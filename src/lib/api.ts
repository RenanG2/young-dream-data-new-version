import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { getProfessorFromReq } from './auth';
import type { SessionProfessor } from '@/types';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Use quando o handler precisa devolver um status diferente de 200. */
export class ApiResponse {
  constructor(public status: number, public body?: unknown) {}
}
export const created = (body: unknown) => new ApiResponse(201, body);

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface PublicCtx {
  req: NextApiRequest;
  res: NextApiResponse;
}
interface AuthCtx extends PublicCtx {
  professor: SessionProfessor;
}
type Handlers<C> = Partial<Record<Method, (ctx: C) => Promise<unknown> | unknown>>;

/** Defesa extra contra CSRF: em requisições que alteram dados, o Origin (se enviado) deve ser o nosso host. */
function assertSameOrigin(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (!origin) return;
  const forwarded = req.headers['x-forwarded-host'];
  const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ?? req.headers.host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Origem inválida');
  }
  if (originHost !== host) throw new HttpError(403, 'Origem não permitida');
}

function handleError(err: unknown, res: NextApiResponse) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    return res
      .status(400)
      .json({ error: issue ? `${where}${issue.message}` : 'Dados inválidos', details: err.flatten().fieldErrors });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um registro com esses dados' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'Este registro está vinculado a outros dados' });
  }
  // Nunca devolvemos err.message ao cliente: pode vazar detalhes internos.
  console.error('[api]', err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

function createHandler<C extends PublicCtx>(
  handlers: Handlers<C>,
  buildCtx: (base: PublicCtx) => Promise<C>
) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      const method = (req.method ?? 'GET') as Method;
      const fn = handlers[method];
      if (!fn) {
        res.setHeader('Allow', Object.keys(handlers).join(', '));
        throw new HttpError(405, 'Método não permitido');
      }
      if (method !== 'GET') assertSameOrigin(req);

      const ctx = await buildCtx({ req, res });
      const result = await fn(ctx);

      if (res.writableEnded) return; // o handler já respondeu (ex.: download de CSV)
      if (result instanceof ApiResponse) {
        if (result.body === undefined) return res.status(result.status).end();
        return res.status(result.status).json(result.body);
      }
      if (result === undefined) return res.status(204).end();
      return res.status(200).json(result);
    } catch (err) {
      return handleError(err, res);
    }
  };
}

/** Rota aberta (login, cadastro). */
export const publicHandler = (handlers: Handlers<PublicCtx>) => createHandler(handlers, async (base) => base);

/** Rota privada: exige sessão válida e injeta `professor` no contexto. */
export const authHandler = (handlers: Handlers<AuthCtx>) =>
  createHandler<AuthCtx>(handlers, async (base) => {
    const professor = await getProfessorFromReq(base.req);
    if (!professor) throw new HttpError(401, 'Não autenticado');
    return { ...base, professor };
  });

export function parseId(value: string | string[] | undefined, label = 'id'): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} inválido`);
  return n;
}

export function parseIntQuery(
  value: string | string[] | undefined,
  fallback: number,
  { min = 1, max = 1000 }: { min?: number; max?: number } = {}
): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function firstQuery(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() ? v.trim() : undefined;
}
