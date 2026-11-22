const { test } = require('node:test');
const assert = require('node:assert/strict');

for (const [nome, tabela] of [['usuario', 'usuarios'], ['tutorial', 'tutoriais'], ['comentario', 'comentarios'], ['avaliacao', 'avaliacoes']]) {
    test(`contagem de ${nome} consulta somente COUNT no PostgreSQL e acompanha o estado em memória`, async () => {
        const PostgresRepository = require(`../src/repositories/${nome}PostgresRepository`);
        const MemoryRepository = require(`../src/repositories/${nome}MemoryRepository`);
        const consultas = [];
        const repo = new PostgresRepository({ async query(sql) { consultas.push(sql); return { rows: [{ total: '123' }] }; } });
        assert.equal(await repo.count(), 123);
        assert.deepEqual(consultas, [`SELECT COUNT(*) AS total FROM public.${tabela}`]);
        const dados = [];
        const memoria = new MemoryRepository(dados);
        assert.equal(await memoria.count(), 0);
        dados.push({ id: 1 });
        assert.equal(await memoria.count(), 1);
        dados.pop();
        assert.equal(await memoria.count(), 0);
    });
}

test('listagem leve de tutoriais usa um SELECT sem imagens/passos/tags e serializa datas', async () => {
    const Repository = require('../src/repositories/tutorialPostgresRepository');
    const consultas = [];
    const repo = new Repository({ async query(sql) {
        consultas.push(sql);
        return { rows: [{ id: 1, slug: 'tutorial', autor_id: 2, categoria_id: 'teste', titulo: 'Título',
            visualizacoes: 7, criado_em: new Date('2026-11-21T12:00:00Z'), conteudo: 'Não serializar' }] };
    } });
    assert.deepEqual(await repo.listarParaModeracao(), [{ id: 1, slug: 'tutorial', autorId: 2, categoriaId: 'teste',
        titulo: 'Título', visualizacoes: 7, criadoEm: '2026-11-21T12:00:00.000Z' }]);
    assert.equal(consultas.length, 1);
    assert.match(consultas[0], /ORDER BY criado_em DESC, id DESC/);
    assert.doesNotMatch(consultas[0], /SELECT \*|tutorial_passos|tutorial_tags|conteudo/);
});

test('proteção de conta administrativa executa ROLLBACK no mesmo client PostgreSQL sem DELETE', async t => {
    const Repository = require('../src/repositories/usuarioPostgresRepository');
    const UsuarioModel = require('../src/models/usuarioModel');
    const RelacionamentoService = require('../src/services/relacionamentoService');
    const consultas = [], liberacoes = [];
    const client = {
        async query(sql) {
            consultas.push(sql);
            if (sql.startsWith('SELECT id')) return { rows: [{ id: 99 }] };
            if (sql.startsWith('SELECT u.*')) return { rows: [{ id: 99, administrador: true }] };
            return { rows: [] };
        },
        release(erro) { liberacoes.push(erro); }
    };
    const repo = new Repository({ async connect() { return client; }, query() { throw new Error('Usar o client transacional'); } });
    t.mock.method(UsuarioModel, 'remove', (id, opcoes) => repo.remove(id, opcoes));
    await assert.rejects(RelacionamentoService.removerDadosDoUsuario(99, { administradorId: 1 }), { code: 'ADMIN_USUARIO_PROTEGIDO' });
    assert.equal(consultas[0], 'BEGIN');
    assert.match(consultas[1], /FOR UPDATE/);
    assert.equal(consultas.at(-1), 'ROLLBACK');
    assert.equal(consultas.some(sql => /^(UPDATE|DELETE|COMMIT)/.test(sql)), false);
    assert.equal(liberacoes[0].code, 'ADMIN_USUARIO_PROTEGIDO');
    consultas.length = 0;
    await assert.rejects(RelacionamentoService.removerDadosDoUsuario(99), { code: 'ADMIN_USUARIO_PROTEGIDO' });
    assert.equal(consultas.at(-1), 'ROLLBACK');
    assert.equal(consultas.some(sql => /^(UPDATE|DELETE|COMMIT)/.test(sql)), false);
});
