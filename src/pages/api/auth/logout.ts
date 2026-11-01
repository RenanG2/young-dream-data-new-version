import { publicHandler } from '@/lib/api';
import { clearAuthCookie } from '@/lib/auth';

export default publicHandler({
  POST: ({ res }) => {
    clearAuthCookie(res);
    return { message: 'Sessão encerrada' };
  },
});
