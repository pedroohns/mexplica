# MExplica

O **MExplica** é uma plataforma acadêmica voltada à **inclusão e acessibilidade digital**, desenvolvida para auxiliar principalmente idosos e pessoas com dificuldades na utilização de dispositivos, aplicativos e serviços tecnológicos.

A proposta é oferecer um ambiente simples e colaborativo no qual usuários possam pesquisar dúvidas sobre tecnologia, acessar tutoriais passo a passo e encontrar conteúdos produzidos por colaboradores da comunidade.

O projeto evoluiu de um protótipo visual para uma **aplicação web funcional com frontend e backend integrados**, autenticação, gerenciamento de usuários, diferentes níveis de permissão, operações CRUD e arquitetura organizada com base no padrão **MVC (Model-View-Controller)**.

> 🟡 **Status:** Protótipo funcional em desenvolvimento

### 🌐 Demonstração
A aplicação está disponível através da Vercel:

[MExplica — visualizar aplicação](https://mexplica-atualizado.vercel.app/)

---

## Objetivo
O principal objetivo do MExplica é contribuir para a **inclusão digital**, aproximando tecnologia e usuário através de conteúdos simples, acessíveis e organizados.
A plataforma busca reduzir algumas das barreiras enfrentadas por pessoas com menor familiaridade com tecnologia, oferecendo diferentes formas de acesso às informações e recursos de acessibilidade.
Além do consumo de conteúdos, o projeto também propõe uma comunidade de colaboradores, permitindo que usuários contribuam com tutoriais e auxiliem outras pessoas.

---

## Principais funcionalidades
Atualmente, o MExplica possui funcionalidades relacionadas a usuários, conteúdos, colaboração e acessibilidade.

### Usuários e autenticação
- Cadastro de usuários;
- Login utilizando e-mail ou telefone;
- Autenticação JWT, com cookie HttpOnly na web e Bearer nas APIs;
- Senhas armazenadas através de hash;
- Sessão de usuário;
- Perfis de usuários;
- Diferentes níveis de permissão;
- Sistema de colaboradores;
- Controle de acesso conforme o tipo de usuário.

### Tutoriais
- Pesquisa de dúvidas e conteúdos;
- Organização e filtragem dos resultados;
- Tutoriais estruturados em etapas;
- Utilização de tags e categorias;
- Suporte a imagens;
- Suporte a vídeos;
- Criação de tutoriais;
- Visualização de tutoriais;
- Edição de conteúdos;
- Exclusão de conteúdos.

### Interação e comunidade
- Comentários em tutoriais;
- Avaliação de conteúdos;
- Sistema de colaboradores;
- Pontuação de colaboradores;
- Ranking de colaboradores.

### Acessibilidade
- Ajuste do tamanho dos textos;
- Modo escuro;
- Modo de conforto ocular;
- Integração com VLibras;
- Interface responsiva;
- Organização gradual dos conteúdos;
- Apoio através de imagens e vídeos;
- Interface desenvolvida com foco em simplicidade e compreensão.
---

## Arquitetura
A aplicação utiliza uma organização baseada no padrão **MVC (Model-View-Controller)**, buscando separar responsabilidades e facilitar a manutenção e evolução do projeto.
A estrutura principal está dividida em:

- **Models:** representação e manipulação dos dados da aplicação;
- **Views:** páginas e interfaces renderizadas através do EJS;
- **Controllers:** tratamento HTTP, renderização e chamadas aos Models/Services;
- **Services:** validação, composição de entidades, integridade e operações transacionais;
- **Repositories:** persistência PostgreSQL no runtime e memória somente nos testes;
- **Routes:** definição e organização das rotas da aplicação;
- **Middlewares:** funções intermediárias utilizadas em autenticação, sessões e controle de acesso;
- **Utils:** funções auxiliares utilizadas pelo sistema;
- **Public:** arquivos estáticos da interface, como CSS, JavaScript e recursos visuais.

O fluxo principal é Route → Controller → Service quando necessário → Model → Repository.
`src/data/` contém dados demonstrativos usados pelo seed e pelos testes offline.
Os padrões implementados são Singleton (`DatabaseConnection`, Pool lazy por processo),
Factory (seleção dos quatro Repositories) e Observer (avaliações e pontuação na mesma transação).
Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e
[docs/PADROES_DE_PROJETO.md](docs/PADROES_DE_PROJETO.md).

---

## Stack e execução

Node.js 24, Express 5, EJS, HTML/CSS/JavaScript, PostgreSQL/Neon, `pg`, `bcryptjs`,
`jsonwebtoken`, `cookie-parser` e `dotenv`. Hospedagem na Vercel.

Instale as dependências do lockfile com `npm.cmd ci`. Configure privadamente o `.env`
local, ignorado pelo Git, usando os nomes de [.env.example](.env.example):

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão pooled do Neon, preservando as opções SSL fornecidas pelo provedor |
| `JWT_SECRET` | Chave aleatória forte e estável para assinar/verificar JWT |
| `NODE_ENV` | `production` na hospedagem HTTPS; `test` é reservado à suíte offline |
| `PORT` | Opcional no desenvolvimento local; padrão 3000 |

Com o banco existente preparado, execute:

```powershell
npm.cmd run dev
```

Abra `http://localhost:3000`. Para rodar a suíte nativa `node:test`:

```powershell
npm.cmd test
```

Baseline atual: **262 testes aprovados**, sem acesso ao Neon real, com chave JWT exclusiva
de testes e driver real bloqueado. Schema, migrations e seed são comandos manuais separados;
não são executados por start, instalação ou deploy.
Consulte [docs/BANCO_DE_DADOS.md](docs/BANCO_DE_DADOS.md) e
[docs/AUTENTICACAO.md](docs/AUTENTICACAO.md) para preparação do banco e autenticação.

---

## API e backend
- levantamento e discussão de funcionalidades;
- organização arquitetural;
- desenvolvimento frontend;
- desenvolvimento backend;
- UX/UI;
- acessibilidade;
- controle de versão;
- documentação;
- testes;
- evolução contínua da aplicação.
---

## Equipe
- Pedro Henrique de Souza Silva
- Arthur Drumond Teles
- Miguel Lacerda
- Bernardo Gonzaga
- Wladnei Jr
- Pedro de Paula
---

## Minha participação
Minha atuação no MExplica começou principalmente na implementação da interface e evoluiu junto com o crescimento técnico do projeto.
Atualmente, minha participação inclui:
- desenvolvimento e evolução da interface;
- integração entre frontend e backend;
- implementação de funcionalidades;
- participação na organização da arquitetura baseada em MVC;
- estruturação de rotas;
- estruturação de controllers;
- estruturação de models;
- utilização e desenvolvimento de middlewares;
- implementação e evolução do sistema de autenticação;
- participação na implementação de operações CRUD;
- testes e identificação de problemas;
- organização da estrutura do projeto;
- configuração e manutenção do deploy;
- utilização de Git/GitHub no desenvolvimento colaborativo;
- participação nas discussões e decisões relacionadas à evolução da aplicação.
O projeto permanece em desenvolvimento e minha atuação acompanha a evolução das necessidades funcionais e arquiteturais da plataforma.
---

## Evolução do projeto
O MExplica começou como um projeto focado principalmente na construção da experiência visual da plataforma.
Com sua evolução, passou a incorporar conceitos e funcionalidades relacionados a:
1. construção e refinamento da interface;
2. recursos de acessibilidade;
3. organização das funcionalidades;
4. backend com Node.js e Express;
5. renderização através de EJS;
6. arquitetura baseada em MVC;
7. autenticação e sessões;
8. diferentes níveis de permissão;
9. operações CRUD;
10. comentários e avaliações;
11. organização dos dados através de Models;
12. persistência relacional em PostgreSQL/Neon através de Repositories.
Essa evolução transformou o projeto de um protótipo visual em uma aplicação funcional utilizada também como ambiente de aprendizado e aplicação prática de conceitos de desenvolvimento, arquitetura de software e análise de sistemas.
---

## Próximas etapas
O projeto continua em desenvolvimento.
Entre as principais possibilidades de evolução estão:
- revisão das correções finais e integração manual de `banco-persistencia` à `main` após aprovação;
- configuração e liberação de Production em uma etapa posterior autorizada;
- continuidade da evolução da arquitetura;
- aprimoramento das funcionalidades existentes;
- refinamento das interfaces;
- expansão dos recursos de acessibilidade;
- evolução da documentação técnica.
---

## Status atual
🟡 Protótipo funcional - em desenvolvimento
Atualmente, o MExplica possui:
- frontend e backend integrados;
- arquitetura baseada em MVC;
- autenticação;
- persistência do domínio em PostgreSQL/Neon;
- gerenciamento de usuários;
- tutoriais;
- comentários;
- avaliações;
- diferentes níveis de permissão;
- operações CRUD;
- recursos de acessibilidade;
- aplicação publicada na Vercel.
Algumas funcionalidades e interfaces continuam sendo refinadas conforme o projeto evolui.
---

## Observação
O MExplica é um projeto acadêmico em desenvolvimento.
Na branch `banco-persistencia`, o runtime usa PostgreSQL/Neon e autenticação JWT. Arrays de
demonstração ficam restritos aos testes offline e seed. O Preview real dessa branch na Vercel
já foi validado pelo responsável. A auditoria pré-merge está registrada abaixo; as correções
locais precisam ser revisadas e incluídas na branch antes do merge manual. Production
permanece para uma etapa posterior autorizada.

Configuração e checklist de validação: [docs/DEPLOY.md](docs/DEPLOY.md).
Resultados da auditoria final: [docs/AUDITORIA_PRODUCAO.md](docs/AUDITORIA_PRODUCAO.md).
