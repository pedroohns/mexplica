# MExplica

O **MExplica** é uma plataforma acadêmica desenvolvida com o objetivo de tornar a tecnologia mais acessível, especialmente para idosos e pessoas que possuem dificuldades na utilização de dispositivos, aplicativos e serviços digitais.

A proposta da plataforma é oferecer um ambiente simples, acessível e colaborativo, onde o usuário possa pesquisar dúvidas relacionadas à tecnologia, encontrar tutoriais passo a passo e contar com conteúdos produzidos por colaboradores da comunidade.

## Sobre o projeto

O MExplica nasceu como um projeto acadêmico voltado à **inclusão e acessibilidade digital**.

A plataforma busca reduzir algumas das barreiras encontradas por pessoas com menor familiaridade com tecnologia, oferecendo uma interface de fácil utilização, conteúdos organizados de maneira simples e recursos voltados à acessibilidade.

Ao longo do desenvolvimento, o projeto evoluiu de um protótipo visual para uma aplicação funcional com frontend e backend integrados.

Entre os recursos presentes atualmente no projeto estão:

- Pesquisa de dúvidas e tutoriais relacionados à tecnologia;
- Organização e filtragem dos resultados;
- Tutoriais estruturados em etapas;
- Suporte a imagens de apoio e vídeos;
- Cadastro e autenticação de usuários;
- Perfis de usuários e colaboradores;
- Sistema de colaboradores com níveis e pontuação;
- Criação, edição e exclusão de tutoriais;
- Comentários em tutoriais;
- Avaliação de conteúdos;
- Ranking de colaboradores;
- Controle de permissões de acordo com o tipo de usuário;
- Ajuste do tamanho dos textos da interface;
- Modo escuro;
- Modo de conforto ocular;
- Integração com o VLibras;
- Interface responsiva.

## Objetivo

O principal objetivo do MExplica é contribuir para a **inclusão digital**, criando uma experiência em que pessoas com pouca familiaridade com tecnologia possam encontrar ajuda de maneira simples, compreensível e acessível.

A plataforma procura aproximar tecnologia e usuário, priorizando uma interface intuitiva e oferecendo diferentes formas de acesso às informações.

Também buscamos incentivar a participação de colaboradores, que podem produzir conteúdos e ajudar outros usuários da plataforma.

## Funcionamento

O MExplica possui uma estrutura baseada em frontend e backend.

O sistema conta com funcionalidades de autenticação, cadastro, sessão de usuário e diferentes níveis de permissão.

Os usuários podem pesquisar e visualizar tutoriais, enquanto colaboradores autenticados possuem acesso a funcionalidades relacionadas à criação e manutenção de conteúdos.

Os tutoriais podem conter:

- Título;
- Descrição;
- Categoria;
- Etapas;
- Tags;
- Imagens de apoio;
- Vídeos;
- Comentários;
- Avaliações.

O projeto também possui operações de criação, leitura, atualização e exclusão de dados através do backend.

## Tecnologias utilizadas

O projeto utiliza atualmente:

- HTML;
- CSS;
- JavaScript;
- Node.js;
- Express.js;
- EJS;
- bcryptjs;
- cookie-session;
- dotenv;
- Vercel.

A aplicação está organizada seguindo uma estrutura baseada no padrão **MVC (Model-View-Controller)**, separando models, controllers, rotas, views e middlewares.

## Acessibilidade

A acessibilidade é um dos principais pilares do MExplica.

Por isso, a interface conta com recursos desenvolvidos para atender diferentes necessidades dos usuários, incluindo:

- Controle para aumentar ou diminuir o tamanho dos textos;
- Modo escuro;
- Modo de conforto ocular;
- Integração com o VLibras;
- Interface desenvolvida com foco em simplicidade;
- Conteúdos organizados de forma gradual e compreensível;
- Apoio através de imagens e vídeos.

## Persistência de dados

Atualmente, os dados utilizados pela aplicação são mantidos através de arrays de objetos presentes nos Models.

Essa estrutura é utilizada nesta etapa do projeto para permitir o desenvolvimento e demonstração das funcionalidades do sistema, incluindo autenticação, CRUD, comentários, avaliações e regras de acesso.

A implementação de uma camada definitiva de persistência com banco de dados poderá fazer parte de etapas futuras do projeto.

## Equipe

O MExplica é desenvolvido em grupo como parte de um projeto acadêmico.

Integrantes:

- **Pedro Henrique de Souza Silva**
- **Arthur Drumond Teles**
- **Miguel Lacerda**
- **Bernardo Gonzaga**
- **Wladnei Jr**
- **Pedro de Paula**

O desenvolvimento do projeto envolve atividades de pesquisa, planejamento, UX/UI, desenvolvimento, documentação, testes e evolução das funcionalidades da plataforma.

## Minha participação

Minha participação no MExplica envolve principalmente o desenvolvimento e integração da plataforma.

Ao longo do projeto, minha atuação passou a incluir:

- Desenvolvimento e implementação da interface;
- Integração entre frontend e backend;
- Desenvolvimento de funcionalidades;
- Estruturação de rotas, controllers, models e middlewares;
- Implementação do sistema de autenticação;
- Implementação de operações de criação, leitura, edição e exclusão;
- Testes das funcionalidades;
- Organização da estrutura do projeto;
- Configuração do deploy;
- Participação nas discussões e decisões relacionadas à evolução da plataforma.

O projeto continua em desenvolvimento e minha atuação também acompanha a evolução das funcionalidades e das necessidades da aplicação.

## Status

🟡 **Protótipo funcional — em desenvolvimento**

O MExplica possui atualmente frontend e backend integrados, autenticação, gerenciamento de usuários, tutoriais, comentários, avaliações e diferentes níveis de permissão.

Algumas áreas da interface ainda estão em processo de evolução e novas funcionalidades continuam sendo desenvolvidas.

## Demonstração

O projeto está disponível para visualização através do deploy realizado na Vercel:

[Visualizar MExplica](https://mexplica-atualizado.vercel.app/)
