const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../src/models/usuarioModel');
const UsuarioMemoryRepository = require('../src/repositories/usuarioMemoryRepository');
const TokenService = require('../src/services/tokenService');
const { carregarUsuario, exigirAdministrador } = require('../src/middlewares/authMiddleware');
const usuarios = require('../src/data/usuarioData');
const app = require('../src/index');

let server, serverRestrito, base, baseRestrita;
const erroAutenticacao = 'Você precisa estar autenticado para realizar esta ação.';
const erroAdministracao = 'Esta ação é restrita à administração do MExplica.';
const conta = alteracoes => ({
    nome: 'Pessoa', sobrenome: 'Fundação', email: 'fundacao@teste.local', telefone: '',
    idade: 30, genero: 'outro', colaborador: false, senhaHash: 'hash-ficticio', ...alteracoes
});

before(async () => {
    // A rota restrita existe somente neste servidor de teste; não adiciona uma API ao produto.
    const restrito = express();
    restrito.use(cookieParser());
    restrito.use(carregarUsuario);
    restrito.get('/api/recurso-restrito', exigirAdministrador, (req, res) => res.json({
        usuario: UsuarioModel.toPrivate(req.usuario), usuarioAtual: res.locals.usuarioAtual
    }));
    server = app.listen(0, '127.0.0.1');
    serverRestrito = restrito.listen(0, '127.0.0.1');
    await Promise.all([once(server, 'listening'), once(serverRestrito, 'listening')]);
    base = 'http://127.0.0.1:' + server.address().port;
    baseRestrita = 'http://127.0.0.1:' + serverRestrito.address().port;
});

after(async () => {
    await Promise.all([server, serverRestrito].map(atual => new Promise(resolve => atual.close(resolve))));
});

beforeEach(t => {
    const copia = structuredClone(usuarios);
    t.after(() => { usuarios.splice(0, usuarios.length, ...copia); });
});

function fixtureAdministrador(alteracoes = {}) {
    const fixture = {
        ...structuredClone(usuarios[0]), ...conta(),
        id: Math.max(0, ...usuarios.map(usuario => usuario.id)) + 1,
        slug: 'fixture-administrativo', administrador: true, pontos: 0,
        disponivelAtendimento: false, ...alteracoes
    };
    usuarios.push(fixture);
    return fixture;
}

function request(rota, { restrita = false, method = 'GET', body, headers = {} } = {}) {
    return fetch((restrita ? baseRestrita : base) + rota, {
        method, headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

function credenciais(token) {
    return [{ Authorization: 'Bearer ' + token }, { Cookie: 'mexplica_token=' + encodeURIComponent(token) }];
}

function autorizar(usuario) {
    let status, body, chamadasNext = 0;
    const res = {
        status(valor) { status = valor; return this; },
        json(valor) { body = valor; return this; }
    };
    exigirAdministrador({ usuario }, res, () => { chamadasNext++; });
    return { status, body, chamadasNext };
}

test('MemoryRepository cria usuário comum com administrador falso e ignora injeção no create', async () => {
    const repo = new UsuarioMemoryRepository([]);
    for (const [indice, administrador] of [undefined, true, 'true', { valor: true }].entries()) {
        const usuario = await repo.create(conta({
            slug: 'pessoa-' + indice, email: 'pessoa-' + indice + '@teste.local', administrador
        }));
        assert.equal(usuario.administrador, false);
        assert.equal((await repo.findById(usuario.id)).administrador, false);
    }
});

test('MemoryRepository aceita administrador apenas em fixture interna e mantém a flag independente', async () => {
    const fixture = fixtureAdministrador();
    const comum = { ...conta(), id: fixture.id + 1, slug: 'fixture-comum' };
    const repo = new UsuarioMemoryRepository([fixture, comum]);
    assert.equal((await repo.findById(fixture.id)).administrador, true);
    assert.equal((await repo.findById(fixture.id)).colaborador, false);
    assert.equal((await repo.findBySlug(comum.slug)).administrador, false);
    assert.deepEqual((await repo.findAll()).map(usuario => usuario.administrador), [true, false]);
    assert.equal((await repo.update(fixture.id, { administrador: false })).administrador, true);
    assert.equal((await repo.update(comum.id, { administrador: true })).administrador, false);
});

test('UsuarioModel.create fixa administrador falso antes de enviar dados ao Repository', async t => {
    const original = UsuarioMemoryRepository.prototype.create;
    const recebidos = [];
    t.mock.method(UsuarioMemoryRepository.prototype, 'create', async function (dados) {
        recebidos.push(dados.administrador);
        return original.call(this, dados);
    });
    for (const [indice, administrador] of [undefined, true, 'true'].entries()) {
        const usuario = await UsuarioModel.create(conta({ email: 'model-' + indice + '@teste.local', administrador }));
        assert.equal(usuario.administrador, false);
        assert.equal(UsuarioModel.toPrivate(usuario).administrador, false);
    }
    assert.deepEqual(recebidos, [false, false, false]);
});

test('sincronizarNivel normaliza a flag com segurança sem derivá-la de colaboração ou pontos', () => {
    for (const [administrador, esperado] of [[true, true], [false, false], [undefined, false], ['true', false], ['false', false], [1, false], [{}, false]]) {
        const usuario = UsuarioModel.sincronizarNivel({
            ...conta(), administrador, pontos: 99999, disponivelAtendimento: true
        });
        assert.equal(usuario.administrador, esperado);
        assert.equal(usuario.colaborador, false);
        assert.equal(usuario.tipo, 'usuario');
        assert.equal(usuario.nivel, null);
        assert.equal(usuario.disponivelAtendimento, false);
    }
    const colaborador = UsuarioModel.sincronizarNivel({ ...conta({ colaborador: true }), pontos: 99999 });
    assert.equal(colaborador.nivel, 'Platina');
    assert.equal(colaborador.administrador, false);
});

test('leituras do UsuarioModel preservam a flag administrativa da fixture interna', async () => {
    const fixture = fixtureAdministrador();
    for (const usuario of [
        await UsuarioModel.findById(fixture.id), await UsuarioModel.findBySlug(fixture.slug),
        await UsuarioModel.findByIdentifier(fixture.email),
        (await UsuarioModel.findAll()).find(item => item.id === fixture.id)
    ]) {
        assert.equal(usuario.administrador, true);
        assert.equal(usuario.colaborador, false);
    }
});

test('toPrivate expõe booleano administrativo; toPublic omite a flag e ambas omitem senha', () => {
    for (const [administrador, esperado] of [[true, true], [false, false], [undefined, false], ['true', false]]) {
        const usuario = { ...conta(), administrador };
        const privado = UsuarioModel.toPrivate(usuario);
        const publico = UsuarioModel.toPublic(usuario);
        assert.equal(privado.administrador, esperado);
        assert.equal(Object.hasOwn(publico, 'administrador'), false);
        assert.equal(Object.hasOwn(publico, 'senhaHash'), false);
        assert.equal(Object.hasOwn(privado, 'senhaHash'), false);
    }
    assert.equal(UsuarioModel.toPrivate(null), null);
    assert.equal(UsuarioModel.toPublic(null), null);
});

test('UsuarioModel.update não permite conceder nem revogar administração pela whitelist de perfil', async () => {
    const comum = await UsuarioModel.create(conta());
    const fixture = fixtureAdministrador({ email: 'admin-update@teste.local' });
    const atualizado = await UsuarioModel.update(comum.id, { nome: 'Editado', administrador: true, admin: true });
    assert.equal(atualizado.nome, 'Editado');
    assert.equal(atualizado.administrador, false);
    assert.equal((await UsuarioModel.update(fixture.id, { administrador: false })).administrador, true);
});

test('exigirAdministrador retorna 401 sem autenticação e não chama next', () => {
    assert.deepEqual(autorizar(null), { status: 401, body: { erro: erroAutenticacao }, chamadasNext: 0 });
});

test('exigirAdministrador retorna 403 para usuário comum mesmo com identificadores sugestivos', () => {
    assert.deepEqual(autorizar({
        id: 1, nome: 'MExplica Moderação', slug: 'mexplica-moderacao', email: 'admin@teste.local',
        administrador: false, colaborador: true, nivel: 'Platina', pontos: 99999
    }), { status: 403, body: { erro: erroAdministracao }, chamadasNext: 0 });
});

test('exigirAdministrador chama next para administrador sem exigir colaboração ou nível', () => {
    assert.deepEqual(autorizar({ administrador: true, colaborador: false, nivel: null, pontos: 0 }), {
        status: undefined, body: undefined, chamadasNext: 1
    });
});

test('exigirAdministrador recusa flags ausentes ou valores truthy que não sejam true', () => {
    for (const administrador of [undefined, null, 'true', 'false', 1, {}, []]) {
        assert.deepEqual(autorizar({ administrador }), {
            status: 403, body: { erro: erroAdministracao }, chamadasNext: 0
        });
    }
});

test('cadastro público ignora administrador no JSON, campos extras e query e mantém sessão comum', async t => {
    const original = UsuarioModel.create;
    const recebidos = [];
    t.mock.method(UsuarioModel, 'create', async dados => {
        recebidos.push(dados);
        return original(dados);
    });
    for (const [indice, administrador] of [true, 'true'].entries()) {
        const resposta = await request('/api/auth/cadastro?administrador=true&admin=true', {
            method: 'POST', body: {
                identificador: 'cadastro-admin-' + indice + '@teste.local', nome: 'Pessoa', sobrenome: 'Cadastro',
                idade: 30, genero: 'outro', senha: 'senha-de-teste', colaborador: false,
                administrador, admin: true, permissoes: ['administrador'], usuario: { administrador: true }
            }
        });
        assert.equal(resposta.status, 201);
        const { usuario } = await resposta.json();
        assert.equal(usuario.administrador, false);
        assert.equal((await UsuarioModel.findById(usuario.id)).administrador, false);
        const Cookie = resposta.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');
        const sessao = await request('/api/auth/sessao?administrador=true', { headers: { Cookie } });
        assert.equal((await sessao.json()).usuario.administrador, false);
    }
    assert.equal(recebidos.length, 2);
    assert.equal(recebidos.every(dados => !Object.hasOwn(dados, 'administrador')), true);
});

test('PUT público de perfil descarta a flag antes do Model e PATCH inexistente não promove usuário', async t => {
    const comum = await UsuarioModel.create(conta());
    const headers = { Authorization: 'Bearer ' + TokenService.criarToken(comum.id) };
    const original = UsuarioModel.update;
    let recebidas;
    t.mock.method(UsuarioModel, 'update', async (id, alteracoes) => {
        recebidas = alteracoes;
        return original(id, alteracoes);
    });
    const rota = '/api/usuarios/' + comum.id + '?administrador=true';
    const body = { bio: 'Bio permitida', administrador: true, admin: true, usuario: { administrador: true } };
    const resposta = await request(rota, { method: 'PUT', body, headers });
    assert.equal(resposta.status, 200);
    const { usuario } = await resposta.json();
    assert.equal(usuario.bio, 'Bio permitida');
    assert.equal(usuario.administrador, false);
    assert.deepEqual(recebidas, { bio: 'Bio permitida' });
    const patch = await request(rota, { method: 'PATCH', body, headers });
    assert.equal(patch.status, 404);
    await patch.json();
    assert.equal((await UsuarioModel.findById(comum.id)).administrador, false);
    const negado = await request('/api/recurso-restrito?administrador=true', { restrita: true, headers });
    assert.equal(negado.status, 403);
    assert.deepEqual(await negado.json(), { erro: erroAdministracao });
});

test('sessão autenticada retorna estado administrativo atual por cookie e Bearer sem expor hash', async () => {
    const admin = fixtureAdministrador();
    const comum = await UsuarioModel.create(conta({ email: 'sessao-comum@teste.local' }));
    for (const usuario of [admin, comum]) {
        for (const headers of credenciais(TokenService.criarToken(usuario.id))) {
            const resposta = await request('/api/auth/sessao?administrador=true', { headers });
            assert.equal(resposta.status, 200);
            assert.equal(resposta.headers.get('cache-control'), 'no-store');
            const sessao = await resposta.json();
            assert.equal(sessao.autenticado, true);
            assert.equal(sessao.usuario.id, usuario.id);
            assert.equal(sessao.usuario.administrador, usuario.administrador);
            assert.equal(Object.hasOwn(sessao.usuario, 'senhaHash'), false);
        }
    }
    const visitante = await request('/api/auth/sessao?administrador=true');
    assert.deepEqual(await visitante.json(), { autenticado: false, usuario: null });
});

test('login de fixture administrativa expõe projeção privada, preservando cookie HttpOnly e JWT mínimo', async () => {
    const admin = fixtureAdministrador({ senhaHash: usuarios[0].senhaHash });
    const resposta = await request('/api/auth/login', {
        method: 'POST', body: { identificador: admin.email, senha: '123456', administrador: false }
    });
    assert.equal(resposta.status, 200);
    assert.equal((await resposta.json()).usuario.administrador, true);
    const header = resposta.headers.getSetCookie()[0];
    assert.equal(/;\s*HttpOnly/i.test(header), true);
    const token = decodeURIComponent(header.split(';')[0].slice('mexplica_token='.length));
    assert.deepEqual(Object.keys(TokenService.verificarToken(token)).sort(), ['aud', 'exp', 'iat', 'iss', 'sub']);
});

test('perfis, listagens e autores públicos não expõem a propriedade administrativa', async () => {
    const admin = fixtureAdministrador({ colaborador: true, pontos: UsuarioModel.NIVEL_PLATINA, disponivelAtendimento: true });
    for (const rota of ['/api/usuarios', '/api/usuarios/' + admin.id, '/api/usuarios/ranking', '/api/usuarios/platina-disponiveis', '/api/tutoriais']) {
        const resposta = await request(rota);
        assert.equal(resposta.status, 200);
        const json = await resposta.text();
        assert.equal(json.includes('"administrador"'), false, rota);
    }
    const perfil = await request('/perfil/' + admin.slug);
    assert.equal(perfil.status, 200);
    assert.equal((await perfil.text()).includes('administrador'), false);
});

test('integração carregarUsuario → exigirAdministrador retorna 401, 403 e 200 conforme usuário atual', async () => {
    const visitante = await request('/api/recurso-restrito', { restrita: true });
    assert.equal(visitante.status, 401);
    assert.deepEqual(await visitante.json(), { erro: erroAutenticacao });
    const comum = await UsuarioModel.create(conta());
    const admin = fixtureAdministrador({ email: 'integracao-admin@teste.local' });
    for (const usuario of [comum, admin]) {
        for (const headers of credenciais(TokenService.criarToken(usuario.id))) {
            const resposta = await request('/api/recurso-restrito', { restrita: true, headers });
            assert.equal(resposta.status, usuario.administrador ? 200 : 403);
            const dados = await resposta.json();
            if (usuario.administrador) {
                assert.equal(dados.usuario.administrador, true);
                assert.equal(dados.usuarioAtual.administrador, true);
                assert.equal(dados.usuario.colaborador, false);
            } else assert.deepEqual(dados, { erro: erroAdministracao });
        }
    }
});

test('claims administrativas assinadas são ignoradas e tokens emitidos continuam mínimos', async () => {
    const comum = await UsuarioModel.create(conta());
    const minimo = TokenService.verificarToken(TokenService.criarToken(comum.id));
    assert.deepEqual(Object.keys(minimo).sort(), ['aud', 'exp', 'iat', 'iss', 'sub']);
    for (const [administrador, usuario] of [[true, comum], [false, fixtureAdministrador({ email: 'claims-admin@teste.local' })]]) {
        const token = jwt.sign({ administrador, admin: administrador, permissoes: ['administrador'] }, process.env.JWT_SECRET, {
            subject: String(usuario.id), issuer: 'mexplica', audience: 'mexplica-web', algorithm: 'HS256', expiresIn: 28800
        });
        for (const headers of credenciais(token)) {
            const resposta = await request('/api/recurso-restrito', { restrita: true, headers });
            assert.equal(resposta.status, usuario.administrador ? 200 : 403);
            await resposta.json();
        }
    }
});

test('JWT adulterado com flag administrativa não autentica por cookie nem Bearer', async () => {
    const comum = await UsuarioModel.create(conta());
    const partes = TokenService.criarToken(comum.id).split('.');
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    partes[1] = Buffer.from(JSON.stringify({ ...payload, administrador: true })).toString('base64url');
    for (const headers of credenciais(partes.join('.'))) {
        const resposta = await request('/api/recurso-restrito', { restrita: true, headers });
        assert.equal(resposta.status, 401);
        assert.deepEqual(await resposta.json(), { erro: erroAutenticacao });
    }
});

test('revogação no registro atual bloqueia a próxima requisição com o MESMO JWT ainda válido', async t => {
    const registro = fixtureAdministrador();
    const token = TokenService.criarToken(registro.id);
    const busca = t.mock.method(UsuarioMemoryRepository.prototype, 'findById');
    for (const headers of credenciais(token)) {
        const autorizado = await request('/api/recurso-restrito', { restrita: true, headers });
        assert.equal(autorizado.status, 200);
        await autorizado.json();
    }
    assert.equal(busca.mock.callCount(), 2);
    // Simula a revogação persistida por uma operação interna, fora do update público de perfil.
    registro.administrador = false;
    for (const headers of credenciais(token)) {
        assert.ok(TokenService.verificarToken(token));
        const negado = await request('/api/recurso-restrito', { restrita: true, headers });
        assert.equal(negado.status, 403);
        assert.deepEqual(await negado.json(), { erro: erroAdministracao });
        const sessao = await request('/api/auth/sessao', { headers });
        const dados = await sessao.json();
        assert.equal(dados.autenticado, true);
        assert.equal(dados.usuario.administrador, false);
    }
    assert.equal(busca.mock.callCount(), 6);
});
