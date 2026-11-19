# Padrões de projeto no MExplica

Auditoria realizada na branch `banco-persistencia`. Este documento descreve o código real e
seus limites. Singleton e Factory já existiam e foram preservados. A busca por eventos,
listeners, callbacks registrados, publicação/assinatura e notificações não encontrou um
Observer de domínio no backend antes desta etapa.

## Singleton: DatabaseConnection

**Problema:** evitar configurações e Pools PostgreSQL independentes espalhados pelos consumidores.

**Participante central:** classe `DatabaseConnection`, em
[`src/database/databaseConnection.js`](../src/database/databaseConnection.js).
Os quatro `*PostgresRepository.js` de Usuario, Tutorial, Comentario e Avaliacao, o health do
banco e os comandos de infraestrutura são consumidores.

**Funcionamento:** `#instance` armazena a instância da classe. `getInstance()` retorna essa
instância e o próprio construtor também a reutiliza. `#pool` começa sem valor; `getPool()`
valida `DATABASE_URL` e cria o Pool somente no primeiro uso. Chamadas seguintes o reutilizam.
Construir Repository ou importar a aplicação não abre conexão.

```text
Repositories / health / comandos de infraestrutura
  ↓ DatabaseConnection.getInstance()
  ↓ getPool()
pg.Pool compartilhado, criado sob demanda
```

**Por que faz sentido:** centraliza a configuração de infraestrutura e reutiliza recursos
no backend Express e em cada instância serverless. A auditoria encontrou um único `new Pool`
no código de produção. Pools injetados nos Repositories são usados pelos testes offline.

**Limites:** Singleton não significa uma única conexão física. O Pool pode abrir até duas
conexões na configuração atual. A instância é única no processo/cópia carregada do módulo;
instâncias serverless distintas têm seus próprios Pools. Não é um Singleton distribuído nem
um mecanismo de serialização de todas as regras de negócio.

**Evidências:** `tests/databaseConnection.test.js` cobre identidade, construtor, criação lazy,
configuração e encerramento. `tests/repositoryFactory.test.js` comprova que os quatro
Repositories PostgreSQL reutilizam o mesmo Pool. Nenhuma refatoração foi necessária.

Explicação acadêmica: “Usamos uma instância compartilhada da conexão para centralizar e
reutilizar o pool do PostgreSQL.”

## Factory: RepositoryFactory

**Problema:** os Models precisam executar operações de persistência sem selecionar a
implementação concreta de cada ambiente.

**Onde está:** classe `RepositoryFactory`, em
[`src/repositories/repositoryFactory.js`](../src/repositories/repositoryFactory.js).
Seus quatro métodos são `criarUsuarioRepository`, `criarTutorialRepository`,
`criarComentarioRepository` e `criarAvaliacaoRepository`.

**Arquivos participantes:** os quatro `*Model.js` em `src/models/` pedem um Repository à
Factory no carregamento do módulo. Os produtos são `UsuarioMemoryRepository`/
`UsuarioPostgresRepository`, `TutorialMemoryRepository`/`TutorialPostgresRepository`,
`ComentarioMemoryRepository`/`ComentarioPostgresRepository` e `AvaliacaoMemoryRepository`/
`AvaliacaoPostgresRepository`, todos em `src/repositories/`.

**Funcionamento:** o ambiente padrão é `process.env.NODE_ENV`. `test` cria a implementação
em memória; qualquer outro valor cria a PostgreSQL. O parâmetro explícito `ambiente` permite
verificar essa seleção nos testes. A escolha acontece na inicialização dos Models, sem
alternância por request. Falta de `DATABASE_URL` gera erro ao usar o banco, sem fallback.

```text
Model
  ↓ RepositoryFactory.criar...Repository()
  ├── test → MemoryRepository → fixtures Data
  └── runtime → PostgresRepository → DatabaseConnection → PostgreSQL
```

**Por que faz sentido:** permite PostgreSQL no runtime e testes offline sobre a mesma camada
de domínio. SQL e arrays ficam nas implementações correspondentes. O preload
`scripts/testSetup.js` seleciona memória e bloqueia conexões reais do driver; testes SQL
injetam clientes falsos.

**Limites:** é uma Factory simples com métodos estáticos. Não há uma hierarquia de Factory
Method por subclasses nem uma Abstract Factory GoF completa. Não cria automaticamente
interfaces de linguagem, não gerencia transações e não compartilha o Pool por conta própria.
Os produtos possuem os métodos de persistência que seus Models consomem.

**Evidências:** `tests/repositoryFactory.test.js` verifica seleção, métodos dos produtos,
compartilhamento do Pool e ausência de fallback. As suítes `*Persistencia.test.js` e
`*PostgresRepository.test.js` exercitam os contratos. Nenhuma refatoração foi necessária.

Explicação acadêmica: “Os Models pedem seu Repository à Factory, que seleciona memória nos
testes e PostgreSQL no runtime.”

## Observer: ciclo de avaliação e pontuação

**Problema:** `relacionamentoService` persistia uma avaliação e chamava diretamente o ajuste
de pontos. A reação de pontuação estava acoplada ao CRUD principal. A extração dá a essa
reação uma responsabilidade própria, preservando avaliação e pontos como uma operação atômica.

**Resultado da busca inicial:** havia `Pool.on('error')` para erro de infraestrutura,
EventEmitter em doubles de testes, callbacks de transação/exclusão e listeners DOM/
IntersectionObserver de animações no frontend. Nenhum deles notificava observadores de uma
mudança de domínio do backend. Esses mecanismos não foram classificados como o Observer
de negócio do projeto. O caso escolhido foi o CRUD normal de avaliações, que já precisava
reagir com ajuste de pontuação.

### Participantes reais

| Papel | Implementação e responsabilidade |
| --- | --- |
| Subject/Publisher | `AvaliacaoEventPublisher`, em `src/events/avaliacaoEventPublisher.js`: registrar e notificar observers |
| Observer | `PontuacaoAvaliacaoObserver`, em `src/observers/pontuacaoAvaliacaoObserver.js`: aplicar delta ao autor |
| Quem publica | `relacionamentoService`, em `src/services/relacionamentoService.js`, depois de persistir a avaliação |
| Evento | Objeto `{ tipo, autorId, deltaPontos }` para criação, atualização ou remoção |
| Contexto transacional | `{ client }` passado separadamente ao Publisher e ao Observer |
| Destino da reação | `UsuarioModel.adicionarPontos` → UsuarioRepository, mantendo nível, piso zero e disponibilidade |
| Fonte do cálculo | `AvaliacaoModel.pontosPorNota`, sem duplicação de fórmula no Observer |

O payload é o contexto mínimo necessário à reação atual. Não contém tutorial/usuário completos,
senha, token, `req` ou `res`. O client não é dado do evento; é o recurso da unidade de trabalho.

### Eventos e operações

| Operação do Service | Tipo do evento | `deltaPontos` |
| --- | --- | --- |
| `criarAvaliacaoComPontos` | `avaliacaoCriada` | `pontosPorNota(nota)` |
| `atualizarAvaliacaoComPontos` | `avaliacaoAtualizada` | `pontosPorNota(notaNova) - pontosPorNota(notaAnterior)` |
| `removerAvaliacaoComAjuste` | `avaliacaoRemovida` | `-pontosPorNota(notaRemovida)` |

A regra existente equivale a nota × 10, mas permanece implementada somente no Model.
O Service calcula o contexto e o Observer aplica o delta recebido. Alterar 3 → 5 soma 20;
editar 5 → 5 aplica delta zero; remover 5 desconta 50. Uma avaliação ausente ou uma operação
recusada não publica evento. A remoção preserva a proteção anterior para tutorial ausente.

### Registro e notificação assíncrona

O Service cria um Publisher e registra uma instância de `PontuacaoAvaliacaoObserver` no escopo
do módulo CommonJS. O carregamento normal via cache de módulos mantém essa composição; os
requests apenas publicam. O Publisher não é exportado como registro global mutável e testes
isolados podem construir suas próprias instâncias.

`registrar(observer)` usa Set: registrar o mesmo objeto duas vezes não duplica sua execução.
Instâncias diferentes são observadores distintos; a composição registra apenas uma. Não há
fila, biblioteca adicional, mensageria externa nem barramento genérico.

`notificar(evento, contexto)` executa `await observer.atualizar(evento, contexto)` para cada
registro, sequencialmente. O Service aguarda `notificar`. Rejeições são propagadas e impedem
as reações seguintes. O Publisher isolado admite zero observers; na composição da aplicação
o observer de pontuação é sempre registrado. O Observer exige client para evitar uso
acidental de autocommit.

### Mesma transação e rollback

```text
AvaliacaoController
  ↓ relacionamentoService
  ↓ AvaliacaoModel.emTransacao → AvaliacaoPostgresRepository
BEGIN (client obtido do Pool)
  ↓ bloquear tutorial; validar; reler avaliação sob bloqueio quando necessário
  ↓ persistir criação / edição / remoção de avaliação usando { client }
  ↓ await AvaliacaoEventPublisher.notificar(evento, { client })
  ↓ await PontuacaoAvaliacaoObserver.atualizar(evento, { client })
  ↓ UsuarioModel.adicionarPontos → UsuarioRepository usando o mesmo client
  ↓ construir resultado e resumo usando o mesmo client, quando aplicável
COMMIT

Falha em qualquer etapa → ROLLBACK → release(erro) → rejeição ao chamador
```

O Publisher e o Observer não abrem conexão nem iniciam/confirmam transação. O Repository
aguarda o callback inteiro de `emTransacao`, incluindo a notificação, antes de confirmar.
Uma rejeição do Observer, mesmo após o UPDATE de pontos, alcança o catch do Repository e
desfaz ambos os efeitos. Não existe notificação posterior ao COMMIT.

O Service mantém bloqueios, validações, persistência, cálculo de delta e composição da
resposta. O CRUD normal não chama mais `adicionarPontos` diretamente. Criação/edição leem o
autor após as reações, no mesmo client; isso acrescenta uma leitura e evita depender do
retorno de um observer. O nível anterior é capturado como valor antes da mutação, também
para os MemoryRepositories, que retornam referências mutáveis. Os campos e status da API
permanecem os mesmos. O DELETE mantém o retorno da avaliação removida.

### Por que cascatas permanecem agregadas

`removerTutorialCompleto` soma as avaliações, desconta o autor e executa DELETE com CASCADE
na mesma transação. `removerDadosDoUsuario` agrupa reversões por outros autores antes do
DELETE da conta. Esses dois fluxos continuam chamando diretamente o ajuste agregado no
Service. Produzir um evento por avaliação aumentaria trabalho e fragmentaria operações
em lote que já possuem coordenação transacional clara. O Observer cobre o CRUD normal de
avaliações; não substitui cascatas nem triggers do banco.

**Benefício:** separação explícita entre persistir avaliação e reagir atualizando pontos,
com registro testável e protocolo aguardado. O desacoplamento é entre responsabilidades;
pontuação continua obrigatória para o sucesso da operação.

**Limites:** não é processamento em background ou consistência eventual. Chamadas diretas
aos métodos de persistência de AvaliacaoModel/Repository não publicam eventos; os endpoints
usam o Service coordenador. Adicionar consumidores externos exigiria outra análise de
atomicidade. Não foram criados observers adicionais para simular extensibilidade.

**Evidências:** `tests/avaliacaoObserver.test.js` cobre registro, deduplicação por identidade,
isolamento, Publisher vazio, ordem/espera async, propagação de erro e client obrigatório.
Os novos casos em `tests/relacionamentosPostgres.test.js` usam os Repositories reais com
Pool/client falsos para verificar eventos/deltas, identidade do client, um ajuste por evento,
COMMIT aguardado, rollback após o Observer ajustar pontos nos três CRUDs e cascatas sem
eventos individuais. `tests/comentarioAvaliacaoPersistencia.test.js` também confere via HTTP
níveis anterior/atual e disponibilidade com MemoryRepositories.

Explicação acadêmica: “A mudança em uma avaliação gera um evento; um observador reage
atualizando a pontuação do autor, desacoplando a reação da persistência principal sem
perder a mesma transação.”

## Auditoria limitada de resíduos e dependências

- Nenhum uso de `cookie-session`, `SESSION_SECRET`, `req.session`, `executarOperacaoHibrida`
  ou `operacaoAtual` permanece no código de produção. Não foram encontrados Repositories
  antigos sem uso ou TODOs técnicos resolvidos nesse escopo.
- `AGENTS.md` ainda descrevia cookie-session e persistência em memória como atuais; essas
  informações foram corrigidas. `CONTEXTO_CODEX.md` ainda anunciava Observer como pendente
  e chamava 208 testes de suíte atual em um relato histórico; o estado foi atualizado.
- As menções à remoção dos mecanismos antigos em documentos de migração são histórico válido.
  `SESSION_SECRET` eventualmente presente no `.env` local não é consumido; esse arquivo não
  foi alterado nem seus valores expostos.
- Imports Data permanecem somente no seed/verificador e nos caminhos MemoryRepository de
  teste, carregados sob demanda. Os adapters em memória continuam necessários. O comentário
  sobre desempates históricos da busca descreve compatibilidade legítima.
- `package.json`, lockfile e `npm.cmd ls --depth=0` confirmam a ausência de cookie-session.
  `jsonwebtoken` é usado em tokenService; `cookie-parser` no Express; `pg` em
  DatabaseConnection; `bcryptjs` na autenticação e nas fixtures. Dependências e versões
  foram preservadas, sem `npm audit fix`.

Observação histórica: ocorreram dois NetworkError transitórios ao editar comentário e avaliar;
repetir funcionou. Não houve reprodução nesta etapa nem no Preview real posteriormente
validado pelo responsável. Nenhuma alteração de código foi feita por esses relatos.

## Validação da etapa

Baseline: **241 testes aprovados** antes das alterações. Resultado final: **258 aprovados**,
sendo os 241 anteriores preservados e 17 novos, sem acesso ao Neon real. Comando:
`npm.cmd test`. Os testes anteriores continuam cobrindo JWT, HTTP, pontos, rollback, tutorial,
perfil, ranking, cascatas, assets e contratos de frontend. Não houve mudança de schema, seed,
migrations, JWT, frontend, CSS ou entrada Vercel; nenhuma dependência foi adicionada.
