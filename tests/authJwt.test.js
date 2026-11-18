const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../src/models/usuarioModel');
const DatabaseConnection = require('../src/database/databaseConnection');
const TokenService = require('../src/services/tokenService');
const app = require('../src/index');

let server, base;
const cadastro = {
    identificador: 'jwt-offline@teste.local', nome: 'Pessoa', sobrenome: 'JWT',
    idade: 30, genero: 'outro', senha: 'senha-somente-de-teste', colaborador: true
};

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(t => {
    for (const nome of ['usuario', 'tutorial', 'comentario', 'avaliacao']) {
        const array = require(`../src/data/${nome}Data`);
        const copia = structuredClone(array);
        t.after(() => { array.splice(0, array.length, ...copia); });
    }
});

function request(rota, { method = 'GET', body, headers = {}, ...opcoes } = {}) {
    return fetch(base + rota, {
        method, headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body), ...opcoes
    });
}
function cookieToken(token) { return 'mexplica_token=' + encodeURIComponent(token); }
function cookies(resposta) { return resposta.headers.getSetCookie().map(item => item.split(';')[0]).join('; '); }
function conferirCookie(resposta, { limpo = false, secure = false } = {}) {
    const header = resposta.headers.getSetCookie().find(item => item.startsWith('mexplica_token='));
    assert.equal(typeof header, 'string');
    // Falhas não devem imprimir o header que contém a credencial.
    for (const atributo of [/;\s*HttpOnly/i, /;\s*SameSite=Lax/i, /;\s*Path=\/(?:;|$)/i]) {
        assert.equal(atributo.test(header), true, 'Atributo obrigatório do cookie ausente');
    }
    assert.equal(/;\s*Secure(?:;|$)/i.test(header), secure);
    const expires = /;\s*Expires=([^;]+)/i.exec(header)?.[1];
    assert.equal(Number.isFinite(Date.parse(expires)), true);
    if (limpo) {
        assert.equal(header.startsWith('mexplica_token=;'), true);
        assert.ok(Date.parse(expires) < Date.now());
    } else {
        assert.equal(/;\s*Max-Age=28800(?:;|$)/i.test(header), true);
        assert.ok(Math.abs(Date.parse(expires) - Date.now() - 28800000) < 5000);
        const token = decodeURIComponent(header.split(';')[0].slice('mexplica_token='.length));
        assert.ok(TokenService.verificarToken(token));
    }
}
async function protegido(headers, status = 401) {
    // Rota protegida que permite observar a autorização sem modificar dados.
    const resposta = await request('/api/usuarios/999999', { method: 'PUT', body: { bio: 'Teste' }, headers });
    assert.equal(resposta.status, status);
    const dados = await resposta.json();
    if (status === 401) assert.deepEqual(dados, { erro: 'Você precisa estar autenticado para realizar esta ação.' });
    return dados;
}
function assinarInvalido(opcoes = {}) {
    return jwt.sign({}, process.env.JWT_SECRET, {
        subject: '1', issuer: 'mexplica', audience: 'mexplica-web', algorithm: 'HS256',
        expiresIn: 28800, ...opcoes
    });
}

test('login mantém contrato, emite somente cookie JWT HttpOnly e autentica a sessão', async () => {
    const resposta = await request('/api/auth/login', {
        method: 'POST', body: { identificador: 'lucas@mexplica.com', senha: '123456' }
    });
    assert.equal(resposta.status, 200);
    const dados = await resposta.json();
    assert.equal(dados.mensagem, 'Login realizado com sucesso.');
    assert.equal(Object.hasOwn(dados.usuario, 'senhaHash'), false);
    assert.equal(Object.hasOwn(dados, 'token'), false);
    assert.equal(resposta.headers.getSetCookie().length, 1);
    conferirCookie(resposta);
    const sessao = await request('/api/auth/sessao', { headers: { Cookie: cookies(resposta) } });
    assert.equal(sessao.status, 200);
    assert.equal(sessao.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await sessao.json(), { autenticado: true, usuario: dados.usuario });
});

test('login e emissão API preservam erros públicos de validação e credenciais', async () => {
    for (const rota of ['/api/auth/login', '/api/auth/token']) {
        for (const [body, status, erro] of [
            [{}, 400, 'Informe o email/telefone e a senha.'],
            [{ identificador: 'invalido', senha: '123456' }, 400, 'Informe o email/telefone e a senha.'],
            [{ identificador: 'lucas@mexplica.com', senha: 'incorreta' }, 401, 'Credenciais inválidas.'],
            [{ identificador: 'inexistente@teste.local', senha: '123456' }, 401, 'Credenciais inválidas.']
        ]) {
            const resposta = await request(rota, { method: 'POST', body });
            assert.equal(resposta.status, status);
            assert.deepEqual(await resposta.json(), { erro });
            assert.equal(resposta.headers.getSetCookie().length, 0);
        }
    }
});

test('cadastro autentica imediatamente com JWT e preserva bcrypt e login por telefone', async () => {
    for (const identificador of [cadastro.identificador, '(24) 97777-6666']) {
        const resposta = await request('/api/auth/cadastro', { method: 'POST', body: { ...cadastro, identificador } });
        assert.equal(resposta.status, 201);
        const { usuario } = await resposta.json();
        conferirCookie(resposta);
        assert.equal(Object.hasOwn(usuario, 'senhaHash'), false);
        const sessao = await request('/api/auth/sessao', { headers: { Cookie: cookies(resposta) } });
        assert.equal((await sessao.json()).usuario.id, usuario.id);
        for (const rota of ['/api/auth/login', '/api/auth/token']) {
            const login = await request(rota, { method: 'POST', body: { identificador, senha: cadastro.senha } });
            assert.equal(login.status, 200);
            await login.json();
        }
    }
});

test('sessão sem credencial mantém o contrato de visitante', async () => {
    const resposta = await request('/api/auth/sessao');
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { autenticado: false, usuario: null });
    assert.equal(resposta.headers.getSetCookie().length, 0);
});

test('cookies inválidos, expirados, com assinatura ou claims incorretos viram visitante e são limpos', async t => {
    const busca = t.mock.method(UsuarioModel, 'findById', async () => { throw new Error('Não consultar com JWT inválido'); });
    for (const token of ['', 'invalido', 'a.b.c', assinarInvalido({ expiresIn: -1 }),
        assinarInvalido({ issuer: 'outro' }), assinarInvalido({ audience: 'outro' }),
        assinarInvalido({ algorithm: 'HS512' }), assinarInvalido({ algorithm: 'none' }),
        jwt.sign({ sub: '1' }, 'outra-chave-de-teste')]) {
        const resposta = await request('/api/auth/sessao', { headers: { Cookie: cookieToken(token) } });
        assert.equal(resposta.status, 200);
        assert.deepEqual(await resposta.json(), { autenticado: false, usuario: null });
        conferirCookie(resposta, { limpo: true });
    }
    assert.equal(busca.mock.callCount(), 0);
});

test('Bearer válido funciona sem cookie e autoriza a rota protegida', async () => {
    const usuario = await UsuarioModel.findByIdentifier('lucas@mexplica.com');
    const headers = { Authorization: 'Bearer ' + TokenService.criarToken(usuario.id) };
    const resposta = await request('/api/usuarios/' + usuario.id, {
        method: 'PUT', body: { bio: 'Atualização autenticada por Bearer' }, headers
    });
    assert.equal(resposta.status, 200);
    assert.equal((await resposta.json()).usuario.bio, 'Atualização autenticada por Bearer');
    assert.equal(resposta.headers.getSetCookie().length, 0);
});

test('Bearer inválido ou malformado responde 401 sem detalhes criptográficos', async () => {
    for (const Authorization of ['Bearer invalido', 'Bearer a.b.c', 'Bearer', 'Bearer primeiro segundo']) {
        await protegido({ Authorization });
    }
});

test('Bearer expirado responde 401', async () => {
    await protegido({ Authorization: 'Bearer ' + assinarInvalido({ expiresIn: -1 }) });
});

test('JWT válido de usuário inexistente não autentica por Bearer nem cookie', async () => {
    const token = TokenService.criarToken(999999);
    await protegido({ Authorization: 'Bearer ' + token });
    const resposta = await request('/api/auth/sessao', { headers: { Cookie: cookieToken(token) } });
    assert.deepEqual(await resposta.json(), { autenticado: false, usuario: null });
    conferirCookie(resposta, { limpo: true });
});

test('Bearer explícito de B vence cookie de A sem mesclar identidades', async () => {
    const usuarios = await UsuarioModel.findAll();
    const [a, b] = usuarios;
    const headers = { Cookie: cookieToken(TokenService.criarToken(a.id)), Authorization: 'Bearer ' + TokenService.criarToken(b.id) };
    const resposta = await request('/api/auth/sessao', { headers });
    assert.equal((await resposta.json()).usuario.id, b.id);
    assert.equal(resposta.headers.getSetCookie().length, 0);
    const editarA = await request('/api/usuarios/' + a.id, { method: 'PUT', body: { bio: 'Sem permissão' }, headers });
    assert.equal(editarA.status, 403);
    await editarA.json();
});

test('Bearer inválido, expirado, vazio ou sem usuário nunca recorre a um cookie válido', async () => {
    const Cookie = cookieToken(TokenService.criarToken(1));
    for (const token of ['', 'invalido', assinarInvalido({ expiresIn: -1 }), TokenService.criarToken(999999)]) {
        await protegido({ Cookie, Authorization: 'Bearer ' + token });
    }
});

test('Bearer válido autentica mesmo na presença de cookie inválido', async () => {
    const resposta = await request('/api/auth/sessao', {
        headers: { Cookie: cookieToken('invalido'), Authorization: 'bEaReR ' + TokenService.criarToken(1) }
    });
    assert.equal((await resposta.json()).usuario.id, 1);
    assert.equal(resposta.headers.getSetCookie().length, 0);
});

test('/token retorna contrato Bearer sem cookie e o token funciona em uma API protegida', async () => {
    const resposta = await request('/api/auth/token', {
        method: 'POST', body: { identificador: 'lucas@mexplica.com', senha: '123456' }
    });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
    assert.equal(resposta.headers.getSetCookie().length, 0);
    const dados = await resposta.json();
    assert.deepEqual(Object.keys(dados).sort(), ['expiraEm', 'tipo', 'token']);
    assert.equal(dados.tipo, 'Bearer');
    assert.equal(dados.expiraEm, 28800);
    const payload = TokenService.verificarToken(dados.token);
    assert.ok(payload);
    const protegida = await request('/api/usuarios/' + payload.sub, {
        method: 'PUT', body: { bio: 'Demonstração API offline' }, headers: { Authorization: 'Bearer ' + dados.token }
    });
    assert.equal(protegida.status, 200);
    await protegida.json();
});

test('logout limpa cookie compatível e Bearer copiado continua válido até expirar', async () => {
    const token = TokenService.criarToken(1);
    const resposta = await request('/api/auth/logout', { method: 'POST', headers: { Cookie: cookieToken(token) } });
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { mensagem: 'Logout realizado com sucesso.' });
    conferirCookie(resposta, { limpo: true });
    const sessao = await request('/api/auth/sessao', { headers: { Cookie: cookies(resposta) } });
    assert.equal((await sessao.json()).autenticado, false);
    await protegido({}, 401);
    const bearer = await request('/api/auth/sessao', { headers: { Authorization: 'Bearer ' + token } });
    assert.equal((await bearer.json()).autenticado, true);
});

test('produção define e remove cookie Secure mesmo atrás do proxy HTTPS', async t => {
    const ambiente = process.env.NODE_ENV;
    t.after(() => { process.env.NODE_ENV = ambiente; });
    process.env.NODE_ENV = 'production';
    const resposta = await request('/api/auth/login', {
        method: 'POST', body: { identificador: 'lucas@mexplica.com', senha: '123456' },
        headers: { 'X-Forwarded-Proto': 'https' }
    });
    assert.equal(resposta.status, 200);
    await resposta.json();
    conferirCookie(resposta, { secure: true });
    const logout = await request('/api/auth/logout', { method: 'POST' });
    conferirCookie(logout, { limpo: true, secure: true });
    await logout.json();
    assert.equal(app.get('trust proxy'), 1);
});

test('exclusão de conta limpa cookie e o mesmo JWT deixa de autenticar imediatamente', async () => {
    const resposta = await request('/api/auth/cadastro', { method: 'POST', body: cadastro });
    const { usuario } = await resposta.json();
    const Cookie = cookies(resposta);
    const token = TokenService.criarToken(usuario.id);
    const excluir = await request('/api/usuarios/' + usuario.id, { method: 'DELETE', headers: { Cookie } });
    assert.equal(excluir.status, 200);
    await excluir.json();
    conferirCookie(excluir, { limpo: true });
    await protegido({ Authorization: 'Bearer ' + token });
    const sessao = await request('/api/auth/sessao', { headers: { Cookie } });
    assert.deepEqual(await sessao.json(), { autenticado: false, usuario: null });
    conferirCookie(sessao, { limpo: true });
});

test('autorização relê colaborador e nível atuais e ignora claims de permissão', async () => {
    const registro = require('../src/data/usuarioData').find(item => item.colaborador);
    registro.pontos = UsuarioModel.NIVEL_PLATINA;
    const token = TokenService.criarToken(registro.id);
    const headers = { Authorization: 'Bearer ' + token };
    const disponivel = await request('/api/usuarios/me/disponibilidade', { method: 'PUT', body: { disponivel: true }, headers });
    assert.equal(disponivel.status, 200);
    await disponivel.json();
    await UsuarioModel.adicionarPontos(registro.id, -1);
    const rebaixado = await request('/api/usuarios/me/disponibilidade', { method: 'PUT', body: { disponivel: true }, headers });
    assert.equal(rebaixado.status, 403);
    await rebaixado.json();
    const colaborador = await request('/api/tutoriais', { method: 'POST', body: {}, headers });
    assert.equal(colaborador.status, 400); // passou pela autorização; faltam campos do tutorial
    await colaborador.json();
    registro.colaborador = false;
    const removido = await request('/api/tutoriais', { method: 'POST', body: {}, headers });
    assert.equal(removido.status, 403);
    await removido.json();
    const forjado = assinarInvalido({ subject: String(registro.id) });
    const claims = jwt.sign({ colaborador: true, nivel: 'Platina', pontos: 99999 }, process.env.JWT_SECRET, {
        subject: String(registro.id), issuer: 'mexplica', audience: 'mexplica-web', algorithm: 'HS256', expiresIn: 28800
    });
    for (const credencial of [forjado, claims]) {
        const negado = await request('/api/tutoriais', { method: 'POST', body: {}, headers: { Authorization: 'Bearer ' + credencial } });
        assert.equal(negado.status, 403);
        await negado.json();
    }
});

test('páginas EJS reconhecem cookie em navegação direta e preservam redirecionamento de visitante', async () => {
    const usuario = await UsuarioModel.findByIdentifier('lucas@mexplica.com');
    const headers = { Cookie: cookieToken(TokenService.criarToken(usuario.id)) };
    const tutorial = require('../src/data/tutorialData').find(item => item.autorId === usuario.id);
    for (const rota of ['/tutoriais/novo', `/tutoriais/${tutorial.slug}/editar`, `/perfil/${usuario.slug}`, '/comunidade']) {
        const resposta = await request(rota, { headers, redirect: 'manual' });
        assert.equal(resposta.status, 200, rota);
        assert.match(resposta.headers.get('content-type'), /text\/html/);
        const html = await resposta.text();
        if (rota === '/comunidade') assert.match(html, /community-cta" href="\/tutoriais\/novo"/);
    }
    const visitante = await request('/tutoriais/novo', { redirect: 'manual' });
    assert.equal(visitante.status, 302);
    assert.equal(visitante.headers.get('location'), '/cadastro.html?redirect=%2Ftutoriais%2Fnovo');
    await visitante.text();
});

test('assets e health não verificam JWT nem carregam usuário ou Pool, mesmo com credenciais inválidas', async t => {
    const verificacao = t.mock.method(TokenService, 'verificarToken', () => { throw new Error('JWT bloqueado'); });
    const usuario = t.mock.method(UsuarioModel, 'findById', async () => { throw new Error('Usuário bloqueado'); });
    const pool = t.mock.method(DatabaseConnection.getInstance(), 'getPool', () => { throw new Error('Pool bloqueado'); });
    t.mock.method(DatabaseConnection.getInstance(), 'testarConexao', async () => true);
    for (const rota of ['/css/style.css', '/js/core/api.js', '/icons/logo-completa.png', '/icons/favicon.ico', '/api/health', '/api/health/database']) {
        const resposta = await request(rota, { headers: { Cookie: cookieToken('invalido'), Authorization: 'Bearer invalido' } });
        assert.equal(resposta.status, 200, rota);
        await resposta.text();
    }
    assert.equal(verificacao.mock.callCount(), 0);
    assert.equal(usuario.mock.callCount(), 0);
    assert.equal(pool.mock.callCount(), 0);
});

test('JWT_SECRET ausente preserva endpoints públicos e falha de forma clara sem criar conta', async t => {
    const segredo = process.env.JWT_SECRET;
    t.after(() => { process.env.JWT_SECRET = segredo; });
    const cookie = cookieToken(TokenService.criarToken(1));
    const criacao = t.mock.method(UsuarioModel, 'create', async () => { throw new Error('Não criar sem chave'); });
    const logs = [];
    t.mock.method(console, 'error', (...args) => logs.push(args));
    process.env.JWT_SECRET = '';
    for (const rota of ['/', '/api/health', '/css/style.css', '/api/tutoriais', '/api/auth/sessao']) {
        const resposta = await request(rota);
        assert.equal(resposta.status, 200, rota);
        await resposta.text();
    }
    for (const rota of ['/api/auth/login', '/api/auth/token', '/api/auth/cadastro']) {
        const body = rota.endsWith('cadastro') ? cadastro : { identificador: 'lucas@mexplica.com', senha: '123456' };
        const resposta = await request(rota, { method: 'POST', body });
        assert.equal(resposta.status, 503);
        assert.deepEqual(await resposta.json(), { erro: 'Autenticação indisponível. Verifique a configuração JWT_SECRET do servidor.' });
        assert.equal(resposta.headers.getSetCookie().length, 0);
    }
    const sessao = await request('/api/auth/sessao', { headers: { Cookie: cookie } });
    assert.equal(sessao.status, 503);
    await sessao.json();
    assert.equal(criacao.mock.callCount(), 0);
    assert.deepEqual(logs, Array.from({ length: 4 }, () => ['JWT_SECRET não configurada para autenticação.']));
});

test('entrada serverless importa em produção sem chave, banco ou estado eager', () => {
    const resultado = spawnSync(process.execPath, ['-e', `
        const assert = require('node:assert/strict');
        const app = require('./api/index');
        assert.equal(typeof app, 'function');
        assert.equal(app.get('trust proxy'), 1);
    `], { cwd: require('node:path').join(__dirname, '..'), encoding: 'utf8', timeout: 5000,
        env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: '', DATABASE_URL: '', DOTENV_CONFIG_QUIET: 'true' } });
    assert.equal(resultado.error, undefined);
    assert.equal(resultado.status, 0);
    assert.equal(resultado.stderr, '');
});
