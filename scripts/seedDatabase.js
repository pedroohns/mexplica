const { executarTarefaDatabase } = require('./databaseTask');
const { inserirSeed } = require('../src/database/databaseSetup');
const { carregarDadosSeed } = require('../src/database/seedData');

function main() {
    return executarTarefaDatabase(async pool => {
        const inseridos = await inserirSeed(pool, carregarDadosSeed());
        console.log('Seed demonstrativo do MExplica aplicado com sucesso.');
        for (const [tabela, total] of Object.entries(inseridos)) console.log(`${tabela}: ${total} inseridos`);
    }, 'Falha no seed PostgreSQL. A transação foi cancelada; confira schema e conflitos dos dados.');
}

if (require.main === module) main();
module.exports = { main };
