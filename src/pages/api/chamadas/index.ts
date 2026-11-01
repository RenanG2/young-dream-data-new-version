import { authHandler, created, parseIntQuery, firstQuery, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { chamadaSchema } from '@/lib/schemas';
import type { Prisma } from '@prisma/client';
import type { ChamadaResumoDTO } from '@/types';

export default authHandler({
  GET: async ({ req, professor }) => {
    const page = parseIntQuery(req.query.page, 1, { min: 1, max: 100000 });
    const pageSize = parseIntQuery(req.query.pageSize, 15, { min: 1, max: 50 });
    const turmaIdRaw = firstQuery(req.query.turmaId);

    const where: Prisma.ChamadaWhereInput = { professorId: professor.id };
    if (turmaIdRaw && Number.isInteger(Number(turmaIdRaw))) where.turmaId = Number(turmaIdRaw);

    const [total, chamadas] = await Promise.all([
      prisma.chamada.count({ where }),
      prisma.chamada.findMany({
        where,
        orderBy: [{ data: 'desc' }, { aula: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          data: true,
          aula: true,
          turma: { select: { id: true, codigo: true } },
          presencas: { select: { status: true } },
        },
      }),
    ]);

    const dto: ChamadaResumoDTO[] = chamadas.map((c) => {
      const presentes = c.presencas.filter((p) => p.status === 'PRESENTE').length;
      const justificadas = c.presencas.filter((p) => p.status === 'JUSTIFICADA').length;
      return {
        id: c.id,
        data: c.data.toISOString(),
        aula: c.aula,
        turma: c.turma,
        presentes,
        justificadas,
        faltas: c.presencas.length - presentes - justificadas,
        total: c.presencas.length,
      };
    });

    return { chamadas: dto, total, page, pageSize };
  },

  // Salva (ou refaz) a chamada do dia. Todo aluno da turma recebe um registro: quem não foi marcado fica com FALTA.
  POST: async ({ req, professor }) => {
    const input = chamadaSchema.parse(req.body);

    const data = new Date(`${input.data}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime())) throw new HttpError(400, 'Data inválida');
    const limite = new Date(Date.now() + 36 * 60 * 60 * 1000); // folga para fusos
    if (data > limite) throw new HttpError(400, 'Não é possível registrar chamada em data futura');

    const turma = await prisma.turma.findFirst({
      where: { id: input.turmaId, professorId: professor.id },
      select: { id: true, alunos: { select: { id: true } } },
    });
    if (!turma) throw new HttpError(404, 'Turma não encontrada');
    if (turma.alunos.length === 0) throw new HttpError(400, 'A turma não tem alunos');

    const alunoIds = new Set(turma.alunos.map((a) => a.id));
    for (const p of input.presencas) {
      if (!alunoIds.has(p.alunoId)) throw new HttpError(400, 'Há aluno que não pertence a esta turma');
    }

    const marcados = new Map(input.presencas.map((p) => [p.alunoId, p]));
    const rows = turma.alunos.map((a) => {
      const p = marcados.get(a.id);
      return { alunoId: a.id, status: p?.status ?? ('FALTA' as const), metodo: p?.metodo ?? ('MANUAL' as const) };
    });

    const chamada = await prisma.$transaction(async (tx) => {
      const c = await tx.chamada.upsert({
        where: { turmaId_data_aula: { turmaId: turma.id, data, aula: input.aula } },
        create: { turmaId: turma.id, professorId: professor.id, data, aula: input.aula },
        update: {},
        select: { id: true },
      });
      await tx.presenca.deleteMany({ where: { chamadaId: c.id } });
      await tx.presenca.createMany({ data: rows.map((r) => ({ ...r, chamadaId: c.id })) });
      return c;
    });

    const presentes = rows.filter((r) => r.status === 'PRESENTE').length;
    return created({
      message: `Chamada salva: ${presentes} de ${rows.length} presentes.`,
      id: chamada.id,
    });
  },
});
