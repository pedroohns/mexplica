const { test } = require('node:test');
const assert = require('node:assert/strict');
const ComentarioPostgresRepository = require('../src/repositories/comentarioPostgresRepository');

const linha = () => ({ id: 14, tutorial_id: 4, usuario_id: 3, texto: 'Comentário sintético.',
    criado_em: new Date('2026-10-01T10:00:00Z'), atualizado_em: null });
function executor(rows = [linha()]) {
    const consultas = [];
    return { consultas, async query(sql, valores) { consultas.push({ sql, valores }); return { rows }; } };
}

test('comentário PostgreSQL centraliza camelCase, datas ISO e atualizadoEm null', async () => {
    const tutorial = await new ComentarioPostgresRepository(executor()).findById(14);
    assert.deepEqual(tutorial, { id: 14, tutorialId: 4, usuarioId: 3, texto: 'Comentário sintético.',
        criadoEm: '2026-10-01T10:00:00.000Z', atualizadoEm: null });
});

test('finds de comentários parametrizam filtros e preservam ordenação por tutorial/usuário', async () => {
    const pool = executor();
    const repo = new ComentarioPostgresRepository(pool);
    await repo.findAll();
    await repo.findById(14);
    await repo.findByTutorialId(4);
    await repo.findByUserId(3);
    assert.deepEqual(pool.consultas.map(item => item.valores), [[], [14], [4], [3]]);
    assert.match(pool.consultas[2].sql, /ORDER BY c\.criado_em, c\.id/);
    assert.match(pool.consultas[3].sql, /c\.usuario_id = \$1 ORDER BY c\.id/);
});

test('create de comentário usa identity, parâmetros e RETURNING sem serializar o domínio', async () => {
    const pool = executor();
    const entrada = { tutorialId: 4, usuarioId: 3, texto: "Texto ' não é SQL", criadoEm: '2026-10-01T10:00:00Z' };
    const comentario = await new ComentarioPostgresRepository(pool).create(entrada);
    assert.equal(comentario.id, 14);
    assert.deepEqual(pool.consultas[0].valores, [4, 3, entrada.texto, entrada.criadoEm]);
    assert.equal(pool.consultas[0].sql.includes(entrada.texto), false);
    assert.match(pool.consultas[0].sql, /RETURNING \*/);
});

test('update de comentário altera somente texto/data e usa client compartilhado', async () => {
    const client = executor();
    const repo = new ComentarioPostgresRepository({ query() { throw new Error('Pool não deve ser usado'); } });
    await repo.update(14, { texto: 'Edição', atualizadoEm: '2026-10-02', id: 999, tutorialId: 9, usuarioId: 9 }, { client });
    assert.deepEqual(client.consultas[0].valores, [14, 'Edição', '2026-10-02']);
    assert.doesNotMatch(client.consultas[0].sql, /SET\s+(id|tutorial_id|usuario_id|criado_em)\s*=/);
    await repo.findById(14, { client });
    await repo.findAll({ client });
    await repo.findByTutorialId(4, { client });
    await repo.findByUserId(3, { client });
    await repo.create({ tutorialId: 4, usuarioId: 3, texto: 'Texto', criadoEm: '2026-10-01' }, { client });
    await repo.remove(14, { client });
    assert.equal(client.consultas.length, 7);
});

test('delete de comentário é parametrizado e devolve a linha removida', async () => {
    const pool = executor();
    const removido = await new ComentarioPostgresRepository(pool).remove(14);
    assert.equal(removido.id, 14);
    assert.deepEqual(pool.consultas[0].valores, [14]);
    assert.match(pool.consultas[0].sql, /^DELETE FROM public\.comentarios WHERE id = \$1 RETURNING/);
});

test('comentários ausentes retornam listas vazias ou null nas operações individuais', async () => {
    const repo = new ComentarioPostgresRepository(executor([]));
    assert.deepEqual(await repo.findAll(), []);
    assert.deepEqual(await repo.findByTutorialId(4), []);
    assert.deepEqual(await repo.findByUserId(3), []);
    assert.equal(await repo.findById(14), null);
    assert.equal(await repo.update(14, { texto: 'Edição' }), null);
    assert.equal(await repo.remove(14), null);
});
