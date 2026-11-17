# Banco de dados do MExplica

O schema inicial está em `src/database/schema.sql`. Usuários e tutoriais agora usam PostgreSQL
no runtime real; somente comentários e avaliações continuam nos arrays de `src/data/`.
Os comandos de infraestrutura e o Repository reutilizam o Singleton `DatabaseConnection`.
O frontend e a autenticação com cookie-session permanecem preservados.

## Persistência de usuários no runtime

O fluxo é Controller → Service quando necessário → UsuarioModel → Repository → PostgreSQL.
`src/repositories/repositoryFactory.js` implementa Factory de forma explícita: cria
`UsuarioMemoryRepository` quando `NODE_ENV=test`, e `UsuarioPostgresRepository` nos demais
ambientes. `UsuarioModel` usa efetivamente essa Factory. Ausência de `DATABASE_URL` no
runtime normal gera erro de configuração ao usar o banco, sem fallback para arrays.

`npm.cmd test` carrega `scripts/testSetup.js`, que define o ambiente de testes, esvazia a
configuração de banco e bloqueia `pg.Client.connect`. A suíte permanece offline; testes do
Repository PostgreSQL injetam Pool/client falso. `usuarioData.js` permanece para esses
testes e para o seed, sem alimentar a persistência normal de usuários.

O Repository PostgreSQL concentra o SQL de usuários e usa `DatabaseConnection.getInstance()`.
O mapeamento central converte snake_case para camelCase, datas para ISO e contatos NULL
para os campos vazios do contrato atual. `tipo` e `nivel` são calculados pelo Model,
sem colunas extras.

Os onze métodos de persistência do Model são async: `findAll`, `findById`, `findBySlug`,
`findByIdentifier`, `getRanking`, `getPlatinaDisponiveis`, `create`, `update`,
`adicionarPontos`, `definirDisponibilidade` e `remove`. Controllers, middleware de sessão e
Services de perfil/tutorial/comentário/relacionamento aguardam seus resultados; coleções
de enriquecimento usam `Promise.all`. Assets estáticos e health checks são servidos antes
do carregamento do usuário da sessão, evitando consultas de usuário para CSS, JS e imagens.
Uma sessão que aponta para usuário removido é limpa; falhas inesperadas chegam ao middleware
global, com resposta genérica e sem impressão da exceção privada.

Cadastro preserva bcrypt, defaults e identity do banco. O Model gera slug base e sufixos,
consulta o Repository e tenta novamente se a UNIQUE detectar concorrência, limitado a 50
candidatos por cadastro. Conflitos conhecidos de email/telefone retornam HTTP 409; erros
inesperados continuam sendo falhas internas. Nenhuma senha em texto puro é persistida.

Edição usa whitelist de nome, sobrenome, bio, localização, idade e gênero. Cadastro e edição
usam uma única instrução parametrizada com RETURNING, sem transação manual desnecessária.
As transações de pontos, disponibilidade e exclusão permanecem preservadas.
ID, slug, pontos, senha e colaborador não são editáveis por esse endpoint.

Pontos usam incremento atômico com `GREATEST(0, pontos + delta)`; a disponibilidade é limpa
quando o saldo cai abaixo de Platina. Limites de nível continuam centralizados no Model e
são passados como parâmetros ao Repository. Somente colaboradores Platina alteram sua
disponibilidade. Ranking filtra colaboradores pelo threshold de Diamante e ordena por pontos.

## Persistência de tutoriais no runtime

A mesma RepositoryFactory fornece `TutorialMemoryRepository` em `NODE_ENV=test` e
`TutorialPostgresRepository` nos demais ambientes. O Repository PostgreSQL reutiliza
`DatabaseConnection.getInstance()`, compartilhando o Pool com usuários. `tutorialData.js`
permanece como fixture de testes/seed, sem alimentar a persistência normal de tutoriais.

As dez operações do TutorialModel são async: `findAll`, `findById`, `findBySlug`,
`findByAutorId`, `buscar`, `maisAcessadosDaSemana`, `incrementarVisualizacao`, `create`,
`update` e `remove`. Controllers de tutorial/página/comentário/avaliação e os Services de
perfil/tutorial/relacionamento aguardam os resultados, inclusive antes de map/filter/forEach.

Uma carga não vazia faz três SELECTs, independentemente da quantidade de tutoriais: metadados,
passos por `ANY(ids)` e tags por `ANY(ids)`. A hidratação agrupa as coleções por tutorial,
converte snake_case para camelCase e datas para ISO. Passos são ordenados por ordem; imagem
e link são objetos opcionais ou null. `imagens` é derivado dos passos; tags têm ordem
determinística por nome e não se repetem. Não existe tabela de imagens separada.

O Model mantém o algoritmo de busca sobre dados hidratados do Repository. Os pesos da frase
continuam 30/16/12/8/5/3 para título/tags/resumo/categoria/conteúdo/passos; por palavra,
7/5/4/3/2/1. Os desempates continuam por visualizações e ordem histórica de IDs. Listagens
usam data de criação decrescente. Mais acessados mantém sua janela e fallback existentes;
ranking de respostas mantém sete dias, autores colaboradores e desempates anteriores.
O contrato consumido pelo MExplicAI não mudou.

Criação usa um único client e transação para inserir `tutoriais`, `tutorial_passos` e
`tutorial_tags`. Edição bloqueia a linha, atualiza os campos permitidos e substitui as
coleções enviadas dentro da mesma transação. Falhas provocam ROLLBACK e descarte do client.
Autor vem da sessão e categoria é validada no Service, com FKs como garantia adicional.
Imagem serializada continua em TEXT, com os mesmos limites do contrato atual.

O Model gera o slug e consulta sua disponibilidade; colisão concorrente da UNIQUE tenta
o próximo sufixo, com limite de 50 candidatos. Slug, autor e visualizações não são editáveis
pelo update. Abrir `/tutoriais/:slug` executa `visualizacoes = visualizacoes + 1` em UPDATE
atômico e usa o tutorial retornado, sem nova consulta redundante do metadado. Esse GET escreve
no banco. `GET /api/tutoriais/:id` é uma alternativa de leitura sem incremento.

## Consistência temporária entre PostgreSQL e arrays

`relacionamentoService` serializa as mutações híbridas por processo. Uma avaliação só é
criada/editada/removida no array depois de confirmar o ajuste de pontos no PostgreSQL.
Excluir tutorial compartilha um único client entre TutorialPostgresRepository e o ajuste
de pontos do UsuarioPostgresRepository. O DELETE e o desconto de pontos são confirmados ou
desfeitos juntos; as cascatas removem passos/tags e dependentes persistidos. Somente após
o commit os comentários e avaliações correspondentes são removidos dos arrays.

Excluir usuário calcula os ajustes das avaliações em memória e executa ajustes de pontos
mais DELETE de usuário em uma única transação do Repository. As cascatas cuidam dos dados
persistidos, incluindo tutoriais do autor. IDs dos tutoriais e dependentes dos arrays são
capturados antes da exclusão. Uma carga em lote fornece os autores dos tutoriais avaliados,
evitando consulta por avaliação. Após o commit, comentários e avaliações são limpos de forma
síncrona. O adapter Memory simula a cascata de tutoriais para manter equivalência nos testes.
Se o PostgreSQL falhar, esses arrays permanecem.

Esses arrays são locais ao processo e reiniciam com ele. Não há transação distribuída ou
atomicidade durável entre memória e banco em caso de término do processo, nem compartilhamento
das coleções entre instâncias serverless. A migração das próximas entidades eliminará essa
condição temporária; Comentario e Avaliacao são a próxima etapa.

## Prova manual de persistência de tutoriais

Validação automática desta etapa: 172 testes offline aprovados. No Neon real, retornaram
HTTP 200: `/api/tutoriais` (18 tutoriais hidratados), `/api/tutoriais/buscar?q=fonte`,
`/comunidade`, `/perfil/lucas-mendes` e `/api/tutoriais/:id`. O processo usou os Repositories
PostgreSQL sem carregar usuarioData/tutorialData. Foram executados 49 SELECTs nessas rotas,
incluindo enriquecimento de autores; nenhuma escrita foi executada ou tentada. O bloqueio
de comandos diferentes de SELECT ficou restrito ao processo de validação, sem alterar runtime.
Os três SELECTs por carga de tutoriais não incluem as consultas de usuários do enriquecimento.

As escritas abaixo devem ser executadas manualmente pelo usuário. A validação automática no
Neon usa apenas SELECT e evita a página de tutorial que incrementa visualizações.

1. Iniciar com `npm.cmd run dev` e entrar como colaborador seed.
2. Abrir `/tutoriais/novo` e criar um tutorial sintético com título identificável, passos,
   imagem opcional, link e tags.
3. Conferir ID, slug, autor e conteúdo em `tutoriais` no Neon.
4. Conferir ordem, textos e campos opcionais em `tutorial_passos`, pelo tutorial_id.
5. Conferir as linhas e ausência de duplicação em `tutorial_tags`.
6. Parar o servidor e iniciar novamente com `npm.cmd run dev`.
7. Anotar visualizacoes no Neon, abrir o tutorial e conferir os dados. Confirmar incremento
   de uma unidade no banco para essa abertura.
8. Pelo editor, alterar título, resumo, passos e tags; salvar.
9. Conferir as alterações nas três tabelas e confirmar que o slug ficou estável.
10. Reiniciar novamente o servidor.
11. Conferir no Neon que o contador anterior foi preservado; abrir e conferir a edição
    persistida. Essa nova abertura deve acrescentar mais uma visualização.
12. Buscar o novo conteúdo e testar o encaminhamento do MExplicAI quando houver relevância.
13. Para validar o tratamento híbrido, entrar com outra conta e criar comentário/avaliação
    no tutorial. Anotar os pontos concedidos ao autor, voltar à conta autora e excluir o
    tutorial pelo MExplica, sem reiniciar o processo entre essas operações.
14. Confirmar a remoção do tutorial e a cascata de passos/tags no Neon.
15. Confirmar que não restaram comentários/avaliações do runtime para esse tutorial e que
    os pontos concedidos por suas avaliações foram descontados.

## Validação manual de escrita

Login seed, sessão, perfil, ranking, comunidade e autores foram validados no Neon.
Cadastro e persistência após reinício também foram validados manualmente. A conta sintética
existente deve ser preservada para completar o CRUD; esta limpeza não executa escritas no Neon.

Para provar persistência de escrita, executar posteriormente com uma conta sintética:

1. Criar a conta pelo MExplica e confirmar sua presença no Neon sem exibir hash/credenciais.
2. Parar o servidor, iniciar novamente e fazer login com a conta criada.
3. Editar bio/localização; reiniciar e conferir as alterações.
4. Conferir restrições de edição e unicidade por email/telefone.
5. Validar pontos/nível/disponibilidade com contas de teste adequadas.
6. Excluir a conta e confirmar a remoção no Neon e dos dependentes em memória.

## Comandos

```powershell
npm.cmd run db:check
npm.cmd run db:schema
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:verify
```

Todos carregam o `.env` local, usam o Pool compartilhado e o encerram ao terminar.
Falhas retornam código diferente de zero. Contatos, hashes e credenciais não são impressos.
`npm.cmd test` continua offline, com clientes falsos.

`db:schema` lê o SQL versionado e o aplica em uma transação. Usa `IF NOT EXISTS`, sem
remoção de tabelas ou dados. Não atualiza definições de tabelas preexistentes: mudanças
posteriores de schema exigem migrations explícitas.

## Remoção do conceito legado

Especialidades foram removidas por não fazerem parte do produto atual. O backend, as
respostas de usuários, as fixtures e o seed não oferecem mais esse recurso.

Banco novo: `db:schema` já cria somente as sete tabelas de domínio listadas abaixo.
Banco existente: executar manualmente a migration versionada, sem recriar tabelas ou seed:

```powershell
npm.cmd run db:migrate
npm.cmd run db:verify
```

`src/database/migrations/001_remove_usuario_especialidades.sql` contém apenas
`DROP TABLE IF EXISTS public.usuario_especialidades;`, sem CASCADE. Nenhuma conta é removida.
A migration foi aplicada na etapa anterior; o controle registra sua versão.

`scripts/runMigrations.js` usa o Singleton existente, aplica arquivos `NNN_nome.sql` em
ordem e registra nome/data em `public.schema_migrations`. Essa é uma tabela técnica,
separada da contagem de entidades. Uma trava transacional serializa execuções concorrentes;
DDL e registro são confirmados na mesma transação, ou desfeitos juntos. Reexecutar o comando
ignora versões já registradas. O Pool é encerrado tanto no sucesso quanto na falha.

`db:verify` confirma a ausência da tabela legada pelo catálogo e informa falha enquanto a
migration estiver pendente. Não é necessário executar `db:seed` para esta limpeza.

## Tabelas e relacionamentos

| Tabela | Primary Key | Foreign Keys e exclusões |
| --- | --- | --- |
| `usuarios` | `id`, identity | — |
| `categorias` | `id`, textual e estável | — |
| `tutoriais` | `id`, identity | `autor_id → usuarios.id`, CASCADE; `categoria_id → categorias.id`, RESTRICT |
| `tutorial_passos` | `id`, identity | `tutorial_id → tutoriais.id`, CASCADE |
| `tutorial_tags` | `(tutorial_id, tag)` | `tutorial_id → tutoriais.id`, CASCADE |
| `comentarios` | `id`, identity | `tutorial_id → tutoriais.id` e `usuario_id → usuarios.id`, CASCADE |
| `avaliacoes` | `id`, identity | `tutorial_id → tutoriais.id` e `avaliador_id → usuarios.id`, CASCADE |

A cascata acompanha as exclusões atuais de `relacionamentoService`: excluir um autor
remove seus tutoriais e dependentes; excluir um usuário também remove seus comentários
e avaliações em outros tutoriais. Categorias em uso não podem ser excluídas.
O ajuste de pontos continua uma regra da aplicação; não há triggers que o recalculam.

Principais garantias:

- Slugs de usuários e tutoriais são únicos e obrigatórios.
- Email é único por `lower(email)`; telefone é único quando presente e contém só dígitos.
- Ausência de contato é `NULL`; pelo menos email ou telefone é obrigatório.
- Idade entre 10 e 120, pontos e visualizações não negativos, hash obrigatório.
- Disponibilidade de atendimento exige colaborador, sem duplicar níveis em SQL.
- Passos têm ordem de 1 a 9 e unicidade `(tutorial_id, ordem)`; título de 3–120
  caracteres e descrição de 3–1000, conforme o contrato atual.
- Imagem usa `TEXT`, inclusive para data URL; alt até 180 e legenda até 240 caracteres.
- Link tem URL/texto opcionais em conjunto; URL até 2048 e texto até 120 caracteres.
- Comentários têm 2–1000 caracteres; notas são de 1 a 5.
- Avaliação tem unicidade `(tutorial_id, avaliador_id)`, permitindo futuro UPDATE/UPSERT.
- Datas usam `TIMESTAMPTZ`. Índices adicionais cobrem autor/categoria dos tutoriais,
  tutorial/usuário dos comentários e avaliador das avaliações. PKs/UNIQUE compostas
  já cobrem as demais consultas por FK à esquerda.

Mínimo de um passo, limite total de tags, URLs seguras, nível e pontuação
continuam responsabilidades do contrato/Services, sem duplicar essas regras com triggers.

## Decisões de normalização

- `tipo` não é persistido: deriva de `colaborador`.
- `nivel` não é persistido: deriva de `colaborador` e `pontos`; `calcularNivel()` e
  `sincronizarNivel()` continuam na aplicação.
- Tags e passos são linhas relacionadas, sem listas concatenadas ou JSON.
- Cada passo possui no máximo uma imagem e um link, mapeados para atributos próprios.
- Categorias possuem entidade própria, com os três IDs atuais preservados. Metadados
  visuais continuam em `src/utils/categorias.js`.

## Seed e compatibilidade

`seedData.js` transforma diretamente os arrays e categorias existentes, sem modificá-los.
Preserva IDs históricos, slugs, textos, vínculos, datas, pontos e o hash bcrypt já gerado
em `usuarioData`; não recalcula pontos nem gera outra senha. Contatos vazios viram `NULL`,
email vira lowercase e telefone é normalizado para dígitos.

Uma imagem integrada ao passo tem precedência. A ausência da propriedade busca a imagem
legada pela ordem original; `imagem: null` representa remoção e impede essa busca.
Depois, os passos são numerados sequencialmente como no `TutorialService`. A imagem
legada do Pix mantém URL, alt e legenda. `linkExterno` vira `link_url` e `link_texto`.

`db:seed` usa um único client do Pool durante `BEGIN`, inserts e `COMMIT`; erros provocam
`ROLLBACK` e descarte do client. Todos os valores são parâmetros SQL. Identificadores
de tabelas/colunas vêm de uma lista fixa do projeto.

Conflitos de PK usam `DO NOTHING`, sem UPDATE. IDs históricos de usuários/tutoriais são
comparados pelo slug; comentários/avaliações pelos seus vínculos. Um ID ocupado por outra
identidade cancela o seed. Conflitos por outros campos únicos também falham, sem ocultar
colisões. Passos/tags são inseridos apenas para pais novos nesta execução,
preservando coleções que já foram editadas ou removidas no banco.

As cinco identities são localizadas por `pg_get_serial_sequence` e ajustadas com `setval`
depois dos inserts, para o próximo ID ser `MAX(id) + 1` (ou 1 em tabela vazia). O seed
bloqueia escritas nas sete tabelas de domínio durante a transação para estabilizar esse máximo.
O estado de sequences não sofre rollback no PostgreSQL: um erro tardio pode deixar lacunas,
mas o ajuste não fica abaixo dos IDs existentes. Referências oficiais:
[identity](https://www.postgresql.org/docs/current/ddl-identity-columns.html),
[sequences](https://www.postgresql.org/docs/current/functions-sequence.html) e
[transações com pg](https://node-postgres.com/features/transactions).

`db:verify` faz somente leituras: verifica tabelas, contagens mínimas, IDs demonstrativos,
PKs/FKs, dependentes órfãos e o próximo valor de cada identity sem consumir `nextval`.
Mostra apenas contagens e próximos IDs; falha se houver inconsistência.

Carga inicial esperada: 3 categorias, pelo menos 12 usuários, 18 tutoriais,
72 passos, 94 tags, 10 comentários e 20 avaliações.
A conta sintética adicional pode elevar usuários para 13; isso não é erro nem motivo para exclusão.
