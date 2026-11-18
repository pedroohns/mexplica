# Deploy e validação do MExplica na Vercel

A primeira validação desta implementação deve ser um **Preview de `banco-persistencia`**.
`main` só recebe as mudanças após revisão e aprovação. Este roteiro não exige trocar a
Production Branch, fazer merge, preparar novamente o banco ou instalar a CLI da Vercel.
Os resultados da conferência local estão em [AUDITORIA_PRODUCAO.md](AUDITORIA_PRODUCAO.md).

## 1. Pré-requisitos e código no GitHub

- Acesso ao repositório no GitHub, ao projeto existente na Vercel e ao banco Neon já preparado.
- Duas contas sintéticas novas para a validação: uma colaboradora e outra avaliadora.
  Preservar a conta **Teste Persistencia** e os registros anteriores do Neon.
- Node.js e dependências instalados localmente. A auditoria usou Node **24.11.1**;
  no Dashboard, conferir **Settings > Build and Deployment > Node.js Version** e usar
  **24.x** para manter a mesma versão principal. Não é preciso alterar `package.json`.
  [Versões Node na Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

No PowerShell, na pasta do projeto:

```powershell
git branch --show-current
npm.cmd test
git status --short
```

Esperado: branch `banco-persistencia` e **261 testes aprovados**, incluindo os 258 anteriores.
Se as dependências ainda não estiverem instaladas, executar `npm.cmd ci` primeiro.

O Preview do GitHub usa somente arquivos que já foram commitados e enviados à branch remota.
As alterações desta auditoria ficam locais para revisão; o responsável deve revisar o diff,
fazer o commit e enviar **essa branch** quando decidir publicá-las. Um redeploy do commit
antigo não inclui arquivos locais. Não enviar `.env`, tokens, senhas ou capturas com segredos.

## 2. Conferir o projeto existente

1. Entrar no Dashboard da Vercel e abrir o projeto MExplica ligado ao repositório correto.
2. Em **Settings > Git**, conferir a conexão GitHub. Manter a Production Branch existente
   (esperada: `main`); não selecionar `banco-persistencia` como produção.
3. Em **Settings > Build and Deployment**, conferir Root Directory na raiz do repositório.
   Preservar o fluxo existente de `api/index.js` e `vercel.json`. Para configurar esse fluxo
   com preset **Other**, deixar Build Command vazio e Output Directory no padrão `public`;
   a Function em `api/` continua separada dos estáticos. A instalação pode usar o padrão npm
   com o lockfile, ou `npm ci` se já configurado. Não usar `npm start` como Build Command.
   [Configuração de build](https://vercel.com/docs/builds/configure-a-build).
4. Conferir que nenhum comando do Dashboard, de instalação ou de build contém
   `db:schema`, `db:migrate` ou `db:seed`. O banco já está preparado.
5. Não mover views, não substituir o rewrite e não alterar região ou `maxDuration`
   preventivamente. Se o build indicar outro entrypoint ou ignorar as opções de
   `api/index.js`, registrar a mensagem e revisar o preset antes de modificar o código.

Se não houver projeto conectado, importar o repositório pelo GitHub em **Add New > Project**,
conferir os itens acima e manter `main` como Production Branch. A importação inicial pode
disparar um deploy da branch padrão; isso não valida `banco-persistencia`. Para esta etapa,
criar depois o Preview explicitamente como descrito na seção 4.

## 3. Configurar as variáveis manualmente

Abrir **Settings > Environment Variables > Add Environment Variable**.

| Nome | Valor a cadastrar privadamente | Escopo desta validação |
| --- | --- | --- |
| `DATABASE_URL` | URL **pooled** do banco Neon existente, com as opções SSL fornecidas pelo Neon | Preview; selecionar `banco-persistencia` quando houver filtro por branch |
| `JWT_SECRET` | Chave aleatória própria da hospedagem | Preview; mesmo filtro da branch |
| `NODE_ENV` | `production` | Preview; mesmo filtro da branch |

A aplicação exige as duas primeiras variáveis; `NODE_ENV=production` explicita o modo
do Express e ativa cookie Secure também no Preview HTTPS. **Preview não é `NODE_ENV=test`**:
`test` selecionaria os MemoryRepositories. Não substituir essa variável por `VERCEL_ENV`.
Não cadastrar `SESSION_SECRET`. Não é necessário configurar `PORT` na Function.

Copiar a URL pooled somente do painel privado do Neon para a Vercel. O endpoint pooled usa
`-pooler` no hostname; não montar uma conexão manualmente nem retirar suas opções SSL.
O código não escolhe nem verifica qual banco é apontado pela variável. Preview **não isola
os dados automaticamente**: se a URL apontar para o banco usado por produção, os testes
também escrevem nele. Usar somente os registros sintéticos deste roteiro.
[Pooling do Neon](https://neon.com/docs/connect/connection-pooling).

Para gerar uma chave localmente sem imprimi-la no terminal, no PowerShell:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | Set-Clipboard
```

Colar diretamente no campo privado de `JWT_SECRET` e depois limpar o clipboard com
`Set-Clipboard -Value ''`. Não enviar o valor ao Codex, a grupos, documentação ou GitHub.
O segredo da hospedagem pode ser diferente do local. Manter a mesma chave entre instâncias
e redeploys desse ambiente; trocá-la invalida os JWTs anteriores. Production pode ter sua
própria chave, a cadastrar separadamente antes da futura liberação aprovada.

O `.env` local está ignorado pelo Git e não vai no deploy pelo GitHub. A Vercel recebe os
valores pelo Dashboard; não é necessário enviar esse arquivo. `.env.example` contém apenas
`DATABASE_URL=` e `JWT_SECRET=` vazios. Marcar os segredos como Sensitive quando disponível.
Variáveis podem ser limitadas à branch de Preview, e alterações só valem em um **novo deploy**.
[Variáveis por ambiente](https://vercel.com/docs/environment-variables).

## 4. Criar ou refazer o Preview

1. Depois do envio manual dos commits revisados, abrir **Deployments**.
2. Filtrar por `banco-persistencia` e ambiente **Preview**. O push nessa branch normalmente
   já cria o deploy. [Ambientes da Vercel](https://vercel.com/docs/deployments/environments).
3. Se não houver deploy, abrir o menu ao lado do título Deployments, selecionar
   **Create Deployment** e informar `banco-persistencia`. Conferir a branch quando o mesmo
   commit existir em várias branches.
   [Deploy por branch no Dashboard](https://vercel.com/changelog/manually-create-deployments-by-commit-or-branch-in-the-dashboard).
4. Conferir branch, SHA do commit revisado e target Preview. Aguardar **Ready** e abrir
   **Visit** pela URL HTTPS desse deploy. Guardar URL/SHA no registro da validação.
5. Se as variáveis foram corrigidas depois, usar **Redeploy** no menu desse Preview e
   verificar o novo resultado. Se houve novo código no GitHub, criar o deploy do **novo SHA**.
6. Manter a proteção de Preview do projeto. Se houver uma tela de acesso da Vercel,
   autenticar-se nela antes de testar o login do MExplica; são autenticações diferentes.

Usar o mesmo hostname durante os testes de cookie. URLs por commit e o alias da branch
podem ser diferentes; cookie sem Domain é específico do host que o emitiu. O alias da branch
acompanha o deploy mais recente, e a URL por commit identifica a versão exata testada.

## 5. Checklist manual no Preview HTTPS

Abrir DevTools > Network e Console. Ativar **Disable cache** durante a inspeção dos assets.
Não copiar valores de Cookie, Set-Cookie, Authorization ou respostas de `/api/auth/token`.
Anotar somente URL sem credenciais, SHA, etapa, horário, status e resultado público.

| Ordem | Ação exata | Resultado esperado |
| --- | --- | --- |
| 1 | Abrir `/` e `/cadastro.html`. | Home e formulário completos; tema e navegação funcionam. |
| 2 | Abrir `/css/style.css`, `/css/base.css`, `/js/core/api.js`, `/js/core/site.js`, `/icons/favicon.ico`, `/icons/logo-mexplica.png`, `/images/tutorials/pix-seguranca.jpg`, `/fontes/NimbusSanL-Bol.otf` e `/fontes/NimbusSanL-Reg.otf`. Conferir também os requests das páginas. | 200 com CSS, JS, imagem ou fonte correspondente; nenhum asset local retorna HTML ou 404. Fonte pode abrir um download. |
| 3 | Abrir `GET /api/health`. | 200, `status: "ok"`; não consulta PostgreSQL nem exige JWT. |
| 4 | Abrir `GET /api/health/database`. | 200, `status: "ok"`, `banco: "postgresql"`, `provider: "neon"`; falhas retornam 503 genérico, sem detalhes de conexão. |
| 5 | Cadastrar uma conta sintética nova **colaboradora**, com nome identificável como Auditoria Preview e contato exclusivo de teste. Anotar seu ID/slug. | 201 em `/api/auth/cadastro`, autenticação imediata, perfil sem hash na resposta. Não usar a conta Teste Persistencia. |
| 6 | Fazer logout e login dessa conta por `/cadastro.html`. Testar uma senha incorreta antes da correta. | Credencial incorreta: 401; correta: 200 em `/api/auth/login`; nenhum JWT no JSON do login web. |
| 7 | Em Application > Cookies, conferir `mexplica_token` **sem copiar o valor**. | HttpOnly, Secure, SameSite=Lax, Path=/ e duração de oito horas. Nenhum Domain personalizado. |
| 8 | Abrir `/api/auth/sessao`, recarregar a home e abrir diretamente `/perfil/SLUG_DA_CONTA`. Fechar e reabrir a aba dentro da validade. | `autenticado: true`, usuário sem hash e navegação autenticada preservada. Não há JWT no localStorage/sessionStorage. |
| 9 | Abrir `/comunidade`, o próprio perfil e um perfil com tutoriais. | Rankings, cards, métricas, CTA autenticado e páginas EJS sem erro de view/partial. Perfil vazio não requisita imagem inexistente. |
| 10 | Na home, buscar `fonte`, limpar a busca e testar uma consulta sem resultados. Abrir MExplicAI e perguntar `Como aumentar a fonte do celular?`. | Busca e estados vazios funcionam; MExplicAI usa busca/tutorial relacionado quando houver relevância, sem erro JavaScript. Testar minimizar/reabrir. |
| 11 | Abrir `/tutoriais/novo`. Criar `Auditoria Preview - tutorial sintético`, resumo `Tutorial sintético para validar o Preview.`, introdução `Esta publicação serve apenas para validar a persistência e a integração do MExplica.`, categoria existente e um passo `Abrir configurações` / `Abra as configurações do aparelho de teste.`. Tags: `auditoria, preview`. Opcionalmente usar uma imagem de teste e um link HTTPS com texto. | Publicação retorna 201 e abre `/tutoriais/SLUG`. Anotar ID, slug, autor e saldo inicial de pontos do autor. |
| 12 | Abrir a edição pelo botão do tutorial ou `/tutoriais/SLUG/editar`; alterar título, resumo e descrição do passo; salvar e recarregar. | PUT 200, novos dados preservados, mesmo ID/slug/autor. Imagem/link mantidos quando usados. |
| 13 | Em janela anônima separada, cadastrar uma **segunda conta sintética** avaliadora. Abrir o tutorial criado e comentar `Comentário sintético da auditoria de Preview.`. Editar para `Comentário sintético editado no Preview.` e recarregar. | POST 201, PUT 200, mesmo comentário/autor e texto editado persistido. Anotar ID. |
| 14 | Com a avaliadora, dar **3 estrelas**, recarregar e conferir o perfil da autora na primeira janela. | Uma avaliação, nota 3, média/quantidade coerentes; autor recebe **+30 pontos**. |
| 15 | Alterar para **5 estrelas**, recarregar e conferir novamente os pontos. | Mesma avaliação, sem duplicação, apenas **+20 adicionais**, total **+50** sobre o saldo inicial. Observer conclui antes da resposta. |
| 16 | Na conta autora, tentar avaliar o próprio tutorial; com avaliadora, tentar editar o tutorial alheio por `/tutoriais/SLUG/editar`. | Ambas as ações recusadas com 403 e sem mudanças. |
| 17 | Repetir GETs de `/api/tutoriais/ID`, `/api/tutoriais/ID/comentarios`, `/api/tutoriais/ID/avaliacoes` e perfil. Reabrir em outra aba. | Edição, comentário, nota e pontos continuam presentes. GET da página do tutorial incrementa visualizações; GET da API por ID é só leitura. |
| 18 | Refazer o Preview do mesmo commit, mantendo banco/chave, e abrir novamente as mesmas rotas. Usar o alias da branch; se mudar o hostname, fazer login novamente. | Dados permanecem após novo deploy. Isso complementa a conferência entre requests; não depende de a Vercel reutilizar uma instância. |
| 19 | Seguir o teste Bearer da seção 6. | Emissão e autorização por Bearer funcionam sem cookie do MExplica. |
| 20 | Pela avaliadora, excluir a avaliação e o comentário sintéticos. | Remoções bem-sucedidas, média/quantidade atualizadas e desconto de **50 pontos**, voltando ao saldo inicial se não houve outras ações. |
| 21 | Em viewport mobile de aproximadamente 390 px, conferir home, busca/MExplicAI, comunidade, perfil, tutorial, editor e menu. | Conteúdo legível, sem rolagem horizontal relevante, botões acessíveis e formulários utilizáveis. |
| 22 | Fazer logout em qualquer conta sintética ainda disponível antes da exclusão. Conferir cookies e `/api/auth/sessao`. | Cookie removido, `autenticado: false`. Bearer copiado externamente continua válido até expirar enquanto a conta existir. |
| 23 | Sem cookie/Bearer, tentar `POST /api/tutoriais` com JSON `{}` e abrir `/tutoriais/novo`. | API 401; página redireciona ao cadastro/login. Token adulterado também retorna 401. |
| 24 | Entrar novamente como autora e excluir o tutorial sintético. Entrar em cada conta criada nesta validação e excluir somente a própria conta pelo perfil. | Tutorial e dependentes removidos; contas anteriores e dados do Neon preservados. Se alguma limpeza falhar, registrar somente os IDs pendentes. |
| 25 | Revisar Network, Console e Runtime Logs. | Sem 500/404 locais inesperados, exceções JavaScript ou informações privadas. Conferir VLibras/YouTube/Google Fonts no ambiente real sem modificar essas integrações. |

Após excluir cada conta, confirmar que aparece como visitante na requisição seguinte.
Não limpar dados anteriores à auditoria para fazer este roteiro passar.

Para conferir cascatas, o responsável pode consultar no painel privado do Neon, pelos IDs
sintéticos, a ausência do tutorial em `tutoriais`, `tutorial_passos`, `tutorial_tags`,
`comentarios` e `avaliacoes`. Não executar seed/migration para testar persistência ou limpar dados.

## 6. Bearer com Postman, sem compartilhar credenciais

1. Usar o mesmo hostname HTTPS do Preview e desativar o cookie jar do MExplica no cliente.
   Se Deployment Protection impedir o Postman, usar o mecanismo de acesso autorizado do
   projeto; uma tela HTML da Vercel não é resposta do login do MExplica.
2. Enviar **POST `/api/auth/token`**, Body > raw > JSON, preenchendo somente no cliente privado:

   ```json
   { "identificador": "CONTATO_DA_CONTA_SINTETICA", "senha": "SENHA_DA_CONTA_SINTETICA" }
   ```

3. Esperar 200, `tipo: "Bearer"`, `expiraEm: 28800` e token; nenhum cookie de autenticação
   emitido por esse endpoint. Não exportar a resposta ou salvar os valores no repositório.
4. Selecionar Authorization > Bearer Token e usar o token recebido em
   **PUT `/api/usuarios/ID_DA_PROPRIA_CONTA`**, JSON `{ "bio": "Auditoria Preview por Bearer" }`.
   Esperar 200 e conferir a bio no perfil em nova requisição.
5. Alterar um caractere da **assinatura** do token e repetir: esperar 401 público, sem
   detalhes criptográficos. Remover o Bearer e repetir sem cookie: 401.
6. Repetir `/api/auth/token` com senha incorreta: 401 e nenhum token novo. Apagar os valores
   privados do cliente ao terminar. Reverter a bio ou remover a conta sintética na limpeza.

Não testar Secure como se HTTP localhost fosse produção. Os atributos de produção têm
cobertura automatizada; sua aceitação pelo navegador deve ser conferida neste Preview HTTPS.

## 7. Diagnóstico sem expor segredo

Em **Deployments > deploy testado**, usar Build Logs para instalação/empacotamento e
**Logs/Runtime Logs** para requisições. Filtrar pelo horário, rota e status da falha.
Não adicionar logs de request completo, corpo de login, cookie, JWT, senha/hash, SQL ou
variáveis de ambiente. Compartilhar apenas mensagem operacional sanitizada e contexto público.

| Sintoma | Conferência |
| --- | --- |
| `/api/health` não responde 200 | Commit/branch, Function importada, Root Directory, rewrite e logs de inicialização. |
| Health básico 200, banco 503 | Escopo/nome de `DATABASE_URL`, URL pooled/SSL, disponibilidade do Neon; redeploy depois de corrigir variável. Não copiar conexão para relatório. |
| Login 503 com mensagem de configuração | `JWT_SECRET` ausente/vazia no Preview ou variável aplicada somente a outro ambiente; configurar e redeployar. |
| Login 200, sessão perdida no navegador | Mesmo hostname HTTPS, atributos do cookie, `NODE_ENV=production`, validade e chave estável. |
| CSS/JS retorna HTML ou 404 | Output Directory/public, caixa dos nomes no Linux e commit correto. Não substituir rewrite sem identificar a causa. |
| View ou partial ausente | `api/index.js`, `includeFiles: "src/views/**"`, preset e artefato gerado no build. |
| JSON malformado 400 | Corrigir o corpo do cliente. A resposta não repete o corpo nem detalhes do parser. |
| NetworkError ao comentar/avaliar | Anotar horário, rota, método, status se houver, repetição e duração. Correlacionar Runtime Logs; não exportar HAR sem remover cookies, Authorization e corpos privados. |
| Timeout/504 | Medir a operação e consultar duração/logs antes de propor alterar os 10 s atuais. Timeout por consulta de 3 s não limita a soma de todas as consultas. |

Os NetworkError anteriores não tiveram causa concreta na inspeção estática; não foram
adicionados retries nem mudanças no helper. Se uma escrita ficar com resultado incerto,
consultar o estado atual antes de repetir para não criar ações duplicadas.

## 8. Produção e retorno a um deploy anterior

Aprovar o Preview e sua limpeza antes de considerar merge manual para `main`. Configurar
separadamente `DATABASE_URL`, `JWT_SECRET` e `NODE_ENV=production` no escopo **Production**
antes da futura publicação. Não promover este Preview nem trocar a Production Branch nesta etapa.

Se houver problema no Preview, abrir a URL de um Preview anterior para comparar ou refazer
o deploy de um commit revisado. Em produção, **Instant Rollback** permite apontar o domínio
de volta a um deploy anterior elegível, sujeito ao plano/permissões. Ele reutiliza o build
e a configuração daquele deploy; não incorpora variáveis recém-alteradas e **não desfaz
escritas no Neon**. Conferir compatibilidade e autenticação ao retornar. Após rollback,
verificar também a retomada da atribuição automática do domínio para futuros deploys.
[Rollback na Vercel](https://vercel.com/docs/instant-rollback).

Registrar o resultado de cada etapa e manter o deploy/SHA anterior disponível. A aprovação
de produção depende da validação no ambiente hospedado; testes locais não executam a CDN,
o empacotador nem a infraestrutura real da Vercel.
