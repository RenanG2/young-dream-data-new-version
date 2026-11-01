import { authHandler, parseId, firstQuery, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { FrequenciaAlunoDTO } from '@/types';

function csvCell(value: string | number | null): string {
  let s = value === null ? '' : String(value);
  // Evita "CSV injection": células que começam com = + - @ seriam executadas como fórmula no Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default authHandler({
  GET: async ({ req, res, professor }) => {
    const turmaId = parseId(req.query.id);
    const turma = await prisma.turma.findFirst({
      where: { id: turmaId, professorId: professor.id },
      select: { id: true, codigo: true },
    });
    if (!turma) throw new HttpError(404, 'Turma não encontrada');

    const [alunos, grouped, totalChamadas] = await Promise.all([
      prisma.aluno.findMany({
        where: { turmaId, professorId: professor.id },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
      }),
      prisma.presenca.groupBy({
        by: ['alunoId', 'status'],
        where: { chamada: { turmaId, professorId: professor.id } },
        _count: { _all: true },
      }),
      prisma.chamada.count({ where: { turmaId, professorId: professor.id } }),
    ]);

    const counts = new Map<number, { PRESENTE: number; FALTA: number; JUSTIFICADA: number }>();
    for (const g of grouped) {
      const c = counts.get(g.alunoId) ?? { PRESENTE: 0, FALTA: 0, JUSTIFICADA: 0 };
      c[g.status] = g._count._all;
      counts.set(g.alunoId, c);
    }

    // O denominador é por aluno: quem entrou na turma depois não é penalizado por chamadas anteriores.
    const frequencia: FrequenciaAlunoDTO[] = alunos.map((a) => {
      const c = counts.get(a.id) ?? { PRESENTE: 0, FALTA: 0, JUSTIFICADA: 0 };
      const registradas = c.PRESENTE + c.FALTA + c.JUSTIFICADA;
      return {
        alunoId: a.id,
        nome: a.nome,
        presentes: c.PRESENTE,
        justificadas: c.JUSTIFICADA,
        faltas: c.FALTA,
        registradas,
        percentual: registradas ? Math.round((c.PRESENTE / registradas) * 1000) / 10 : null,
      };
    });

    if (firstQuery(req.query.formato) === 'csv') {
      const header = ['Aluno', 'Presenças', 'Faltas justificadas', 'Faltas', 'Aulas registradas', 'Frequência (%)'];
      const lines = [header.map(csvCell).join(';')];
      for (const f of frequencia) {
        lines.push(
          [
            f.nome,
            f.presentes,
            f.justificadas,
            f.faltas,
            f.registradas,
            f.percentual === null ? '' : f.percentual.toFixed(1).replace('.', ','),
          ]
            .map(csvCell)
            .join(';')
        );
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="frequencia-${turma.codigo.replace(/[^\w-]/g, '_')}.csv"`);
      // BOM para o Excel reconhecer UTF-8 (acentos)
      res.status(200).send('\uFEFF' + lines.join('\r\n'));
      return;
    }

    return { turma, totalChamadas, frequencia };
  },
});
