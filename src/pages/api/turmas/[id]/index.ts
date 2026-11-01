import { authHandler, parseId, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { turmaSchema } from '@/lib/schemas';

export default authHandler({
  PATCH: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const data = turmaSchema.parse(req.body);

    const turma = await prisma.turma.findFirst({ where: { id, professorId: professor.id }, select: { id: true } });
    if (!turma) throw new HttpError(404, 'Turma não encontrada');

    const conflict = await prisma.turma.findFirst({
      where: { professorId: professor.id, codigo: data.codigo, NOT: { id } },
      select: { id: true },
    });
    if (conflict) throw new HttpError(409, 'Já existe uma turma com esse código');

    const updated = await prisma.turma.update({
      where: { id },
      data,
      select: { id: true, codigo: true, descricao: true },
    });
    return { turma: updated };
  },

  DELETE: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const turma = await prisma.turma.findFirst({
      where: { id, professorId: professor.id },
      select: { _count: { select: { alunos: true, chamadas: true } } },
    });
    if (!turma) throw new HttpError(404, 'Turma não encontrada');
    if (turma._count.alunos > 0 || turma._count.chamadas > 0) {
      throw new HttpError(
        409,
        'Não é possível excluir: a turma tem alunos ou chamadas registradas. Mova os alunos para outra turma primeiro.'
      );
    }
    await prisma.turma.delete({ where: { id } });
    return { message: 'Turma excluída' };
  },
});
