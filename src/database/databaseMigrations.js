const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');

async function aplicarMigrations(pool) {
    const pasta = path.join(__dirname, 'migrations');
    const arquivos = (await readdir(pasta, { withFileTypes: true }))
        .filter(arquivo => arquivo.isFile() && /^\d{3}_[a-z0-9_]+\.sql$/.test(arquivo.name))
        .map(arquivo => arquivo.name).sort();
    const migrations = await Promise.all(arquivos.map(async nome => ({
        nome, sql: await readFile(path.join(pasta, nome), 'utf8')
    })));

    const client = await pool.connect();
    let falha;
    try {
        await client.query('BEGIN');
        // Serializa execuções, inclusive a primeira criação da tabela de controle.
        await client.query('SELECT pg_advisory_xact_lock(1296386128, 1)');
        await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
            nome TEXT PRIMARY KEY,
            aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        const resultado = await client.query('SELECT nome FROM public.schema_migrations ORDER BY nome');
        const aplicadas = new Set(resultado.rows.map(linha => linha.nome));
        const executadas = [];

        for (const migration of migrations) {
            if (aplicadas.has(migration.nome)) continue;
            await client.query(migration.sql);
            await client.query('INSERT INTO public.schema_migrations (nome) VALUES ($1)', [migration.nome]);
            executadas.push(migration.nome);
        }

        await client.query('COMMIT');
        return executadas;
    } catch (erro) {
        falha = erro;
        await client.query('ROLLBACK').catch(() => {});
        throw erro;
    } finally {
        client.release(falha);
    }
}

module.exports = { aplicarMigrations };
