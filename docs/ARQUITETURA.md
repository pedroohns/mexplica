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
Data
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
│   │   └── profile.css
│   ├── js/
│   │   ├── core/
│   │   │   ├── api.js
│   │   │   └── site.js
│   │   ├── auth/
│   │   │   └── cadastro.js
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
│   ├── middlewares/
│   ├── models/
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
- `relacionamentoService.js`: integridade entre entidades, exclusões em cascata e ajustes de pontos.

### Models

Models concentram operações sobre cada entidade: busca, criação, alteração, exclusão, filtros e consultas específicas.

### Data

A pasta `src/data/` contém o estado em memória utilizado atualmente pelo projeto:

```text
tutorialData.js
usuarioData.js
comentarioData.js
avaliacaoData.js
```

Essa camada separa dados de demonstração da lógica dos Models. Ela não deve ser tratada como substituta permanente para um banco de dados.

### Middlewares

Middlewares cuidam de comportamentos transversais do ciclo HTTP, como carregar usuário da sessão e exigir autenticação ou níveis de acesso.

### Utils

`src/utils/` deve conter apenas recursos auxiliares e reutilizáveis que não representem operações de negócio complexas. `categorias.js` é o principal exemplo atual.

## 5. Frontend

### `public/js/core/`

`site.js` concentra comportamento global de interface, como tema, acessibilidade, tamanho da fonte, navegação e animações.

`api.js` centraliza `fetch`, headers padrão, conversão JSON e tratamento padrão de erros. Scripts de página não devem recriar helpers locais de comunicação HTTP sem necessidade.

### `public/js/auth/`

`cadastro.js` concentra verificação de usuário, login, cadastro, passos do formulário e escolha de colaborador.

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

Atualmente a aplicação usa arrays em memória. Isso é suficiente para o estágio acadêmico do projeto, mas não é persistência durável em ambiente serverless.

Uma evolução futura natural seria:

```text
Controller
  ↓
Service
  ↓
Repository / Model
  ↓
Banco de dados
```

A adoção de banco de dados deve ser uma evolução separada, não misturada a refatorações organizacionais.

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
