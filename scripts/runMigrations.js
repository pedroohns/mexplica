const { executarTarefaDatabase } = require('./databaseTask');
const { aplicarMigrations } = require('../src/database/databaseMigrations');

function main() {
    return executarTarefaDatabase(async pool => {
        const aplicadas = await aplicarMigrations(pool);
        console.log(aplicadas.length ? 'Migrations aplicadas com sucesso.' : 'Nenhuma migration pendente.');
        for (const nome of aplicadas) console.log(nome);
    }, 'Falha ao aplicar migrations PostgreSQL. A transação foi cancelada.');
}

if (require.main === module) main();
module.exports = { main };
