import { authHandler, created, parseIntQuery, firstQuery, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { avisoSchema } from '@/lib/schemas';
import { avisoSelect, toAvisoDTO } from '@/lib/dto';
import type { Prisma } from '@prisma/client';

export default authHandler({
  GET: async ({ req, professor }) => {
    const page = parseIntQuery(req.query.page, 1, { min: 1, max: 100000 });
    const pageSize = parseIntQuery(req.query.pageSize, 20, { min: 1, max: 50 });
    const turmaIdRaw = firstQuery(req.query.turmaId);

    const where: Prisma.AvisoWhereInput = { professorId: professor.id };
    if (turmaIdRaw && Number.isInteger(Number(turmaIdRaw))) where.turmaId = Number(turmaIdRaw);

    const [total, avisos] = await Promise.all([
      prisma.aviso.count({ where }),
      prisma.aviso.findMany({
        where,
        orderBy: [{ fixado: 'desc' }, { criadoEm: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: avisoSelect,
      }),
    ]);
    return { avisos: avisos.map(toAvisoDTO), total, page, pageSize };
  },

  POST: async ({ req, professor }) => {
    const data = avisoSchema.parse(req.body);
    if (data.turmaId) {
      const turma = await prisma.turma.findFirst({
        where: { id: data.turmaId, professorId: professor.id },
        select: { id: true },
      });
      if (!turma) throw new HttpError(404, 'Turma não encontrada');
    }
    const aviso = await prisma.aviso.create({
      data: {
        titulo: data.titulo,
        corpo: data.corpo,
        fixado: data.fixado,
        turmaId: data.turmaId ?? null,
        professorId: professor.id,
      },
      select: avisoSelect,
    });
    return created({ aviso: toAvisoDTO(aviso) });
  },
});
