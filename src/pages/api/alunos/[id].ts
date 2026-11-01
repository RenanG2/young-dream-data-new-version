import { authHandler, parseId, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { alunoUpdateSchema } from '@/lib/schemas';
import { alunoSelect, toAlunoDTO } from '@/lib/dto';

export default authHandler({
  GET: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const aluno = await prisma.aluno.findFirst({ where: { id, professorId: professor.id }, select: alunoSelect });
    if (!aluno) throw new HttpError(404, 'Aluno não encontrado');
    return { aluno: toAlunoDTO(aluno) };
  },

  PATCH: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const data = alunoUpdateSchema.parse(req.body);

    const atual = await prisma.aluno.findFirst({ where: { id, professorId: professor.id }, select: { id: true } });
    if (!atual) throw new HttpError(404, 'Aluno não encontrado');

    if (data.turmaId !== undefined) {
      const turma = await prisma.turma.findFirst({
        where: { id: data.turmaId, professorId: professor.id },
        select: { id: true },
      });
      if (!turma) throw new HttpError(404, 'Turma não encontrada');
    }

    const aluno = await prisma.aluno.update({ where: { id }, data, select: alunoSelect });
    return { aluno: toAlunoDTO(aluno) };
  },

  // Exclui o aluno, a biometria e o histórico de presenças (cascade). Só o professor dono pode excluir.
  DELETE: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const { count } = await prisma.aluno.deleteMany({ where: { id, professorId: professor.id } });
    if (count === 0) throw new HttpError(404, 'Aluno não encontrado');
    return { message: 'Aluno deletado com sucesso' };
  },
});
