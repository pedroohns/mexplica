# Autenticação JWT do MExplica

A autenticação usa `jsonwebtoken` e `JWT_SECRET`. JWT é a credencial real: cada requisição
dinâmica verifica sua assinatura e claims, busca o usuário por ID e usa o estado atual do banco.
O frontend, EJS, bcrypt, Factory, Singleton, schema e entrada Vercel foram preservados.

## Configuração e responsabilidades

Variáveis necessárias no runtime:

```dotenv
DATABASE_URL=
JWT_SECRET=
```

Preencher somente no `.env` local ignorado pelo Git ou nas variáveis do ambiente Vercel.
`JWT_SECRET` precisa ser uma chave aleatória forte e estável entre instâncias/deploys que
devam aceitar os mesmos tokens. Nunca imprimir, versionar ou usar em exemplos seu valor real.
`SESSION_SECRET` ficou obsoleto e não é usado; pode permanecer temporariamente no `.env` local.
`NODE_ENV=production` ativa cookie Secure; `PORT` é opcional (padrão 3000).

- `src/services/tokenService.js`: `CONFIGURACAO`, `validarConfiguracao()`,
  `criarToken(usuarioId)` e `verificarToken(token)`. Somente esse módulo chama
  `jwt.sign()`/`jwt.verify()` no runtime; não usa `decode()` para autenticar.
- `src/utils/authCookie.js`: nome, emissão e remoção do cookie com os mesmos atributos.
- `authController`: validação de credenciais compartilhada entre login e `/token`, usando
  email ou telefone, `UsuarioModel.findByIdentifier()` e `bcrypt.compare()`.
- `carregarUsuario`: seleção da credencial, verificação e consulta atual de usuário.
- Middlewares de autorização: continuam lendo somente `req.usuario`.

Configuração central: algoritmo **HS256**, issuer **mexplica**, audience **mexplica-web**,
expiração **8 horas (28800 segundos)**. A verificação restringe o algoritmo e valida assinatura,
issuer, audience e expiração. Exige `sub` com ID inteiro positivo, `iat`, `exp` e validade de
no máximo oito horas. Tokens expirados, adulterados, malformados ou com claims inválidas
não autenticam e não provocam exposição de erros criptográficos.

Payload conceitual, sem token real:

```text
sub = ID do usuário como string
iat = instante de emissão em segundos Unix
exp = iat + 28800
iss = mexplica
aud = mexplica-web
```

JWT é assinado, e seu conteúdo pode ser lido por quem possuir a credencial. Não contém senha,
hash, email, telefone, bio, pontos, nível ou colaborador. Permissões não são confiadas a claims.

Sem `JWT_SECRET`, emissão/verificação falham com erro seguro de configuração (HTTP 503).
Não existe fallback. A aplicação pode iniciar e atender assets, health e rotas públicas sem
credencial. Cadastro verifica a configuração antes de persistir a conta. Testes sobrescrevem
a variável com chave exclusiva em `scripts/testSetup.js`, antes do carregamento de dotenv.

## Web: login, cadastro, sessão e cookie

1. `POST /api/auth/login` recebe `identificador` e `senha` e valida via bcrypt.
2. Em sucesso, assina JWT com `sub` do usuário e define `mexplica_token`.
3. Mantém o JSON anterior de mensagem/usuário, sem devolver token no corpo.
4. O navegador envia o cookie nas requisições seguintes, inclusive navegação direta em EJS.
5. `carregarUsuario` verifica JWT, chama `UsuarioModel.findById(sub)` e preenche
   `req.usuario` e `res.locals.usuarioAtual`.

`POST /api/auth/cadastro` preserva validações, formato de usuário e bcrypt; continua retornando
201 e autenticando imediatamente com o mesmo cookie. Mensagens públicas de credenciais e
cadastro são preservadas. Credenciais incorretas retornam 401, sem emissão de autenticação.

Cookie: **HttpOnly**, **SameSite=Lax**, **Path=/**, **Max-Age=28800** e Expires correspondente.
**Secure** somente em produção. Express define o atributo Secure também atrás do proxy HTTPS;
`trust proxy = 1` foi preservado. Não há Domain personalizado. JWT não fica acessível por
`document.cookie`, localStorage ou sessionStorage. O frontend usa o helper HTTP existente.
A validade é fixa desde a emissão; requests não renovam o JWT.

Cookie inválido/expirado ou que aponta para conta removida é limpo e tratado como visitante.
Falhas inesperadas do banco seguem para o tratamento global seguro, sem virar logout silencioso.

`GET /api/auth/sessao` preserva o contrato usado pelo MExplicAI:

```json
{ "autenticado": false, "usuario": null }
```

Quando autenticado, retorna `{ autenticado: true, usuario: ... }`, com a mesma projeção privada
de antes e sem hash. Respostas de autenticação recebem `Cache-Control: no-store`.

## API: emissão e Bearer

`POST /api/auth/token` recebe as mesmas credenciais e reutiliza a mesma função de validação
do login. Retorna somente:

```text
{ token: <JWT emitido>, tipo: "Bearer", expiraEm: 28800 }
```

`expiraEm` é duração em segundos, e não data absoluta. Esse endpoint não define cookie para
autenticar o cliente. Nunca retornar senha/hash. O cliente usa `Authorization: Bearer <JWT>`.

Nas rotas `/api/`, Bearer explícito tem prioridade sobre cookie. Se cookie é de A e Bearer
é de B, a identidade é B. Bearer vazio, malformado, inválido, expirado ou de conta inexistente
não recorre ao cookie: rota protegida retorna 401 amigável. Sem esquema Bearer no header,
o cookie é usado. Headers com outros esquemas não são credenciais JWT.
Páginas EJS usam o cookie; o suporte Bearer é destinado às APIs.

## Autorização e logout

`exigirAutenticacao`, `exigirColaborador` e `exigirPlatina` usam o usuário consultado no
PostgreSQL a cada request. Rebaixamento, perda de colaboração ou exclusão de conta têm
efeito na próxima requisição, mesmo que o JWT ainda não tenha expirado. JWT válido sem
usuário existente não autentica e não gera 500.

`POST /api/auth/logout` limpa `mexplica_token` com Path, SameSite, HttpOnly e Secure
compatíveis com a emissão. Exclusão da própria conta também limpa esse cookie.
Logout remove a credencial mantida pelo navegador. **Um Bearer copiado externamente
continua criptograficamente válido até expirar**, se a conta ainda existir e autorizar a ação.
Não há blacklist, refresh token, tabela de sessões ou revogação por token nesta etapa.
Trocar `JWT_SECRET` invalida globalmente tokens anteriores, sem revogação seletiva.

`cookie-session` foi removido de middleware, require, package.json e lockfile. Não existem
consumidores de `req.session`. Cookies do mecanismo anterior não autenticam; é preciso
fazer login novamente após a migração.

## Assets, testes e Vercel

Assets estáticos e ambos os health checks são atendidos antes de cookie-parser/carregarUsuario.
Não verificam JWT nem consultam usuário. `/api/health/database` mantém sua consulta de
disponibilidade ao banco, independente de autenticação; `/api/health` é independente do banco.
`api/index.js` continua exportando `src/index.js`. Não existe estado de sessão por instância.
Configurar `DATABASE_URL`, `JWT_SECRET` e `NODE_ENV=production` na Vercel e usar HTTPS.

`npm.cmd test`: 241 testes offline, incluindo os 208 anteriores e 33 novos. O preload mantém
MemoryRepositories e bloqueia o driver real; testes SQL usam clientes falsos. A cobertura JWT
inclui assinatura, validade sem sleeps, claims, algoritmo, ausência de chave, cookies de produção,
login/cadastro/logout, exclusão, Bearer, prioridade, EJS, permissões atuais e assets/health.

Validação adicional no Chrome headless local, com MemoryRepositories e driver PostgreSQL
bloqueado: login, recarga da página, cookie HttpOnly inacessível a JavaScript, avatar MExplicAI,
CTA autenticado da comunidade, perfil, criação/edição de tutorial, logout/401, cadastro imediato,
comentário e avaliação. Sem exceções JavaScript/console.error relevantes ou respostas locais 500.
Não foi encontrado JWT no localStorage/sessionStorage. Nenhum dado real do Neon foi alterado.
Serviços externos como VLibras ficaram bloqueados nessa conferência; sua tradução não foi validada.

## Roteiro manual local exato

As ações de escrita abaixo são para execução manual pelo usuário com registros sintéticos.
Não executar automaticamente no Neon real.

### Web

1. Executar `npm.cmd run dev` e abrir `http://localhost:3000/cadastro.html`.
2. Fazer login com email ou telefone e senha de uma conta de teste.
3. Conferir o menu autenticado e `/api/auth/sessao`: `autenticado: true` e usuário sem hash.
   Em DevTools > Application > Cookies, conferir atributos do cookie sem copiar/expor seu valor.
4. Fechar/reabrir a página e acessar diretamente o perfil e `/tutoriais/novo` com colaborador.
   A autenticação deve continuar dentro das oito horas. Reiniciar o servidor preserva o JWT
   se `JWT_SECRET` permanecer o mesmo.
5. Criar um tutorial sintético, abrir sua edição e salvar uma mudança; conferir autoria e slug.
6. Abrir tutorial de outro autor; criar comentário, editar esse comentário e registrar/editar
   uma avaliação. Conferir textos e nota após recarregar. Não alterar tratamento de NetworkError
   transitório sem reprodução ligada à autenticação.
7. Na home, abrir MExplicAI e enviar uma saudação; conferir iniciais da conta no avatar.
8. No próprio perfil, clicar em Sair. `/api/auth/sessao` deve retornar visitante e o cookie
   deve desaparecer. Em DevTools > Console, executar a chamada sem credencial:

   ```js
   fetch('/api/tutoriais', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: '{}'
   }).then(resposta => console.log(resposta.status)); // 401
   ```

9. Fazer login novamente. Depois de outro logout, cadastrar uma conta sintética nova e
   conferir autenticação imediata (201) sem login extra. Conferir menu/perfil/avatar.

### API no Postman (nenhum segredo/token real nos exemplos)

1. Desabilitar o cookie jar dessa demonstração para isolar o uso de Bearer.
2. Enviar `POST http://localhost:3000/api/auth/token`, Body > raw > JSON:

   ```json
   { "identificador": "EMAIL_OU_TELEFONE_DA_CONTA_DE_TESTE", "senha": "SENHA_DA_CONTA_DE_TESTE" }
   ```

3. Esperar 200, `tipo: "Bearer"`, `expiraEm: 28800` e um token. Não compartilhar/exportar
   resposta com token ou salvar credenciais reais no repositório.
4. Usar Authorization > Bearer Token em
   `PUT http://localhost:3000/api/usuarios/ID_DA_PROPRIA_CONTA`, com JSON
   `{ "bio": "Validação manual JWT" }`. Esperar 200. Essa operação altera a bio da conta
   sintética; pode ser revertida manualmente ao terminar.
5. Alterar um caractere do segmento da assinatura no token e repetir: esperar 401 com
   `Você precisa estar autenticado para realizar esta ação.` Sem stack/detalhe criptográfico.
6. Repetir `/api/auth/token` com senha incorreta: esperar 401 e nenhuma credencial emitida.
7. Expiração e claims incorretas já estão cobertas automaticamente; não esperar oito horas.

Referências oficiais: [jsonwebtoken: sign/verify e restrição de algoritmo](https://github.com/auth0/node-jsonwebtoken#readme),
[cookie-parser](https://expressjs.com/en/resources/middleware/cookie-parser/).
