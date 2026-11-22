# Arquitetura do MExplica

## 1. Visão geral

O MExplica é uma plataforma acadêmica voltada à inclusão digital, com foco em pessoas que possuem dificuldade no uso de dispositivos, aplicativos e serviços digitais.

A aplicação utiliza Node.js com Express no backend, EJS para renderização de páginas, HTML/CSS/JavaScript no frontend e deploy na Vercel.

A arquitetura atual foi organizada para manter o projeto simples, legível e adequado ao seu porte, evitando padrões complexos sem necessidade.

## 2. Fluxo principal

```text
Route
  ↓
Controller
  ↓
Service (quando existe regra de negócio ou composição)
  ↓
Model
  ↓
Repository → PostgreSQL (runtime) / MemoryRepository → Data (testes)
```

Nem toda operação precisa passar por um Service. Services são usados apenas quando existe uma responsabilidade que ultrapassa simples manipulação de dados, como composição de informações vindas de vários Models, validação e normalização de regras de domínio, integridade entre entidades, operações em cascata ou cálculos complexos.

## 3. Estrutura do projeto

```text
mexplica/
├── api/
│   └── index.js
├── public/
│   ├── css/
│   │   ├── style.css
│   │   ├── base.css
│   │   ├── home.css
│   │   ├── auth.css
│   │   ├── community.css
│   │   ├── tutorial.css
│   │   ├── search.css
│   │   ├── profile.css
│   │   ├── mexplicai.css
│   │   └── admin.css
│   ├── js/
│   │   ├── core/
│   │   │   ├── api.js
│   │   │   └── site.js
│   │   ├── auth/
│   │   │   └── cadastro.js
│   │   ├── admin/
│   │   │   └── painel.js
│   │   ├── home/
│   │   │   ├── search.js
│   │   │   └── search-render.js
│   │   ├── perfil/
│   │   │   ├── ui.js
│   │   │   └── account.js
│   │   └── tutorial/
│   │       ├── view.js
│   │       └── editor.js
│   ├── fontes/
│   ├── icons/
│   ├── images/
│   ├── index.html
│   └── cadastro.html
├── src/
│   ├── controllers/
│   ├── data/
│   ├── database/
│   ├── events/
│   ├── middlewares/
│   ├── models/
│   ├── observers/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── views/
│   └── index.js
├── tests/
├── docs/
│   └── ARQUITETURA.md
├── AGENTS.md
├── package.json
├── package-lock.json
├── vercel.json
└── README.md
```

## 4. Backend

### Routes

As Routes definem os endpoints, aplicam middlewares e encaminham as requisições para os Controllers. Não devem concentrar regras de negócio extensas.

### Controllers

Controllers representam a camada HTTP. Devem principalmente ler `req.params`, `req.query` e `req.body`, chamar Models ou Services, escolher códigos de status, renderizar views ou enviar JSON.

### Services

A pasta `src/services/` concentra operações com responsabilidade de negócio ou composição.

- `tutorialService.js`: validação, normalização e enriquecimento de tutoriais.
- `perfilService.js`: montagem dos dados completos de perfil e estatísticas.
- `comentarioService.js`: enriquecimento e listagem de comentários completos.
- `relacionamentoService.js`: integridade, exclusões em cascata, coordenação transacional de avaliações e publicação dos eventos de pontuação.
- `tokenService.js`: assinatura/verificação JWT, algoritmo, issuer, audience e validade centralizados.
- `adminService.js`: composição das listagens e contagens administrativas, projeções seguras, busca e paginação; reutiliza os Models de domínio.

`adminController` e `adminRoutes` atendem `/admin` e `/api/admin`. Não existe AdminRepository:
as entidades continuam nos repositories atuais, com contagens e leitura leve de tutoriais.
Exclusões reutilizam relacionamentoService ou ComentarioModel, com as transações existentes.
Contas administrativas não podem ser excluídas por nenhum dos endpoints de conta; a validação
fica no Service após bloqueio e releitura do alvo.

### Models

Models concentram operações sobre cada entidade: busca, criação, alteração, exclusão, filtros e consultas específicas.

### Eventos e observer de avaliação

`src/events/avaliacaoEventPublisher.js` implementa o Subject/Publisher. Seu `registrar()` mantém
observers em um Set; `notificar()` aguarda cada `atualizar()` em sequência e propaga falhas.
`src/observers/pontuacaoAvaliacaoObserver.js` reage aos eventos usando
`UsuarioModel.adicionarPontos(autorId, deltaPontos, { client })`; o Model mantém as regras de nível
e disponibilidade e delega o incremento atômico ao Repository.

`relacionamentoService` compõe um Publisher e registra uma instância do observer ao carregar
o módulo, sem registro por request. Após persistir a avaliação, publica `avaliacaoCriada`,
`avaliacaoAtualizada` ou `avaliacaoRemovida`. Os eventos contêm `tipo`, `autorId` e `deltaPontos`;
o client é contexto de execução separado. O cálculo continua usando somente
`AvaliacaoModel.pontosPorNota`: nota na criação, diferença na edição e valor negativo na remoção.

```text
AvaliacaoController → relacionamentoService
  ↓ AvaliacaoModel.emTransacao → BEGIN (Repository)
  ↓ bloqueios/validações e persistência da avaliação
  ↓ await AvaliacaoEventPublisher.notificar(evento, { client })
  ↓ await PontuacaoAvaliacaoObserver.atualizar(evento, { client })
  ↓ UsuarioModel → UsuarioRepository (mesmo client)
  ↓ leitura do resultado/resumo no mesmo client
  ↓ COMMIT, ou ROLLBACK se qualquer etapa falhar
```

A resposta de criação/edição consulta o autor após a notificação; o nível anterior é capturado
antes da mutação, inclusive no adapter em memória. O Service não depende do retorno do observer.
O Publisher pode estar vazio isoladamente, mas a composição de produção sempre registra o
observer de pontuação. O observer recusa execução sem client para evitar um ajuste em autocommit.

Exclusões de tutorial e usuário mantêm os cálculos agrupados no Service e o CASCADE do banco,
na mesma transação. Não publicam eventos por avaliação: são operações em lote com contexto e
estratégia próprios, já testadas. A API, as views e a autenticação permanecem com os mesmos contratos.

### Data

A pasta `src/data/` contém fixtures de testes e seed:

```text
tutorialData.js
usuarioData.js
comentarioData.js
avaliacaoData.js
```

Essa camada separa dados de demonstração da lógica dos Models. O runtime usa exclusivamente
os Repositories PostgreSQL selecionados pela RepositoryFactory; testes usam MemoryRepositories.

### Middlewares

Middlewares cuidam de comportamentos transversais do ciclo HTTP. Após assets/health,
`cookie-parser` lê cookies e `carregarUsuario` verifica o JWT de cookie HttpOnly ou Bearer
(prioritário nas APIs), consulta o usuário por `sub` e preenche `req.usuario`/`res.locals.usuarioAtual`.
`exigirAutenticacao`, `exigirColaborador`, `exigirPlatina` e `exigirAdministrador` usam o usuário atual do PostgreSQL.
Administração depende somente de `req.usuario.administrador === true`, sem exigir colaboração,
pontos ou nível. JWT mantém apenas identidade/claims de validação, sem congelar permissões.
`src/utils/authCookie.js` centraliza criação/limpeza e atributos do cookie; não contém regra de domínio.
Não há estado de sessão em memória. Consulte [AUTENTICACAO.md](AUTENTICACAO.md).

### Utils

`src/utils/` deve conter apenas recursos auxiliares e reutilizáveis que não representem operações de negócio complexas. `categorias.js` é o principal exemplo atual.

## 5. Frontend

### `public/js/core/`

`site.js` concentra comportamento global de interface, como tema, acessibilidade, tamanho da fonte, navegação e animações.

`api.js` centraliza `fetch`, headers padrão, conversão JSON e tratamento padrão de erros. Scripts de página não devem recriar helpers locais de comunicação HTTP sem necessidade.

### `public/js/auth/`

`cadastro.js` concentra verificação de usuário, login, cadastro, passos do formulário e escolha de colaborador.

### `public/js/admin/`

`painel.js` usa a API compartilhada para listagens, busca, paginação e exclusão com dialog
nativo, feedback e atualização de contagens. A entrada Moderação no header depende da sessão
privada; a autorização efetiva permanece no servidor. `toPublic()` omite a flag administrativa.

### `public/js/home/`

`search.js` controla estado da busca, filtros, eventos, chamada da API e ativação/desativação do modo de busca.

`search-render.js` controla a renderização visual dos resultados. Ele deve ser carregado antes de `search.js`.

### `public/js/perfil/`

`ui.js` cuida de modais, menus, filtros, compartilhamento e interações visuais.

`account.js` cuida de edição, disponibilidade, logout e exclusão de conta. `ui.js` deve ser carregado antes de `account.js`.

### `public/js/tutorial/`

`view.js` concentra os comportamentos da página de tutorial.

`editor.js` concentra os comportamentos do editor.

Esses arquivos permanecem separados por contexto, sem fragmentação artificial adicional.

## 6. CSS

O ponto de entrada continua sendo:

```text
public/css/style.css
```

As páginas devem carregar somente:

```html
<link rel="stylesheet" href="/css/style.css">
```

`style.css` importa os módulos nesta ordem:

```text
base.css
home.css
auth.css
community.css
tutorial.css
search.css
profile.css
mexplicai.css
admin.css
```

A ordem deve ser preservada porque a cascata pode alterar o comportamento visual mesmo quando o conteúdo das regras não muda.

## 7. Testes

O projeto utiliza o test runner nativo do Node.js:

```powershell
npm.cmd test
```

A suíte cobre endpoints, autenticação/autorização, páginas, Services, integridade de relacionamentos, sintaxe dos scripts do frontend, arquivos estáticos, ordem de dependências e estrutura modular do CSS.

Antes e depois de qualquer refatoração relevante, os testes devem ser executados.

## 8. Vercel

A entrada serverless é:

```text
api/index.js
```

que exporta a aplicação definida em:

```text
src/index.js
```

Fluxo:

```text
Vercel
  ↓
api/index.js
  ↓
src/index.js
  ↓
Express
```

Arquivos estáticos são servidos a partir de `public/`.

## 9. Persistência

Usuários, tutoriais, passos, tags, comentários e avaliações persistem em PostgreSQL no runtime:

```text
Controller
  ↓
Service (quando necessário)
  ↓
Model
  ↓
Repository (selecionado pela RepositoryFactory)
  ↓
PostgreSQL (Pool do DatabaseConnection Singleton)
```

Persistência real está concluída. `src/data/` e MemoryRepositories continuam nos testes offline
e seed; não há fallback em memória no runtime. Detalhes em [BANCO_DE_DADOS.md](BANCO_DE_DADOS.md).

## 10. Princípios adotados

- separação de responsabilidades;
- alta coesão;
- baixo acoplamento;
- manutenibilidade;
- testabilidade;
- mudanças incrementais;
- preservação de comportamento;
- arquitetura proporcional ao tamanho do projeto.

O objetivo não é implementar padrões apenas para aumentar a quantidade de camadas.

## 11. Regra para futuras refatorações

Antes de mover ou dividir código:

1. identificar a responsabilidade real;
2. verificar se existe duplicação ou acoplamento problemático;
3. criar ou reforçar testes quando necessário;
4. alterar uma responsabilidade por vez;
5. executar a suíte;
6. validar visualmente quando houver frontend envolvido;
7. fazer commits pequenos e reversíveis.

## 12. Auditoria dos padrões de projeto

- **Singleton**: `src/database/databaseConnection.js` possui uma instância compartilhada e um
  Pool criado sob demanda. Os quatro Repositories PostgreSQL e os comandos de infraestrutura
  reutilizam `getInstance().getPool()`. Existe apenas um local de `new Pool` no código de
  produção. O escopo é o processo/instância serverless; o Pool pode conter várias conexões.
- **Factory**: `src/repositories/repositoryFactory.js` seleciona os Repositories de Usuario,
  Tutorial, Comentario e Avaliacao. `NODE_ENV=test` usa MemoryRepositories e os demais ambientes
  usam PostgresRepositories; os Models não selecionam implementações concretas. É uma Factory
  simples com métodos estáticos, sem hierarquias adicionais.
- **Observer**: a auditoria inicial não encontrou um Observer de domínio no backend. O listener
  de erro do Pool, callbacks transacionais e listeners/IntersectionObserver do browser não
  representavam o caso de negócio. Foi implementado somente o ciclo de avaliação → pontuação,
  com registro explícito, notificação aguardada e transação preservada.

Singleton e Factory foram mantidos sem alterações. Participantes, justificativas, limites,
diagramas e evidências estão em [PADROES_DE_PROJETO.md](PADROES_DE_PROJETO.md).
