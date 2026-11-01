import { authHandler, created, firstQuery, parseIntQuery, HttpError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { alunoCreateSchema } from '@/lib/schemas';
import { FACE_MATCH_THRESHOLD, findClosest, parseDescriptor, type FaceCandidate } from '@/lib/face';
import { alunoSelect, toAlunoDTO } from '@/lib/dto';
import type { Prisma } from '@prisma/client';

export default authHandler({
  // Lista paginada, sempre restrita aos alunos do professor logado e SEM dados biométricos.
  GET: async ({ req, professor }) => {
    const page = parseIntQuery(req.query.page, 1, { min: 1, max: 100000 });
    const pageSize = parseIntQuery(req.query.pageSize, 20, { min: 1, max: 100 });
    const q = firstQuery(req.query.q);
    const turmaIdRaw = firstQuery(req.query.turmaId);

    const where: Prisma.AlunoWhereInput = { professorId: professor.id };
    if (q) where.nome = { contains: q, mode: 'insensitive' };
    if (turmaIdRaw && Number.isInteger(Number(turmaIdRaw))) where.turmaId = Number(turmaIdRaw);

    const [total, alunos] = await Promise.all([
      prisma.aluno.count({ where }),
      prisma.aluno.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: alunoSelect,
      }),
    ]);

    return { alunos: alunos.map(toAlunoDTO), total, page, pageSize };
  },

  POST: async ({ req, professor }) => {
    const data = alunoCreateSchema.parse(req.body);

    // A turma precisa ser do professor logado (antes o professorId vinha do corpo da requisição).
    const turma = await prisma.turma.findFirst({
      where: { id: data.turmaId, professorId: professor.id },
      select: { id: true },
    });
    if (!turma) throw new HttpError(404, 'Turma não encontrada');

    // Impede cadastrar o mesmo rosto duas vezes (compara só com os alunos deste professor).
    const existentes = await prisma.aluno.findMany({
      where: { professorId: professor.id, faceData: { not: null } },
      select: { id: true, nome: true, faceData: true },
    });
    const candidatos: FaceCandidate[] = [];
    for (const e of existentes) {
      const descriptor = parseDescriptor(e.faceData);
      if (descriptor) candidatos.push({ id: e.id, nome: e.nome, descriptor });
    }
    const closest = findClosest(data.descriptor, candidatos);
    if (closest && closest.distance < FACE_MATCH_THRESHOLD) {
      throw new HttpError(409, `Biometria facial similar já cadastrada (aluno: ${closest.candidate.nome})`, {
        code: 'FACE_DUPLICATE',
      });
    }

    const aluno = await prisma.aluno.create({
      data: {
        nome: data.nome,
        idade: data.idade,
        turmaId: turma.id,
        professorId: professor.id,
        faceData: JSON.stringify(data.descriptor),
        consentimentoBiometriaEm: new Date(),
      },
      select: alunoSelect,
    });

    return created({ message: 'Aluno cadastrado com sucesso!', aluno: toAlunoDTO(aluno) });
  },
});
