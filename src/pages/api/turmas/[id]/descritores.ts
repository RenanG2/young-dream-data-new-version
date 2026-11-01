import { authHandler, parseId, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { parseDescriptor } from '@/lib/face';
import type { DescritorAlunoDTO } from '@/types';

// Alimenta a tela de chamada: nomes + descritores faciais dos alunos de UMA turma do professor logado.
// Diferente da versão antiga (que enviava a biometria de todos os alunos do sistema para qualquer visitante).
export default authHandler({
  GET: async ({ req, res, professor }) => {
    const turmaId = parseId(req.query.id);
    const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: professor.id }, select: { id: true } });
    if (!turma) throw new HttpError(404, 'Turma não encontrada');

    const alunos = await prisma.aluno.findMany({
      where: { turmaId, professorId: professor.id },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, faceData: true },
    });

    res.setHeader('Cache-Control', 'no-store');
    const result: DescritorAlunoDTO[] = [];
    const semBiometria: { id: number; nome: string }[] = [];
    for (const a of alunos) {
      const descriptor = parseDescriptor(a.faceData);
      if (descriptor) result.push({ id: a.id, nome: a.nome, descriptor });
      else semBiometria.push({ id: a.id, nome: a.nome });
    }
    return { alunos: result, semBiometria };
  },
});
