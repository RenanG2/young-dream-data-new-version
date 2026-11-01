// Funções do navegador para o face-api.js. O pacote é carregado sob demanda (import dinâmico),
// então só quem abre cadastro de aluno / chamada baixa o código e os modelos (~7 MB).
export type FaceApi = typeof import('face-api.js');

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Captura o rosto em algumas amostras seguidas e tira a média dos descritores.
 * Fica bem mais estável do que uma única foto (que pode pegar piscada ou rosto desfocado).
 */
export async function captureAveragedDescriptor(
  faceapi: FaceApi,
  video: HTMLVideoElement,
  samples = 3
): Promise<{ descriptor: number[]; box: Box } | null> {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const collected: Float32Array[] = [];
  let box: Box | null = null;

  for (let i = 0; i < samples; i++) {
    const detection = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
      collected.push(detection.descriptor);
      box = detection.detection.box;
    }
    if (i < samples - 1) await sleep(250);
  }

  if (collected.length < 2 || !box) return null;

  const avg = new Array<number>(collected[0].length).fill(0);
  for (const d of collected) {
    for (let i = 0; i < d.length; i++) avg[i] += d[i] / collected.length;
  }
  return { descriptor: avg, box };
}

export function drawFaces(
  faceapi: FaceApi,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  faces: { box: Box; label: string; color?: string }[]
): void {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const f of faces) {
    new faceapi.draw.DrawBox(f.box, { label: f.label, boxColor: f.color ?? '#22c55e' }).draw(canvas);
  }
}
