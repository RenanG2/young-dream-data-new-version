import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { AppShell } from '@/components/AppShell/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useApi } from '@/hooks/useApi';
import { useCamera } from '@/hooks/useCamera';
import { useFaceApi } from '@/hooks/useFaceApi';
import { requireProfessorSSR } from '@/lib/auth';
import { FACE_MATCH_THRESHOLD, findClosest } from '@/lib/face';
import { drawFaces } from '@/lib/faceClient';
import { todayLocalISO } from '@/lib/format';
import { api, errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { DescritorAlunoDTO, MetodoPresenca, SessionProfessor, StatusPresenca, TurmaDTO } from '@/types';

export const getServerSideProps = requireProfessorSSR;

interface RosterItem {
  alunoId: number;
  nome: string;
  status: StatusPresenca;
  metodo: MetodoPresenca;
  temBiometria: boolean;
}

interface DescritoresResponse {
  alunos: DescritorAlunoDTO[];
  semBiometria: { id: number; nome: string }[];
}

const STATUS_LABEL: Record<StatusPresenca, string> = {
  PRESENTE: 'Presente',
  FALTA: 'Falta',
  JUSTIFICADA: 'Falta justificada',
};

export default function NovaChamadaPage({ professor }: { professor: SessionProfessor }) {
  const router = useRouter();
  const turmas = useApi<{ turmas: TurmaDTO[] }>('/api/turmas');
  const [turmaId, setTurmaId] = useState('');
  const [data, setData] = useState('');
  const [aula, setAula] = useState('1');
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [saving, setSaving] = useState(false);

  const descritores = useApi<DescritoresResponse>(turmaId ? `/api/turmas/${turmaId}/descritores` : null);
  const { faceapi, ready, error: modelError } = useFaceApi();
  const { videoRef, active, error: cameraError, start, stop } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // A data de hoje só é definida no navegador (evita divergência de fuso entre servidor e cliente).
  useEffect(() => setData(todayLocalISO()), []);

  // Monta a lista de presença sempre que a turma muda: todos começam como falta até serem reconhecidos/marcados.
  useEffect(() => {
    const d = descritores.data;
    if (!d) {
      setRoster([]);
      return;
    }
    const items: RosterItem[] = [
      ...d.alunos.map((a) => ({ alunoId: a.id, nome: a.nome, status: 'FALTA' as const, metodo: 'MANUAL' as const, temBiometria: true })),
      ...d.semBiometria.map((a) => ({ alunoId: a.id, nome: a.nome, status: 'FALTA' as const, metodo: 'MANUAL' as const, temBiometria: false })),
    ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    setRoster(items);
  }, [descritores.data]);

  // Refs lidas pelo laço de reconhecimento (evitam reiniciar a câmera a cada atualização da lista)
  const rosterRef = useRef(roster);
  rosterRef.current = roster;
  const candidatesRef = useRef<DescritorAlunoDTO[]>([]);
  candidatesRef.current = descritores.data?.alunos ?? [];
  const streakRef = useRef(new Map<number, number>());

  const markPresent = useCallback((alunoId: number) => {
    const item = rosterRef.current.find((r) => r.alunoId === alunoId);
    if (!item || item.status === 'PRESENTE') return;
    setRoster((prev) => prev.map((r) => (r.alunoId === alunoId ? { ...r, status: 'PRESENTE', metodo: 'FACIAL' } : r)));
    toast.success(`${item.nome} registrado(a) na chamada!`);
  }, []);

  // Reconhecimento contínuo: detecta todos os rostos do quadro ~3x por segundo, sem precisar clicar em nada.
  useEffect(() => {
    if (!active || !faceapi) return;
    let cancelled = false;
    let timer: number | undefined;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    streakRef.current.clear();

    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks().withFaceDescriptors();
          if (cancelled) return;

          const seen = new Set<number>();
          const faces = detections.map((det) => {
            const match = findClosest(Array.from(det.descriptor), candidatesRef.current);
            const box = det.detection.box;
            if (match && match.distance < FACE_MATCH_THRESHOLD) {
              seen.add(match.candidate.id);
              return { box, label: match.candidate.nome, color: '#22c55e' };
            }
            return { box, label: 'Não reconhecido', color: '#ef4444' };
          });
          drawFaces(faceapi, canvas, video, faces);

          // Só marca presença após 2 quadros seguidos com o mesmo aluno (reduz falsos positivos)
          seen.forEach((id) => {
            const n = (streakRef.current.get(id) ?? 0) + 1;
            streakRef.current.set(id, n);
            if (n >= 2) markPresent(id);
          });
          streakRef.current.forEach((_, id) => {
            if (!seen.has(id)) streakRef.current.delete(id);
          });
        } catch (err) {
          console.error('Erro no reconhecimento facial:', err);
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, 350);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [active, faceapi, videoRef, markPresent]);

  const setStatus = (alunoId: number, status: StatusPresenca) =>
    setRoster((prev) => prev.map((r) => (r.alunoId === alunoId ? { ...r, status, metodo: 'MANUAL' } : r)));

  const presentes = useMemo(() => roster.filter((r) => r.status === 'PRESENTE').length, [roster]);

  const finalizar = async () => {
    setSaving(true);
    try {
      const res = await api<{ message: string }>('/api/chamadas', {
        method: 'POST',
        body: {
          turmaId: Number(turmaId),
          data,
          aula: Number(aula) || 1,
          presencas: roster.map((r) => ({ alunoId: r.alunoId, status: r.status, metodo: r.metodo })),
        },
      });
      stop();
      toast.success(res.message);
      router.push('/chamadas');
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  const turmaOptions = turmas.data?.turmas ?? [];

  return (
    <AppShell
      professor={professor}
      title="Nova chamada"
      actions={
        <Button asChild variant="secondary">
          <Link href="/chamadas">Voltar ao histórico</Link>
        </Button>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="chamada-turma">Turma</Label>
          <Select
            id="chamada-turma"
            value={turmaId}
            onChange={(e) => {
              stop();
              setTurmaId(e.target.value);
            }}
          >
            <option value="">Selecione...</option>
            {turmaOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} ({t.totalAlunos} alunos)
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="chamada-data">Data</Label>
          <Input id="chamada-data" type="date" value={data} max={todayLocalISO()} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="chamada-aula">Nº da aula no dia</Label>
          <Input id="chamada-aula" type="number" min={1} max={20} value={aula} onChange={(e) => setAula(e.target.value)} />
        </div>
      </div>

      {!turmaId ? (
        <p className="text-sm text-muted-foreground">Escolha uma turma para começar.</p>
      ) : descritores.loading ? (
        <p className="text-sm text-muted-foreground">Carregando alunos...</p>
      ) : descritores.error ? (
        <p className="text-sm text-red-500">{descritores.error}</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta turma não tem alunos.{' '}
          <Link href="/alunos" className="text-foreground underline underline-offset-4">
            Cadastre alunos
          </Link>{' '}
          primeiro.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-secondary">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
              <canvas ref={canvasRef} className="absolute left-0 top-0 h-full w-full object-contain" />
              {!active && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Câmera desligada</div>
              )}
            </div>
            {(modelError || cameraError) && <p className="text-sm text-red-500">{modelError ?? cameraError}</p>}
            {!active ? (
              <Button variant="secondary" className="w-full" onClick={start} disabled={!ready}>
                {ready ? 'Iniciar câmera e reconhecimento' : 'Carregando modelos...'}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" onClick={stop}>
                Parar câmera
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              O reconhecimento é automático: basta cada aluno olhar para a câmera. Você também pode marcar manualmente na lista ao lado.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Lista de presença</h2>
              <span className="text-sm text-muted-foreground">
                {presentes} de {roster.length} presentes
              </span>
            </div>
            <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {roster.map((r) => (
                <li
                  key={r.alunoId}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md border p-2',
                    r.status === 'PRESENTE' && 'border-green-600/60 bg-green-600/10'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === 'PRESENTE' ? (r.metodo === 'FACIAL' ? 'Reconhecido pela câmera' : 'Marcado manualmente') : 'Aguardando'}
                      {!r.temBiometria && ' · sem biometria'}
                    </p>
                  </div>
                  <Select
                    aria-label={`Situação de ${r.nome}`}
                    className="h-8 w-40 shrink-0 text-xs"
                    value={r.status}
                    onChange={(e) => setStatus(r.alunoId, e.target.value as StatusPresenca)}
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
            <p className="mt-3 text-xs text-muted-foreground">
              Quem não estiver marcado como presente será salvo como falta. Se já existir uma chamada desta turma na mesma data e aula, ela
              será substituída.
            </p>
            <div className="mt-4 flex justify-end">
              <Button onClick={finalizar} disabled={saving || !data}>
                {saving ? 'Salvando...' : 'Finalizar chamada'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
