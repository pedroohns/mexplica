const { executarTarefaDatabase } = require('./databaseTask');
const { aplicarSchema } = require('../src/database/databaseSetup');

function main() {
    return executarTarefaDatabase(async pool => {
        await aplicarSchema(pool);
        console.log('Schema PostgreSQL do MExplica aplicado com sucesso.');
    }, 'Falha ao aplicar o schema PostgreSQL. Nenhum detalhe privado foi registrado.');
}

if (require.main === module) main();
module.exports = { main };
