import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AppShell, EmptyState, Pagination } from '@/components/AppShell/AppShell';
import AlunoModal from '@/components/AlunoModal/AlunoModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/modal';
import { useApi } from '@/hooks/useApi';
import { useDebounced } from '@/hooks/useDebounced';
import { requireProfessorSSR } from '@/lib/auth';
import { api, errorMessage } from '@/lib/http';
import type { AlunoDTO, AlunosPageDTO, SessionProfessor, TurmaDTO } from '@/types';

export const getServerSideProps = requireProfessorSSR;

const PAGE_SIZE = 20;
const NO_TURMAS: TurmaDTO[] = []; // referência estável (evita re-render em loop no modal)

export default function AlunosPage({ professor }: { professor: SessionProfessor }) {
  const [q, setQ] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounced(q);

  // Ao mudar filtros, volta para a 1ª página
  useEffect(() => setPage(1), [debouncedQ, turmaId]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedQ) params.set('q', debouncedQ);
    if (turmaId) params.set('turmaId', turmaId);
    return `/api/alunos?${params}`;
  }, [page, debouncedQ, turmaId]);

  const alunos = useApi<AlunosPageDTO>(url);
  const turmas = useApi<{ turmas: TurmaDTO[] }>('/api/turmas');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlunoDTO | null>(null);
  const [toDelete, setToDelete] = useState<AlunoDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (a: AlunoDTO) => {
    setEditing(a);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/alunos/${toDelete.id}`, { method: 'DELETE' });
      toast.success('Aluno deletado com sucesso');
      setToDelete(null);
      alunos.reload();
      turmas.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const onSaved = () => {
    alunos.reload();
    turmas.reload();
  };

  return (
    <AppShell
      professor={professor}
      title="Alunos"
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar aluno
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Pesquisar por nome" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="sm:max-w-[200px]">
          <option value="">Todas as turmas</option>
          {turmas.data?.turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.codigo}
            </option>
          ))}
        </Select>
      </div>

      {alunos.error && <p className="text-sm text-red-500">{alunos.error}</p>}
      {alunos.loading && !alunos.data ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : alunos.data && alunos.data.alunos.length === 0 ? (
        <EmptyState>
          {debouncedQ || turmaId ? 'Nenhum aluno encontrado com esses filtros.' : 'Nenhum aluno cadastrado ainda.'}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alunos.data?.alunos.map((aluno) => (
              <div key={aluno.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium">{aluno.nome}</h2>
                    <p className="text-sm text-muted-foreground">
                      {aluno.idade} anos · Turma {aluno.turma?.codigo ?? 'sem turma'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(aluno)} aria-label={`Editar ${aluno.nome}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(aluno)} aria-label={`Excluir ${aluno.nome}`}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                {!aluno.consentimentoBiometriaEm && (
                  <p className="mt-2 text-xs text-yellow-500">Consentimento de biometria não registrado</p>
                )}
              </div>
            ))}
          </div>
          {alunos.data && <Pagination page={alunos.data.page} pageSize={alunos.data.pageSize} total={alunos.data.total} onChange={setPage} />}
        </>
      )}

      <AlunoModal
        open={modalOpen}
        turmas={turmas.data?.turmas ?? NO_TURMAS}
        aluno={editing}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir aluno"
        message={`Excluir ${toDelete?.nome ?? ''}? A biometria e todo o histórico de presenças deste aluno serão apagados. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </AppShell>
  );
}
