// Tipos compartilhados entre API e telas (somente tipos: seguro importar no cliente).

export interface SessionProfessor {
  id: number;
  nome: string;
  email: string;
  instituicao: string;
}

export type StatusPresenca = 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
export type MetodoPresenca = 'FACIAL' | 'MANUAL';

export interface TurmaRef {
  id: number;
  codigo: string;
}

export interface TurmaDTO extends TurmaRef {
  descricao: string | null;
  totalAlunos: number;
}

export interface AlunoDTO {
  id: number;
  nome: string;
  idade: number;
  turmaId: number | null;
  turma: TurmaRef | null;
  consentimentoBiometriaEm: string | null;
}

export interface AlunosPageDTO {
  alunos: AlunoDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DescritorAlunoDTO {
  id: number;
  nome: string;
  descriptor: number[];
}

export interface ChamadaResumoDTO {
  id: number;
  data: string;
  aula: number;
  turma: TurmaRef;
  presentes: number;
  justificadas: number;
  faltas: number;
  total: number;
}

export interface ChamadaDetalheDTO {
  id: number;
  data: string;
  aula: number;
  turma: TurmaRef;
  presencas: {
    alunoId: number;
    nome: string;
    status: StatusPresenca;
    metodo: MetodoPresenca;
  }[];
}

export interface AvisoDTO {
  id: number;
  titulo: string;
  corpo: string;
  fixado: boolean;
  criadoEm: string;
  turma: TurmaRef | null;
}

export interface FrequenciaAlunoDTO {
  alunoId: number;
  nome: string;
  presentes: number;
  justificadas: number;
  faltas: number;
  registradas: number;
  /** 0–100, ou null se o aluno ainda não tem nenhuma chamada registrada. */
  percentual: number | null;
}

export interface DashboardDTO {
  totalAlunos: number;
  totalTurmas: number;
  chamadasUltimos30Dias: number;
  frequenciaMedia: number | null;
  alunosEmRisco: { id: number; nome: string; turma: string | null; percentual: number }[];
  ultimasChamadas: ChamadaResumoDTO[];
  avisosRecentes: AvisoDTO[];
}
