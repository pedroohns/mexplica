const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const UsuarioModel = require('../src/models/usuarioModel');
const UsuarioMemoryRepository = require('../src/repositories/usuarioMemoryRepository');
const TutorialModel = require('../src/models/tutorialModel');
const ComentarioModel = require('../src/models/comentarioModel');
const AvaliacaoModel = require('../src/models/avaliacaoModel');
const RelacionamentoService = require('../src/services/relacionamentoService');
const app = require('../src/index');
let server, base, cookie;

const conta = alteracoes => ({ nome: 'Pessoa', sobrenome: 'Persistência', email: 'pessoa@teste.local', idade: 30,
    genero: 'outro', senhaHash: 'hash-ficticio', colaborador: true, ...alteracoes });

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
    const resposta = await request('/api/auth/login', 'POST', { identificador: 'maria@mexplica.com', senha: '123456' });
    assert.equal(resposta.status, 200);
    await resposta.json();
    cookie = resposta.headers.getSetCookie().map(valor => valor.split(';')[0]).join('; ');
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

function request(rota, method = 'GET', body, autenticado = false) {
    return fetch(base + rota, {
        method, headers: { 'Content-Type': 'application/json', ...(autenticado ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

function restaurarArrays(t) {
    for (const nome of ['usuario', 'tutorial', 'comentario', 'avaliacao']) {
        const array = require(`../src/data/${nome}Data`);
        const copia = structuredClone(array);
        t.after(() => { array.splice(0, array.length, ...copia); });
    }
}

test('Model mantém tipo e nível derivados e preserva as projeções públicas sem hash', async () => {
    const usuarios = await UsuarioModel.findAll();
    for (const usuario of usuarios) {
        assert.equal(usuario.tipo, usuario.colaborador ? 'colaborador' : 'usuario');
        assert.equal(usuario.nivel, UsuarioModel.calcularNivel(usuario.pontos, usuario.colaborador));
        assert.equal('senhaHash' in UsuarioModel.toPublic(usuario), false);
        assert.equal('senhaHash' in UsuarioModel.toPrivate(usuario), false);
        assert.equal(Object.hasOwn(usuario, 'especialidades'), false);
        assert.equal(Object.hasOwn(UsuarioModel.toPublic(usuario), 'especialidades'), false);
        assert.equal(Object.hasOwn(UsuarioModel.toPrivate(usuario), 'especialidades'), false);
    }
});

test('MemoryRepository não lê nem cria especialidades em cadastro ou edição', async () => {
    const repo = new UsuarioMemoryRepository([]);
    const entrada = conta({ slug: 'campo-abandonado', pontos: 0 });
    Object.defineProperty(entrada, 'especialidades', { get() { throw new Error('Campo abandonado não deve ser lido.'); } });
    const usuario = await repo.create(entrada);
    assert.equal(Object.hasOwn(usuario, 'especialidades'), false);
    assert.equal(usuario.nome, entrada.nome);
    const atualizado = await repo.update(usuario.id, { bio: 'Bio atualizada', especialidades: ['legado'] });
    assert.equal(atualizado.bio, 'Bio atualizada');
    assert.equal(Object.hasOwn(atualizado, 'especialidades'), false);
    assert.equal(Object.hasOwn(UsuarioModel.toPublic({ ...atualizado, especialidades: ['legado'] }), 'especialidades'), false);
});

test('cadastros concorrentes com o mesmo nome recebem slugs distintos', async t => {
    restaurarArrays(t);
    const [primeiro, segundo] = await Promise.all([
        UsuarioModel.create(conta({ email: 'primeiro@teste.local' })),
        UsuarioModel.create(conta({ email: 'segundo@teste.local' }))
    ]);
    assert.deepEqual(new Set([primeiro.slug, segundo.slug]), new Set(['pessoa-persistencia', 'pessoa-persistencia-2']));
    assert.equal(primeiro.pontos, 0);
});

test('Model tenta próximo slug quando a UNIQUE detecta colisão após a consulta prévia', async t => {
    restaurarArrays(t);
    const original = UsuarioMemoryRepository.prototype.create;
    let tentativas = 0;
    t.mock.method(UsuarioMemoryRepository.prototype, 'create', async function (dados) {
        tentativas++;
        if (tentativas === 1) throw Object.assign(new Error('Colisão simulada'), { code: 'USUARIO_SLUG_CONFLITO' });
        return original.call(this, dados);
    });
    const usuario = await UsuarioModel.create(conta());
    assert.equal(usuario.slug, 'pessoa-persistencia-2');
    assert.equal(tentativas, 2);
});

test('tentativas de slug têm limite para evitar repetição indefinida', async t => {
    let tentativas = 0;
    t.mock.method(UsuarioMemoryRepository.prototype, 'create', async () => {
        tentativas++;
        throw Object.assign(new Error('Colisão simulada'), { code: 'USUARIO_SLUG_CONFLITO' });
    });
    await assert.rejects(UsuarioModel.create(conta()), { code: 'USUARIO_SLUG_CONFLITO' });
    assert.equal(tentativas, 50);
});

test('perfil mantém whitelist e perda de Platina limpa disponibilidade', async t => {
    restaurarArrays(t);
    const usuario = await UsuarioModel.create(conta());
    await UsuarioModel.adicionarPontos(usuario.id, UsuarioModel.NIVEL_PLATINA);
    assert.equal((await UsuarioModel.definirDisponibilidade(usuario.id, true)).disponivelAtendimento, true);
    const atualizado = await UsuarioModel.update(usuario.id, {
        nome: 'Nome editado', especialidades: ['legado'],
        id: 999, slug: 'outro', colaborador: false, pontos: 99999, senhaHash: 'indevida'
    });
    assert.equal(atualizado.id, usuario.id);
    assert.equal(atualizado.slug, 'pessoa-persistencia');
    assert.equal(atualizado.colaborador, true);
    assert.equal(atualizado.pontos, UsuarioModel.NIVEL_PLATINA);
    assert.equal(Object.hasOwn(atualizado, 'especialidades'), false);
    assert.equal(atualizado.senhaHash === 'hash-ficticio', true);
    const rebaixado = await UsuarioModel.adicionarPontos(usuario.id, -1);
    assert.equal(rebaixado.nivel, 'Diamante');
    assert.equal(rebaixado.disponivelAtendimento, false);
    assert.equal(await UsuarioModel.definirDisponibilidade(usuario.id, true), null);
    assert.equal((await UsuarioModel.adicionarPontos(usuario.id, -10000)).pontos, 0);
});

test('requisições estáticas e health com cookie não consultam usuário; rotas dinâmicas consultam', async t => {
    const busca = t.mock.method(UsuarioModel, 'findById', async () => { throw new Error('Consulta bloqueada no teste'); });
    t.mock.method(console, 'error', () => {});
    for (const rota of ['/css/style.css', '/js/core/api.js', '/icons/logo-completa.png', '/api/health']) {
        const resposta = await request(rota, 'GET', undefined, true);
        assert.equal(resposta.status, 200, rota);
        await resposta.text();
    }
    assert.equal(busca.mock.callCount(), 0);
    const dinamica = await request('/api/auth/sessao', 'GET', undefined, true);
    assert.equal(dinamica.status, 500);
    await dinamica.json();
    assert.equal(busca.mock.callCount(), 1);
});

test('sessão de usuário removido é limpa depois da consulta assíncrona', async t => {
    t.mock.method(UsuarioModel, 'findById', async () => null);
    const resposta = await request('/api/auth/sessao', 'GET', undefined, true);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { autenticado: false, usuario: null });
    assert.equal(resposta.headers.getSetCookie().some(valor => valor.startsWith('mexplica_token=;')), true);
});

test('falha assíncrona inesperada chega ao middleware sem expor SQL ou detalhes privados', async t => {
    const logs = [];
    t.mock.method(console, 'error', (...args) => logs.push(args));
    t.mock.method(UsuarioModel, 'findById', async () => {
        throw Object.assign(new Error('SQL com credenciais e hash privados simulados'), { detail: 'Detalhe privado', code: 'XX000' });
    });
    const resposta = await request('/api/auth/sessao', 'GET', undefined, true);
    assert.equal(resposta.status, 500);
    assert.deepEqual(await resposta.json(), { erro: 'Erro interno do servidor.' });
    assert.deepEqual(logs, [['Erro interno ao processar a requisição.']]);
});

test('cadastro traduz conflito concorrente de email/telefone em HTTP 409 amigável', async t => {
    t.mock.method(UsuarioModel, 'findByIdentifier', async () => null);
    t.mock.method(UsuarioModel, 'create', async () => {
        throw Object.assign(new Error('Detalhe privado simulado'), { code: 'USUARIO_IDENTIFICADOR_CONFLITO' });
    });
    const resposta = await request('/api/auth/cadastro', 'POST', {
        identificador: 'conflito@example.com', nome: 'Pessoa', sobrenome: 'Teste', idade: 30, genero: 'outro', senha: '123456'
    });
    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), { erro: 'Este email ou telefone já está cadastrado.' });
});

test('API preserva cadastro, verificação, login, edição e exclusão por email ou telefone em memória', async t => {
    restaurarArrays(t);
    for (const identificador of ['CONTA-API@TESTE.LOCAL', '(24) 98888-0000']) {
        const cadastro = await request('/api/auth/cadastro', 'POST', {
            identificador, nome: 'Pessoa', sobrenome: 'API', idade: 30, genero: 'outro', senha: '123456', colaborador: true
        });
        assert.equal(cadastro.status, 201);
        const usuario = (await cadastro.json()).usuario;
        assert.equal(usuario.nivel, 'Comum');
        const conferir = await request('/api/auth/verificar', 'POST', { identificador });
        assert.equal((await conferir.json()).cadastrado, true);
        const login = await request('/api/auth/login', 'POST', { identificador, senha: '123456' });
        assert.equal(login.status, 200);
        await login.json();
        const cookieConta = login.headers.getSetCookie().map(valor => valor.split(';')[0]).join('; ');
        const editar = await fetch(base + '/api/usuarios/' + usuario.id, {
            method: 'PUT', headers: { Cookie: cookieConta, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: 'Editado', bio: 'Nova bio', localizacao: 'Rio de Janeiro',
                especialidades: ['Segurança'], pontos: 9999, colaborador: false, slug: 'indevido' })
        });
        assert.equal(editar.status, 200);
        const atualizado = (await editar.json()).usuario;
        assert.equal(atualizado.nome, 'Editado');
        assert.equal(atualizado.bio, 'Nova bio');
        assert.equal(atualizado.localizacao, 'Rio de Janeiro');
        assert.equal(Object.hasOwn(atualizado, 'especialidades'), false);
        assert.equal(atualizado.pontos, 0);
        assert.equal(atualizado.colaborador, true);
        assert.equal(atualizado.slug, usuario.slug);
        const excluir = await fetch(base + '/api/usuarios/' + usuario.id, { method: 'DELETE', headers: { Cookie: cookieConta } });
        assert.equal(excluir.status, 200);
        await excluir.json();
        assert.equal(await UsuarioModel.findById(usuario.id), null);
    }
});

test('Controller descarta especialidades antes de chamar o Model e mantém edição de bio/localização', async t => {
    restaurarArrays(t);
    const login = await request('/api/auth/login', 'POST', { identificador: 'lucas@mexplica.com', senha: '123456' });
    assert.equal(login.status, 200);
    const { usuario } = await login.json();
    const cookieAutor = login.headers.getSetCookie().map(valor => valor.split(';')[0]).join('; ');
    const original = UsuarioModel.update;
    let recebidas;
    t.mock.method(UsuarioModel, 'update', async (id, alteracoes) => {
        recebidas = alteracoes;
        return original(id, alteracoes);
    });
    const resposta = await fetch(base + '/api/usuarios/' + usuario.id, {
        method: 'PUT', headers: { Cookie: cookieAutor, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'Bio atualizada', localizacao: 'Brasil', especialidades: ['legado'] })
    });
    assert.equal(resposta.status, 200);
    const atualizado = (await resposta.json()).usuario;
    assert.equal(Object.hasOwn(recebidas, 'especialidades'), false);
    assert.equal(Object.hasOwn(atualizado, 'especialidades'), false);
    assert.equal(atualizado.bio, 'Bio atualizada');
    assert.equal(atualizado.localizacao, 'Brasil');
});

test('falha ao excluir usuário preserva todos os dados do adapter em memória', async t => {
    restaurarArrays(t);
    const usuario = await UsuarioModel.create(conta());
    const tutorial = (await TutorialModel.create({ autorId: usuario.id, titulo: 'Tutorial temporário', passos: [] }));
    (await ComentarioModel.create({ tutorialId: tutorial.id, usuarioId: 1, texto: 'Comentário temporário' }));
    (await AvaliacaoModel.create({ tutorialId: tutorial.id, avaliadorId: 1, nota: 5 }));
    const anteriores = JSON.stringify([(await TutorialModel.findAll()), (await ComentarioModel.findAll()), (await AvaliacaoModel.findAll())]);
    t.mock.method(UsuarioModel, 'remove', async () => { throw new Error('Falha simulada no commit'); });
    await assert.rejects(RelacionamentoService.removerDadosDoUsuario(usuario.id), /Falha simulada/);
    assert.equal(JSON.stringify([(await TutorialModel.findAll()), (await ComentarioModel.findAll()), (await AvaliacaoModel.findAll())]) === anteriores, true);
    assert.ok(await UsuarioModel.findById(usuario.id));
});

test('falha no ajuste de pontos preserva avaliação e tutorial e não bloqueia operações seguintes', async t => {
    restaurarArrays(t);
    t.mock.method(UsuarioModel, 'adicionarPontos', async () => { throw new Error('Falha simulada nos pontos'); });
    await assert.rejects(RelacionamentoService.removerAvaliacaoComAjuste(1), /Falha simulada/);
    assert.ok((await AvaliacaoModel.findById(1)));
    await assert.rejects(RelacionamentoService.removerTutorialCompleto(1), /Falha simulada/);
    assert.ok((await TutorialModel.findById(1)));
    assert.ok((await AvaliacaoModel.findById(1)));
    assert.equal(await RelacionamentoService.removerTutorialCompleto(999999), null);
});

test('falha persistente ao avaliar ou editar avaliação não modifica o array', async t => {
    restaurarArrays(t);
    t.mock.method(console, 'error', () => {});
    t.mock.method(UsuarioModel, 'adicionarPontos', async () => { throw new Error('Falha simulada nos pontos'); });
    const tutorial = (await TutorialModel.create({ autorId: 2, titulo: 'Tutorial temporário', passos: [] }));
    const tamanho = (await AvaliacaoModel.findAll()).length;
    const nova = await request(`/api/tutoriais/${tutorial.id}/avaliacoes`, 'POST', { nota: 5 }, true);
    assert.equal(nova.status, 500);
    await nova.json();
    assert.equal((await AvaliacaoModel.findAll()).length, tamanho);
    const nota = (await AvaliacaoModel.findById(1)).nota;
    const edicao = await request('/api/avaliacoes/1', 'PUT', { nota: 3 }, true);
    assert.equal(edicao.status, 500);
    await edicao.json();
    assert.equal((await AvaliacaoModel.findById(1)).nota, nota);
});

test('avaliações concorrentes no mesmo processo não duplicam avaliação nem pontos', async t => {
    restaurarArrays(t);
    const tutorial = (await TutorialModel.create({ autorId: 2, titulo: 'Tutorial temporário', passos: [] }));
    const pontosAnteriores = (await UsuarioModel.findById(2)).pontos;
    const respostas = await Promise.all([
        request(`/api/tutoriais/${tutorial.id}/avaliacoes`, 'POST', { nota: 5 }, true),
        request(`/api/tutoriais/${tutorial.id}/avaliacoes`, 'POST', { nota: 5 }, true)
    ]);
    assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [201, 409]);
    await Promise.all(respostas.map(resposta => resposta.json()));
    assert.equal((await AvaliacaoModel.findByTutorialId(tutorial.id)).length, 1);
    assert.equal((await UsuarioModel.findById(2)).pontos, pontosAnteriores + 50);
});
