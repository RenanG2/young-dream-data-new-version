import bcrypt from 'bcrypt';
import { publicHandler, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/schemas';
import { signToken, setAuthCookie } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// Hash falso usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails são cadastrados.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('senha-inexistente', 12));

export default publicHandler({
  POST: async ({ req, res }) => {
    const { email, senha } = loginSchema.parse(req.body);

    const limit = rateLimit(`login:${clientIp(req)}:${email}`, 5, 15 * 60 * 1000);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      throw new HttpError(429, 'Muitas tentativas de login. Aguarde alguns minutos.');
    }

    const user = await prisma.professor.findUnique({ where: { email } });
    const valid = await bcrypt.compare(senha, user?.senha ?? (await getDummyHash()));
    if (!user || !valid) throw new HttpError(401, 'Email ou senha inválidos');

    setAuthCookie(res, signToken(user));
    return {
      message: 'Login bem-sucedido!',
      professor: { id: user.id, nome: user.nome, email: user.email, instituicao: user.instituicao },
    };
  },
});
