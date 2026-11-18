const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function executarEmProducao(verificar) {
    const resultado = spawnSync(process.execPath, ['-e', `
        const assert = require('node:assert/strict');
        // Isolar a configuração: não ler .env nem permitir conexão real.
        require('dotenv').config = () => ({ parsed: {} });
        require('pg').Pool = class { constructor() { throw new Error('Pool real proibido nesta verificação.'); } };
        const logs = [];
        console.error = (...args) => logs.push(args);
        const app = require('./api/index');
        const server = app.listen(0, '127.0.0.1', async () => {
            const base = 'http://127.0.0.1:' + server.address().port;
            try { await (${verificar.toString()})(base, logs); }
            catch (erro) { process.stderr.write(erro.stack); process.exitCode = 1; }
            finally { server.closeAllConnections(); server.close(); }
        });
    `], {
        cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 10000,
        env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: '', JWT_SECRET: '' }
    });
    assert.equal(resultado.error, undefined);
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.equal(resultado.stdout, '');
    assert.equal(resultado.stderr, '');
}

test('JSON inválido retorna 400 público em produção sem ecoar o corpo ou registrar exceção', () => {
    executarEmProducao(async (base, logs) => {
        const resposta = await fetch(base + '/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: '{"senha":"marcador-sintetico-privado",'
        });
        assert.equal(resposta.status, 400);
        assert.deepEqual(await resposta.json(), { erro: 'Envie um JSON válido no corpo da requisição.' });
        assert.deepEqual(logs, []);
    });
});

test('falhas internas em API e EJS retornam mensagens genéricas e logs seguros em produção', () => {
    executarEmProducao(async (base, logs) => {
        const UsuarioModel = require('./src/models/usuarioModel');
        const falhar = async () => {
            throw Object.assign(new Error('marcador-sintetico-privado'), {
                code: 'XX000', detail: 'marcador-sintetico-privado',
                query: 'SELECT marcador_sintetico_privado', senhaHash: 'marcador-sintetico-privado'
            });
        };
        UsuarioModel.findAll = falhar;
        UsuarioModel.getRanking = falhar;
        const api = await fetch(base + '/api/usuarios');
        assert.equal(api.status, 500);
        assert.deepEqual(await api.json(), { erro: 'Erro interno do servidor.' });
        const pagina = await fetch(base + '/comunidade');
        assert.equal(pagina.status, 500);
        assert.equal(await pagina.text(), 'Erro interno do servidor.');
        assert.deepEqual(logs, [
            ['Erro interno ao processar a requisição.'],
            ['Erro interno ao processar a requisição.']
        ]);
    });
});
