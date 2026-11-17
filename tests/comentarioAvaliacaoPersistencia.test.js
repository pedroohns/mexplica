const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const UsuarioModel = require('../src/models/usuarioModel');
const TutorialModel = require('../src/models/tutorialModel');
const ComentarioModel = require('../src/models/comentarioModel');
const AvaliacaoModel = require('../src/models/avaliacaoModel');
const ComentarioService = require('../src/services/comentarioService');
const PerfilService = require('../src/services/perfilService');
const app = require('../src');
let servidor, base;
const cookies = new Map();
const request = (path, id, method = 'GET', body) => fetch(base + path, { method,
    headers: { 'Content-Type': 'application/json', ...(id ? { Cookie: cookies.get(id) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });

before(async () => {
    servidor = app.listen(0, '127.0.0.1');
    await new Promise(resolve => servidor.once('listening', resolve));
    base = 'http://127.0.0.1:' + servidor.address().port;
    for (const id of [1, 2, 3]) {
        const usuario = await UsuarioModel.findById(id);
        const resposta = await request('/api/auth/login', null, 'POST', { identificador: usuario.email, senha: '123456' });
        assert.equal(resposta.status, 200);
        cookies.set(id, resposta.headers.getSetCookie().map(valor => valor.split(';')[0]).join('; '));
        await resposta.json();
    }
});
after(async () => { await new Promise(resolve => servidor.close(resolve)); });

function restaurar(t) {
    for (const entidade of ['usuario', 'tutorial', 'comentario', 'avaliacao']) {
        const array = require('../src/data/' + entidade + 'Data');
        const original = structuredClone(array);
        t.after(() => array.splice(0, array.length, ...original));
    }
}
function novoTutorial() {
    return TutorialModel.create({ autorId: 2, categoriaId: 'sistemas-acessibilidade', titulo: 'Tutorial sintético de persistência',
        resumo: 'Resumo sintético para exercitar comentários e avaliações.', conteudo: 'Uma introdução completa para o tutorial sintético de testes.',
        passos: [{ ordem: 1, titulo: 'Abra a configuração', descricao: 'Confira as opções disponíveis.', imagem: null, linkExterno: null }], tags: ['teste'] });
}

test('comentário usa autor da sessão, preserva vínculo/data e mantém autorização no CRUD', async t => {
    restaurar(t);
    const tutorial = await novoTutorial();
    const resposta = await request('/api/tutoriais/' + tutorial.id + '/comentarios', 1, 'POST', { texto: '  Comentário de teste  ', usuarioId: 3 });
    assert.equal(resposta.status, 201);
    const comentario = (await resposta.json()).comentario;
    assert.equal(comentario.usuarioId, 1);
    assert.equal(comentario.texto, 'Comentário de teste');
    assert.equal(comentario.atualizadoEm, null);
    assert.equal('senhaHash' in comentario.autor, false);
    const caminho = '/api/comentarios/' + comentario.id;
    assert.equal((await request(caminho, 3, 'PUT', { texto: 'Edição indevida' })).status, 403);
    const edicao = await request(caminho, 1, 'PUT', { texto: 'Edição permitida', tutorialId: 1, usuarioId: 3, criadoEm: '1900-01-01' });
    assert.equal(edicao.status, 200);
    const atualizado = (await edicao.json()).comentario;
    assert.equal(atualizado.tutorialId, tutorial.id);
    assert.equal(atualizado.usuarioId, 1);
    assert.equal(atualizado.criadoEm, comentario.criadoEm);
    assert.ok(atualizado.atualizadoEm);
    assert.equal((await request(caminho, 3, 'DELETE')).status, 403);
    assert.equal((await request(caminho, 1, 'DELETE')).status, 200);
    assert.equal(await ComentarioModel.findById(comentario.id), null);
    assert.equal((await request(caminho, 1, 'PUT', { texto: 'Ausente' })).status, 404);
});

test('comentário mantém validação amigável e ordenação ascendente sem expor SQL', async t => {
    restaurar(t);
    const tutorial = await novoTutorial();
    const caminho = '/api/tutoriais/' + tutorial.id + '/comentarios';
    for (const texto of ['a', 'a'.repeat(1001)]) assert.equal((await request(caminho, 1, 'POST', { texto })).status, 400);
    assert.equal((await request('/api/tutoriais/999999/comentarios', 1, 'POST', { texto: 'Comentário válido' })).status, 404);
    const primeiro = await ComentarioModel.create({ tutorialId: tutorial.id, usuarioId: 1, texto: 'Primeiro' });
    const segundo = await ComentarioModel.create({ tutorialId: tutorial.id, usuarioId: 3, texto: 'Segundo' });
    primeiro.criadoEm = '2026-01-01T00:00:00Z';
    segundo.criadoEm = '2026-02-01T00:00:00Z';
    const lista = await (await request(caminho)).json();
    assert.deepEqual(lista.map(item => item.id), [primeiro.id, segundo.id]);
    assert.equal(lista.some(item => 'usuario_id' in item || 'criado_em' in item), false);
});

test('avaliação preserva UNIQUE, média, minhaAvaliacao e pontos no create/update/delete da API', async t => {
    restaurar(t);
    const tutorial = await novoTutorial();
    const caminho = '/api/tutoriais/' + tutorial.id + '/avaliacoes';
    const pontos = (await UsuarioModel.findById(2)).pontos;
    const criada = await request(caminho, 1, 'POST', { nota: 3, avaliadorId: 3 });
    assert.equal(criada.status, 201);
    const avaliacao = (await criada.json()).avaliacao;
    assert.equal(avaliacao.avaliadorId, 1);
    assert.equal((await UsuarioModel.findById(2)).pontos, pontos + 30);
    assert.equal((await request(caminho, 1, 'POST', { nota: 5 })).status, 409);
    assert.equal((await request('/api/avaliacoes/' + avaliacao.id, 3, 'PUT', { nota: 5 })).status, 403);
    const atualizacao = await request('/api/avaliacoes/' + avaliacao.id, 1, 'PUT', { nota: 5, avaliadorId: 3, tutorialId: 1 });
    assert.equal(atualizacao.status, 200);
    const atualizada = (await atualizacao.json()).avaliacao;
    assert.equal(atualizada.id, avaliacao.id);
    assert.equal(atualizada.criadoEm, avaliacao.criadoEm);
    assert.equal((await UsuarioModel.findById(2)).pontos, pontos + 50);
    assert.equal((await AvaliacaoModel.findByTutorialId(tutorial.id)).length, 1);
    assert.deepEqual(await (await request(caminho)).json(), { tutorialId: tutorial.id, media: 5, quantidade: 1 });
    const publicado = await (await request('/api/tutoriais/' + tutorial.id, 1)).json();
    assert.deepEqual(publicado.minhaAvaliacao, { id: avaliacao.id, nota: 5 });
    assert.equal((await request('/api/avaliacoes/' + avaliacao.id, 3, 'DELETE')).status, 403);
    assert.equal((await request('/api/avaliacoes/' + avaliacao.id, 1, 'DELETE')).status, 200);
    assert.equal((await UsuarioModel.findById(2)).pontos, pontos);
    assert.deepEqual(await AvaliacaoModel.resumoDoTutorial(tutorial.id), { media: 0, quantidade: 0 });
});

test('avaliações mantêm validação de nota/autoria e edições concorrentes não somam duas vezes', async t => {
    restaurar(t);
    const tutorial = await novoTutorial();
    const caminho = '/api/tutoriais/' + tutorial.id + '/avaliacoes';
    for (const nota of [0, 6, 3.5]) assert.equal((await request(caminho, 1, 'POST', { nota })).status, 400);
    assert.equal((await request(caminho, 2, 'POST', { nota: 5 })).status, 403);
    const pontos = (await UsuarioModel.findById(2)).pontos;
    const avaliacao = (await (await request(caminho, 1, 'POST', { nota: 3 })).json()).avaliacao;
    const respostas = await Promise.all([request('/api/avaliacoes/' + avaliacao.id, 1, 'PUT', { nota: 5 }),
        request('/api/avaliacoes/' + avaliacao.id, 1, 'PUT', { nota: 1 })]);
    assert.deepEqual(respostas.map(item => item.status), [200, 200]);
    await Promise.all(respostas.map(item => item.json()));
    const final = await AvaliacaoModel.findById(avaliacao.id);
    assert.equal((await UsuarioModel.findById(2)).pontos, pontos + AvaliacaoModel.pontosPorNota(final.nota));
});

test('listagem de comentários consulta cada autor distinto apenas uma vez', async t => {
    restaurar(t);
    const tutorial = await novoTutorial();
    for (const usuarioId of [1, 1, 1, 3]) await ComentarioModel.create({ tutorialId: tutorial.id, usuarioId, texto: 'Comentário sintético' });
    const original = UsuarioModel.findById;
    const chamadas = [];
    t.mock.method(UsuarioModel, 'findById', async id => { chamadas.push(id); return original(id); });
    const lista = await ComentarioService.listarPorTutorial(tutorial.id);
    assert.equal(lista.length, 4);
    assert.deepEqual(chamadas.sort(), [1, 3]);
    assert.equal(lista.every(item => item.autor && !('senhaHash' in item.autor)), true);
});

test('perfil combina comentários e avaliações async mantendo totais e média ponderada', async t => {
    restaurar(t);
    const usuario = await UsuarioModel.findById(2);
    const tutoriais = [await novoTutorial(), await novoTutorial()];
    await ComentarioModel.create({ tutorialId: tutoriais[0].id, usuarioId: 2, texto: 'Comentário do autor' });
    await AvaliacaoModel.create({ tutorialId: tutoriais[0].id, avaliadorId: 1, nota: 3 });
    await AvaliacaoModel.create({ tutorialId: tutoriais[0].id, avaliadorId: 3, nota: 4 });
    await AvaliacaoModel.create({ tutorialId: tutoriais[1].id, avaliadorId: 1, nota: 5 });
    const perfil = await PerfilService.montarPerfil(usuario.slug, 1);
    const ids = new Set(perfil.tutoriais.map(item => item.id));
    const recebidas = (await AvaliacaoModel.findAll()).filter(item => ids.has(item.tutorialId));
    assert.equal(perfil.estatisticas.totalAvaliacoesRecebidas, recebidas.length);
    assert.equal(perfil.estatisticas.mediaGeral, Number((recebidas.reduce((soma, item) => soma + item.nota, 0) / recebidas.length).toFixed(1)));
    assert.equal(perfil.estatisticas.totalComentarios, (await ComentarioModel.findByUserId(2)).length);
    assert.equal(perfil.estatisticas.totalAvaliacoesFeitas, (await AvaliacaoModel.findByAvaliadorId(2)).length);
    assert.equal(perfil.tutoriais.find(item => item.id === tutoriais[0].id).quantidadeComentarios, 1);
});
