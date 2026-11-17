const { test } = require('node:test');
const assert = require('node:assert/strict');
const AvaliacaoPostgresRepository = require('../src/repositories/avaliacaoPostgresRepository');

const linha = () => ({ id: 29, tutorial_id: 4, avaliador_id: 3, nota: 5,
    criado_em: new Date('2026-10-01T10:00:00Z'), atualizado_em: new Date('2026-10-02T10:00:00Z') });
function executor(rows = [linha()]) {
    const consultas = [];
    return { consultas, async query(sql, valores) { consultas.push({ sql, valores }); return { rows }; } };
}

test('avaliação PostgreSQL reconstrói domínio camelCase com nota numérica e datas ISO', async () => {
    const avaliacao = await new AvaliacaoPostgresRepository(executor()).findById(29);
    assert.deepEqual(avaliacao, { id: 29, tutorialId: 4, avaliadorId: 3, nota: 5,
        criadoEm: '2026-10-01T10:00:00.000Z', atualizadoEm: '2026-10-02T10:00:00.000Z' });
});

test('todos os finds de avaliações usam parâmetros e aceitam bloqueio transacional', async () => {
    const client = executor();
    const repo = new AvaliacaoPostgresRepository({ query() { throw new Error('Pool não deve ser usado'); } });
    await repo.findAll({ client });
    await repo.findById(29, { client, bloquear: true });
    await repo.findByTutorialId(4, { client, bloquear: true });
    await repo.findByAvaliadorId(3, { client, bloquear: true });
    await repo.findByTutorialEAvaliador(4, "3' OR TRUE", { client });
    assert.deepEqual(client.consultas.map(item => item.valores), [[], [29], [4], [3], [4, "3' OR TRUE"]]);
    assert.equal(client.consultas[4].sql.includes("3' OR TRUE"), false);
    assert.match(client.consultas[1].sql, /FOR UPDATE$/);
    assert.match(client.consultas[2].sql, /FOR UPDATE$/);
    assert.match(client.consultas[3].sql, /FOR UPDATE$/);
});

test('CRUD de avaliação parametriza valores e protege vínculos na edição', async () => {
    const client = executor();
    const repo = new AvaliacaoPostgresRepository({ query() { throw new Error('Pool não deve ser usado'); } });
    const entrada = { tutorialId: 4, avaliadorId: 3, nota: 5, criadoEm: '2026-10-01' };
    assert.equal((await repo.create(entrada, { client })).id, 29);
    assert.equal((await repo.update(29, { nota: 4, atualizadoEm: '2026-10-02', avaliadorId: 99 }, { client })).id, 29);
    assert.equal((await repo.remove(29, { client })).id, 29);
    assert.deepEqual(client.consultas.map(item => item.valores), [[4, 3, 5, '2026-10-01'], [29, 4, '2026-10-02'], [29]]);
    assert.doesNotMatch(client.consultas[1].sql, /\b(avaliador_id|tutorial_id|criado_em)\s*=/);
    assert.match(client.consultas[2].sql, /DELETE FROM public\.avaliacoes/);
});

test('avaliações ausentes retornam null/listas vazias e atualizadoEm null é preservado', async () => {
    const repo = new AvaliacaoPostgresRepository(executor([]));
    assert.deepEqual(await repo.findAll(), []);
    assert.deepEqual(await repo.findByTutorialId(4), []);
    assert.deepEqual(await repo.findByAvaliadorId(3), []);
    assert.equal(await repo.findById(29), null);
    assert.equal(await repo.findByTutorialEAvaliador(4, 3), null);
    assert.equal(await repo.update(29, { nota: 4 }), null);
    assert.equal(await repo.remove(29), null);
    const novo = new AvaliacaoPostgresRepository(executor([{ ...linha(), atualizado_em: null }]));
    assert.equal((await novo.findById(29)).atualizadoEm, null);
});

test('UNIQUE de tutorial/avaliador vira conflito público e erros desconhecidos continuam internos', async () => {
    for (const constraint of ['avaliacoes_tutorial_id_avaliador_id_key', 'outra_constraint']) {
        const erro = Object.assign(new Error('Detalhe privado de SQL'), { code: '23505', constraint });
        const repo = new AvaliacaoPostgresRepository({ async query() { throw erro; } });
        await assert.rejects(repo.create({}), recebido => constraint === 'outra_constraint' ? recebido === erro
            : recebido.code === 'AVALIACAO_DUPLICADA' && !recebido.message.includes('privado') && !('constraint' in recebido));
    }
});

test('transação de avaliação libera client único depois do commit', async () => {
    const client = executor();
    const liberacoes = [];
    client.release = erro => liberacoes.push(erro);
    const repo = new AvaliacaoPostgresRepository({ async connect() { return client; } });
    assert.equal(await repo.emTransacao(async recebido => { assert.equal(recebido, client); return 123; }), 123);
    assert.deepEqual(client.consultas.map(item => item.sql), ['BEGIN', 'COMMIT']);
    assert.deepEqual(liberacoes, [undefined]);
});

test('falha na transação executa rollback e descarta client inclusive se rollback também falhar', async () => {
    const consultas = [], liberacoes = [], erro = new Error('Falha intermediária');
    const repo = new AvaliacaoPostgresRepository({ async connect() {
        return { async query(sql) { consultas.push(sql); if (sql === 'ROLLBACK') throw new Error('Rollback indisponível'); },
            release(falha) { liberacoes.push(falha); } };
    } });
    await assert.rejects(repo.emTransacao(async () => { throw erro; }), erro);
    assert.deepEqual(consultas, ['BEGIN', 'ROLLBACK']);
    assert.deepEqual(liberacoes, [erro]);
});
