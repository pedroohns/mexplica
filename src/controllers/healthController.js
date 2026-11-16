const DatabaseConnection = require('../database/databaseConnection');

async function verificarBanco(req, res) {
    res.set('Cache-Control', 'no-store');

    try {
        await DatabaseConnection.getInstance().testarConexao();

        return res.json({
            status: 'ok',
            banco: 'postgresql',
            provider: 'neon'
        });
    } catch {
        console.error('Falha na verificação de disponibilidade do PostgreSQL.');

        return res.status(503).json({
            status: 'erro',
            banco: 'indisponivel'
        });
    }
}

module.exports = { verificarBanco };
