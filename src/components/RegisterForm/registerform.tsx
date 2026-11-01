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

interface RegisterFormInputs {
  nome: string;
  email: string;
  senha: string;
  instituicao: string;
}

export const RegisterForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: RegisterFormInputs) => {
    setLoading(true);
    try {
      await api('/api/auth/register', { method: 'POST', body: data });
      router.push('/dashboard');
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm space-y-4 p-6">
      <h2 className="text-xl font-semibold">Registre-se</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" type="text" autoComplete="name" placeholder="Nome" {...register('nome', { required: 'Nome obrigatório' })} />
          {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
        </div>
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
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            {...register('senha', {
              required: 'Informe a senha',
              minLength: { value: 8, message: 'A senha deve ter ao menos 8 caracteres' },
              maxLength: { value: 72, message: 'Senha muito longa (máx. 72)' },
            })}
          />
          {errors.senha && <p className="text-sm text-red-500">{errors.senha.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instituicao">Instituição de ensino</Label>
          <Input
            id="instituicao"
            type="text"
            placeholder="Instituição de ensino"
            {...register('instituicao', { required: 'Instituição de ensino obrigatória' })}
          />
          {errors.instituicao && <p className="text-sm text-red-500">{errors.instituicao.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </Card>
  );
};
