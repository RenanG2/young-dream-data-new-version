import { z } from 'zod';
import { FACE_DESCRIPTOR_SIZE } from './face';

const nome = z.string().trim().min(2, 'Informe o nome').max(100, 'Nome muito longo (máx. 100)');
const id = z.number().int().positive();

export const registerSchema = z.object({
  nome,
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
  // bcrypt só considera os 72 primeiros bytes da senha
  senha: z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(72, 'Senha muito longa (máx. 72)'),
  instituicao: z.string().trim().min(2, 'Informe a instituição').max(120),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha').max(72),
});

export const turmaSchema = z.object({
  codigo: z.string().trim().toUpperCase().min(1, 'Informe o código da turma').max(20, 'Código muito longo (máx. 20)'),
  descricao: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

const descriptor = z.array(z.number().finite()).length(FACE_DESCRIPTOR_SIZE, 'Descritor facial inválido');

export const alunoCreateSchema = z.object({
  nome,
  idade: z.number().int().min(3, 'Idade mínima: 3').max(25, 'Idade máxima: 25'),
  turmaId: id,
  descriptor,
  consentimento: z.literal(true, {
    errorMap: () => ({ message: 'É necessário o consentimento do responsável para usar a biometria facial' }),
  }),
});

export const alunoUpdateSchema = z
  .object({
    nome,
    idade: z.number().int().min(3).max(25),
    turmaId: id,
  })
  .partial();

export const chamadaSchema = z.object({
  turmaId: id,
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  aula: z.number().int().min(1).max(20).default(1),
  presencas: z
    .array(
      z.object({
        alunoId: id,
        status: z.enum(['PRESENTE', 'FALTA', 'JUSTIFICADA']),
        metodo: z.enum(['FACIAL', 'MANUAL']),
      })
    )
    .max(1000),
});

export const chamadaPatchSchema = z.object({
  presencas: z
    .array(z.object({ alunoId: id, status: z.enum(['PRESENTE', 'FALTA', 'JUSTIFICADA']) }))
    .min(1)
    .max(1000),
});

export const avisoSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título').max(120, 'Título muito longo (máx. 120)'),
  corpo: z.string().trim().min(1, 'Escreva a mensagem').max(5000, 'Mensagem muito longa (máx. 5000)'),
  turmaId: id.nullable().optional(),
  fixado: z.boolean().default(false),
});
