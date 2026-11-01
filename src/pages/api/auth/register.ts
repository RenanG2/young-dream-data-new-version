import bcrypt from 'bcrypt';
import { publicHandler, created, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/schemas';
import { signToken, setAuthCookie } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export default publicHandler({
  POST: async ({ req, res }) => {
    const limit = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      throw new HttpError(429, 'Muitas tentativas. Tente novamente mais tarde.');
    }

    const data = registerSchema.parse(req.body);

    const existing = await prisma.professor.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) throw new HttpError(409, 'E-mail já cadastrado!');

    const senha = await bcrypt.hash(data.senha, 12);
    // `select` garante que o hash da senha nunca sai daqui (antes ele era devolvido ao navegador).
    const professor = await prisma.professor.create({
      data: { nome: data.nome, email: data.email, instituicao: data.instituicao, senha },
      select: { id: true, nome: true, email: true, instituicao: true },
    });

    setAuthCookie(res, signToken(professor));
    return created({ message: 'Registro realizado com sucesso!', professor });
  },
});
