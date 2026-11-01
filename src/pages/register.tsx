import Head from 'next/head';
import Link from 'next/link';
import { RegisterForm } from '@/components/RegisterForm/registerform';
import { Button } from '@/components/ui/button';
import { redirectIfAuthenticatedSSR } from '@/lib/auth';

export const getServerSideProps = redirectIfAuthenticatedSSR;

export default function Register() {
  return (
    <>
      <Head>
        <title>Cadastre-se · Young Dream Data</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="absolute left-4 top-4">
          <h1 className="text-xl font-bold md:text-2xl">Young Dream Data 📚</h1>
        </div>
        <div className="absolute right-4 top-4">
          <Button asChild variant="secondary">
            <Link href="/">Voltar</Link>
          </Button>
        </div>
        <RegisterForm />
      </div>
    </>
  );
}
