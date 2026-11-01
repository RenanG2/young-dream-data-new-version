import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { AppShell, EmptyState } from '@/components/AppShell/AppShell';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { requireProfessorSSR } from '@/lib/auth';
import { formatDateBR, formatDateTimeBR } from '@/lib/format';
import type { DashboardDTO, SessionProfessor } from '@/types';

export const getServerSideProps = requireProfessorSSR;

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function Dashboard({ professor }: { professor: SessionProfessor }) {
  const { data, loading, error } = useApi<DashboardDTO>('/api/dashboard');

  return (
    <AppShell
      professor={professor}
      title={`Olá, ${professor.nome.split(' ')[0]}!`}
      actions={
        <Button asChild>
          <Link href="/chamadas/nova">Fazer chamada</Link>
        </Button>
      }
    >
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && !data && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {data && (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Alunos" value={data.totalAlunos} />
            <StatCard label="Turmas" value={data.totalTurmas} />
            <StatCard label="Chamadas (30 dias)" value={data.chamadasUltimos30Dias} />
            <StatCard
              label="Frequência média (30 dias)"
              value={data.frequenciaMedia === null ? '—' : `${data.frequenciaMedia.toFixed(1).replace('.', ',')}%`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Alunos com baixa frequência
              </h2>
              {data.alunosEmRisco.length === 0 ? (
                <EmptyState>Nenhum aluno abaixo de 75% nos últimos 30 dias.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {data.alunosEmRisco.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm">
                      <span>
                        {a.nome}
                        {a.turma && <span className="text-muted-foreground"> · {a.turma}</span>}
                      </span>
                      <span className="font-medium text-red-400">{a.percentual.toFixed(1).replace('.', ',')}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-semibold">Últimas chamadas</h2>
              {data.ultimasChamadas.length === 0 ? (
                <EmptyState>Nenhuma chamada registrada ainda.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {data.ultimasChamadas.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm">
                      <span>
                        {formatDateBR(c.data)} · Turma {c.turma.codigo} · {c.aula}ª aula
                      </span>
                      <span className="text-muted-foreground">
                        {c.presentes}/{c.total} presentes
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Avisos recentes</h2>
              <Link href="/avisos" className="text-sm text-muted-foreground underline underline-offset-4">
                Ver todos
              </Link>
            </div>
            {data.avisosRecentes.length === 0 ? (
              <EmptyState>Nenhum aviso publicado.</EmptyState>
            ) : (
              <div className="space-y-2">
                {data.avisosRecentes.map((a) => (
                  <article key={a.id} className="rounded-md border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{a.titulo}</h3>
                      <span className="text-xs text-muted-foreground">
                        {a.turma ? `Turma ${a.turma.codigo}` : 'Todas as turmas'} · {formatDateTimeBR(a.criadoEm)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.corpo}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
