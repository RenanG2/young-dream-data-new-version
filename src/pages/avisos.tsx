import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AppShell, EmptyState, Pagination } from '@/components/AppShell/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useApi } from '@/hooks/useApi';
import { requireProfessorSSR } from '@/lib/auth';
import { api, errorMessage } from '@/lib/http';
import { formatDateTimeBR } from '@/lib/format';
import type { AvisoDTO, SessionProfessor, TurmaDTO } from '@/types';

export const getServerSideProps = requireProfessorSSR;

interface AvisosPage {
  avisos: AvisoDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AvisosPage({ professor }: { professor: SessionProfessor }) {
  const [page, setPage] = useState(1);
  const avisos = useApi<AvisosPage>(`/api/avisos?page=${page}`);
  const turmas = useApi<{ turmas: TurmaDTO[] }>('/api/turmas');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AvisoDTO | null>(null);
  const [toDelete, setToDelete] = useState<AvisoDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/avisos/${toDelete.id}`, { method: 'DELETE' });
      toast.success('Aviso excluído');
      setToDelete(null);
      avisos.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      professor={professor}
      title="Mural de avisos"
      actions={
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo aviso
        </Button>
      }
    >
      {avisos.error && <p className="text-sm text-red-500">{avisos.error}</p>}
      {avisos.loading && !avisos.data ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : avisos.data && avisos.data.avisos.length === 0 ? (
        <EmptyState>Nenhum aviso publicado ainda.</EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            {avisos.data?.avisos.map((a) => (
              <article key={a.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{a.titulo}</h2>
                      {a.fixado && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">Fixado</span>}
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                        {a.turma ? `Turma ${a.turma.codigo}` : 'Todas as turmas'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeBR(a.criadoEm)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar aviso"
                      onClick={() => {
                        setEditing(a);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Excluir aviso" onClick={() => setToDelete(a)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{a.corpo}</p>
              </article>
            ))}
          </div>
          {avisos.data && <Pagination page={avisos.data.page} pageSize={avisos.data.pageSize} total={avisos.data.total} onChange={setPage} />}
        </>
      )}

      <AvisoFormModal
        open={formOpen}
        aviso={editing}
        turmas={turmas.data?.turmas ?? NO_TURMAS}
        onClose={() => setFormOpen(false)}
        onSaved={avisos.reload}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir aviso"
        message={`Excluir o aviso "${toDelete?.titulo ?? ''}"?`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </AppShell>
  );
}

const NO_TURMAS: TurmaDTO[] = [];

function AvisoFormModal({
  open,
  aviso,
  turmas,
  onClose,
  onSaved,
}: {
  open: boolean;
  aviso: AvisoDTO | null;
  turmas: TurmaDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [fixado, setFixado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitulo(aviso?.titulo ?? '');
    setCorpo(aviso?.corpo ?? '');
    setTurmaId(aviso?.turma ? String(aviso.turma.id) : '');
    setFixado(aviso?.fixado ?? false);
    setError('');
  }, [open, aviso]);

  const submit = async () => {
    if (!titulo.trim() || !corpo.trim()) {
      setError('Preencha o título e a mensagem');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { titulo: titulo.trim(), corpo: corpo.trim(), turmaId: turmaId ? Number(turmaId) : null, fixado };
      if (aviso) await api(`/api/avisos/${aviso.id}`, { method: 'PATCH', body });
      else await api('/api/avisos', { method: 'POST', body });
      toast.success(aviso ? 'Aviso atualizado!' : 'Aviso publicado!');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={aviso ? 'Editar aviso' : 'Novo aviso'}>
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-md border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="aviso-titulo">Título</Label>
          <Input id="aviso-titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aviso-corpo">Mensagem</Label>
          <Textarea id="aviso-corpo" value={corpo} maxLength={5000} onChange={(e) => setCorpo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aviso-turma">Destinatários</Label>
          <Select id="aviso-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                Turma {t.codigo}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fixado} onChange={(e) => setFixado(e.target.checked)} />
          Fixar no topo do mural
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Publicar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
