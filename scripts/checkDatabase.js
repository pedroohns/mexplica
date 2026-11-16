require('dotenv').config({ quiet: true });

const DatabaseConnection = require('../src/database/databaseConnection');

async function main() {
    const database = DatabaseConnection.getInstance();

    try {
        await database.testarConexao();
        console.log('Conexão com PostgreSQL/Neon realizada com sucesso.');
    } catch {
        console.error('Não foi possível conectar ao PostgreSQL/Neon. Verifique DATABASE_URL e a disponibilidade do banco.');
        process.exitCode = 1;
    } finally {
        await database.encerrar();
    }
}

main().catch(() => {
    console.error('Não foi possível finalizar a verificação do PostgreSQL/Neon.');
    process.exitCode = 1;
});
