const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const UsuarioModel = require('../src/models/usuarioModel');
const TutorialModel = require('../src/models/tutorialModel');
const ComentarioModel = require('../src/models/comentarioModel');
const AvaliacaoModel = require('../src/models/avaliacaoModel');
const AdminService = require('../src/services/adminService');
const RelacionamentoService = require('../src/services/relacionamentoService');
const TokenService = require('../src/services/tokenService');
const app = require('../src/index');
let server, base, admin, comum, colaborador;
const colecoes = ['usuario', 'tutorial', 'comentario', 'avaliacao'];
const recursos = ['usuarios', 'tutoriais', 'comentarios', 'avaliacoes'];

async function usuario(nome, { administrador = false, colaborador = false } = {}) {
    const novo = await UsuarioModel.create({ nome, sobrenome: 'Offline', email: nome + '@teste.local',
        idade: 30, genero: 'outro', colaborador, senhaHash: 'hash-privado-sentinela' });
    // Fixture interna; nenhum endpoint público concede esta permissão.
    novo.administrador = administrador;
    return novo;
}
async function tutorial(autor, titulo = 'Tutorial de teste administrativo') {
    return TutorialModel.create({ titulo, autorId: autor.id, categoriaId: 'sistemas-acessibilidade', resumo: 'Resumo de teste para o painel de moderação.',
        conteudo: 'Conteúdo de teste usado para validar a moderação com segurança.',
        passos: [{ ordem: 1, titulo: 'Passo', descricao: 'Descrição' }], tags: ['teste'] });
}
function request(rota, { method = 'GET', body, usuario = admin, token, ...opcoes } = {}) {
    return fetch(base + rota, { method,
        headers: { 'Content-Type': 'application/json', ...(usuario || token ? { Authorization: 'Bearer ' + (token || TokenService.criarToken(usuario.id)) } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), ...opcoes });
}
async function totais() {
    return Object.fromEntries(await Promise.all(colecoes.map(async nome => [nome, require(`../src/data/${nome}Data`).length])));
}

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(async t => {
    for (const nome of colecoes) {
        const array = require(`../src/data/${nome}Data`), copia = structuredClone(array);
        t.after(() => { array.splice(0, array.length, ...copia); });
    }
    admin = await usuario('ModeradorTeste', { administrador: true });
    comum = await usuario('PessoaTeste');
    colaborador = await usuario('AutorTeste', { colaborador: true });
});

for (const [identidade, status] of [['visitante', 401], ['comum', 403], ['colaborador', 403]]) {
    test(`todas as listagens e exclusões administrativas recusam ${identidade} com ${status}`, async () => {
        const alvo = identidade === 'visitante' ? null : identidade === 'comum' ? comum : colaborador;
        const antes = await totais();
        for (const rota of ['/api/admin/resumo', ...recursos.map(recurso => '/api/admin/' + recurso)]) {
            const resposta = await request(rota, { usuario: alvo });
            assert.equal(resposta.status, status, rota);
            assert.equal(resposta.headers.get('cache-control'), 'no-store');
            assert.equal(typeof (await resposta.json()).erro, 'string');
        }
        for (const recurso of recursos) {
            const resposta = await request(`/api/admin/${recurso}/${comum.id}`, { method: 'DELETE', usuario: alvo,
                body: { administrador: true, admin: true } });
            assert.equal(resposta.status, status, recurso);
            await resposta.json();
        }
        assert.deepEqual(await totais(), antes);
    });
}

test('admin sem colaboração acessa todas as listagens e o resumo reflete os dados atuais', async () => {
    assert.equal(admin.colaborador, false);
    assert.equal(admin.nivel, null);
    for (const recurso of recursos) {
        const resposta = await request('/api/admin/' + recurso);
        assert.equal(resposta.status, 200);
        const dados = await resposta.json();
        assert.equal(Array.isArray(dados.itens), true);
        assert.ok(dados.itens.length <= 20);
    }
    const resumo = await request('/api/admin/resumo');
    assert.deepEqual(await resumo.json(), { usuarios: await UsuarioModel.count(), tutoriais: await TutorialModel.count(),
        comentarios: await ComentarioModel.count(), avaliacoes: await AvaliacaoModel.count() });
});

test('/admin redireciona visitante e apresenta 403 amigável ao usuário comum', async () => {
    const visitante = await request('/admin', { usuario: null, redirect: 'manual' });
    assert.equal(visitante.status, 302);
    assert.equal(visitante.headers.get('location'), '/cadastro.html?redirect=%2Fadmin');
    await visitante.text();
    for (const pessoa of [comum, colaborador]) {
        const resposta = await request('/admin', { usuario: null, headers: { Cookie: 'mexplica_token=' + TokenService.criarToken(pessoa.id) } });
        assert.equal(resposta.status, 403);
        const html = await resposta.text();
        assert.match(html, /necessária uma permissão administrativa/);
        assert.doesNotMatch(html, /id="adminExcluirDialog"/);
    }
});

test('/admin aceita cookie, mostra identidade e mantém API antes do script do painel', async () => {
    const resposta = await request('/admin', { usuario: null, headers: { Cookie: 'mexplica_token=' + TokenService.criarToken(admin.id) } });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get('cache-control'), 'no-store');
    const html = await resposta.text();
    assert.match(html, /Painel de Moderação/);
    assert.match(html, /ModeradorTeste Offline/);
    assert.ok(html.indexOf('/js/core/api.js') < html.indexOf('/js/admin/painel.js'));
    assert.match(html, /<dialog[^>]+aria-labelledby="adminExcluirTitulo"/);
    assert.doesNotMatch(html, /hash-privado-sentinela|senha_hash|senhaHash/);
});

test('header EJS exibe entrada de moderação somente para a própria sessão administrativa', async () => {
    for (const pessoa of [admin, comum, null]) {
        const resposta = await request('/perfil/' + comum.slug, { usuario: null,
            headers: pessoa ? { Cookie: 'mexplica_token=' + TokenService.criarToken(pessoa.id) } : {} });
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.text()).includes('href="/admin"'), pessoa === admin);
    }
});

test('APIs administrativas não serializam hashes ou propriedades persistentes extras', async () => {
    admin.senha_hash = 'outro-hash-sentinela';
    admin.segredoInterno = 'segredo-sentinela';
    for (const rota of ['/api/admin/resumo', ...recursos.map(recurso => '/api/admin/' + recurso)]) {
        const resposta = await request(rota);
        assert.equal(resposta.status, 200);
        assert.doesNotMatch(await resposta.text(), /senhaHash|senha_hash|sentinela|JWT_SECRET|DATABASE_URL|segredoInterno/);
    }
});

test('busca administrativa normaliza acentos, nome, handle e email e informa vazio', async () => {
    const pessoa = await usuario('Ágata');
    for (const q of ['agata', 'Ágata Offline', '@agataoffline', pessoa.email.toUpperCase()]) {
        const resposta = await request('/api/admin/usuarios?q=' + encodeURIComponent(q));
        const dados = await resposta.json();
        assert.equal(dados.total, 1, q);
        assert.equal(dados.itens[0].id, pessoa.id);
    }
    for (const recurso of recursos) {
        const dados = await (await request(`/api/admin/${recurso}?q=naoexistequalquerregistro`)).json();
        assert.deepEqual(dados.itens, []);
        assert.equal(dados.total, 0);
    }
});

test('paginação limita resposta e normaliza páginas inválidas sem perder ordenação', async () => {
    for (let i = 0; i < 24; i++) await usuario('Pagina' + i);
    const primeira = await (await request('/api/admin/usuarios?q=pagina&pagina=1')).json();
    const segunda = await (await request('/api/admin/usuarios?q=pagina&pagina=2')).json();
    assert.equal(primeira.itens.length, 20);
    assert.equal(segunda.itens.length, 4);
    assert.equal(new Set([...primeira.itens, ...segunda.itens].map(item => item.id)).size, 24);
    assert.equal(segunda.paginas, 2);
    assert.equal((await (await request('/api/admin/usuarios?q=pagina&pagina=invalida')).json()).pagina, 1);
});

test('listagens compõem autores e totais em lotes sem consultas individuais por registro', async t => {
    const novo = await tutorial(colaborador, 'Título pesquisável');
    await ComentarioModel.create({ tutorialId: novo.id, usuarioId: comum.id, texto: 'Conversa pesquisável' });
    await RelacionamentoService.criarAvaliacaoComPontos(novo.id, comum.id, 4);
    t.mock.method(UsuarioModel, 'findById', () => { throw new Error('N+1 de usuário proibido'); });
    t.mock.method(TutorialModel, 'findById', () => { throw new Error('N+1 de tutorial proibido'); });
    const usuarios = t.mock.method(UsuarioModel, 'findAll');
    const tutoriais = t.mock.method(TutorialModel, 'listarParaModeracao');
    const resultado = await AdminService.listarTutoriais({ q: 'AutorTeste' });
    assert.equal(resultado.itens[0].autor.id, colaborador.id);
    assert.equal(resultado.itens[0].comentarios, 1);
    assert.equal(resultado.itens[0].avaliacoes, 1);
    assert.equal(resultado.itens[0].categoria, 'Sistemas e Acessibilidade');
    assert.equal(Object.hasOwn(resultado.itens[0], 'passos'), false);
    assert.equal((await AdminService.listarComentarios({ q: 'Conversa pesquisável' })).itens[0].tutorial.id, novo.id);
    assert.equal((await AdminService.listarAvaliacoes({ q: 'Título pesquisável' })).itens[0].autor.id, comum.id);
    assert.equal(usuarios.mock.callCount(), 3);
    assert.equal(tutoriais.mock.callCount(), 3);
});

test('admin não pode excluir a própria conta ou outra conta administrativa', async () => {
    const outro = await usuario('OutroAdmin', { administrador: true });
    for (const alvo of [admin, outro]) {
        const resposta = await request('/api/admin/usuarios/' + alvo.id, { method: 'DELETE' });
        assert.equal(resposta.status, 403);
        assert.match((await resposta.json()).erro, alvo === admin ? /própria conta/ : /Contas administrativas/);
        assert.ok(await UsuarioModel.findById(alvo.id));
    }
});

test('proteção administrativa confere o usuário relido dentro da transação antes de qualquer efeito', async t => {
    const original = UsuarioModel.remove;
    const copia = structuredClone(await totais());
    t.mock.method(UsuarioModel, 'remove', async (id, opcoes) => {
        // Simula promoção concluída antes de o Repository obter o bloqueio da exclusão.
        comum.administrador = true;
        return original(id, opcoes);
    });
    const resposta = await request('/api/admin/usuarios/' + comum.id, { method: 'DELETE' });
    assert.equal(resposta.status, 403);
    await resposta.json();
    assert.deepEqual(await totais(), copia);
    assert.ok(await UsuarioModel.findById(comum.id));
});

test('admin exclui usuário comum por endpoint explícito sem conceder privilégios ao alvo', async () => {
    const resposta = await request('/api/admin/usuarios/' + comum.id, { method: 'DELETE', body: { administrador: true } });
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { mensagem: 'Usuário excluído com sucesso.' });
    assert.equal(await UsuarioModel.findById(comum.id), null);
});

test('exclusão administrativa de usuário preserva cascatas e reversão agregada dos pontos', async () => {
    const alvo = colaborador, autor = await usuario('OutroAutor', { colaborador: true });
    const primeiro = await tutorial(autor, 'Primeiro externo'), segundo = await tutorial(autor, 'Segundo externo');
    const proprio = await tutorial(alvo, 'Tutorial do alvo');
    await RelacionamentoService.criarAvaliacaoComPontos(primeiro.id, alvo.id, 5);
    await RelacionamentoService.criarAvaliacaoComPontos(segundo.id, alvo.id, 4);
    await RelacionamentoService.criarAvaliacaoComPontos(primeiro.id, comum.id, 3);
    await RelacionamentoService.criarAvaliacaoComPontos(proprio.id, comum.id, 4);
    await ComentarioModel.create({ tutorialId: primeiro.id, usuarioId: alvo.id, texto: 'Comentário do alvo' });
    await ComentarioModel.create({ tutorialId: proprio.id, usuarioId: comum.id, texto: 'Comentário dependente' });
    assert.equal((await UsuarioModel.findById(autor.id)).pontos, 120);
    const resposta = await request('/api/admin/usuarios/' + alvo.id, { method: 'DELETE' });
    assert.equal(resposta.status, 200);
    await resposta.json();
    assert.equal((await UsuarioModel.findById(autor.id)).pontos, 30);
    assert.equal(await TutorialModel.findById(proprio.id), null);
    assert.equal((await ComentarioModel.findByTutorialId(proprio.id)).length, 0);
    assert.equal((await ComentarioModel.findByUserId(alvo.id)).length, 0);
    assert.equal((await AvaliacaoModel.findByAvaliadorId(alvo.id)).length, 0);
    assert.equal((await AvaliacaoModel.findByTutorialId(proprio.id)).length, 0);
    assert.equal((await AvaliacaoModel.findByTutorialId(primeiro.id)).length, 1);
});

test('admin exclui tutorial alheio com comentários e avaliações e reverte seus pontos', async () => {
    const novo = await tutorial(colaborador);
    await RelacionamentoService.criarAvaliacaoComPontos(novo.id, comum.id, 5);
    await ComentarioModel.create({ tutorialId: novo.id, usuarioId: comum.id, texto: 'Texto associado' });
    assert.equal((await UsuarioModel.findById(colaborador.id)).pontos, 50);
    const resposta = await request('/api/admin/tutoriais/' + novo.id, { method: 'DELETE' });
    assert.equal(resposta.status, 200);
    await resposta.json();
    assert.equal(await TutorialModel.findById(novo.id), null);
    assert.deepEqual(await ComentarioModel.findByTutorialId(novo.id), []);
    assert.deepEqual(await AvaliacaoModel.findByTutorialId(novo.id), []);
    assert.equal((await UsuarioModel.findById(colaborador.id)).pontos, 0);
});

test('admin remove comentário alheio sem alterar a pontuação ou simular autoria', async () => {
    const novo = await tutorial(colaborador);
    const comentario = await ComentarioModel.create({ tutorialId: novo.id, usuarioId: comum.id, texto: 'Texto alheio' });
    const resposta = await request('/api/admin/comentarios/' + comentario.id, { method: 'DELETE' });
    assert.equal(resposta.status, 200);
    await resposta.json();
    assert.equal(await ComentarioModel.findById(comentario.id), null);
    assert.equal((await UsuarioModel.findById(colaborador.id)).pontos, 0);
});

test('admin remove avaliação alheia pelo Service e Observer reverte somente seus pontos', async () => {
    const novo = await tutorial(colaborador);
    const primeira = (await RelacionamentoService.criarAvaliacaoComPontos(novo.id, comum.id, 5)).avaliacao;
    await RelacionamentoService.criarAvaliacaoComPontos(novo.id, admin.id, 4);
    const resposta = await request('/api/admin/avaliacoes/' + primeira.id, { method: 'DELETE' });
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { mensagem: 'Avaliação removida com sucesso.' });
    assert.equal(await AvaliacaoModel.findById(primeira.id), null);
    assert.equal((await UsuarioModel.findById(colaborador.id)).pontos, 40);
    assert.equal((await AvaliacaoModel.resumoDoTutorial(novo.id)).quantidade, 1);
});

test('falha transacional na remoção de avaliação não deixa exclusão ou pontos parciais', async t => {
    const novo = await tutorial(colaborador);
    const avaliacao = (await RelacionamentoService.criarAvaliacaoComPontos(novo.id, comum.id, 5)).avaliacao;
    t.mock.method(console, 'error', () => {});
    t.mock.method(UsuarioModel, 'adicionarPontos', async () => { throw new Error('SQL e segredo privados simulados'); });
    const resposta = await request('/api/admin/avaliacoes/' + avaliacao.id, { method: 'DELETE' });
    assert.equal(resposta.status, 500);
    assert.deepEqual(await resposta.json(), { erro: 'Erro interno do servidor.' });
    assert.ok(await AvaliacaoModel.findById(avaliacao.id));
    assert.equal((await UsuarioModel.findById(colaborador.id)).pontos, 50);
});

for (const recurso of ['usuarios', 'tutoriais']) {
    test(`falha no ajuste de pontos aborta exclusão administrativa de ${recurso} e mantém dependências`, async t => {
        const novo = await tutorial(colaborador);
        const comentario = await ComentarioModel.create({ tutorialId: novo.id, usuarioId: comum.id, texto: 'Preservar' });
        const avaliacao = (await RelacionamentoService.criarAvaliacaoComPontos(novo.id, comum.id, 5)).avaliacao;
        const antes = await totais();
        t.mock.method(console, 'error', () => {});
        t.mock.method(UsuarioModel, 'adicionarPontos', async () => { throw new Error('Falha privada simulada'); });
        const id = recurso === 'usuarios' ? comum.id : novo.id;
        const resposta = await request(`/api/admin/${recurso}/${id}`, { method: 'DELETE' });
        assert.equal(resposta.status, 500);
        assert.deepEqual(await resposta.json(), { erro: 'Erro interno do servidor.' });
        assert.deepEqual(await totais(), antes);
        assert.ok(await UsuarioModel.findById(comum.id));
        assert.ok(await TutorialModel.findById(novo.id));
        assert.ok(await ComentarioModel.findById(comentario.id));
        assert.ok(await AvaliacaoModel.findById(avaliacao.id));
        assert.equal((await UsuarioModel.findById(colaborador.id)).pontos, 50);
    });
}

test('resumo reflete exclusão confirmada e não varia em exclusão recusada', async () => {
    const antes = await (await request('/api/admin/resumo')).json();
    const protegido = await request('/api/admin/usuarios/' + admin.id, { method: 'DELETE' });
    assert.equal(protegido.status, 403);
    await protegido.json();
    assert.deepEqual(await (await request('/api/admin/resumo')).json(), antes);
    const removido = await request('/api/admin/usuarios/' + comum.id, { method: 'DELETE' });
    assert.equal(removido.status, 200);
    await removido.json();
    assert.deepEqual(await (await request('/api/admin/resumo')).json(), { ...antes, usuarios: antes.usuarios - 1 });
});

test('exclusões inexistentes ou IDs inválidos retornam 404 sem modificar os dados', async () => {
    const antes = await totais();
    for (const recurso of recursos) {
        for (const id of ['999999', '-1', 'invalido', '2147483648']) {
            const resposta = await request(`/api/admin/${recurso}/${id}`, { method: 'DELETE' });
            assert.equal(resposta.status, 404, recurso + '/' + id);
            assert.equal(typeof (await resposta.json()).erro, 'string');
        }
    }
    assert.deepEqual(await totais(), antes);
});

test('moderação não permite editar conteúdo alheio nas rotas normais nem cria endpoint de edição', async () => {
    admin.colaborador = true;
    const novo = await tutorial(colaborador);
    const resposta = await request('/api/tutoriais/' + novo.id, { method: 'PUT', body: { titulo: 'Mudança indevida' } });
    assert.equal(resposta.status, 403);
    await resposta.json();
    const inexistente = await request('/api/admin/tutoriais/' + novo.id, { method: 'PUT', body: { titulo: 'Outra mudança' } });
    assert.equal(inexistente.status, 404);
    await inexistente.json();
    assert.equal((await TutorialModel.findById(novo.id)).titulo, novo.titulo);
});

test('revogação bloqueia listagens e exclusões reais com o mesmo JWT sem removê-lo da sessão', async () => {
    const token = TokenService.criarToken(admin.id);
    assert.equal((await request('/api/admin/resumo', { token })).status, 200);
    admin.administrador = false;
    for (const recurso of recursos) {
        for (const method of ['GET', 'DELETE']) {
            const resposta = await request('/api/admin/' + recurso + (method === 'DELETE' ? '/' + comum.id : ''), { method, token });
            assert.equal(resposta.status, 403);
            await resposta.json();
        }
    }
    const sessao = await (await request('/api/auth/sessao', { token })).json();
    assert.equal(sessao.autenticado, true);
    assert.equal(sessao.usuario.administrador, false);
    assert.ok(TokenService.verificarToken(token));
});
