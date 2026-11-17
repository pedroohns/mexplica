const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const TutorialModel = require('../src/models/tutorialModel');
const UsuarioModel = require('../src/models/usuarioModel');
const TutorialMemoryRepository = require('../src/repositories/tutorialMemoryRepository');
const ComentarioModel = require('../src/models/comentarioModel');
const AvaliacaoModel = require('../src/models/avaliacaoModel');
const { removerTutorialCompleto } = require('../src/services/relacionamentoService');
const app = require('../src/index');
let server, base, cookie;

function restaurar(t) {
    for (const nome of ['usuario', 'tutorial', 'comentario', 'avaliacao']) {
        const array = require(`../src/data/${nome}Data`);
        const copia = structuredClone(array);
        t.after(() => { array.splice(0, array.length, ...copia); });
    }
}
const registro = (id, campos = {}) => ({ id, slug: 'tutorial-' + id, autorId: 2, categoriaId: 'sistemas-acessibilidade',
    titulo: 'Título neutro', resumo: 'Resumo neutro', conteudo: 'Introdução neutra', passos: [], imagens: [], tags: [],
    videoUrl: '', visualizacoes: 0, criadoEm: `2026-09-${String(id).padStart(2, '0')}T12:00:00.000Z`, atualizadoEm: null, ...campos });
const dados = () => ({ autorId: 2, categoriaId: 'sistemas-acessibilidade', titulo: 'Como conectar teclado Bluetooth sintético',
    resumo: 'Configure seu teclado seguindo este tutorial sintético.', conteudo: 'Abra as configurações e siga as etapas com calma para conectar seu teclado.',
    passos: [{ ordem: 1, titulo: 'Abra as configurações', descricao: 'Toque no aplicativo de configurações.', imagem: null, linkExterno: null }], tags: ['teclado bluetooth'], imagens: [], videoUrl: '' });

before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = 'http://127.0.0.1:' + server.address().port;
    const resposta = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador: 'lucas@mexplica.com', senha: '123456' }) });
    assert.equal(resposta.status, 200);
    await resposta.json();
    cookie = resposta.headers.getSetCookie().map(valor => valor.split(';')[0]).join('; ');
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test('busca preserva os pesos de título, tags, resumo, categoria, conteúdo e passos', async t => {
    restaurar(t);
    const array = require('../src/data/tutorialData');
    array.splice(0, array.length,
        registro(1, { titulo: 'alvo' }), registro(2, { tags: ['alvo'] }), registro(3, { resumo: 'alvo' }),
        registro(4, { categoriaId: 'alvo' }), registro(5, { conteudo: 'alvo' }),
        registro(6, { passos: [{ titulo: 'alvo', descricao: '' }] }));
    assert.deepEqual((await TutorialModel.buscar('  ÁLVO  ', 10)).map(item => item.id), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual((await TutorialModel.buscar('alvo', 2)).map(item => item.id), [1, 2]);
    assert.deepEqual((await TutorialModel.findAll()).map(item => item.id), [6, 5, 4, 3, 2, 1]);
});

test('busca mantém desempate por visualizações e ordem histórica quando os escores empatam', async t => {
    restaurar(t);
    const array = require('../src/data/tutorialData');
    array.splice(0, array.length, registro(1, { titulo: 'alvo', visualizacoes: 5 }), registro(2, { titulo: 'alvo', visualizacoes: 5 }), registro(3, { titulo: 'alvo', visualizacoes: 10 }));
    assert.deepEqual((await TutorialModel.buscar('alvo')).map(item => item.id), [3, 1, 2]);
});

test('consulta curta não carrega tutoriais nem acessa persistência', async t => {
    const consulta = t.mock.method(TutorialMemoryRepository.prototype, 'findAll', async () => { throw new Error('Não deve consultar'); });
    assert.deepEqual(await TutorialModel.buscar('a'), []);
    assert.equal(consulta.mock.callCount(), 0);
});

test('mais acessados preserva janela atual, datas futuras e fallback para todos quando não há recentes', async t => {
    restaurar(t);
    const agora = Date.parse('2026-11-16T12:00:00Z');
    const dia = 24 * 60 * 60 * 1000;
    t.mock.method(Date, 'now', () => agora);
    const array = require('../src/data/tutorialData');
    array.splice(0, array.length,
        registro(1, { criadoEm: new Date(agora - dia).toISOString(), visualizacoes: 3 }),
        registro(2, { criadoEm: new Date(agora - 8 * dia).toISOString(), visualizacoes: 100 }),
        registro(3, { criadoEm: new Date(agora + dia).toISOString(), visualizacoes: 9 }));
    assert.deepEqual((await TutorialModel.maisAcessadosDaSemana()).map(item => item.id), [3, 1]);
    array.forEach(item => { item.criadoEm = new Date(agora - 9 * dia).toISOString(); });
    assert.deepEqual((await TutorialModel.maisAcessadosDaSemana()).map(item => item.id), [2, 3, 1]);
});

test('Model gera slugs únicos concorrentes, mantém slug estável e protege campos persistentes', async t => {
    restaurar(t);
    const tutoriais = await Promise.all([TutorialModel.create(dados()), TutorialModel.create(dados())]);
    assert.equal(new Set(tutoriais.map(item => item.slug)).size, 2);
    const original = tutoriais[0];
    await TutorialModel.incrementarVisualizacao(original.id);
    const atualizado = await TutorialModel.update(original.id, { titulo: 'Novo título do tutorial', slug: 'indevido', autorId: 1, visualizacoes: 0 });
    assert.equal(atualizado.slug, original.slug);
    assert.equal(atualizado.autorId, 2);
    assert.equal(atualizado.visualizacoes, 1);
    assert.ok(atualizado.atualizadoEm);
});

test('Model tenta outro sufixo na colisão tardia de UNIQUE e limita tentativas', async t => {
    restaurar(t);
    const original = TutorialMemoryRepository.prototype.create;
    let chamadas = 0;
    const criar = t.mock.method(TutorialMemoryRepository.prototype, 'create', async function (entrada) {
        chamadas++;
        if (chamadas === 1) throw Object.assign(new Error('Colisão simulada'), { code: 'TUTORIAL_SLUG_CONFLITO' });
        return original.call(this, entrada);
    });
    const tutorial = await TutorialModel.create(dados());
    assert.ok(tutorial.slug.endsWith('-2'));
    criar.mock.mockImplementation(async () => { throw Object.assign(new Error('Colisão simulada'), { code: 'TUTORIAL_SLUG_CONFLITO' }); });
    await assert.rejects(TutorialModel.create({ ...dados(), titulo: 'Outro título para tentar endereço' }), { code: 'TUTORIAL_SLUG_CONFLITO' });
    assert.equal(criar.mock.callCount(), 52);
});

test('API usa autor da sessão, encontra novos tutoriais e página incrementa visualização uma vez', async t => {
    restaurar(t);
    const resposta = await fetch(base + '/api/tutoriais', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dados(), autorId: 1 }) });
    assert.equal(resposta.status, 201);
    const tutorial = (await resposta.json()).tutorial;
    assert.equal(tutorial.autor.id, 2);
    const busca = await fetch(base + '/api/tutoriais/buscar?q=teclado%20sint%C3%A9tico');
    assert.equal(busca.status, 200);
    assert.equal((await busca.json()).resultados.some(item => item.id === tutorial.id), true);
    const visualizacoes = (await TutorialModel.findById(tutorial.id)).visualizacoes;
    const pagina = await fetch(base + '/tutoriais/' + tutorial.slug);
    assert.equal(pagina.status, 200);
    await pagina.text();
    assert.equal((await TutorialModel.findById(tutorial.id)).visualizacoes, visualizacoes + 1);
});

test('falha na exclusão persistente preserva tutorial, pontos e arrays dependentes', async t => {
    restaurar(t);
    const tutorial = await TutorialModel.create(dados());
    const comentario = (await ComentarioModel.create({ tutorialId: tutorial.id, usuarioId: 1, texto: 'Comentário sintético' }));
    const avaliacao = (await AvaliacaoModel.create({ tutorialId: tutorial.id, avaliadorId: 1, nota: 5 }));
    await UsuarioModel.adicionarPontos(2, 50);
    const pontos = (await UsuarioModel.findById(2)).pontos;
    t.mock.method(TutorialModel, 'remove', async () => { throw new Error('Falha simulada no DELETE'); });
    await assert.rejects(removerTutorialCompleto(tutorial.id), /Falha simulada/);
    assert.ok(await TutorialModel.findById(tutorial.id));
    assert.ok((await ComentarioModel.findById(comentario.id)));
    assert.ok((await AvaliacaoModel.findById(avaliacao.id)));
    assert.equal((await UsuarioModel.findById(2)).pontos, pontos);
});
