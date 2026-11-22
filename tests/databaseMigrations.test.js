const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { aplicarMigrations } = require('../src/database/databaseMigrations');
const DatabaseConnection = require('../src/database/databaseConnection');
const { main } = require('../scripts/runMigrations');
const nomeMigration = '001_remove_usuario_especialidades.sql';
const nomeMigrationAdmin = '002_add_usuario_administrador.sql';
const migrations = [nomeMigration, nomeMigrationAdmin];

function poolFalso({ falharDrop = false, falharAlter = false, falharRegistro = false, migrationsAplicadas = [] } = {}) {
    const chamadas = [], liberacoes = [], aplicadas = new Set(migrationsAplicadas);
    let pendentes = [];
    const erro = Object.assign(new Error('Detalhe privado simulado'), { code: '2BP01' });
    const client = {
        async query(sql, valores) {
            chamadas.push({ sql, valores });
            if (sql === 'BEGIN') pendentes = [];
            if (sql.startsWith('SELECT nome')) return { rows: [...aplicadas].map(nome => ({ nome })) };
            if (sql.startsWith('DROP TABLE') && falharDrop) throw erro;
            if (sql.startsWith('ALTER TABLE') && falharAlter) throw erro;
            if (sql.startsWith('INSERT INTO public.schema_migrations')) {
                if (falharRegistro) throw erro;
                pendentes.push(valores[0]);
            }
            if (sql === 'COMMIT') pendentes.forEach(nome => aplicadas.add(nome));
            if (sql === 'ROLLBACK') pendentes = [];
            return { rows: [] };
        },
        release(falha) { liberacoes.push(falha); }
    };
    return { chamadas, liberacoes, aplicadas, erro, async connect() { return client; },
        query() { throw new Error('Migration deve usar o mesmo client da transação.'); } };
}

test('schema novo contém somente as sete tabelas de domínio e preserva tutorial_tags', async () => {
    const sql = await readFile(path.join(__dirname, '../src/database/schema.sql'), 'utf8');
    const nomes = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)].map(item => item[1]);
    assert.deepEqual(nomes, ['usuarios', 'categorias', 'tutoriais', 'tutorial_passos', 'tutorial_tags', 'comentarios', 'avaliacoes']);
    assert.equal(sql.includes('usuario_especialidades'), false);
    assert.match(sql, /PRIMARY KEY \(tutorial_id, tag\)/);
    assert.match(sql, /administrador BOOLEAN NOT NULL DEFAULT FALSE/);
});

test('migration versionada remove somente a tabela legada, sem CASCADE ou outras operações', async () => {
    const sql = await readFile(path.join(__dirname, '../src/database/migrations', nomeMigration), 'utf8');
    assert.match(sql, /^\s*DROP TABLE IF EXISTS public\.usuario_especialidades;\s*$/);
});

test('migration administrativa adiciona somente a flag booleana com default falso, sem promover usuários', async () => {
    const sql = await readFile(path.join(__dirname, '../src/database/migrations', nomeMigrationAdmin), 'utf8');
    assert.match(sql, /^\s*ALTER TABLE public\.usuarios\s+ADD COLUMN IF NOT EXISTS administrador BOOLEAN NOT NULL DEFAULT FALSE;\s*$/);
});

test('runner aplica SQL e registra versão na mesma transação, com trava antes do controle de migrations', async () => {
    const pool = poolFalso();
    assert.deepEqual(await aplicarMigrations(pool), migrations);
    assert.equal(pool.chamadas[0].sql, 'BEGIN');
    assert.match(pool.chamadas[1].sql, /pg_advisory_xact_lock/);
    const exclusao = pool.chamadas.find(item => item.sql.startsWith('DROP TABLE'));
    const registro = pool.chamadas.find(item => item.sql.startsWith('INSERT INTO public.schema_migrations'));
    assert.ok(pool.chamadas.indexOf(exclusao) < pool.chamadas.indexOf(registro));
    assert.deepEqual(registro.valores, [nomeMigration]);
    const alteracao = pool.chamadas.find(item => item.sql.startsWith('ALTER TABLE'));
    const registros = pool.chamadas.filter(item => item.sql.startsWith('INSERT INTO public.schema_migrations'));
    assert.ok(pool.chamadas.indexOf(registro) < pool.chamadas.indexOf(alteracao));
    assert.ok(pool.chamadas.indexOf(alteracao) < pool.chamadas.indexOf(registros[1]));
    assert.deepEqual(registros.map(item => item.valores[0]), migrations);
    assert.equal(pool.chamadas.at(-1).sql, 'COMMIT');
    assert.deepEqual(pool.liberacoes, [undefined]);
});

test('reexecução ignora migrations já registradas e não repete DROP, ALTER ou INSERT', async () => {
    const pool = poolFalso();
    await aplicarMigrations(pool);
    pool.chamadas.length = 0;
    assert.deepEqual(await aplicarMigrations(pool), []);
    assert.equal(pool.chamadas.some(item => /^(DROP|ALTER|INSERT)/.test(item.sql)), false);
    assert.deepEqual([...pool.aplicadas], migrations);
});

test('banco com a migration anterior aplica somente a flag administrativa pendente', async () => {
    const pool = poolFalso({ migrationsAplicadas: [nomeMigration] });
    assert.deepEqual(await aplicarMigrations(pool), [nomeMigrationAdmin]);
    assert.equal(pool.chamadas.some(item => item.sql.startsWith('DROP')), false);
    assert.equal(pool.chamadas.filter(item => item.sql.startsWith('ALTER TABLE')).length, 1);
    assert.deepEqual([...pool.aplicadas], migrations);
});

test('falha na adição da flag desfaz as migrations da transação sem registrar sucesso parcial', async () => {
    const pool = poolFalso({ falharAlter: true });
    await assert.rejects(aplicarMigrations(pool), pool.erro);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.chamadas.some(item => item.sql === 'COMMIT'), false);
    assert.equal(pool.aplicadas.size, 0);
    assert.equal(pool.liberacoes[0], pool.erro);
});

test('falha na remoção provoca rollback e não registra migration aplicada', async () => {
    const pool = poolFalso({ falharDrop: true });
    await assert.rejects(aplicarMigrations(pool), pool.erro);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.chamadas.some(item => item.sql.startsWith('INSERT')), false);
    assert.equal(pool.aplicadas.size, 0);
    assert.equal(pool.liberacoes[0], pool.erro);
});

test('falha ao registrar versão também desfaz a transação da migration', async () => {
    const pool = poolFalso({ falharRegistro: true });
    await assert.rejects(aplicarMigrations(pool), pool.erro);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.chamadas.some(item => item.sql === 'COMMIT'), false);
    assert.equal(pool.aplicadas.size, 0);
});

test('db:migrate usa Singleton e encerra o Pool sem imprimir dados privados', async t => {
    const pool = poolFalso();
    let encerramentos = 0;
    const logs = [];
    t.mock.method(console, 'log', (...args) => logs.push(args));
    t.mock.method(DatabaseConnection, 'getInstance', () => ({
        getPool() { return pool; }, async encerrar() { encerramentos++; }
    }));
    await main();
    assert.equal(encerramentos, 1);
    assert.deepEqual(logs, [['Migrations aplicadas com sucesso.'], ...migrations.map(nome => [nome])]);
});

test('db:migrate sinaliza falha com código 1, encerra Pool e não imprime exceção', async t => {
    const codigoOriginal = process.exitCode;
    t.after(() => { process.exitCode = codigoOriginal; });
    const pool = poolFalso({ falharDrop: true });
    let encerramentos = 0;
    const logs = [];
    t.mock.method(console, 'error', (...args) => logs.push(args));
    t.mock.method(DatabaseConnection, 'getInstance', () => ({
        getPool() { return pool; }, async encerrar() { encerramentos++; }
    }));
    await main();
    assert.equal(encerramentos, 1);
    assert.equal(process.exitCode, 1);
    assert.deepEqual(logs, [['Falha ao aplicar migrations PostgreSQL. A transação foi cancelada.'], ['Código PostgreSQL: 2BP01']]);
});
