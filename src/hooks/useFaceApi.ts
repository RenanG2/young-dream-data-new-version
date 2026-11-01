import { useEffect, useState } from 'react';
import type { FaceApi } from '@/lib/faceClient';

let loading: Promise<FaceApi> | null = null;

// Carrega a biblioteca e os modelos uma única vez por sessão, compartilhado entre cadastro e chamada.
function loadFaceApi(): Promise<FaceApi> {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      return faceapi;
    })().catch((err) => {
      loading = null; // permite tentar de novo
      throw err;
    });
  }
  return loading;
}

export function useFaceApi() {
  const [faceapi, setFaceapi] = useState<FaceApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFaceApi()
      .then((f) => {
        if (!cancelled) setFaceapi(f);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os modelos de reconhecimento facial.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { faceapi, ready: faceapi !== null, error };
}
