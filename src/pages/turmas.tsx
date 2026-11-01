import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BarChart3, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { AppShell, EmptyState } from '@/components/AppShell/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useApi } from '@/hooks/useApi';
import { requireProfessorSSR } from '@/lib/auth';
import { api, errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { FrequenciaAlunoDTO, SessionProfessor, TurmaDTO } from '@/types';

export const getServerSideProps = requireProfessorSSR;

export default function TurmasPage({ professor }: { professor: SessionProfessor }) {
  const { data, loading, error, reload } = useApi<{ turmas: TurmaDTO[] }>('/api/turmas');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TurmaDTO | null>(null);
  const [toDelete, setToDelete] = useState<TurmaDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [freqTurma, setFreqTurma] = useState<TurmaDTO | null>(null);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/turmas/${toDelete.id}`, { method: 'DELETE' });
      toast.success('Turma excluída');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      professor={professor}
      title="Turmas"
      actions={
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova turma
        </Button>
      }
    >
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : data && data.turmas.length === 0 ? (
        <EmptyState>Nenhuma turma ainda. Crie a primeira para começar a cadastrar alunos.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.turmas.map((t) => (
            <div key={t.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{t.codigo}</h2>
                  <p className="truncate text-sm text-muted-foreground">{t.descricao || 'Sem descrição'}</p>
                  <p className="mt-1 text-sm">{t.totalAlunos} aluno(s)</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar turma ${t.codigo}`}
                    onClick={() => {
                      setEditing(t);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Excluir turma ${t.codigo}`} onClick={() => setToDelete(t)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setFreqTurma(t)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Frequência
              </Button>
            </div>
          ))}
        </div>
      )}

      <TurmaFormModal open={formOpen} turma={editing} onClose={() => setFormOpen(false)} onSaved={reload} />
      <FrequenciaModal turma={freqTurma} onClose={() => setFreqTurma(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir turma"
        message={`Excluir a turma ${toDelete?.codigo ?? ''}? Só é possível se ela não tiver alunos nem chamadas.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </AppShell>
  );
}

function TurmaFormModal({
  open,
  turma,
  onClose,
  onSaved,
}: {
  open: boolean;
  turma: TurmaDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCodigo(turma?.codigo ?? '');
    setDescricao(turma?.descricao ?? '');
    setError('');
  }, [open, turma]);

  const submit = async () => {
    if (!codigo.trim()) {
      setError('Informe o código da turma');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { codigo: codigo.trim(), descricao: descricao.trim() || null };
      if (turma) await api(`/api/turmas/${turma.id}`, { method: 'PATCH', body });
      else await api('/api/turmas', { method: 'POST', body });
      toast.success(turma ? 'Turma atualizada!' : 'Turma criada!');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={turma ? 'Editar turma' : 'Nova turma'} className="max-w-md">
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-md border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="turma-codigo">Código</Label>
          <Input id="turma-codigo" value={codigo} maxLength={20} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex.: 1A2" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="turma-desc">Descrição (opcional)</Label>
          <Input id="turma-desc" value={descricao} maxLength={200} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: 1º ano A, manhã" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function FrequenciaModal({ turma, onClose }: { turma: TurmaDTO | null; onClose: () => void }) {
  const { data, loading, error } = useApi<{ totalChamadas: number; frequencia: FrequenciaAlunoDTO[] }>(
    turma ? `/api/turmas/${turma.id}/frequencia` : null
  );

  return (
    <Modal open={!!turma} onClose={onClose} title={`Frequência · Turma ${turma?.codigo ?? ''}`} className="max-w-3xl">
      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {data &&
        (data.frequencia.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta turma ainda não tem alunos.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {data.totalChamadas} chamada(s) registrada(s). Em vermelho: frequência abaixo de 75%.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Aluno</th>
                    <th className="px-2 font-medium">Pres.</th>
                    <th className="px-2 font-medium">Just.</th>
                    <th className="px-2 font-medium">Faltas</th>
                    <th className="px-2 text-right font-medium">Freq.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.frequencia.map((f) => (
                    <tr key={f.alunoId} className="border-b border-border/50">
                      <td className="py-2 pr-3">{f.nome}</td>
                      <td className="px-2">{f.presentes}</td>
                      <td className="px-2">{f.justificadas}</td>
                      <td className="px-2">{f.faltas}</td>
                      <td
                        className={cn(
                          'px-2 text-right font-medium',
                          f.percentual !== null && f.percentual < 75 && 'text-red-400'
                        )}
                      >
                        {f.percentual === null ? '—' : `${f.percentual.toFixed(1).replace('.', ',')}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button asChild variant="secondary">
                <a href={`/api/turmas/${turma?.id}/frequencia?formato=csv`}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </a>
              </Button>
            </div>
          </>
        ))}
    </Modal>
  );
}
