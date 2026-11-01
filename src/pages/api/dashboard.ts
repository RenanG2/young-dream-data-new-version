import { authHandler } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { avisoSelect, toAvisoDTO } from '@/lib/dto';
import type { ChamadaResumoDTO, DashboardDTO } from '@/types';

const LIMITE_FREQUENCIA = 75; // % mínimo (referência da LDB); abaixo disso o aluno entra em "atenção"
const MIN_REGISTROS = 3; // evita alertar com poucas chamadas

export default authHandler({
  GET: async ({ professor }) => {
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - 30);
    desde.setUTCHours(0, 0, 0, 0);

    const [totalAlunos, totalTurmas, chamadasUltimos30Dias, grouped, ultimas, avisos] = await Promise.all([
      prisma.aluno.count({ where: { professorId: professor.id } }),
      prisma.turma.count({ where: { professorId: professor.id } }),
      prisma.chamada.count({ where: { professorId: professor.id, data: { gte: desde } } }),
      prisma.presenca.groupBy({
        by: ['alunoId', 'status'],
        where: { chamada: { professorId: professor.id, data: { gte: desde } } },
        _count: { _all: true },
      }),
      prisma.chamada.findMany({
        where: { professorId: professor.id },
        orderBy: [{ data: 'desc' }, { aula: 'desc' }],
        take: 5,
        select: {
          id: true,
          data: true,
          aula: true,
          turma: { select: { id: true, codigo: true } },
          presencas: { select: { status: true } },
        },
      }),
      prisma.aviso.findMany({
        where: { professorId: professor.id },
        orderBy: [{ fixado: 'desc' }, { criadoEm: 'desc' }],
        take: 3,
        select: avisoSelect,
      }),
    ]);

    // Frequência dos últimos 30 dias, por aluno e geral
    const porAluno = new Map<number, { presentes: number; total: number }>();
    let presentesGeral = 0;
    let totalGeral = 0;
    for (const g of grouped) {
      const acc = porAluno.get(g.alunoId) ?? { presentes: 0, total: 0 };
      acc.total += g._count._all;
      if (g.status === 'PRESENTE') acc.presentes += g._count._all;
      porAluno.set(g.alunoId, acc);
      totalGeral += g._count._all;
      if (g.status === 'PRESENTE') presentesGeral += g._count._all;
    }

    const emRisco: { id: number; percentual: number }[] = [];
    porAluno.forEach((v, id) => {
      if (v.total >= MIN_REGISTROS) {
        const percentual = Math.round((v.presentes / v.total) * 1000) / 10;
        if (percentual < LIMITE_FREQUENCIA) emRisco.push({ id, percentual });
      }
    });
    emRisco.sort((a, b) => a.percentual - b.percentual);
    const top = emRisco.slice(0, 5);

    const nomes = top.length
      ? await prisma.aluno.findMany({
          where: { id: { in: top.map((t) => t.id) }, professorId: professor.id },
          select: { id: true, nome: true, turma: { select: { codigo: true } } },
        })
      : [];
    const nomePorId = new Map(nomes.map((n) => [n.id, n]));

    const ultimasChamadas: ChamadaResumoDTO[] = ultimas.map((c) => {
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

    const dto: DashboardDTO = {
      totalAlunos,
      totalTurmas,
      chamadasUltimos30Dias,
      frequenciaMedia: totalGeral ? Math.round((presentesGeral / totalGeral) * 1000) / 10 : null,
      alunosEmRisco: top.flatMap((t) => {
        const n = nomePorId.get(t.id);
        return n ? [{ id: t.id, nome: n.nome, turma: n.turma?.codigo ?? null, percentual: t.percentual }] : [];
      }),
      ultimasChamadas,
      avisosRecentes: avisos.map(toAvisoDTO),
    };
    return dto;
  },
});
