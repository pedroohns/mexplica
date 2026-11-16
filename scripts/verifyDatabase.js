const { executarTarefaDatabase } = require('./databaseTask');
const { verificarBanco } = require('../src/database/databaseSetup');
const { carregarDadosSeed } = require('../src/database/seedData');

function main() {
    return executarTarefaDatabase(async pool => {
        const resultado = await verificarBanco(pool, carregarDadosSeed());
        console.log('Banco MExplica validado com sucesso.');
        for (const [tabela, total] of Object.entries(resultado.contagens)) console.log(`${tabela}: ${total}`);
        console.log('PKs/FKs e integridade referencial: OK');
        console.log('Identities: OK (próximos IDs)');
        for (const [tabela, id] of Object.entries(resultado.proximosIds)) console.log(`${tabela}: ${id}`);
    }, 'Falha na verificação do banco MExplica. Confira schema, seed, integridade e identities.');
}

if (require.main === module) main();
module.exports = { main };
