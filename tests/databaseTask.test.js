const { test } = require('node:test');
const assert = require('node:assert/strict');
const DatabaseConnection = require('../src/database/databaseConnection');
const { executarTarefaDatabase } = require('../scripts/databaseTask');

test('comandos de infraestrutura usam o Singleton e encerram o mesmo Pool no sucesso', async t => {
    const pool = {};
    let encerramentos = 0;
    t.mock.method(DatabaseConnection, 'getInstance', () => ({
        getPool() { return pool; }, async encerrar() { encerramentos++; }
    }));
    await executarTarefaDatabase(async recebido => { assert.equal(recebido, pool); }, 'Falha pública');
    assert.equal(encerramentos, 1);
});

test('comandos retornam falha e encerram o Pool sem imprimir exceção ou dados privados', async t => {
    const codigoOriginal = process.exitCode;
    t.after(() => { process.exitCode = codigoOriginal; });
    const logs = [];
    let encerramentos = 0;
    t.mock.method(console, 'error', (...args) => logs.push(args));
    t.mock.method(DatabaseConnection, 'getInstance', () => ({
        getPool() { return {}; }, async encerrar() { encerramentos++; }
    }));
    await executarTarefaDatabase(async () => {
        const erro = new Error('Contatos, hash e credenciais privados de teste');
        erro.code = '23505';
        erro.detail = 'Detalhe privado';
        throw erro;
    }, 'Falha pública');
    assert.equal(process.exitCode, 1);
    assert.equal(encerramentos, 1);
    assert.deepEqual(logs, [['Falha pública'], ['Código PostgreSQL: 23505']]);
});
