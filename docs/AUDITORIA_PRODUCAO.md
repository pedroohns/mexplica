# Auditoria final de integração e produção

## Auditoria pré-merge de 18/11/2026

**Veredito: APROVADA PARA MERGE**, considerando o estado local com as correções desta
auditoria. Elas ainda precisam ser revisadas e incluídas manualmente em `banco-persistencia`
antes do merge: o commit auditado `a2fe7c0`, isoladamente, não contém essas correções.
Nenhum commit, merge, deploy, alteração de Production ou escrita no Neon foi executado.

O Preview real já foi validado pelo responsável. Foram informados: home/assets, login/JWT,
cookie Secure, sessão após F5, perfil, comunidade, MExplicAI, comentários, avaliações,
Observer/pontos, logout, responsividade, busca PostgreSQL e health básico/banco com 200,
sem falha funcional relevante nos logs. Essa evidência externa foi usada como contexto;
não houve nova consulta remota, teste de navegador ou deploy nesta auditoria.

### Git, histórico e escopo do diff

Branch confirmada: `banco-persistencia`, sincronizada com `origin/banco-persistencia`.
O `git status` inicial estava limpo. Ao final há somente as alterações rastreadas desta
auditoria, sem novos arquivos não rastreados. `.env` e `node_modules/` existem localmente
e são ignorados; foram preservados. Não há `.env`, logs, downloads, artefatos temporários,
node_modules ou arquivos de editor versionados identificados na conferência.

O diff entre os commits de `main...banco-persistencia`, antes das alterações locais,
contém **92 arquivos, 7060 inserções e 2632 remoções**, distribuídos em oito commits:
infraestrutura (`cb3c7b6`), schema/seed (`3740075`), usuários (`bfbd9d7`), tutoriais
(`3da4bed`), comentários/avaliações (`85d0551`), JWT (`99f5cb1`), Observer (`5d23f13`)
e preparação para Vercel (`a2fe7c0`). Não houve remoção de arquivos.

| Área | Mudanças auditadas |
| --- | --- |
| Infraestrutura PostgreSQL | Pool lazy centralizado, health do banco e comandos explícitos |
| Schema/migrations/seed | Sete entidades, remoção versionada de especialidades, seed transacional/idempotente e verificador somente leitura |
| Repositories | Quatro implementações PostgreSQL e quatro adapters em memória para testes |
| Models | Persistência async via Factory, mantendo regras, busca, slugs e projeções |
| Services | Composição async e coordenação transacional de relacionamentos/pontuação |
| Controllers | Await dos dados e transferência da composição de avaliações para o Service |
| JWT | jsonwebtoken, TokenService, cookie HttpOnly/Bearer e remoção de cookie-session |
| Patterns | Singleton/Factory e Observer aguardado de pontuação |
| Tests | Cobertura offline de SQL, HTTP, autenticação, cascatas, rollback, assets e frontend |
| Docs | Arquitetura, banco, autenticação, padrões, deploy e contexto |
| Deploy | Entrada/configuração preservadas, importação sem conexão e views incluídas |
| Correções de produção | Fontes, estado vazio do perfil, favicon e JSON inválido com 400 |

A remoção de especialidades é deliberada, documentada e acompanhada de migration;
não é perda acidental de dados funcionais. Os dois arquivos de configuração do Postman
são metadados laterais da etapa JWT, sem credenciais; foram preservados.

### Regressão corrigida e validação

Os IDs do schema são INTEGER, mas os Models aceitavam inteiros seguros JavaScript até
9007199254740991. Valores acima de 2147483647 chegavam às queries, embora não sejam
representáveis nas colunas, podendo gerar erro de banco em vez da ausência/404 anterior.
A correção limita as validações existentes dos quatro Models à faixa do schema e evita
consultas/remoção de usuário para IDs inválidos. Não altera schema, rotas, permissões,
contratos para IDs válidos ou responsabilidades entre camadas.

O teste de IDs inválidos foi ampliado; um caso HTTP novo confere quatro rotas de leitura
com IDs fora da faixa, sem consultas, e confirma o encaminhamento de 2147483647 aos quatro
Repositories. Antes da correção, os testes evidenciaram consultas indevidas; depois,
`npm.cmd test` passou com **262 testes, zero falhas, cancelados ou ignorados**. Baseline
inicial: 261 aprovados. Nenhum teste anterior foi removido. Os processos de teste mantêm
chave JWT exclusiva, MemoryRepositories ou Pool/client falsos e driver real bloqueado.

### Resultados finais

| Item | Resultado |
| --- | --- |
| Segredos | Busca em 137 arquivos textuais versionados e 450 blobs textuais de 74 commits alcançáveis localmente: nenhuma credencial real de infraestrutura identificada pelos padrões examinados. URLs encontradas usam hosts reservados de teste; senhas/chaves são fixtures demonstrativas. Nenhum JWT completo, cookie real, token Neon/Vercel ou chave privada identificado. `.env` não aparece no histórico local. Valores não foram reproduzidos. |
| Banco/schema/migrations/seed | Sete PKs/oito FKs; CASCADE de dependentes, RESTRICT de categoria e constraints coerentes. `schema_migrations` separado; migration e registro atômicos, seed sem sobrescrever dados existentes. DATABASE_URL somente por ambiente; nenhum hook de deploy/start/install escreve no banco. |
| Repositories/Factory | Usuario, Tutorial, Comentario e Avaliacao usam PostgreSQL fora de NODE_ENV=test. Models pedem os Repositories à Factory; nenhum Data como fallback no runtime. |
| Singleton | getInstance e Pool lazy reutilizado por processo; único new Pool no runtime, max 2 e timeouts conservadores. Nenhuma conexão no import. |
| Observer | Registro no carregamento do Service, Set, notificação aguardada no mesmo client, deltas corretos e rollback após falha. Cascatas agregadas continuam diretas intencionalmente. |
| Transações | Avaliação/pontos, edição/delta, remoção/desconto, exclusões de tutorial/usuário e escrita de tutorial mantêm um client e COMMIT após todas as etapas; falhas propagam rollback e descarte do client. |
| JWT | HS256, issuer mexplica, audience mexplica-web, oito horas, sub mínimo, jwt.verify e segredo obrigatório. Cookie mexplica_token HttpOnly/Lax/Path=/, Secure em produção; Bearer prioritário sem fallback quando inválido; logout limpa cookie e conta removida perde autenticação. |
| Autorização | Usuário atual do PostgreSQL, sem confiar em permissões de claims; autenticação, colaborador, Platina e autorias preservados; avaliação do próprio tutorial recusada. |
| API | Sem mudança acidental de métodos, rotas, status ou JSON encontrada. Adições deliberadas de /token e health/database e remoção documentada de especialidades. JSON malformado retorna 400 seguro; IDs fora do schema preservam 404. |
| Vercel/serverless | Express exportado por api/index.js; listen somente local, paths absolutos, views incluídas, rewrite e maxDuration 10 preservados. Sem persistência de domínio no processo. Preview informado já aprovado; Production não alterada. |
| Assets | Fontes, favicon e remoção da imagem inexistente confirmados. Referências ativas de HTML/EJS/CSS passam na verificação de existência e caixa; nenhuma referência essencial quebrada identificada. |
| Error handler | JSON inválido 400, payload grande 413, JWT_SECRET ausente 503, health sem banco 503, DATABASE_URL ausente no domínio e falhas desconhecidas com 500 genérico; conflitos/relacionamentos com mensagens fixas. Sem stack, SQL, hash, token ou connection string públicos. |
| Frontend/MExplicAI/VLibras | APIs/helper e ordem de scripts preservados. Sem JWT em localStorage/sessionStorage; MExplicAI continua local/determinístico com busca real, sem provedor externo de IA. VLibras global permanece; frontend não foi alterado. |
| Dependências | npm ls --depth=0 válido, sete dependências esperadas em uso, package/lock coerentes e cookie-session ausente. As versões dos pacotes comuns à main foram preservadas; nenhuma instalação/atualização nesta auditoria. |
| Documentação | README agora cobre stack, execução, variáveis, testes e padrões; contexto/deploy/banco/relatório refletem Preview concluído e Production futura. Contagens antigas de migrações permanecem identificadas como histórico. |

A busca por segredos se limita aos padrões e ao histórico disponíveis localmente; não
inspecionou valores do `.env`, configurações privadas externas ou todos os formatos possíveis.
O estado do Neon após limpeza foi informado pelo responsável: 18 tutoriais, 10 comentários,
20 avaliações, zero órfãos de comentários/avaliações, zero pares duplicados e Lucas Mendes
com 1250 pontos. Não foi reconsultado nesta auditoria; Teste Persistencia foi preservada.

### Resíduos e observações sem bloqueio

- O mapa legado de imagens `print-*` em `site.js` cita oito arquivos ausentes, mas os
  contêineres `.step-print` atuais não contêm imagens. Já existia na main, não gera requests ativos
  e foi preservado conforme o escopo de não refatorar frontend.
- Há acentuação corrompida em um comentário e na mensagem interna de esgotamento de slugs
  de UsuarioModel; o error handler retorna o 409 público correto. Resíduo cosmético preservado.
- Metadados do Postman e os arquivos locais ignorados são conhecidos, sem segredo identificado.
- Warning SSL sobre comportamento futuro do pg v9: dívida técnica, sem alteração de URL/SSL/pg.
- NetworkError transitórios: não reproduzidos no Preview informado; nenhuma mudança por hipótese.
- Carga, duração acumulada das consultas e ciclo de vida dos Pools serverless permanecem
  observações futuras, sem evidência atual de falha. Não foi realizado teste de carga.

Arquivos alterados nesta auditoria: quatro Models, `tests/relacionamentosPostgres.test.js`,
`README.md`, `docs/ARQUITETURA.md`, `docs/CONTEXTO_CODEX.md`, `docs/BANCO_DE_DADOS.md`,
`docs/DEPLOY.md`, `docs/PADROES_DE_PROJETO.md` e este relatório. Não houve mudança de
Controllers, Repositories, schema, seed, migrations, JWT, frontend, dependências ou Vercel.

**Bloqueadores restantes: nenhum identificado no estado local corrigido e testado.**
A aprovação técnica se refere a esse estado; incluir as alterações revisadas na branch
antes do merge manual. Configurar/publicar Production continua sendo uma tarefa separada.

## Registro da auditoria local anterior

Conferência local de **17–18/11/2026**, na branch **`banco-persistencia`**, com Node 24.11.1.
Baseline: **258 testes aprovados**. Resultado após as correções: **261 aprovados**, sem
conexão real com PostgreSQL. Naquele momento o Preview da Vercel e seu acesso ao Neon
ainda aguardavam validação manual; a atualização pré-merge acima registra sua conclusão
informada pelo responsável. Nenhum deploy foi executado pela auditoria local.

## Resultado por componente

| Item | Resultado e evidência |
| --- | --- |
| Entrypoint | `api/index.js` continua exportando `src/index.js`, que exporta o Express. `app.listen` permanece sob `if (require.main === module)`. A importação de produção é coberta por `authJwt.test.js`, sem chave/banco obrigatórios na inicialização. |
| `vercel.json` | Mantidos `functions["api/index.js"]`, `includeFiles: "src/views/**"`, rewrite `/(.*)` → `/api` e `maxDuration: 10`. Não há operação longa intencional ou necessidade demonstrada de elevar duração; várias consultas sequenciais podem somar mais que o timeout individual. O tempo real será medido no Preview. |
| Arquivos públicos | CSS, JS, imagens, ícones e fontes permanecem em `public/`. Express usa caminho absoluto relativo ao módulo. Referências literais de HTML/EJS/CSS são verificadas, inclusive caixa dos nomes para Linux; fontes, imagem inexistente e favicon foram corrigidos conforme abaixo. |
| EJS | `src/views/**` inclui comunidade, perfil, tutorial, editor e ambos os partials. O caminho absoluto de views não depende do cwd da Function. Rotas EJS e editor seguem cobertos pela suíte offline. Nenhuma view foi movida. |
| Variáveis | O Pool recebe somente `process.env.DATABASE_URL`; TokenService lê somente `process.env.JWT_SECRET`. Não há fallback de segredo ou conexão. `.env.example` continua com as duas entradas vazias, sem `SESSION_SECRET`. Não houve leitura direta nem modificação do `.env` local. |
| Health | `/api/health` é independente do banco. `/api/health/database` executa `SELECT 1 AS ok` e retorna 200 ou 503 genérico, com `Cache-Control: no-store`. Ambos antecedem cookie-parser/carregarUsuario; não consultam usuário nem exigem JWT. |
| DatabaseConnection | Singleton e Pool lazy por processo; único `new Pool` no runtime. `max: 2`, conexão/consulta: 3000 ms, ociosidade: 10000 ms, `allowExitOnIdle: true`. URL/SSL são preservados; erro de conexão ociosa tem mensagem genérica. Nenhuma conexão é aberta ao importar a aplicação. |
| Factory/ambientes | Os quatro Models pedem Repository à Factory ao carregar. Somente `NODE_ENV=test` escolhe memória. `production`, `development`, valor ausente ou outros valores escolhem PostgreSQL; falha de configuração não aciona fallback. Documentado `NODE_ENV=production` também no Preview HTTPS. |
| Observer | Composição determinística no carregamento do Service: um Publisher e um Observer por cópia do módulo/processo. Set deduplica a mesma instância; não há registro por request nem dependência de requisição anterior. `await notificar` recebe `{ client }` e termina antes do COMMIT. Testes PostgreSQL com doubles cobrem rollback após ajuste nos três CRUDs. Cascatas mantêm os ajustes agregados. |
| JWT/cookies | Mantidos HS256, issuer `mexplica`, audience `mexplica-web` e oito horas. Cookie HttpOnly, SameSite=Lax, Path=/ e Secure em `NODE_ENV=production`; logout limpa atributos compatíveis. Bearer segue prioritário nas APIs. Sem JWT em armazenamento do frontend. Autorização relê usuário atual do PostgreSQL. |
| Proxy | `app.set('trust proxy', 1)` preservado para o proxy da hospedagem. A configuração do atributo Secure depende de `NODE_ENV`, sem hacks de protocolo/hostname ou novo Domain de cookie. |
| Memória | Não há persistência de domínio no processo, filesystem local, sessão, fila de integridade ou fallback Data no runtime PostgreSQL. Maps/Sets de hidratação/enriquecimento são temporários por operação. Pool/configuração, referências de Repository e registro do Observer são estado aceitável por processo. |
| Deploy/start | `package.json` não possui hooks de install/build/start executando schema, migration ou seed. `start` apenas executa `src/index.js`; a Vercel importa a Function. Os comandos de banco são explícitos e separados. Conferir overrides do Dashboard antes do Preview. |
| Erros | Erros desconhecidos de banco/JWT e falhas de renderização retornam mensagem genérica, sem stack/query/hash ou variáveis privadas. Conflitos conhecidos e validações continuam públicos. JSON inválido agora retorna 400, sem ecoar corpo ou mensagem do parser. Produção simulada cobre API/EJS e logs com marcadores privados sintéticos. |
| Logs | Runtime registra somente mensagens operacionais fixas. Scripts imprimem mensagens, contagens e eventualmente código PostgreSQL restrito; não imprimem exceções/queries/credenciais. Nenhum log de request, header Authorization, cookie, token ou senha foi introduzido. |
| Dependências | `npm.cmd ls --depth=0` sem dependências inválidas: bcryptjs na autenticação, cookie-parser no middleware, dotenv na configuração, EJS nas views, Express no HTTP, jsonwebtoken no TokenService e pg no Pool. Nenhuma atualização, instalação ou `npm audit fix`. |

O modelo atual de estáticos/views foi preservado: a Vercel documenta estáticos em `public/**`,
rewrites com consulta ao filesystem e `includeFiles` para arquivos adicionais da Function.
A conferência local não executa esse empacotador/CDN; por isso o checklist exige respostas
com tipos corretos no Preview, além de páginas renderizadas.
[Express e public](https://vercel.com/docs/frameworks/backend/express),
[rewrites e includeFiles](https://vercel.com/docs/project-configuration/vercel-json).

## Limites de conexão em serverless

O Singleton é **por processo/instância**, e não uma conexão global para todas as Functions.
Cada instância pode abrir seu próprio Pool de até duas conexões; o total cresce com o número
de instâncias. Usar a URL pooled do Neon para o tráfego da aplicação mantém a compatibilidade
com transações que recebem o mesmo client. A URL efetivamente configurada não foi inspecionada;
cabe ao responsável cadastrá-la no Dashboard. [Pooling do Neon](https://neon.com/docs/connect/connection-pooling).

O limite pequeno e o reuso são coerentes com a validação inicial, mas não constituem teste
de carga. Durante suspensão de instâncias, timers de ociosidade podem deixar de executar.
A Vercel recomenda integração de ciclo de vida com `attachDatabasePool` em Fluid compute.
Isso fica como ponto de monitoramento de conexões/duração no Preview; não foi adicionado
pacote nem alterada infraestrutura sem evidência de esgotamento ou vazamento nesta aplicação.
[Ciclo de vida de pools na Vercel](https://vercel.com/kb/guide/connection-pooling-with-functions).

## Busca por segredos

- Busca nos arquivos rastreados por URLs PostgreSQL, atribuições de configuração,
  tokens JWT completos, Bearer literal, padrões de chaves de provedores e senhas literais.
  Valores não foram impressos no relatório da busca.
- Nenhuma credencial real de infraestrutura identificada. As URLs encontradas são
  sintéticas nos testes de conexão/health/Factory; chaves e senhas de testes são fixtures.
- `src/data/usuarioData.js`, próximo do início do arquivo, contém uma **senha demonstrativa
  usada pelo seed**; não foi reproduzida nem alterada. É dado público de demonstração,
  não deve ser tratado como segredo de conta real. Contas seed e dados do Neon foram preservados.
- `.env` não está rastreado e está ignorado pelo Git; nenhum dos 73 commits locais alcançáveis
  registra esse caminho. Uma busca adicional em 404 blobs textuais do histórico alcançável
  não identificou conexões não sintéticas ou tokens completos pelos padrões examinados.
- A busca é evidência limitada a esses padrões e ao histórico disponível localmente;
  não é uma certificação de todos os formatos de segredo ou de sistemas externos.

## Inspeção curta dos NetworkError

`public/js/core/api.js` faz um fetch por chamada, usa o body recebido uma vez, converte o
JSON e verifica `resposta.ok`. Comentário usa PUT `/api/comentarios/:id`; avaliação usa POST
`/api/tutoriais/:id/avaliacoes` ou PUT `/api/avaliacoes/:id`, com um único JSON.stringify.
As rotas/métodos correspondem ao backend; os fluxos não sobrescrevem headers do helper.
Cookies são enviados nas chamadas de mesma origem pelo comportamento padrão do fetch.

Não houve reprodução nem causa concreta para os dois erros transitórios anteriores.
Uma resposta não JSON de infraestrutura pode falhar na conversão JSON; isso é um limite
observável, não prova da causa relatada. Helper e fluxos permaneceram sem alterações.
Monitorar horário, método, rota, status/duração e correlacionar logs, sem registrar credenciais.

## Correções necessárias e testes adicionados

1. `public/css/base.css`: duas fontes apontavam para `public/css/fonts/`, inexistente.
   Foram corrigidas para os arquivos já versionados em `public/fontes/`, com formato
   `opentype`. Famílias, pesos e ordem da cascata foram preservados.
2. `src/views/perfil.ejs`: removida referência ao ícone inexistente `ninho-vazio.png`.
   O próprio markup já ocultava essa imagem após erro; mantém-se o estado vazio visível
   sem gerar um request 404. Não foi inventado um novo recurso visual.
3. `public/cadastro.html`: incluída referência ao favicon existente. Sem ela, o navegador
   requisitava `/favicon.ico`, inexistente. A falha foi observada no Chrome local.
4. `src/index.js`: body-parser enviava JSON malformado ao erro genérico 500. A condição
   `entity.parse.failed` agora retorna 400 com mensagem fixa, sem log ou corpo privado.

Novos testes em `tests/staticAssets.test.js` (um) e `tests/productionErrors.test.js` (dois).
O teste de assets verifica referências de CSS/HTML/EJS, caixa dos caminhos e favicon das
páginas; os dois testes HTTP usam processo isolado em produção, dotenv substituído e Pool
real proibido. Nenhum teste depende de detalhes internos de build da Vercel.

As garantias existentes de importação, Pool lazy, health sem banco, cookie Secure/proxy,
JWT/Bearer, Repositories e Observer foram reaproveitadas, sem duplicação de suas suítes.
Não houve mudança de arquitetura, schema, seed, migrations, algoritmo JWT, MExplicAI ou VLibras.

## Conferência de interface e pendências externas

Chrome headless local, com renderização por software, MemoryRepositories e driver real
bloqueado: home, cadastro, comunidade, perfil com publicações, tutorial, editor autenticado
e perfil sintético vazio; larguras 1280 e 390 px. Fonte Nimbus carregada, sem overflow
horizontal ou exceções JavaScript nas páginas conferidas. Capturas de comunidade desktop
e perfil mobile também foram inspecionadas. A imagem inexistente deixou de ser requisitada.
O favicon faltante do cadastro foi identificado nessa conferência e corrigido.
A passagem final por 13 combinações de página/largura confirmou ambas as fontes carregadas,
nenhum HTTP local com erro, nenhuma exceção JavaScript/console.error e nenhum overflow horizontal.

Google Fonts, VLibras e YouTube foram bloqueados para isolar a validação local; seus serviços
reais, HTTPS/cookies no navegador, empacotamento EJS, CDN, duração, conexão ao Neon e
persistência entre deploys permanecem no roteiro manual do Preview. O teste de atributos
Secure foi automatizado; não foi simulado como autenticação HTTPS em navegador HTTP local.

Nenhum commit, merge, deploy, schema, migration, seed ou limpeza no Neon foi executado.
