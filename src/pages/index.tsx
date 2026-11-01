import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirectIfAuthenticatedSSR } from '@/lib/auth';

export const getServerSideProps = redirectIfAuthenticatedSSR;

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-2xl flex-col items-center rounded-lg border bg-card p-8 text-center shadow-lg md:p-12">
        <h1 className="mb-4 text-4xl font-bold md:text-6xl">Young Dream Data</h1>
        <p className="mb-10 text-muted-foreground">A nova era da educação</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild className="w-40">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="outline" className="w-40">
            <Link href="/register">Cadastre-se</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
