import type { Prisma } from '@prisma/client';
import type { AlunoDTO } from '@/types';

// Seleção padrão de aluno: nunca inclui faceData (biometria).
export const alunoSelect = {
  id: true,
  nome: true,
  idade: true,
  turmaId: true,
  turma: { select: { id: true, codigo: true } },
  consentimentoBiometriaEm: true,
} satisfies Prisma.AlunoSelect;

export function toAlunoDTO(a: {
  id: number;
  nome: string;
  idade: number;
  turmaId: number | null;
  turma: { id: number; codigo: string } | null;
  consentimentoBiometriaEm: Date | null;
}): AlunoDTO {
  return { ...a, consentimentoBiometriaEm: a.consentimentoBiometriaEm?.toISOString() ?? null };
}

export const avisoSelect = {
  id: true,
  titulo: true,
  corpo: true,
  fixado: true,
  criadoEm: true,
  turma: { select: { id: true, codigo: true } },
} satisfies Prisma.AvisoSelect;

export function toAvisoDTO(a: {
  id: number;
  titulo: string;
  corpo: string;
  fixado: boolean;
  criadoEm: Date;
  turma: { id: number; codigo: string } | null;
}) {
  return { ...a, criadoEm: a.criadoEm.toISOString() };
}
