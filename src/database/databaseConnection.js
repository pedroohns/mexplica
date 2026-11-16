const { Pool } = require('pg');

class DatabaseConnection {
    static #instance;
    #pool;

    // Singleton explícito: todos os consumidores reutilizam a instância e seu Pool.
    constructor() {
        if (DatabaseConnection.#instance) {
            return DatabaseConnection.#instance;
        }

        DatabaseConnection.#instance = this;
    }

    static getInstance() {
        return DatabaseConnection.#instance || new DatabaseConnection();
    }

    getPool() {
        if (!this.#pool) {
            if (!process.env.DATABASE_URL?.trim()) {
                const erro = new Error('DATABASE_URL não configurada para conexão com PostgreSQL.');
                erro.code = 'DATABASE_URL_AUSENTE';
                throw erro;
            }

            this.#pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                // Limite por processo/instância serverless, adequado à etapa inicial.
                max: 2,
                connectionTimeoutMillis: 3000,
                query_timeout: 3000,
                idleTimeoutMillis: 10000,
                allowExitOnIdle: true
            });

            // Falhas de clientes ociosos não devem derrubar o servidor nem expor a exceção.
            this.#pool.on('error', () => {
                console.error('Uma conexão ociosa com PostgreSQL ficou indisponível.');
            });
        }

        return this.#pool;
    }

    async testarConexao() {
        const resultado = await this.getPool().query('SELECT 1 AS ok');

        if (resultado.rows[0]?.ok !== 1) {
            throw new Error('Resposta inesperada na verificação do PostgreSQL.');
        }

        return { conectado: true };
    }

    async encerrar() {
        if (this.#pool) {
            await this.#pool.end();
        }
    }
}

module.exports = DatabaseConnection;
