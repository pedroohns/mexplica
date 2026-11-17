const UsuarioMemoryRepository = require('./usuarioMemoryRepository');
const UsuarioPostgresRepository = require('./usuarioPostgresRepository');
const TutorialMemoryRepository = require('./tutorialMemoryRepository');
const TutorialPostgresRepository = require('./tutorialPostgresRepository');
const ComentarioMemoryRepository = require('./comentarioMemoryRepository');
const ComentarioPostgresRepository = require('./comentarioPostgresRepository');
const AvaliacaoMemoryRepository = require('./avaliacaoMemoryRepository');
const AvaliacaoPostgresRepository = require('./avaliacaoPostgresRepository');

function dependentesMemory() {
    return { comentarios: require('../data/comentarioData'), avaliacoes: require('../data/avaliacaoData') };
}

class RepositoryFactory {
    // Factory: encapsula a escolha de persistência usada pelos Models.
    static criarUsuarioRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test'
            ? new UsuarioMemoryRepository(undefined, require('../data/tutorialData'), dependentesMemory())
            : new UsuarioPostgresRepository();
    }

    static criarTutorialRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test' ? new TutorialMemoryRepository(undefined, dependentesMemory()) : new TutorialPostgresRepository();
    }

    static criarComentarioRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test' ? new ComentarioMemoryRepository() : new ComentarioPostgresRepository();
    }

    static criarAvaliacaoRepository({ ambiente = process.env.NODE_ENV } = {}) {
        return ambiente === 'test' ? new AvaliacaoMemoryRepository() : new AvaliacaoPostgresRepository();
    }
}

module.exports = RepositoryFactory;
