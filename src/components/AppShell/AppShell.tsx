import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Camera, GraduationCap, LayoutDashboard, LogOut, Megaphone, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { SessionProfessor } from '@/types';

const NAV = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/alunos', label: 'Alunos', icon: Users },
  { href: '/turmas', label: 'Turmas', icon: GraduationCap },
  { href: '/chamadas', label: 'Chamadas', icon: Camera },
  { href: '/avisos', label: 'Avisos', icon: Megaphone },
];

interface AppShellProps {
  professor: SessionProfessor;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ professor, title, actions, children }: AppShellProps) {
  const router = useRouter();

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <>
      <Head>
        <title>{`${title} · Young Dream Data`}</title>
      </Head>
      <div className="min-h-screen md:flex">
        <aside className="border-b bg-card md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
            <Link href="/dashboard" className="text-lg font-bold">
              Young Dream Data 📚
            </Link>
            <Button variant="ghost" size="sm" onClick={logout} className="md:hidden" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = router.pathname === href || router.pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden px-4 pt-6 md:absolute md:bottom-0 md:block md:w-60 md:pb-4">
            <p className="truncate text-sm font-medium">{professor.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{professor.instituicao}</p>
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
          {children}
        </main>
      </div>
    </>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Página {page} de {pages} · {total} registros
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
