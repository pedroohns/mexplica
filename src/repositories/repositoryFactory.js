const UsuarioMemoryRepository = require('./usuarioMemoryRepository');
const UsuarioPostgresRepository = require('./usuarioPostgresRepository');

class RepositoryFactory {
    // Factory: encapsula a escolha de persistência usada de fato pelo UsuarioModel.
    static criarUsuarioRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test'
            ? new UsuarioMemoryRepository()
            : new UsuarioPostgresRepository();
    }
}

module.exports = RepositoryFactory;
