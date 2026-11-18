# Auditoria final de integração e produção

Conferência local de **17–18/11/2026**, na branch **`banco-persistencia`**, com Node 24.11.1.
Baseline: **258 testes aprovados**. Resultado após as correções: **261 aprovados**, sem
conexão real com PostgreSQL. O Preview da Vercel e seu acesso ao Neon ainda precisam da
validação manual em [DEPLOY.md](DEPLOY.md); nenhum deploy foi executado nesta auditoria.

## Resultado por componente

| Item | Resultado e evidência |
| --- | --- |
| Entrypoint | `api/index.js` continua exportando `src/index.js`, que exporta o Express. `app.listen` permanece sob `if (require.main === module)`. A importação de produção é coberta por `authJwt.test.js`, sem chave/banco obrigatórios na inicialização. |
| `vercel.json` | Mantidos `functions["api/index.js"]`, `includeFiles: "src/views/**"`, rewrite `/(.*)` → `/api` e `maxDuration: 10`. Não há operação longa intencional ou necessidade demonstrada de elevar duração; várias consultas sequenciais podem somar mais que o timeout individual. O tempo real será medido no Preview. |
| Arquivos públicos | CSS, JS, imagens, ícones e fontes permanecem em `public/`. Express usa caminho absoluto relativo ao módulo. Referências literais de HTML/EJS/CSS são verificadas, inclusive caixa dos nomes para Linux; quatro falhas de assets foram corrigidas conforme abaixo. |
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
