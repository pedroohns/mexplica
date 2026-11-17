const { test } = require('node:test');
const assert = require('node:assert/strict');
const UsuarioPostgresRepository = require('../src/repositories/usuarioPostgresRepository');

const linha = () => ({
    id: 41, slug: 'pessoa-teste', nome: 'Pessoa', sobrenome: 'Teste', email: null, telefone: '24999990000',
    idade: 30, genero: 'outro', colaborador: true, pontos: 2600, bio: 'Biografia', localizacao: 'Brasil',
    disponivel_atendimento: true, senha_hash: 'hash-ficticio', criado_em: new Date('2026-09-01T12:00:00Z')
});
const dados = () => ({
    id: 999, slug: 'pessoa-teste', nome: "Nome ' com aspas", sobrenome: 'Teste', email: '', telefone: '24999990000',
    idade: 30, genero: 'outro', colaborador: true, pontos: 0, bio: '', localizacao: 'Brasil',
    disponivelAtendimento: false, senhaHash: 'hash-ficticio', criadoEm: '2026-09-01T12:00:00.000Z'
});

function poolFalso(responder = () => undefined) {
    const consultas = [], liberacoes = [];
    let conexoes = 0;
    async function query(sql, valores = []) {
        consultas.push({ sql, valores });
        const resposta = await responder(sql, valores);
        if (resposta) return resposta;
        if (sql.startsWith('SELECT u.*')) return { rows: [linha()] };
        if (sql.startsWith('SELECT id')) return { rows: [{ id: 41, colaborador: true }] };
        if (sql.startsWith('INSERT INTO public.usuarios')) return { rows: [linha()] };
        if (sql.startsWith('UPDATE')) return { rows: [linha()] };
        return { rows: [], rowCount: 1 };
    }
    return {
        consultas, liberacoes, query,
        get conexoes() { return conexoes; },
        async connect() {
            conexoes++;
            return { query, release(erro) { liberacoes.push(erro); } };
        }
    };
}

test('Repository mapeia campos atuais e ignora dados legados sem consultar a tabela removida', async () => {
    const pool = poolFalso(sql => sql.startsWith('SELECT u.*') ? { rows: [{ ...linha(), especialidades: ['legado'] }] } : undefined);
    const usuario = await new UsuarioPostgresRepository(pool).findById(41);
    assert.equal(usuario.id, 41);
    assert.equal(usuario.email, '');
    assert.equal(usuario.disponivelAtendimento, true);
    assert.equal(usuario.criadoEm, '2026-09-01T12:00:00.000Z');
    assert.equal(usuario.senhaHash === linha().senha_hash, true);
    assert.equal(Object.hasOwn(usuario, 'especialidades'), false);
    assert.equal(pool.consultas.some(item => /especialidade/i.test(item.sql)), false);
    assert.equal(['senha_hash', 'criado_em', 'disponivel_atendimento'].some(campo => campo in usuario), false);
    assert.deepEqual(pool.consultas[0].valores, [41]);
    assert.match(pool.consultas[0].sql, /u\.id = \$1/);
});

test('findAll e findBySlug retornam usuários hidratados e parametrizam slug não confiável', async () => {
    const pool = poolFalso();
    const repo = new UsuarioPostgresRepository(pool);
    assert.equal((await repo.findAll()).length, 1);
    const slug = "perfil' OR TRUE --";
    await repo.findBySlug(slug);
    assert.deepEqual(pool.consultas.at(-1).valores, [slug]);
    assert.equal(pool.consultas.at(-1).sql.includes(slug), false);
    assert.match(pool.consultas.at(-1).sql, /u\.slug = \$1/);
});

test('findById/findBySlug devolvem null quando não há registro', async () => {
    const repo = new UsuarioPostgresRepository(poolFalso(() => ({ rows: [] })));
    assert.equal(await repo.findById(100), null);
    assert.equal(await repo.findBySlug('inexistente'), null);
});

test('findByIdentifier compara email em lowercase e telefone normalizado com parâmetros', async () => {
    const pool = poolFalso();
    const repo = new UsuarioPostgresRepository(pool);
    await repo.findByIdentifier('  EXEMPLO@EXAMPLE.COM  ');
    assert.deepEqual(pool.consultas.at(-1).valores, ['exemplo@example.com']);
    assert.match(pool.consultas.at(-1).sql, /lower\(u\.email\) = \$1/);
    await repo.findByIdentifier('(24) 99999-0000');
    assert.deepEqual(pool.consultas.at(-1).valores, ['24999990000']);
    assert.match(pool.consultas.at(-1).sql, /u\.telefone = \$1/);
    assert.equal(await repo.findByIdentifier(' '), null);
});

test('ranking e disponibilidade usam thresholds recebidos do domínio', async () => {
    const pool = poolFalso();
    const repo = new UsuarioPostgresRepository(pool);
    await repo.getRanking(7, 1000);
    assert.deepEqual(pool.consultas.at(-1).valores, [1000, 7]);
    assert.match(pool.consultas.at(-1).sql, /u\.colaborador AND u\.pontos >= \$1/);
    await repo.getPlatinaDisponiveis(2500);
    assert.deepEqual(pool.consultas.at(-1).valores, [2500]);
    assert.match(pool.consultas.at(-1).sql, /u\.disponivel_atendimento/);
});

test('create parametriza dados e usa identity em uma única escrita atômica', async () => {
    const pool = poolFalso();
    const entrada = dados();
    await new UsuarioPostgresRepository(pool).create(entrada);
    assert.equal(pool.conexoes, 0);
    assert.equal(pool.consultas.length, 1);
    const insert = pool.consultas.find(item => item.sql.startsWith('INSERT INTO public.usuarios'));
    assert.equal(insert.sql.includes(entrada.nome), false);
    assert.equal(insert.valores.includes(entrada.nome), true);
    assert.equal(insert.valores.includes(entrada.id), false);
    assert.equal(insert.valores.includes(entrada.senhaHash), true);
    assert.equal(insert.valores[3], null);
    assert.match(insert.sql, /RETURNING \*/);
    assert.deepEqual(pool.liberacoes, []);
});

test('update mantém whitelist e ignora campos abandonados em uma única instrução', async () => {
    const pool = poolFalso();
    const repo = new UsuarioPostgresRepository(pool);
    const usuario = await repo.update(41, {
        nome: "Nome ' atualizado", bio: 'Nova bio', especialidades: ['legado'],
        id: 99, slug: 'outro', pontos: 99999, colaborador: false, senha_hash: 'indevida', senhaHash: 'indevida'
    });
    const atualizacao = pool.consultas[0];
    assert.equal(pool.conexoes, 0);
    assert.equal(pool.consultas.length, 1);
    assert.equal(usuario.id, 41);
    assert.deepEqual(atualizacao.valores, [41, "Nome ' atualizado", 'Nova bio']);
    assert.doesNotMatch(atualizacao.sql, /\b(?:slug|pontos|colaborador|senha_hash)\s*=/);
    assert.equal(atualizacao.sql.includes("Nome ' atualizado"), false);
    assert.equal(/especialidade/i.test(atualizacao.sql), false);
    assert.match(atualizacao.sql, /RETURNING \*/);

    const ignorado = poolFalso();
    const semAlteracoes = await new UsuarioPostgresRepository(ignorado).update(41, { especialidades: ['legado'] });
    assert.equal(Object.hasOwn(semAlteracoes, 'especialidades'), false);
    assert.equal(ignorado.consultas.every(item => item.sql.startsWith('SELECT')), true);
});

test('falha no UPDATE de perfil propaga o erro sem abrir transação desnecessária', async () => {
    const erro = new Error('Falha simulada no UPDATE');
    const pool = poolFalso(sql => { if (sql.startsWith('UPDATE')) throw erro; });
    await assert.rejects(new UsuarioPostgresRepository(pool).update(41, { bio: 'Nova bio' }), erro);
    assert.equal(pool.conexoes, 0);
    assert.equal(pool.consultas.length, 1);
});

test('update de usuário ausente retorna null sem outras escritas', async () => {
    const pool = poolFalso(sql => sql.startsWith('UPDATE') ? { rows: [] } : undefined);
    assert.equal(await new UsuarioPostgresRepository(pool).update(41, { bio: 'Nova bio' }), null);
    assert.equal(pool.consultas.length, 1);
    assert.equal(pool.consultas.some(item => /^(?:INSERT|DELETE)/.test(item.sql)), false);
});

test('pontos usam incremento atômico com piso zero e limpam disponibilidade quando necessário', async () => {
    const pool = poolFalso();
    const usuario = await new UsuarioPostgresRepository(pool).adicionarPontos(41, -50, 2500);
    assert.equal(usuario.id, 41);
    const ajuste = pool.consultas.find(item => item.sql.startsWith('UPDATE'));
    assert.match(ajuste.sql, /GREATEST\(0, pontos \+ \$2\)/);
    assert.match(ajuste.sql, /WHERE id = \$1 AND colaborador/);
    assert.deepEqual(ajuste.valores, [41, -50, 2500]);
});

test('definirDisponibilidade persiste boolean e aplica threshold na escrita para evitar corrida', async () => {
    const pool = poolFalso();
    await new UsuarioPostgresRepository(pool).definirDisponibilidade(41, false, 2500);
    const atualizacao = pool.consultas.find(item => item.sql.startsWith('UPDATE'));
    assert.deepEqual(atualizacao.valores, [41, false, 2500]);
    assert.match(atualizacao.sql, /pontos >= \$3/);
});

test('remove combina ajustes de pontos e DELETE parametrizado na mesma transação', async () => {
    const pool = poolFalso();
    const usuario = await new UsuarioPostgresRepository(pool).remove(41, { ajustesPontos: [{ id: 10, delta: -20 }], pontosPlatina: 2500 });
    assert.equal(usuario.id, 41);
    assert.equal(pool.conexoes, 1);
    const ajuste = pool.consultas.find(item => item.sql.startsWith('UPDATE'));
    const exclusao = pool.consultas.find(item => item.sql.startsWith('DELETE FROM public.usuarios'));
    assert.deepEqual(ajuste.valores, [10, -20, 2500]);
    assert.deepEqual(exclusao.valores, [41]);
    assert.ok(pool.consultas.indexOf(ajuste) < pool.consultas.indexOf(exclusao));
    assert.equal(pool.consultas.at(-1).sql, 'COMMIT');
});

test('unique violation de slug/contatos vira conflito público sem detalhe SQL', async () => {
    for (const [constraint, codigo] of [
        ['usuarios_slug_key', 'USUARIO_SLUG_CONFLITO'],
        ['usuarios_email_lower_unique', 'USUARIO_IDENTIFICADOR_CONFLITO'],
        ['usuarios_telefone_key', 'USUARIO_IDENTIFICADOR_CONFLITO']
    ]) {
        const pool = poolFalso(sql => {
            if (sql.startsWith('INSERT INTO public.usuarios')) throw Object.assign(new Error('SQL e dados privados simulados'), { code: '23505', constraint });
        });
        await assert.rejects(new UsuarioPostgresRepository(pool).create(dados()), erro =>
            erro.code === codigo && !erro.message.includes('privados') && !('constraint' in erro));
        assert.equal(pool.conexoes, 0);
        assert.equal(pool.consultas.length, 1);
    }
});

test('falha inesperada no DELETE desfaz ajustes de pontos antes de liberar o client', async () => {
    const erro = new Error('Falha de banco simulada');
    const pool = poolFalso(sql => { if (sql.startsWith('DELETE FROM public.usuarios')) throw erro; });
    await assert.rejects(new UsuarioPostgresRepository(pool).remove(41, { ajustesPontos: [{ id: 10, delta: -20 }], pontosPlatina: 2500 }), erro);
    assert.equal(pool.consultas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.consultas.some(item => item.sql === 'COMMIT'), false);
});
