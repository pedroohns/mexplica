const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function executar(modo) {
    // Processo isolado substitui pg.Pool antes de executar o script real.
    // DATABASE_URL vazia impede dotenv de carregar a credencial local no teste de ausência.
    return spawnSync(process.execPath, ['-e', `
        const assert = require('node:assert/strict');
        const { EventEmitter } = require('node:events');
        const pg = require('pg');
        let criado = false;
        let encerrado = false;
        pg.Pool = class extends EventEmitter {
            constructor() { super(); criado = true; }
            async query(sql) {
                assert.equal(sql, 'SELECT 1 AS ok');
                if (process.env.MEXPLICA_TEST_DB_MODE === 'falha') {
                    throw new Error('Exceção privada: ' + process.env.DATABASE_URL + process.env.SESSION_SECRET);
                }
                return { rows: [{ ok: 1 }] };
            }
            async end() { encerrado = true; }
        };
        process.on('exit', () => {
            assert.equal(criado, process.env.MEXPLICA_TEST_DB_MODE !== 'ausente');
            assert.equal(encerrado, criado);
        });
        require('./scripts/checkDatabase');
    `], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 5000,
        env: {
            ...process.env,
            DATABASE_URL: modo === 'ausente' ? '' : 'postgresql://banco.invalid/mexplica?sslmode=require',
            SESSION_SECRET: 'segredo-ficticio-de-teste',
            MEXPLICA_TEST_DB_MODE: modo
        }
    });
}

test('db:check executa SELECT pela infraestrutura compartilhada e encerra o Pool no sucesso', () => {
    const resultado = executar('sucesso');
    assert.equal(resultado.error, undefined);
    assert.equal(resultado.status, 0);
    assert.equal(resultado.stdout.trim(), 'Conexão com PostgreSQL/Neon realizada com sucesso.');
    assert.equal(resultado.stderr, '');
});

test('db:check encerra o Pool na falha, retorna código 1 e não imprime detalhes privados', () => {
    const resultado = executar('falha');
    assert.equal(resultado.error, undefined);
    assert.equal(resultado.status, 1);
    assert.equal(resultado.stdout, '');
    assert.equal(resultado.stderr.trim(), 'Não foi possível conectar ao PostgreSQL/Neon. Verifique DATABASE_URL e a disponibilidade do banco.');
});

test('db:check sem DATABASE_URL falha de forma clara sem tentar criar Pool', () => {
    const resultado = executar('ausente');
    assert.equal(resultado.error, undefined);
    assert.equal(resultado.status, 1);
    assert.equal(resultado.stdout, '');
    assert.equal(resultado.stderr.trim(), 'Não foi possível conectar ao PostgreSQL/Neon. Verifique DATABASE_URL e a disponibilidade do banco.');
});
