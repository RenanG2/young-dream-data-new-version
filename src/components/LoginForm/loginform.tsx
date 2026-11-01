import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api, errorMessage } from '@/lib/http';

interface LoginFormInputs {
  email: string;
  senha: string;
}

export const LoginForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // A sessão agora vive num cookie HttpOnly definido pelo servidor: nada de token no localStorage.
  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: data });
      router.push('/dashboard');
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm space-y-4 p-6">
      <h2 className="text-xl font-semibold">Entre utilizando o e-mail</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@escola.com"
            {...register('email', { required: 'Informe o e-mail', pattern: { value: /^\S+@\S+$/i, message: 'E-mail inválido' } })}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            {...register('senha', { required: 'Informe a senha' })}
          />
          {errors.senha && <p className="text-sm text-red-500">{errors.senha.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Cadastre-se
        </Link>
      </p>
    </Card>
  );
};
