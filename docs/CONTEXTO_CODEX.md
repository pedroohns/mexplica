# CONTEXTO_CODEX.md — Estado atual do MExplica

> Este arquivo registra o **estado atual do produto e do trabalho em andamento**.
> Ele complementa `AGENTS.md` e `docs/ARQUITETURA.md`.
>
> Ordem recomendada para qualquer agente de código:
>
> 1. `AGENTS.md`
> 2. `docs/ARQUITETURA.md`
> 3. `docs/CONTEXTO_CODEX.md`
> 4. arquivos diretamente relacionados à tarefa atual
>
> O código do repositório continua sendo a fonte de verdade. Se este documento ficar desatualizado, prevalece o comportamento implementado e testado no código.

---

## 1. Projeto

O MExplica é uma plataforma acadêmica de inclusão digital.

O sistema conecta usuários que precisam de ajuda com tecnologia a colaboradores que publicam tutoriais acessíveis. O projeto também possui perfis, comunidade, ranking, comentários, avaliações, busca e recursos de acessibilidade.

Stack atual:

- Node.js
- Express 5
- EJS
- HTML
- CSS
- JavaScript vanilla
- bcryptjs
- cookie-session
- dotenv
- Vercel
- `node:test`

Não introduzir framework frontend, novo test runner ou arquitetura paralela sem necessidade real.

---

## 2. Estado do Git

A branch estável de produção é:

```text
main
```

A branch atualmente usada para as implementações visuais e funcionais desta fase é:

```text
implementacao-visual
```

Trabalhos desta fase na branch:

1. implementação visual e funcional da nova página `/comunidade`;
2. atualização de dependências transitivas de segurança no `package-lock.json`;
3. fluxo integrado de criação, edição e visualização de tutoriais por blocos;
4. MExplicAI v1 local, concluindo as features visuais planejadas, disponível para revisão manual antes do merge.

Consulte o Git para a contagem atual de commits. A implementação do MExplicAI não faz commit ou merge automaticamente.

Não fazer implementações desta fase diretamente na `main`.

---

## 3. Baseline de testes da branch atual

A suíte atual possui:

```text
68 testes (50 anteriores + 13 do MExplicAI + 5 da integração global do VLibras)
```

Distribuição atual:

```text
comentarioService.test.js       3
community.test.js               1
css.test.js                     2
frontend.test.js                3
mexplicai.test.js              13
perfilService.test.js           3
relacionamentoService.test.js   3
smoke-test.js                  16
tutorialService.test.js         4
tutorialBlocos.test.js         15
vlibras.test.js                 5
```

Antes de uma alteração relevante:

```powershell
npm.cmd ci
npm.cmd test
```

Ao final da implementação:

```powershell
npm.cmd test
```

O objetivo é manter todos os testes verdes e adicionar testes quando a nova funcionalidade justificar proteção contra regressão.

Em uma máquina onde as dependências já estejam instaladas e o lockfile não tenha mudado, não é necessário executar `npm.cmd ci` a cada pequena alteração.

---

## 4. Arquitetura estável

Fluxo predominante do backend:

```text
Route
  ↓
Controller
  ↓
Service, quando existe regra/composição
  ↓
Model
  ↓
Data
```

Regras importantes:

- Controllers devem continuar focados em HTTP.
- Services só devem existir quando houver responsabilidade real de negócio/composição.
- Models concentram operações das entidades.
- Os dados atuais vivem em `src/data/`.
- Não devolver regras de relacionamento para `utils`.
- Não espalhar `fetch` pelo frontend; usar `public/js/core/api.js`.
- Não alterar a arquitetura apenas para implementar visual.

Services atuais:

```text
src/services/
├── tutorialService.js
├── perfilService.js
├── comentarioService.js
└── relacionamentoService.js
```

---

## 5. Estrutura atual do frontend

```text
public/js/
├── core/
│   ├── api.js
│   └── site.js
├── auth/
│   └── cadastro.js
├── home/
│   ├── search.js
│   ├── search-render.js
│   ├── mexplicai-engine.js
│   └── mexplicai.js
├── perfil/
│   ├── ui.js
│   └── account.js
└── tutorial/
    ├── contrato.js
    ├── view.js
    └── editor.js
```

CSS:

```text
public/css/
├── style.css
├── base.css
├── home.css
├── auth.css
├── community.css
├── tutorial.css
├── search.css
├── profile.css
└── mexplicai.css
```

`style.css` continua sendo o ponto de entrada e importa os módulos em ordem controlada para preservar a cascata.

---

## 6. Persistência atual

O projeto ainda usa dados em memória:

```text
src/data/
├── usuarioData.js
├── tutorialData.js
├── comentarioData.js
└── avaliacaoData.js
```

Isso significa:

- CRUD funciona durante a execução;
- mudanças não são persistência durável;
- ambiente serverless pode reiniciar e perder alterações;
- banco de dados real ainda NÃO foi implementado.

A migração para banco é uma fase futura e separada.

Não iniciar banco de dados incidentalmente durante implementações visuais.

---

## 7. Segurança atual

O projeto já possui:

- autenticação;
- sessão com `cookie-session`;
- cookies `httpOnly`;
- `sameSite: lax`;
- `secure` em produção;
- hash de senha com `bcryptjs`;
- autorização por middleware;
- níveis de acesso para colaborador e Platina.

Middlewares relevantes:

```text
carregarUsuario
exigirAutenticacao
exigirColaborador
exigirPlatina
```

Token/JWT ainda NÃO foi implementado.

A implementação de token será tratada em fase própria, depois do fechamento das funcionalidades atuais.

---

# 8. Implementação concluída recentemente: Comunidade

A página:

```text
/comunidade
```

foi redesenhada e sua implementação está concluída na branch `implementacao-visual`.

A nova comunidade preserva funcionalidades existentes e adiciona comportamento novo.

Principais características atuais:

- hero “Comunidade MExplica”;
- Ranking de Colaboradores;
- Ranking de Respostas;
- CTA condicionado à autenticação;
- manutenção dos tutoriais mais acessados da semana;
- footer da home;
- responsividade.

Arquivos principais envolvidos:

```text
src/views/comunidade.ejs
src/views/partials/community-ranking.ejs
public/css/community.css
src/controllers/paginaController.js
src/services/tutorialService.js
tests/community.test.js
tests/smoke-test.js
```

## Ranking de Colaboradores

Usa o ranking já existente de usuários colaboradores.

## Ranking de Respostas

O termo “respostas” representa, no contexto atual, a quantidade de tutoriais publicados pelo colaborador nos últimos sete dias.

A regra está em:

```text
TutorialService.rankingDeRespostas()
```

A implementação:

- considera uma janela móvel de 7 dias;
- conta publicações por autor;
- mantém somente colaboradores válidos;
- ordena por quantidade de tutoriais;
- usa nome e id como desempate;
- não substitui ausência de publicações recentes por dados antigos.

## CTA da Comunidade

Deslogado:

```text
Criar sua conta
→ /cadastro.html
```

Logado:

```text
+ Fazer publicação
→ /tutoriais/novo
```

Esse fluxo já possui cobertura de teste.

---

# 9. Atualização de dependências

A branch atual também contém uma atualização de dependências transitivas de segurança gerada por `npm audit fix`.

O `package.json` não sofreu mudança estrutural de dependências principais.

O `package-lock.json` foi atualizado para versões transitivas corrigidas.

Em novas máquinas, preferir:

```powershell
npm.cmd ci
```

em vez de usar `npm install` como rotina para reproduzir o ambiente.

---

# 10. Fluxo atual de tutoriais

Criação, edição e publicação compartilham agora o mesmo contrato de blocos:

```text
/tutoriais/novo
```

e:

```text
/tutoriais/:slug
```

Essas duas experiências são conceitualmente conectadas:

```text
criação do tutorial
        ↓
estrutura de dados produzida
        ↓
visualização do tutorial publicado
```

O editor compartilhado também atende:

```text
/tutoriais/:slug/editar
```

Os novos passos possuem `ordem`, `titulo`, `descricao`, `imagem` opcional e
`linkExterno` opcional. A criação inicia vazia; a edição recebe todos os dados.
São obrigatórios de 1 a 9 passos, com título de 3–120 caracteres e descrição
de 3–1000. O slug continua estável ao editar o título.

`TutorialService` valida e enriquece essa estrutura. Na leitura do legado,
a imagem separada é associada ao passo pela ordem, sem modificar os seeds.
Uma imagem integrada tem precedência; `imagem: null` representa remoção
explícita. O campo `imagens` continua disponível, derivado dos passos.

Os limites e as funções de URL são compartilhados por backend e browser em
`public/js/tutorial/contrato.js`, sem dependências. A validação binária de
imagens usada pelo Service fica em `src/services/tutorialImagem.js`.

Upload em memória: JPEG, PNG e WebP; arquivo de até 8 MB, mínimo de 120 × 120,
entrada de até 8192 pixels por lado e 24 milhões de pixels. O editor usa
FileReader/Canvas para preview e redução até 1600 pixels por lado e 72 KB
por imagem. A API confere formato, bytes e dimensões do arquivo serializado.
SVG não é aceito. O JSON global continua limitado a 1 MB, com erro 413 legível.
Nenhum storage externo ou banco foi introduzido.

Novos vídeos aceitam somente YouTube com ID validado. O player usa thumbnail
e carrega iframe de `youtube-nocookie.com` apenas após clicar. Vídeos externos
legados seguros permanecem editáveis e têm link de fallback.

A publicação oferece quadros ou coluna simples sobre os mesmos elementos,
sem request. Quatro passos usam 2×2; cinco a nove, até três colunas; tablet,
até duas; mobile, sempre uma. A seleção de categoria usa radios. Exclusão de
post usa dialog com Cancelar como foco inicial, Escape e retorno de foco.
Comentários, avaliações, pontos, níveis, palavras-chave e visualizações
permanecem integrados. O footer existente é reutilizado por um partial.

---

## 10.1 Rotas de página atuais

```text
GET /tutoriais/novo
GET /tutoriais/:slug/editar
GET /tutoriais/:slug
```

### `/tutoriais/novo`

Comportamento atual:

- usuário deslogado é redirecionado para cadastro/login com `redirect=/tutoriais/novo`;
- usuário autenticado que não é colaborador recebe 403;
- colaborador autenticado acessa o editor.

### `/tutoriais/:slug/editar`

Comportamento atual:

- exige autenticação;
- tutorial precisa existir;
- apenas o autor colaborador pode editar o próprio tutorial.

### `/tutoriais/:slug`

Comportamento atual:

- tutorial é localizado pelo slug;
- acesso incrementa visualizações;
- tutorial é enriquecido pelo `TutorialService`;
- comentários são carregados;
- página EJS é renderizada.

---

## 10.2 API atual de tutoriais

Leitura:

```text
GET /api/tutoriais
GET /api/tutoriais/buscar
GET /api/tutoriais/populares
GET /api/tutoriais/:id
```

CRUD:

```text
POST   /api/tutoriais
PUT    /api/tutoriais/:id
DELETE /api/tutoriais/:id
```

Criação, edição e exclusão exigem colaborador autenticado.

O update e delete também verificam se o usuário é autor do tutorial.

Comentários:

```text
GET  /api/tutoriais/:tutorialId/comentarios
POST /api/tutoriais/:tutorialId/comentarios
```

Avaliações:

```text
GET  /api/tutoriais/:tutorialId/avaliacoes
POST /api/tutoriais/:tutorialId/avaliacoes
```

---

## 10.3 Estrutura atual de um tutorial

O Model cria atualmente algo conceitualmente equivalente a:

```js
{
    id,
    slug,
    autorId,
    categoriaId,
    titulo,
    resumo,
    conteudo,
    passos,
    imagens,
    videoUrl,
    tags,
    visualizacoes,
    criadoEm,
    atualizadoEm
}
```

O slug é criado na publicação.

Ao editar o título, o slug NÃO muda, para preservar URLs compartilhadas.

---

## 10.4 Editor compartilhado

A view é `src/views/editor-tutorial.ejs`, o comportamento fica em
`public/js/tutorial/editor.js` e o visual em `public/css/tutorial.css`.
Categoria usa seleção única por cards; passos usam um construtor dinâmico.
O botão de adicionar ocupa a próxima posição do grid e some no limite de nove.
Remover um bloco renumera os demais. Cada bloco permite upload, preview,
substituição/remoção de imagem, título, descrição e link com confirmar/cancelar.

Palavras-chave continuam separadas por vírgulas. Vídeo e palavras-chave ficam
na área secundária. Publicar chama POST; salvar chama PUT. Ambos usam
`MExplicaApi.requisicao` e redirecionam para `/tutoriais/:slug` após sucesso.

## 10.5 Validação atual

`TutorialService.validarCampos()` preserva os limites de título (8–160),
resumo (15–320), introdução (30–6000), dez tags de até quarenta caracteres e
categorias existentes. Limites adicionais de blocos e imagens estão na seção 10.
Blocos inválidos ou excedentes são rejeitados, sem truncar silenciosamente.
Links externos exigem http/https e texto de até 120 caracteres. Conteúdo é
tratado como texto e escapado nas views; não se aceita HTML de embed.

## 10.6 Publicação

A view `src/views/tutorial.ejs` mostra autor, nível real, categoria, título,
resumo, estrelas funcionais, métricas, introdução, cards, vídeo, tags e comentários.
`public/js/tutorial/view.js` controla visualização, carregamento do player,
modal de exclusão e as interações existentes de avaliações e comentários.
Ações de autor permanecem protegidas no backend.

---

# 11. Manutenção do fluxo integrado

As três rotas de tutorial devem evoluir juntas, preservando o contrato entre
editor, validação, Model, API e publicação. Os dados de demonstração continuam
na estrutura antiga para exercitar a compatibilidade. Não migrá-los ou remover
campos sem pesquisar consumidores e executar os testes de regressão.

A validação desta implementação inclui a suíte Node e conferência no Chrome
de upload nos três formatos, adição/remoção, limite de blocos, links, criação,
edição, exclusão, foco/Escape no dialog, responsividade e tema escuro. A construção
do iframe foi verificada localmente; reprodução real depende do YouTube e da
disponibilidade do vídeo.

---

# 12. MExplicAI v1 implementado

O MExplicAI v1 conclui a última feature visual planejada desta branch. A entrega permanece local para revisão manual antes do fechamento e merge na `main`.

A seção abaixo dos resultados aparece sempre que `search-mode` está ativo, inclusive com busca vazia ou zero resultados. O renderer dos cards permanece independente. O painel fixo usa metade da viewport no desktop, 68% no tablet e toda a largura no mobile, com scroll próprio e composer acessível junto ao teclado virtual. Oferece abertura breve, minimizar em bolha, fechar sem apagar histórico e modal nativo de ajuda compartilhado pelo painel e pelo CTA.

`public/js/home/mexplicai-engine.js` contém funções puras compatíveis com browser e Node. Normaliza acentos, caixa, espaços e pontuação; compara palavras/frases inteiras e pontua termos principais, secundários e exemplos. Possui dez intenções: CarPlay, Android Auto, impressora Wi-Fi, espelhamento de TV, cache do navegador, compartilhamento de internet, teclado Bluetooth, pendrive, navegador padrão e fone Bluetooth. Também oferece saudações, agradecimentos e fallback. Não há modelo de IA, API externa de IA ou upload de anexos.

`public/js/home/mexplicai.js` controla DOM, sessão, persistência e integração. Antes de uma resposta local, consulta `/api/tutoriais/buscar` pelo helper `MExplicaApi`. Confere relevância nos candidatos devolvidos pela busca existente: cobertura mínima de 60% dos termos úteis e correspondência em título/tags; para uma intenção conhecida, também exige correspondência do assunto. Assim, um tutorial de Spotify no carro não responde a uma pergunta de CarPlay. Um tutorial humano relevante sempre tem prioridade, com link interno `/tutoriais/:slug`; o conteúdo não é copiado. Falha de rede é informada e permite orientação local.

As chaves `mexplicai:v1:history` e `mexplicai:v1:state` guardam no máximo 40 mensagens e o modo aberto/minimizado/fechado. Há limite de 800 caracteres por pergunta e validação dos campos, papéis e slugs ao restaurar. JSON corrompido ou armazenamento indisponível não impede o uso; nenhuma chave de outro recurso é apagada. Credenciais, sessão, avatar e arquivos não são persistidos pelo chat. O avatar usa iniciais de `/api/auth/sessao`; visitantes recebem `V` e não precisam fazer login.

Mensagens usam `textContent` e links são construídos por DOM com slug validado. O modal explica palavras-chave, LocalStorage, busca no servidor e ausência de modelo externo. Usa `dialog`, contenção de foco por teclado, Escape e retorno ao acionador. O painel oferece controles rotulados, log anunciado, foco visível, modo escuro e redução de movimento. Os assets existentes `mexplicai-logo.png` e `mexplicai-logo-completa.png` foram preservados. O CSS isolado é importado depois de `profile.css`, mantendo a ordem anterior.

Validação: 63 testes Node aprovados e conferência no Chrome local, com desktop, tablet/mobile emulados, tema escuro, redução de movimento, foco, Enter/Shift+Enter, sessão real para avatar, busca real de tutoriais, restauração do histórico, falha de rede e armazenamento bloqueado/corrompido. A interação com teclado virtual foi simulada reduzindo a viewport; a conferência em aparelho físico continua útil na revisão manual.

As logos completas mantêm a transparência original também no tema escuro, sem fundo claro artificial ou filtros de cor. O VLibras é inicializado globalmente por `site.js`, com um único markup/script/widget por página e tratamento de falha externa. Home e cadastro não possuem mais integrações próprias. O posicionamento à esquerda fica em `base.css`, acima do painel mobile do MExplicAI para manter o botão acessível. Os testes dessa integração usam simulação local, sem requisições ao VLibras. A conferência no Chrome abrangeu as sete rotas principais em claro/escuro e larguras desktop/tablet/mobile; como o serviço externo estava inacessível, seu widget foi simulado para validar posicionamento e coexistência, sem validar tradução real.

A próxima fase prevista é de entregáveis técnicos: banco, persistência, tokens e padrões descritos a seguir. Ela continua separada desta implementação.

---

# 13. Fase técnica posterior ao fechamento funcional

Quando as funcionalidades visuais e o MExplicAI v1 estiverem concluídos, será feita uma fase técnica separada para atender aos requisitos acadêmicos.

Pendências previstas:

```text
Banco de dados real
Primary Keys
Foreign Keys
normalização
integridade no banco
API → banco
persistência real
tokens
Factory
Singleton
Observer
```

Esses itens NÃO devem ser introduzidos incidentalmente na branch de implementação visual.

A migração para banco será deliberada e incremental.

---

# 14. Regras para agentes durante a branch implementacao-visual

1. Trabalhar sobre `implementacao-visual`, não sobre `main`.
2. Ler `AGENTS.md`, `docs/ARQUITETURA.md` e este arquivo.
3. Rodar testes antes de alterar.
4. Entender a implementação existente antes de substituir código.
5. Preservar autenticação, autorização e integração com Vercel.
6. Não migrar para React/Vue/etc.
7. Não adicionar biblioteca visual se CSS/JS atual resolver.
8. Não criar nova camada arquitetural sem necessidade real.
9. Não misturar banco de dados ou JWT com tarefa visual.
10. Não remover recursos funcionais simplesmente porque não aparecem no protótipo.
11. Diferenciar claramente comportamento a preservar, comportamento a alterar e comportamento novo.
12. Se uma alteração visual exigir mudança estrutural legítima, alterar todas as camadas afetadas de forma coerente.
13. Criar ou atualizar testes para comportamentos novos importantes.
14. Rodar a suíte completa ao final.
15. Informar os arquivos modificados e a razão de cada mudança.

---

# 15. Compatibilidade entre máquinas

O contexto de uma conversa local do Codex não deve ser tratado como memória permanente do projeto.

A memória confiável deve estar no Git:

```text
AGENTS.md
docs/ARQUITETURA.md
docs/CONTEXTO_CODEX.md
código
testes
histórico de commits
```

Ao trocar de computador:

```powershell
git pull
npm.cmd ci
npm.cmd test
```

Depois abrir o projeto no VS Code e iniciar uma nova tarefa fazendo referência a este contexto.

Não depender de uma thread antiga do Codex para compreender o projeto.

---

# 16. Quando atualizar este documento

Atualizar `docs/CONTEXTO_CODEX.md` quando ocorrer uma mudança relevante de estado, por exemplo:

- uma tela importante for concluída;
- uma funcionalidade nova entrar no projeto;
- começar a fase de banco de dados;
- mudar autenticação;
- mudar persistência;
- alterar significativamente a estrutura do tutorial;
- concluir a branch `implementacao-visual`.

Não transformar este arquivo em changelog detalhado.

Ele deve responder principalmente:

```text
Onde o MExplica está agora?
O que acabou de ser implementado?
O que está em desenvolvimento?
Quais decisões precisam ser preservadas?
Qual é a próxima fase?
```
