import { authHandler, parseId, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { avisoSchema } from '@/lib/schemas';
import { avisoSelect, toAvisoDTO } from '@/lib/dto';

export default authHandler({
  PATCH: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const data = avisoSchema.parse(req.body);

    const atual = await prisma.aviso.findFirst({ where: { id, professorId: professor.id }, select: { id: true } });
    if (!atual) throw new HttpError(404, 'Aviso não encontrado');

    if (data.turmaId) {
      const turma = await prisma.turma.findFirst({
        where: { id: data.turmaId, professorId: professor.id },
        select: { id: true },
      });
      if (!turma) throw new HttpError(404, 'Turma não encontrada');
    }

    const aviso = await prisma.aviso.update({
      where: { id },
      data: { titulo: data.titulo, corpo: data.corpo, fixado: data.fixado, turmaId: data.turmaId ?? null },
      select: avisoSelect,
    });
    return { aviso: toAvisoDTO(aviso) };
  },

  DELETE: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const { count } = await prisma.aviso.deleteMany({ where: { id, professorId: professor.id } });
    if (count === 0) throw new HttpError(404, 'Aviso não encontrado');
    return { message: 'Aviso excluído' };
  },
});
