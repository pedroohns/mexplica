# Banco de dados do MExplica

O schema inicial está em `src/database/schema.sql`. O runtime ainda utiliza os arrays
de `src/data/`; os comandos abaixo são manuais e reutilizam o Singleton `DatabaseConnection`.
Nenhum Model, Repository, login ou frontend foi migrado nesta etapa.

## Comandos

```powershell
npm.cmd run db:check
npm.cmd run db:schema
npm.cmd run db:seed
npm.cmd run db:verify
```

Todos carregam o `.env` local, usam o Pool compartilhado e o encerram ao terminar.
Falhas retornam código diferente de zero. Contatos, hashes e credenciais não são impressos.
`npm.cmd test` continua offline, com clientes falsos.

`db:schema` lê o SQL versionado e o aplica em uma transação. Usa `IF NOT EXISTS`, sem
remoção de tabelas ou dados. Não atualiza definições de tabelas preexistentes: mudanças
posteriores de schema exigirão migrations explícitas.

## Tabelas e relacionamentos

| Tabela | Primary Key | Foreign Keys e exclusões |
| --- | --- | --- |
| `usuarios` | `id`, identity | — |
| `usuario_especialidades` | `(usuario_id, especialidade)` | `usuario_id → usuarios.id`, CASCADE |
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

Mínimo de um passo, limite total de tags/especialidades, URLs seguras, nível e pontuação
continuam responsabilidades do contrato/Services, sem duplicar essas regras com triggers.

## Decisões de normalização

- `tipo` não é persistido: deriva de `colaborador`.
- `nivel` não é persistido: deriva de `colaborador` e `pontos`; `calcularNivel()` e
  `sincronizarNivel()` continuam na aplicação.
- Especialidades, tags e passos são linhas relacionadas, sem listas concatenadas ou JSON.
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
colisões. Especialidades/passos/tags são inseridos apenas para pais novos nesta execução,
preservando coleções que já foram editadas ou removidas no banco.

As cinco identities são localizadas por `pg_get_serial_sequence` e ajustadas com `setval`
depois dos inserts, para o próximo ID ser `MAX(id) + 1` (ou 1 em tabela vazia). O seed
bloqueia escritas nas oito tabelas durante a transação para estabilizar esse máximo.
O estado de sequences não sofre rollback no PostgreSQL: um erro tardio pode deixar lacunas,
mas o ajuste não fica abaixo dos IDs existentes. Referências oficiais:
[identity](https://www.postgresql.org/docs/current/ddl-identity-columns.html),
[sequences](https://www.postgresql.org/docs/current/functions-sequence.html) e
[transações com pg](https://node-postgres.com/features/transactions).

`db:verify` faz somente leituras: verifica tabelas, contagens mínimas, IDs demonstrativos,
PKs/FKs, dependentes órfãos e o próximo valor de cada identity sem consumir `nextval`.
Mostra apenas contagens e próximos IDs; falha se houver inconsistência.

Carga inicial esperada: 3 categorias, 12 usuários, 16 especialidades, 18 tutoriais,
72 passos, 94 tags, 10 comentários e 20 avaliações.
