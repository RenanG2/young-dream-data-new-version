# Young Dream Data 4.0

## Manual de uso do software

O **Young Dream Data 4.0** é um sistema web de apoio à gestão da rotina escolar. Ele permite que professores organizem turmas e alunos, realizem chamadas, acompanhem registros de frequência e publiquem avisos. A presença pode ser registrada manualmente ou com auxílio do reconhecimento facial, quando essa funcionalidade estiver configurada e houver consentimento para o tratamento dos dados biométricos.

Este documento apresenta orientações para instalar, acessar e utilizar as funcionalidades disponíveis no projeto.

## 1. Requisitos para executar o sistema

Antes de iniciar, tenha instalado ou disponível:

- Node.js e npm;
- Git, caso vá clonar o repositório;
- acesso a um banco de dados PostgreSQL;
- um navegador atualizado;
- câmera conectada e permissão do navegador, caso utilize o reconhecimento facial.

O projeto utiliza Next.js, React, TypeScript, Prisma ORM e PostgreSQL. As versões exatas das dependências estão descritas no arquivo `package.json`.

## 2. Instalação e configuração

### 2.1. Obter o código-fonte

Clone o repositório e entre na pasta do projeto:

```bash
git clone https://github.com/RenanG2/young-dream-data-new-version.git
cd young-dream-data-new-version
```

Também é possível baixar o ZIP do repositório e extrair os arquivos.

### 2.2. Instalar as dependências

Na pasta que contém o arquivo `package.json`, execute:

```bash
npm install
```

No PowerShell do Windows, caso a política de execução bloqueie o comando `npm`, utilize:

```powershell
npm.cmd install
```

### 2.3. Configurar as variáveis de ambiente

Crie um arquivo chamado `.env` na raiz do projeto. Informe a URL de conexão com o PostgreSQL e uma chave secreta para a autenticação. Exemplo:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/NOME_DO_BANCO"
JWT_SECRET="INSIRA_UMA_CHAVE_ALEATORIA_COM_PELO_MENOS_32_CARACTERES"
```

Substitua os valores de exemplo pelos dados do seu ambiente. Uma chave aleatória pode ser gerada com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Importante:** não compartilhe nem envie o arquivo `.env` ao GitHub. Ele contém credenciais e segredos privados. O endereço do banco deve apontar para uma instância PostgreSQL à qual o computador tenha acesso.

### 2.4. Preparar o banco de dados

Aplique as migrações do Prisma e gere o cliente:

```bash
npx prisma migrate deploy
npx prisma generate
```

No PowerShell, se necessário:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

### 2.5. Iniciar o sistema

Execute:

```bash
npm run dev
```

No PowerShell, se necessário:

```powershell
npm.cmd run dev
```

Quando o servidor estiver iniciado, abra no navegador:

[http://localhost:3000](http://localhost:3000)

Para encerrar o servidor, volte ao terminal e pressione `Ctrl + C`.

## 3. Criar uma conta de professor

1. Acesse o endereço do sistema no navegador.
2. Na página inicial, selecione a opção de cadastro.
3. Preencha os campos solicitados: nome, e-mail, senha e instituição.
4. Confira as informações e envie o formulário.
5. Após a criação da conta, acesse a tela de login e entre com o e-mail e a senha cadastrados, caso o sistema não faça o redirecionamento automaticamente.

Utilize um endereço de e-mail válido e mantenha sua senha em segurança. Cada professor deve utilizar sua própria conta.

## 4. Entrar e sair do sistema

### Entrar

1. Abra a página de login.
2. Informe o e-mail e a senha cadastrados.
3. Selecione a opção para entrar.
4. Com a autenticação realizada, o sistema disponibilizará as áreas internas.

### Sair

Utilize a opção **Sair** disponível na navegação do sistema para encerrar a sessão. Em computadores compartilhados, sempre encerre sua sessão ao terminar o uso.

## 5. Painel principal

Após entrar, o professor pode acessar o painel principal. Ele apresenta informações resumidas da utilização do sistema, de acordo com os dados cadastrados, como informações de alunos, turmas, chamadas e frequência.

Para que os indicadores e consultas apresentem informações, primeiro cadastre as turmas e os alunos e, em seguida, realize as chamadas.

## 6. Gerenciar turmas

1. No menu de navegação, abra **Turmas**.
2. Utilize a opção de adicionar ou criar uma turma.
3. Informe o código da turma e, se disponível no formulário, sua descrição.
4. Salve o cadastro.
5. Consulte a listagem para localizar as turmas cadastradas.
6. Utilize as ações apresentadas na tela para visualizar, editar ou excluir uma turma, quando necessário.

O código da turma deve ser único entre as turmas do mesmo professor. Uma turma pode ser associada a vários alunos e receber chamadas e avisos.

## 7. Gerenciar alunos

1. Abra a área **Alunos** no menu.
2. Selecione a opção para adicionar um aluno.
3. Preencha os dados solicitados, como nome e idade.
4. Selecione a turma à qual o aluno pertence, quando aplicável.
5. Caso utilize o reconhecimento facial, siga as orientações apresentadas na tela para realizar a captura dos dados faciais.
6. Salve o cadastro.
7. Para localizar um aluno, utilize a listagem e os recursos de busca ou filtro disponíveis.
8. Para atualizar informações, utilize a ação de edição correspondente. A exclusão deve ser utilizada somente quando necessária.

O vínculo do aluno com uma turma é opcional no cadastro do banco de dados. Os dados faciais são dados biométricos e exigem cuidado especial: obtenha a autorização aplicável antes da coleta e utilize essas informações somente para a finalidade informada.

## 8. Realizar chamadas e registrar frequência

1. Acesse **Chamadas** pelo menu.
2. Selecione a opção para iniciar uma nova chamada.
3. Escolha a turma, a data e o número da aula, conforme solicitado.
4. Para utilizar o reconhecimento facial, permita o acesso à câmera quando o navegador solicitar e siga as instruções apresentadas na tela.
5. Confira os alunos identificados e os registros apresentados.
6. Quando necessário, utilize o procedimento de registro manual e selecione a situação adequada para cada aluno.
7. Revise as informações e salve/conclua a chamada.

Os status de frequência previstos no sistema são:

- **Presente:** aluno presente na aula;
- **Falta:** ausência registrada;
- **Justificada:** ausência com justificativa.

O método do registro pode ser facial ou manual. Verifique os dados antes de concluir a chamada.

### 8.1. Requisitos para utilizar a câmera

O navegador precisa ter permissão para acessar a câmera. Durante o desenvolvimento, o endereço `localhost` normalmente permite o uso da câmera. Em um ambiente publicado, a aplicação deve utilizar HTTPS. Se a câmera não iniciar, confira as permissões do navegador, a conexão do dispositivo e se outro programa está utilizando a câmera.

## 9. Consultar chamadas e frequência

1. Acesse a área **Chamadas** para consultar os registros disponíveis.
2. Localize a chamada desejada na listagem.
3. Abra os detalhes para conferir os registros associados.
4. Para consultar a frequência de uma turma, acesse **Turmas**, selecione a turma e utilize a opção de frequência apresentada na página.
5. Confira os resultados por aluno e período, conforme os filtros disponíveis na interface.

Se for necessário corrigir um registro, utilize as ações de edição disponíveis na tela correspondente e confirme a alteração antes de sair.

## 10. Gerenciar avisos

1. Abra a área **Avisos** no menu.
2. Selecione a opção para criar um aviso.
3. Informe o título e o conteúdo do comunicado.
4. Selecione uma turma para direcionar o aviso, quando essa opção estiver disponível. Um aviso sem turma associada é geral.
5. Se desejar, marque a opção para fixar o aviso.
6. Salve o comunicado.
7. Consulte a listagem para visualizar os avisos publicados e utilize as ações disponíveis para editar ou excluir um aviso.

Revise o conteúdo e o público do comunicado antes de publicá-lo.

## 11. Boas práticas e privacidade

- Não compartilhe sua senha ou o arquivo `.env`.
- Utilize contas individuais de professor.
- Mantenha os dados dos alunos protegidos e restrinja o acesso a pessoas autorizadas.
- Antes de coletar dados faciais, obtenha o consentimento/autorização aplicável e informe claramente a finalidade do uso.
- Não utilize os dados biométricos para finalidades diferentes daquelas comunicadas aos responsáveis.
- Confira os registros de frequência antes de finalizar uma chamada.
- Em computadores compartilhados, encerre a sessão após o uso.

## 12. Solução de problemas

| Problema | O que verificar |
|---|---|
| O projeto não inicia | Confira se o Node.js está instalado, se as dependências foram instaladas e se o terminal está na pasta correta do projeto. |
| `npm` é bloqueado no PowerShell | Tente executar os comandos usando `npm.cmd` e `npx.cmd`. |
| Erro de conexão com o banco | Confira a variável `DATABASE_URL`, a disponibilidade do PostgreSQL, usuário, senha, endereço, porta e permissões de rede. |
| Erro relacionado ao Prisma | Execute `npx prisma generate` e confirme se as migrações foram aplicadas com `npx prisma migrate deploy`. |
| Cadastro ou login retorna erro | Confira as variáveis `DATABASE_URL` e `JWT_SECRET` e leia a mensagem detalhada exibida no terminal do servidor. |
| Câmera não funciona | Confira a permissão de câmera do navegador, a conexão do dispositivo e o uso de HTTPS ou `localhost`. |
| A página não abre | Confirme se o servidor está em execução e se o endereço utilizado é `http://localhost:3000`. |

## 13. Comandos úteis do projeto

| Comando | Finalidade |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento. |
| `npm run build` | Gera o Prisma Client e compila a aplicação. |
| `npm run start` | Inicia a aplicação compilada. |
| `npm run lint` | Executa a verificação de código configurada. |
| `npm run typecheck` | Verifica os tipos TypeScript. |
| `npm run db:migrate` | Executa as migrações em ambiente de desenvolvimento. |
| `npm run db:deploy` | Aplica as migrações existentes no banco configurado. |
| `npm run db:studio` | Abre o Prisma Studio para consultar os dados. |

---

**Young Dream Data 4.0**  
Manual de uso do software.
