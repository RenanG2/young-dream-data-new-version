import { authHandler, created, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { turmaSchema } from '@/lib/schemas';
import type { TurmaDTO } from '@/types';

export default authHandler({
  GET: async ({ professor }) => {
    const turmas = await prisma.turma.findMany({
      where: { professorId: professor.id },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true, descricao: true, _count: { select: { alunos: true } } },
    });
    const dto: TurmaDTO[] = turmas.map((t) => ({
      id: t.id,
      codigo: t.codigo,
      descricao: t.descricao,
      totalAlunos: t._count.alunos,
    }));
    return { turmas: dto };
  },

  POST: async ({ req, professor }) => {
    const data = turmaSchema.parse(req.body);
    const exists = await prisma.turma.findUnique({
      where: { professorId_codigo: { professorId: professor.id, codigo: data.codigo } },
      select: { id: true },
    });
    if (exists) throw new HttpError(409, 'Já existe uma turma com esse código');

    const turma = await prisma.turma.create({
      data: { ...data, professorId: professor.id },
      select: { id: true, codigo: true, descricao: true },
    });
    return created({ turma });
  },
});
