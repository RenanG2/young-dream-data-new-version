// Utilidades de reconhecimento facial sem dependências de ambiente (usadas no servidor e no navegador).

export const FACE_DESCRIPTOR_SIZE = 128;

/**
 * Distância euclidiana máxima para considerar "a mesma pessoa".
 * O face-api.js sugere 0.6; usamos 0.5 (mais rígido) para reduzir falsos positivos.
 */
export const FACE_MATCH_THRESHOLD = 0.5;

export interface FaceCandidate {
  id: number;
  nome: string;
  descriptor: number[];
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function parseDescriptor(json: string | null | undefined): number[] | null {
  if (!json) return null;
  try {
    const arr: unknown = JSON.parse(json);
    if (
      Array.isArray(arr) &&
      arr.length === FACE_DESCRIPTOR_SIZE &&
      arr.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      return arr as number[];
    }
  } catch {
    /* JSON inválido */
  }
  return null;
}

/** Candidato mais próximo (menor distância). Antes o código usava o *primeiro* abaixo do limite, não o melhor. */
export function findClosest(
  descriptor: number[],
  candidates: FaceCandidate[]
): { candidate: FaceCandidate; distance: number } | null {
  let best: { candidate: FaceCandidate; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = euclideanDistance(descriptor, candidate.descriptor);
    if (!best || distance < best.distance) best = { candidate, distance };
  }
  return best;
}
