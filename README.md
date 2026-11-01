# Young Dream Data 4.0

Ambiente virtual de aprendizagem (AVA) com **chamada por reconhecimento facial**.
Stack: Next.js 14 (Pages Router) · TypeScript · Prisma + PostgreSQL · Tailwind/shadcn · face-api.js.

## Rodando localmente

```bash
cp .env.example .env          # preencha JWT_SECRET (openssl rand -hex 32) e a senha do banco
docker compose up -d          # PostgreSQL local (uma base SEPARADA da produção)
npm install                   # também roda `prisma generate`
npm run db:migrate            # aplica as migrações no banco local
npm run dev                   # http://localhost:3000
```

A câmera só funciona em `https://` ou `http://localhost`.

Scripts úteis: `npm run typecheck`, `npm run lint`, `npm run db:studio`, `npm run db:deploy` (produção).

## Funcionalidades

| Área | O que faz |
|---|---|
| **Autenticação** | Cadastro/login de professores; sessão em cookie `HttpOnly`; limite de tentativas de login |
| **Turmas** | CRUD; relatório de frequência por aluno; exportação CSV (compatível com Excel) |
| **Alunos** | CRUD paginado com busca e filtro por turma; biometria facial capturada com média de 3 amostras; consentimento LGPD obrigatório |
| **Chamada** | Reconhecimento contínuo de vários rostos ao mesmo tempo; marcação manual; falta justificada; **salva no banco** |
| **Histórico** | Lista de chamadas, correção posterior (ex.: justificar falta) e exclusão |
| **Avisos** | Mural por turma ou geral, com fixação no topo |
| **Painel** | Totais, frequência média (30 dias), alunos com frequência < 75%, últimas chamadas e avisos |

## Estrutura

```
prisma/                 schema + migrações
src/lib/                auth, api (handler padrão), schemas (zod), face, http, dto
src/pages/api/          rotas REST (todas privadas, exceto login/register)
src/pages/              telas (dashboard, alunos, turmas, chamadas, avisos)
src/components/         AppShell, AlunoModal, formulários, ui/ (shadcn)
src/hooks/              useApi, useCamera, useFaceApi, useDebounced
```

## Segurança (resumo do que mudou)

- Segredo do JWT agora vem de `JWT_SECRET` (antes estava escrito no código).
- Token em cookie `HttpOnly` + `SameSite=Lax` (antes ficava no `localStorage`, legível por XSS).
- Todas as rotas exigem sessão e filtram pelo professor logado; ninguém acessa alunos de outro professor.
- O `professorId` vem do token, não do corpo da requisição.
- Listas de alunos **não** retornam biometria; os descritores só são servidos para a turma escolhida na chamada.
- `register` não devolve mais o hash da senha; erros 500 não vazam mensagens internas.
- Entradas validadas com zod; checagem de `Origin` em requisições que alteram dados.

## Pontos de atenção para produção

- **Rate limit em memória**: vale por instância. Em serverless/múltiplas instâncias use Upstash/Redis.
- **Cadastro aberto**: qualquer pessoa pode criar conta de professor. Considere convite/aprovação e verificação de e-mail.
- **LGPD**: biometria facial de menores é dado pessoal sensível. Mantenha o termo de consentimento do responsável arquivado e defina política de retenção/exclusão.
- Dependências sem uso que podem ser removidas: `framer-motion`, `react-icons`, `react-element-to-jsx-string`, `@radix-ui/react-icons`, `ts-node`
  (`npm uninstall ...`). Mova `@types/jsonwebtoken` para `devDependencies`.

## Roadmap sugerido

1. Disciplinas, atividades e notas (boletim por aluno/disciplina)
2. Portal do aluno e do responsável (login próprio, ver notas, frequência e avisos)
3. Materiais de aula (arquivos/links) e entrega de atividades
4. Calendário escolar e provas
5. Mensagens internas e notificações por e-mail
6. Perfis (coordenação/administrador) e vários professores por turma
7. Relatórios em PDF e testes automatizados
