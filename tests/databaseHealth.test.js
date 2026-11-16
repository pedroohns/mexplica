const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once, EventEmitter } = require('node:events');
const pg = require('pg');

const urlTeste = 'postgresql://banco.invalid/mexplica?sslmode=require';
const segredoTeste = 'segredo-ficticio-de-teste';
let DatabaseConnection;
let app;
let server;
let baseUrl;
let pools;

before(async () => {
    app = require('../src/index');
    DatabaseConnection = require('../src/database/databaseConnection');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) await new Promise((resolve, reject) => server.close(erro => erro ? reject(erro) : resolve()));
});

function preparar(t) {
    const urlOriginal = process.env.DATABASE_URL;
    const segredoOriginal = process.env.SESSION_SECRET;
    process.env.DATABASE_URL = urlTeste;
    process.env.SESSION_SECRET = segredoTeste;
    t.after(() => {
        if (urlOriginal === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = urlOriginal;
        if (segredoOriginal === undefined) delete process.env.SESSION_SECRET;
        else process.env.SESSION_SECRET = segredoOriginal;
    });

    pools = [];
    class PoolFalso extends EventEmitter {
        constructor() {
            super();
            this.consultas = [];
            pools.push(this);
        }

        async query(sql) {
            this.consultas.push(sql);
            return { rows: [{ ok: 1 }] };
        }
    }

    t.mock.method(pg, 'Pool', function () { return new PoolFalso(); });
    const caminho = require.resolve('../src/database/databaseConnection');
    delete require.cache[caminho];
    const instancia = require(caminho).getInstance();
    t.mock.method(DatabaseConnection, 'getInstance', () => instancia);

    const logs = [];
    t.mock.method(console, 'error', (...args) => logs.push(args));
    return { instancia, logs };
}

test('health do banco retorna 200 e reutiliza o mesmo Pool em várias requisições', async t => {
    preparar(t);
    const respostas = await Promise.all([
        fetch(`${baseUrl}/api/health/database`),
        fetch(`${baseUrl}/api/health/database`)
    ]);

    for (const resposta of respostas) {
        assert.equal(resposta.status, 200);
        assert.equal(resposta.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await resposta.json(), { status: 'ok', banco: 'postgresql', provider: 'neon' });
    }

    assert.equal(pools.length, 1);
    assert.deepEqual(pools[0].consultas, ['SELECT 1 AS ok', 'SELECT 1 AS ok']);
});

test('health do banco retorna 503 sem expor exceção, DATABASE_URL ou SESSION_SECRET nos logs e JSON', async t => {
    const { instancia, logs } = preparar(t);
    const pool = instancia.getPool();
    t.mock.method(pool, 'query', async () => {
        throw new Error(`Detalhes privados: ${urlTeste} ${segredoTeste}`);
    });

    const resposta = await fetch(`${baseUrl}/api/health/database`);
    assert.equal(resposta.status, 503);
    assert.deepEqual(await resposta.json(), { status: 'erro', banco: 'indisponivel' });
    assert.deepEqual(logs, [['Falha na verificação de disponibilidade do PostgreSQL.']]);

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
});

test('sem DATABASE_URL, aplicação e arrays funcionam e somente health do banco retorna 503', async t => {
    preparar(t);
    delete process.env.DATABASE_URL;

    assert.equal(require('../api/index'), app);
    for (const rota of ['/api/health', '/api/tutoriais', '/', '/css/style.css', '/js/core/api.js']) {
        const resposta = await fetch(`${baseUrl}${rota}`);
        assert.equal(resposta.status, 200, rota);
        await resposta.text();
    }

    assert.equal(pools.length, 0);
    const resposta = await fetch(`${baseUrl}/api/health/database`);
    assert.equal(resposta.status, 503);
    assert.deepEqual(await resposta.json(), { status: 'erro', banco: 'indisponivel' });
    assert.equal(pools.length, 0);
});
