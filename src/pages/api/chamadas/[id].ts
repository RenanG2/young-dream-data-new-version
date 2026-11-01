import { authHandler, parseId, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { chamadaPatchSchema } from '@/lib/schemas';
import type { ChamadaDetalheDTO } from '@/types';

async function loadOwned(id: number, professorId: number) {
  const chamada = await prisma.chamada.findFirst({
    where: { id, professorId },
    select: {
      id: true,
      data: true,
      aula: true,
      turma: { select: { id: true, codigo: true } },
      presencas: {
        select: { alunoId: true, status: true, metodo: true, aluno: { select: { nome: true } } },
        orderBy: { aluno: { nome: 'asc' } },
      },
    },
  });
  if (!chamada) throw new HttpError(404, 'Chamada não encontrada');
  const dto: ChamadaDetalheDTO = {
    id: chamada.id,
    data: chamada.data.toISOString(),
    aula: chamada.aula,
    turma: chamada.turma,
    presencas: chamada.presencas.map((p) => ({
      alunoId: p.alunoId,
      nome: p.aluno.nome,
      status: p.status,
      metodo: p.metodo,
    })),
  };
  return dto;
}

export default authHandler({
  GET: async ({ req, professor }) => ({ chamada: await loadOwned(parseId(req.query.id), professor.id) }),

  // Correção posterior (ex.: justificar uma falta). Alterações manuais passam a constar como MANUAL.
  PATCH: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const { presencas } = chamadaPatchSchema.parse(req.body);
    await loadOwned(id, professor.id); // garante que a chamada é do professor

    await prisma.$transaction(
      presencas.map((p) =>
        prisma.presenca.updateMany({
          where: { chamadaId: id, alunoId: p.alunoId },
          data: { status: p.status, metodo: 'MANUAL' },
        })
      )
    );
    return { chamada: await loadOwned(id, professor.id) };
  },

  DELETE: async ({ req, professor }) => {
    const id = parseId(req.query.id);
    const { count } = await prisma.chamada.deleteMany({ where: { id, professorId: professor.id } });
    if (count === 0) throw new HttpError(404, 'Chamada não encontrada');
    return { message: 'Chamada excluída' };
  },
});
