-- Migração não destrutiva: cria Turma/Chamada/Presenca/Aviso e converte o texto
-- livre Aluno.turma em registros de Turma (backfill). A coluna "turma" é mantida (agora opcional).

-- CreateEnum
CREATE TYPE "StatusPresenca" AS ENUM ('PRESENTE', 'FALTA', 'JUSTIFICADA');
CREATE TYPE "MetodoPresenca" AS ENUM ('FACIAL', 'MANUAL');

-- AlterTable Professor
ALTER TABLE "Professor" ADD COLUMN "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable Turma
CREATE TABLE "Turma" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "professorId" INTEGER NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Turma_professorId_codigo_key" ON "Turma"("professorId", "codigo");
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: uma Turma para cada (professor, código) já existente em Aluno.turma
INSERT INTO "Turma" ("codigo", "professorId")
SELECT DISTINCT UPPER(TRIM("turma")), "professorId"
FROM "Aluno"
WHERE "turma" IS NOT NULL AND TRIM("turma") <> '';

-- AlterTable Aluno
ALTER TABLE "Aluno"
  ADD COLUMN "turmaId" INTEGER,
  ADD COLUMN "consentimentoBiometriaEm" TIMESTAMP(3),
  ADD COLUMN "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "turma" DROP NOT NULL;

UPDATE "Aluno" a
SET "turmaId" = t."id"
FROM "Turma" t
WHERE t."professorId" = a."professorId"
  AND t."codigo" = UPPER(TRIM(a."turma"));

ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Aluno_professorId_turmaId_idx" ON "Aluno"("professorId", "turmaId");

-- CreateTable Chamada
CREATE TABLE "Chamada" (
    "id" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "aula" INTEGER NOT NULL DEFAULT 1,
    "turmaId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chamada_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Chamada_turmaId_data_aula_key" ON "Chamada"("turmaId", "data", "aula");
CREATE INDEX "Chamada_professorId_data_idx" ON "Chamada"("professorId", "data");
ALTER TABLE "Chamada" ADD CONSTRAINT "Chamada_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Chamada" ADD CONSTRAINT "Chamada_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Presenca
CREATE TABLE "Presenca" (
    "id" SERIAL NOT NULL,
    "chamadaId" INTEGER NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "status" "StatusPresenca" NOT NULL DEFAULT 'PRESENTE',
    "metodo" "MetodoPresenca" NOT NULL DEFAULT 'FACIAL',
    "registradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Presenca_chamadaId_alunoId_key" ON "Presenca"("chamadaId", "alunoId");
CREATE INDEX "Presenca_alunoId_idx" ON "Presenca"("alunoId");
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_chamadaId_fkey" FOREIGN KEY ("chamadaId") REFERENCES "Chamada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Aviso
CREATE TABLE "Aviso" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "professorId" INTEGER NOT NULL,
    "turmaId" INTEGER,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Aviso_professorId_criadoEm_idx" ON "Aviso"("professorId", "criadoEm");
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
