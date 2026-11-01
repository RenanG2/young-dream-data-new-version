import { authHandler } from '@/lib/api';

export default authHandler({
  GET: ({ professor }) => ({ professor }),
});
