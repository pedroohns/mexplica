const UsuarioMemoryRepository = require('./usuarioMemoryRepository');
const UsuarioPostgresRepository = require('./usuarioPostgresRepository');
const TutorialMemoryRepository = require('./tutorialMemoryRepository');
const TutorialPostgresRepository = require('./tutorialPostgresRepository');

class RepositoryFactory {
    // Factory: encapsula a escolha de persistência usada pelos Models.
    static criarUsuarioRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test'
            ? new UsuarioMemoryRepository(undefined, require('../data/tutorialData'))
            : new UsuarioPostgresRepository();
    }

    static criarTutorialRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test' ? new TutorialMemoryRepository() : new TutorialPostgresRepository();
    }
}

module.exports = RepositoryFactory;
