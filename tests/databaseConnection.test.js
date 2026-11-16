const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const pg = require('pg');

const urlTeste = 'postgresql://banco.invalid/mexplica?sslmode=require&channel_binding=require';

function preparar(t) {
    const urlOriginal = process.env.DATABASE_URL;
    process.env.DATABASE_URL = urlTeste;
    t.after(() => {
        if (urlOriginal === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = urlOriginal;
    });

    const pools = [];
    class PoolFalso extends EventEmitter {
        constructor(config) {
            super();
            this.config = config;
            this.consultas = [];
            this.encerrado = false;
            pools.push(this);
        }

        async query(sql) {
            this.consultas.push(sql);
            return { rows: [{ ok: 1, detalhePrivado: 'não deve ser retornado' }] };
        }

        async end() {
            this.encerrado = true;
        }
    }

    // Substitui o driver antes de carregar o módulo: nenhuma conexão real é possível.
    t.mock.method(pg, 'Pool', function (config) { return new PoolFalso(config); });
    const caminho = require.resolve('../src/database/databaseConnection');
    delete require.cache[caminho];
    t.after(() => { delete require.cache[caminho]; });

    return { DatabaseConnection: require(caminho), pools };
}

test('Singleton retorna a mesma instância e compartilha um único Pool entre consumidores', async t => {
    const { DatabaseConnection, pools } = preparar(t);
    const primeiro = DatabaseConnection.getInstance();
    const segundo = DatabaseConnection.getInstance();

    assert.equal(primeiro, segundo);
    assert.equal(new DatabaseConnection(), primeiro);
    assert.equal(pools.length, 0);
    assert.equal(primeiro.getPool(), segundo.getPool());

    await Promise.all([primeiro.testarConexao(), segundo.testarConexao()]);
    assert.equal(pools.length, 1);
    assert.equal(pools[0].consultas.length, 2);
});

test('conexão é lazy e DATABASE_URL ausente ou vazia gera erro claro somente ao usar o banco', async t => {
    const { DatabaseConnection, pools } = preparar(t);
    delete process.env.DATABASE_URL;
    const database = DatabaseConnection.getInstance();

    assert.equal(pools.length, 0);
    for (const valor of [undefined, '', '   ']) {
        if (valor === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = valor;

        await assert.rejects(database.testarConexao(), {
            code: 'DATABASE_URL_AUSENTE',
            message: 'DATABASE_URL não configurada para conexão com PostgreSQL.'
        });
    }

    assert.equal(pools.length, 0);
    process.env.DATABASE_URL = urlTeste;
    assert.deepEqual(await database.testarConexao(), { conectado: true });
});

test('Pool recebe DATABASE_URL intacta, sem sobrescrever SSL, e limites conservadores', t => {
    const { DatabaseConnection } = preparar(t);
    const { config } = DatabaseConnection.getInstance().getPool();

    assert.equal(config.connectionString, urlTeste);
    assert.equal(Object.hasOwn(config, 'ssl'), false);
    assert.equal(config.max, 2);
    assert.equal(config.connectionTimeoutMillis, 3000);
    assert.equal(config.query_timeout, 3000);
    assert.equal(config.idleTimeoutMillis, 10000);
    assert.equal(config.allowExitOnIdle, true);
});

test('testarConexao executa apenas SELECT e retorna somente o estado público', async t => {
    const { DatabaseConnection, pools } = preparar(t);
    const resultado = await DatabaseConnection.getInstance().testarConexao();

    assert.deepEqual(pools[0].consultas, ['SELECT 1 AS ok']);
    assert.deepEqual(resultado, { conectado: true });
});

test('testarConexao rejeita falha de consulta e resultado inesperado', async t => {
    const { DatabaseConnection } = preparar(t);
    const database = DatabaseConnection.getInstance();
    const pool = database.getPool();
    t.mock.method(pool, 'query', async () => { throw new Error('Falha simulada'); });
    await assert.rejects(database.testarConexao(), /Falha simulada/);

    pool.query = async () => ({ rows: [{ ok: 0 }] });
    await assert.rejects(database.testarConexao(), /Resposta inesperada/);
});

test('erro em conexão ociosa é tratado sem derrubar o processo ou registrar detalhes privados', t => {
    const { DatabaseConnection } = preparar(t);
    const pool = DatabaseConnection.getInstance().getPool();
    const logs = [];
    t.mock.method(console, 'error', (...args) => logs.push(args));

    assert.doesNotThrow(() => pool.emit('error', new Error(`Falha privada: ${urlTeste}`)));
    assert.deepEqual(logs, [['Uma conexão ociosa com PostgreSQL ficou indisponível.']]);
});

test('encerrar não cria Pool e fecha o Pool compartilhado quando ele existe', async t => {
    const { DatabaseConnection, pools } = preparar(t);
    const database = DatabaseConnection.getInstance();

    await database.encerrar();
    assert.equal(pools.length, 0);

    const pool = database.getPool();
    await database.encerrar();
    assert.equal(pool.encerrado, true);
    assert.equal(pools.length, 1);
});
