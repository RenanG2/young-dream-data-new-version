import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFaceApi } from '@/hooks/useFaceApi';
import { useCamera } from '@/hooks/useCamera';
import { captureAveragedDescriptor, drawFaces } from '@/lib/faceClient';
import { api, ApiError, errorMessage } from '@/lib/http';
import type { AlunoDTO, TurmaDTO } from '@/types';

interface Props {
  open: boolean;
  turmas: TurmaDTO[];
  /** Se informado, o modal edita este aluno (sem recaptura de biometria). */
  aluno?: AlunoDTO | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AlunoModal({ open, turmas, aluno, onClose, onSaved }: Props) {
  const editing = !!aluno;
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [consentimento, setConsentimento] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  // Reinicia o formulário sempre que o modal abre (ou muda o aluno em edição)
  useEffect(() => {
    if (!open) return;
    setNome(aluno?.nome ?? '');
    setIdade(aluno ? String(aluno.idade) : '');
    setTurmaId(aluno?.turmaId ? String(aluno.turmaId) : '');
    setDescriptor(null);
    setConsentimento(false);
    setErrors({});
    setApiError('');
  }, [open, aluno]);

  // Turma padrão: a primeira da lista (que pode chegar depois do modal abrir)
  useEffect(() => {
    if (open && !turmaId && turmas.length > 0) setTurmaId(String(turmas[0].id));
  }, [open, turmaId, turmas]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (nome.trim().length < 2) e.nome = 'Informe o nome do aluno';
    else if (nome.trim().length > 100) e.nome = 'Nome não pode ter mais de 100 caracteres';
    const n = Number(idade);
    if (!Number.isInteger(n) || n < 3 || n > 25) e.idade = 'Idade deve ser entre 3 e 25 anos';
    if (!turmaId) e.turmaId = 'Escolha a turma';
    if (!editing) {
      if (!descriptor) e.face = 'Capture a biometria facial do aluno';
      if (!consentimento) e.consentimento = 'É necessário o consentimento do responsável';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setApiError('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing && aluno) {
        await api(`/api/alunos/${aluno.id}`, {
          method: 'PATCH',
          body: { nome: nome.trim(), idade: Number(idade), turmaId: Number(turmaId) },
        });
        toast.success('Aluno atualizado!');
      } else {
        await api('/api/alunos', {
          method: 'POST',
          body: { nome: nome.trim(), idade: Number(idade), turmaId: Number(turmaId), descriptor, consentimento },
        });
        toast.success('Aluno cadastrado com sucesso!');
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.details as { code?: string } | undefined)?.code === 'FACE_DUPLICATE') {
        setDescriptor(null);
      }
      setApiError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar aluno' : 'Cadastro de aluno'} className={editing ? 'max-w-md' : 'max-w-3xl'}>
      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Antes de cadastrar alunos, crie uma turma em{' '}
          <Link href="/turmas" className="text-foreground underline underline-offset-4">
            Turmas
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          {apiError && (
            <div role="alert" className="rounded-md border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">
              {apiError}
            </div>
          )}

          <div className={editing ? 'space-y-4' : 'grid gap-6 md:grid-cols-2'}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="aluno-nome">Nome</Label>
                <Input id="aluno-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do aluno" />
                {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aluno-idade">Idade</Label>
                <Input
                  id="aluno-idade"
                  type="number"
                  min={3}
                  max={25}
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  placeholder="Idade do aluno"
                />
                {errors.idade && <p className="text-sm text-red-500">{errors.idade}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aluno-turma">Turma</Label>
                <Select id="aluno-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo}
                    </option>
                  ))}
                </Select>
                {errors.turmaId && <p className="text-sm text-red-500">{errors.turmaId}</p>}
              </div>
            </div>

            {!editing && (
              <div className="space-y-3">
                <FaceEnroll descriptor={descriptor} onChange={setDescriptor} />
                {errors.face && <p className="text-sm text-red-500">{errors.face}</p>}
              </div>
            )}
          </div>

          {!editing && (
            <div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consentimento}
                  onChange={(e) => setConsentimento(e.target.checked)}
                />
                <span className="text-muted-foreground">
                  Declaro que o responsável legal pelo aluno autorizou o uso da biometria facial para controle de
                  presença, conforme a LGPD (dados de crianças e adolescentes exigem consentimento específico).
                </span>
              </label>
              {errors.consentimento && <p className="mt-1 text-sm text-red-500">{errors.consentimento}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FaceEnroll({ descriptor, onChange }: { descriptor: number[] | null; onChange: (d: number[] | null) => void }) {
  const { faceapi, ready, error: modelError } = useFaceApi();
  const { videoRef, active, error: cameraError, start } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!faceapi || !videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    onChange(null);
    try {
      const result = await captureAveragedDescriptor(faceapi, videoRef.current);
      if (!result) {
        toast.error('Nenhum rosto detectado com clareza. Centralize o rosto, com boa luz, e tente de novo.');
        return;
      }
      drawFaces(faceapi, canvasRef.current, videoRef.current, [{ box: result.box, label: 'Rosto capturado' }]);
      onChange(result.descriptor);
      toast.success('Rosto capturado com sucesso!');
    } catch (err) {
      console.error('Erro ao capturar rosto:', err);
      toast.error('Erro ao processar a imagem facial');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
        <canvas ref={canvasRef} className="absolute left-0 top-0 h-full w-full object-contain" />
        {descriptor && (
          <span className="absolute right-2 top-2 rounded-md bg-green-600 px-2 py-1 text-xs text-white">Rosto capturado</span>
        )}
      </div>
      {(modelError || cameraError) && <p className="text-sm text-red-500">{modelError ?? cameraError}</p>}
      {!active ? (
        <Button variant="secondary" className="w-full" onClick={start} disabled={!ready}>
          {ready ? 'Iniciar câmera' : 'Carregando modelos...'}
        </Button>
      ) : (
        <Button variant="secondary" className="w-full" onClick={capture} disabled={!ready || capturing}>
          {capturing ? 'Capturando... mantenha o rosto parado' : descriptor ? 'Capturar novamente' : 'Capturar face'}
        </Button>
      )}
    </>
  );
}
