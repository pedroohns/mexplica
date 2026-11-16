const DatabaseConnection = require('../src/database/databaseConnection');

async function executarTarefaDatabase(tarefa, mensagemFalha) {
    require('dotenv').config({ quiet: true });
    const database = DatabaseConnection.getInstance();

    try {
        await tarefa(database.getPool());
    } catch (erro) {
        // Não imprimir message/detail/stack: podem conter contatos, hashes ou credenciais.
        console.error(mensagemFalha);
        if (/^[0-9A-Z]{5}$/.test(erro.code || '')) console.error(`Código PostgreSQL: ${erro.code}`);
        if (erro.code === 'DATABASE_URL_AUSENTE') console.error('DATABASE_URL não configurada.');
        process.exitCode = 1;
    } finally {
        try {
            await database.encerrar();
        } catch {
            console.error('Não foi possível encerrar o pool PostgreSQL.');
            process.exitCode = 1;
        }
    }
}

module.exports = { executarTarefaDatabase };
