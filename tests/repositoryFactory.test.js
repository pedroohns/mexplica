const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const RepositoryFactory = require('../src/repositories/repositoryFactory');
const UsuarioMemoryRepository = require('../src/repositories/usuarioMemoryRepository');
const UsuarioPostgresRepository = require('../src/repositories/usuarioPostgresRepository');
const DatabaseConnection = require('../src/database/databaseConnection');
const TutorialMemoryRepository = require('../src/repositories/tutorialMemoryRepository');
const TutorialPostgresRepository = require('../src/repositories/tutorialPostgresRepository');
const ComentarioMemoryRepository = require('../src/repositories/comentarioMemoryRepository');
const ComentarioPostgresRepository = require('../src/repositories/comentarioPostgresRepository');
const AvaliacaoMemoryRepository = require('../src/repositories/avaliacaoMemoryRepository');
const AvaliacaoPostgresRepository = require('../src/repositories/avaliacaoPostgresRepository');

test('Factory escolhe memória pelo ambiente de teste explícito e PostgreSQL no runtime normal', () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.ok(RepositoryFactory.criarUsuarioRepository() instanceof UsuarioMemoryRepository);
    assert.ok(RepositoryFactory.criarUsuarioRepository({ ambiente: 'development' }) instanceof UsuarioPostgresRepository);
    assert.ok(RepositoryFactory.criarUsuarioRepository({ ambiente: 'production' }) instanceof UsuarioPostgresRepository);
});

test('Repositories obedecem à mesma interface de persistência usada pelo Model', () => {
    const memoria = RepositoryFactory.criarUsuarioRepository({ ambiente: 'test' });
    const postgres = RepositoryFactory.criarUsuarioRepository({ ambiente: 'production' });
    for (const metodo of ['findAll', 'findById', 'findBySlug', 'findByIdentifier', 'getRanking', 'getPlatinaDisponiveis', 'create', 'update', 'adicionarPontos', 'definirDisponibilidade', 'remove']) {
        assert.equal(typeof memoria[metodo], 'function', metodo);
        assert.equal(typeof postgres[metodo], 'function', metodo);
    }
});

test('Repositories PostgreSQL distintos reutilizam o Pool do DatabaseConnection Singleton', t => {
    const pool = {};
    t.mock.method(DatabaseConnection.getInstance(), 'getPool', () => pool);
    const primeiro = new UsuarioPostgresRepository();
    const segundo = new UsuarioPostgresRepository();
    assert.equal(primeiro.getPool(), pool);
    assert.equal(segundo.getPool(), pool);
    assert.equal(new TutorialPostgresRepository().getPool(), pool);
    assert.equal(new ComentarioPostgresRepository().getPool(), pool);
    assert.equal(new AvaliacaoPostgresRepository().getPool(), pool);
});

test('Factory fornece ComentarioRepository em memória nos testes e PostgreSQL no runtime', () => {
    assert.ok(RepositoryFactory.criarComentarioRepository() instanceof ComentarioMemoryRepository);
    for (const ambiente of ['development', 'production']) {
        const repo = RepositoryFactory.criarComentarioRepository({ ambiente });
        assert.ok(repo instanceof ComentarioPostgresRepository);
        for (const metodo of ['findAll', 'findById', 'findByTutorialId', 'findByUserId', 'create', 'update', 'remove']) {
            assert.equal(typeof repo[metodo], 'function', metodo);
        }
    }
});

test('Factory fornece AvaliacaoRepository em memória nos testes e PostgreSQL no runtime', () => {
    assert.ok(RepositoryFactory.criarAvaliacaoRepository() instanceof AvaliacaoMemoryRepository);
    for (const ambiente of ['development', 'production']) {
        const repo = RepositoryFactory.criarAvaliacaoRepository({ ambiente });
        assert.ok(repo instanceof AvaliacaoPostgresRepository);
        for (const metodo of ['findAll', 'findById', 'findByTutorialId', 'findByAvaliadorId', 'findByTutorialEAvaliador', 'create', 'update', 'remove', 'emTransacao']) {
            assert.equal(typeof repo[metodo], 'function', metodo);
        }
    }
});

test('Factory fornece TutorialRepository em memória para testes e PostgreSQL no runtime', () => {
    const memoria = RepositoryFactory.criarTutorialRepository();
    const postgres = RepositoryFactory.criarTutorialRepository({ ambiente: 'production' });
    assert.ok(memoria instanceof TutorialMemoryRepository);
    assert.ok(postgres instanceof TutorialPostgresRepository);
    for (const metodo of ['findAll', 'findById', 'findBySlug', 'findByAutorId', 'create', 'update', 'incrementarVisualizacao', 'remove']) {
        assert.equal(typeof memoria[metodo], 'function', metodo);
        assert.equal(typeof postgres[metodo], 'function', metodo);
    }
});

test('MemoryRepository de usuário simula a cascata de tutoriais sem afetar outros autores', async () => {
    const tutoriais = [{ id: 1, autorId: 3 }, { id: 2, autorId: 4 }];
    const memoria = new UsuarioMemoryRepository([{ id: 3, colaborador: true, pontos: 0 }], tutoriais);
    await memoria.remove(3);
    assert.deepEqual(tutoriais, [{ id: 2, autorId: 4 }]);
});

test('preload de npm test bloqueia o driver real antes de qualquer conexão de rede', () => {
    const client = new Client({ connectionString: 'postgresql://banco.invalid/mexplica' });
    assert.throws(() => client.connect(), /Conexões PostgreSQL reais são proibidas/);
});

test('runtime sem DATABASE_URL gera erro de configuração e não faz fallback para memória', () => {
    const repository = RepositoryFactory.criarUsuarioRepository({ ambiente: 'production' });
    assert.ok(repository instanceof UsuarioPostgresRepository);
    assert.throws(() => repository.getPool(), { code: 'DATABASE_URL_AUSENTE' });
});
