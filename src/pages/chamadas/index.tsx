import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Plus, Trash2 } from 'lucide-react';
import { AppShell, EmptyState, Pagination } from '@/components/AppShell/AppShell';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { useApi } from '@/hooks/useApi';
import { requireProfessorSSR } from '@/lib/auth';
import { api, errorMessage } from '@/lib/http';
import { formatDateBR } from '@/lib/format';
import type { ChamadaDetalheDTO, ChamadaResumoDTO, SessionProfessor, StatusPresenca, TurmaDTO } from '@/types';

export const getServerSideProps = requireProfessorSSR;

interface ChamadasPage {
  chamadas: ChamadaResumoDTO[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABEL: Record<StatusPresenca, string> = {
  PRESENTE: 'Presente',
  FALTA: 'Falta',
  JUSTIFICADA: 'Falta justificada',
};

export default function ChamadasPage({ professor }: { professor: SessionProfessor }) {
  const [page, setPage] = useState(1);
  const [turmaId, setTurmaId] = useState('');
  useEffect(() => setPage(1), [turmaId]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (turmaId) params.set('turmaId', turmaId);
    return `/api/chamadas?${params}`;
  }, [page, turmaId]);

  const chamadas = useApi<ChamadasPage>(url);
  const turmas = useApi<{ turmas: TurmaDTO[] }>('/api/turmas');
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <AppShell
      professor={professor}
      title="Chamadas"
      actions={
        <Button asChild>
          <Link href="/chamadas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova chamada
          </Link>
        </Button>
      }
    >
      <div className="mb-4 max-w-[220px]">
        <Select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} aria-label="Filtrar por turma">
          <option value="">Todas as turmas</option>
          {turmas.data?.turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.codigo}
            </option>
          ))}
        </Select>
      </div>

      {chamadas.error && <p className="text-sm text-red-500">{chamadas.error}</p>}
      {chamadas.loading && !chamadas.data ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : chamadas.data && chamadas.data.chamadas.length === 0 ? (
        <EmptyState>Nenhuma chamada registrada ainda.</EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Turma</th>
                  <th className="p-3 font-medium">Aula</th>
                  <th className="p-3 font-medium">Presentes</th>
                  <th className="p-3 font-medium">Faltas</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {chamadas.data?.chamadas.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0">
                    <td className="p-3">{formatDateBR(c.data)}</td>
                    <td className="p-3">{c.turma.codigo}</td>
                    <td className="p-3">{c.aula}ª</td>
                    <td className="p-3">
                      {c.presentes}/{c.total}
                    </td>
                    <td className="p-3">
                      {c.faltas}
                      {c.justificadas > 0 && <span className="text-muted-foreground"> (+{c.justificadas} just.)</span>}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => setOpenId(c.id)}>
                        Ver / editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {chamadas.data && <Pagination page={chamadas.data.page} pageSize={chamadas.data.pageSize} total={chamadas.data.total} onChange={setPage} />}
        </>
      )}

      <ChamadaDetalheModal id={openId} onClose={() => setOpenId(null)} onChanged={chamadas.reload} />
    </AppShell>
  );
}

function ChamadaDetalheModal({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error } = useApi<{ chamada: ChamadaDetalheDTO }>(id ? `/api/chamadas/${id}` : null);
  const [edits, setEdits] = useState<Record<number, StatusPresenca>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEdits({});
    setConfirmDelete(false);
  }, [id]);

  const chamada = data?.chamada;
  const changed = Object.keys(edits).length;

  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/chamadas/${id}`, {
        method: 'PATCH',
        body: { presencas: Object.entries(edits).map(([alunoId, status]) => ({ alunoId: Number(alunoId), status })) },
      });
      toast.success('Chamada atualizada!');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api(`/api/chamadas/${id}`, { method: 'DELETE' });
      toast.success('Chamada excluída');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Modal
        open={id !== null && !confirmDelete}
        onClose={onClose}
        title={chamada ? `Turma ${chamada.turma.codigo} · ${formatDateBR(chamada.data)} · ${chamada.aula}ª aula` : 'Chamada'}
        className="max-w-xl"
      >
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {chamada && (
          <>
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {chamada.presencas.map((p) => (
                <li key={p.alunoId} className="flex items-center justify-between gap-3 rounded-md border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.metodo === 'FACIAL' ? 'Reconhecimento facial' : 'Manual'}</p>
                  </div>
                  <Select
                    aria-label={`Situação de ${p.nome}`}
                    className="h-8 w-40 shrink-0 text-xs"
                    value={edits[p.alunoId] ?? p.status}
                    onChange={(e) => {
                      const status = e.target.value as StatusPresenca;
                      setEdits((prev) => {
                        const next = { ...prev };
                        if (status === p.status) delete next[p.alunoId];
                        else next[p.alunoId] = status;
                        return next;
                      });
                    }}
                  >
                    {(Object.keys(STATUS_LABEL) as StatusPresenca[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={saving}>
                <Trash2 className="mr-2 h-4 w-4 text-red-400" />
                Excluir chamada
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} disabled={saving}>
                  Fechar
                </Button>
                <Button onClick={save} disabled={saving || changed === 0}>
                  {saving ? 'Salvando...' : `Salvar${changed ? ` (${changed})` : ''}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir chamada"
        message="Excluir esta chamada e todos os seus registros de presença? Isso altera a frequência dos alunos."
        confirmLabel="Excluir"
        loading={saving}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
