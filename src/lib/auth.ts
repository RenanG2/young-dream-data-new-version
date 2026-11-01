import jwt from 'jsonwebtoken';
import type { GetServerSideProps, NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './prisma';
import type { SessionProfessor } from '@/types';

export type { SessionProfessor };

export const COOKIE_NAME = 'ydd_token';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja o .env.example.');
  }
  return secret;
}

export function signToken(professor: { id: number; email: string }): string {
  return jwt.sign({ email: professor.email }, getSecret(), {
    subject: String(professor.id),
    expiresIn: MAX_AGE_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): { id: number; email: string } | null {
  const secret = getSecret();
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub) return null;
    const id = Number(decoded.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id, email: String(decoded.email ?? '') };
  } catch {
    return null;
  }
}

// O token fica em cookie HttpOnly: JavaScript do navegador (e portanto XSS) não consegue lê-lo.
export function setAuthCookie(res: NextApiResponse, token: string): void {
  const parts = [`${COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${MAX_AGE_SECONDS}`];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAuthCookie(res: NextApiResponse): void {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function getProfessorFromToken(token: string | undefined): Promise<SessionProfessor | null> {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.professor.findUnique({
    where: { id: payload.id },
    select: { id: true, nome: true, email: true, instituicao: true },
  });
}

export function getProfessorFromReq(req: NextApiRequest): Promise<SessionProfessor | null> {
  return getProfessorFromToken(req.cookies[COOKIE_NAME]);
}

/** getServerSideProps para páginas privadas: redireciona para /login se não houver sessão válida. */
export const requireProfessorSSR: GetServerSideProps<{ professor: SessionProfessor }> = async (ctx) => {
  const professor = await getProfessorFromToken(ctx.req.cookies[COOKIE_NAME]);
  if (!professor) return { redirect: { destination: '/login', permanent: false } };
  return { props: { professor } };
};

/** getServerSideProps para /login, /register e / : quem já está logado vai direto ao painel. */
export const redirectIfAuthenticatedSSR: GetServerSideProps = async (ctx) => {
  const professor = await getProfessorFromToken(ctx.req.cookies[COOKIE_NAME]);
  if (professor) return { redirect: { destination: '/dashboard', permanent: false } };
  return { props: {} };
};
