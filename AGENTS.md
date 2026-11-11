# AGENTS.md — MExplica

Este arquivo contém contexto e regras para agentes de código que trabalharem no projeto MExplica.

## Objetivo do projeto

O MExplica é uma plataforma acadêmica de inclusão digital. A aplicação ajuda usuários com dificuldade no uso de dispositivos, aplicativos e serviços digitais por meio de tutoriais, comunidade, perfis de colaboradores, avaliações e comentários.

## Regra principal

NÃO reorganize a arquitetura arbitrariamente.

A estrutura atual foi resultado de uma refatoração incremental com testes de regressão. Antes de alterar arquitetura, caminhos de arquivos ou responsabilidades entre camadas:

1. entenda a implementação atual;
2. preserve o comportamento;
3. execute os testes;
4. faça a menor mudança necessária.

## Stack

- Node.js
- Express
- EJS
- HTML
- CSS
- JavaScript
- bcryptjs
- cookie-session
- dotenv
- Vercel

## Execução

```powershell
npm.cmd run dev
npm.cmd test
```

O projeto usa `node:test`. Não adicione Jest, Mocha ou outro test runner sem necessidade.

## Arquitetura

```text
Route
  ↓
Controller
  ↓
Service (quando necessário)
  ↓
Model
  ↓
Data
```

Nem toda chamada precisa passar por todas as camadas.

### Controllers

Devem focar em HTTP: `req`, `res`, status, renderização e chamadas para Models/Services.

### Services

Use Service apenas quando houver valor arquitetural real: composição de várias entidades, validação/regra reutilizável, integridade, operação em cascata ou cálculo complexo.

Não crie Services que apenas retornem diretamente uma chamada de Model.

### Models

Concentram operações das entidades.

### Data

Contém os arrays em memória atuais. Não mover novamente os grandes dados de demonstração para dentro dos Models.

## Services existentes

```text
src/services/
├── tutorialService.js
├── perfilService.js
├── comentarioService.js
└── relacionamentoService.js
```

- `tutorialService`: validação, normalização e enriquecimento de tutorial.
- `perfilService`: montagem completa de perfil e estatísticas.
- `comentarioService`: enriquecimento e listagem de comentários completos.
- `relacionamentoService`: exclusões em cascata, integridade e ajustes de pontos.

Não devolver essas responsabilidades para Controllers ou `utils`.

## Frontend JavaScript

```text
public/js/
├── core/
│   ├── api.js
│   └── site.js
├── auth/
│   └── cadastro.js
├── home/
│   ├── search.js
│   └── search-render.js
├── perfil/
│   ├── ui.js
│   └── account.js
└── tutorial/
    ├── view.js
    └── editor.js
```

Regras:

- `core/api.js` é a implementação compartilhada de chamadas HTTP;
- evite recriar helpers locais de `fetch`;
- `core/site.js` contém comportamento global de interface;
- `search-render.js` deve carregar antes de `search.js`;
- `perfil/ui.js` deve carregar antes de `perfil/account.js`;
- preserve a ordem dos `<script>` quando existir dependência;
- não migrar todo o frontend para ES Modules em uma alteração incidental.

## CSS

As páginas carregam somente:

```html
<link rel="stylesheet" href="/css/style.css">
```

`style.css` importa, nesta ordem:

```text
base.css
home.css
auth.css
community.css
tutorial.css
search.css
profile.css
```

Preserve a ordem salvo quando uma alteração for deliberadamente testada.

## Vercel

Entrada:

```text
api/index.js
```

que exporta:

```text
src/index.js
```

Não substituir esse fluxo sem motivo. Arquivos estáticos são servidos a partir de `public/`.

## Persistência

Os dados atuais vivem em memória. Isso é conhecido e aceito no estágio atual do projeto. Adicionar banco de dados deve ser tratado como uma feature/arquitetura separada.

## Testes

Antes e depois de modificar:

```powershell
npm.cmd test
```

Se um teste antes verde falhar, corrija a regressão antes de continuar. Faça validação manual quando houver interface envolvida.

## Evite sem necessidade

- Clean Architecture completa;
- DDD pesado;
- containers de injeção de dependência;
- Repository Pattern apenas por estética;
- migração CommonJS → ESM incidental;
- troca de framework de testes;
- troca de framework frontend;
- grandes refatorações em um único commit.

## Critério de sucesso

Uma alteração arquitetural só está concluída quando:

- testes continuam verdes;
- comportamento foi preservado;
- interface continua correta;
- caminhos estáticos funcionam;
- não existem erros relevantes no Console;
- a Vercel continua compatível.
