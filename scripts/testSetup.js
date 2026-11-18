// Preload explícito e portátil: npm test sempre usa o Repository em memória.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
// Sempre sobrescrever o ambiente herdado antes de dotenv: nunca usar a chave local/real.
process.env.JWT_SECRET = 'mexplica-chave-jwt-exclusiva-da-suite-offline';

// Proteção adicional: qualquer tentativa acidental de usar o driver real falha offline.
const { Client } = require('pg');
Client.prototype.connect = function () {
    throw new Error('Conexões PostgreSQL reais são proibidas em npm test. Use um Pool/client falso.');
};
