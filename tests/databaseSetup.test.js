const { test } = require('node:test');
const assert = require('node:assert/strict');
const { aplicarSchema, inserirSeed, verificarBanco } = require('../src/database/databaseSetup');
const { prepararDadosSeed } = require('../src/database/seedData');

function dadosTeste() {
    return prepararDadosSeed({
        categorias: [{ id: 'teste', nome: 'Categoria teste' }],
        usuarios: [{ id: 3, slug: 'pessoa-teste', nome: "Nome ' de teste", especialidades: ['Acessibilidade'], pontos: 100 }],
        tutoriais: [{ id: 5, slug: 'tutorial-teste', autorId: 3, categoriaId: 'teste', tags: ['teste'], passos: [{ titulo: 'Abra o aplicativo', descricao: 'Toque no ícone do aplicativo.' }] }],
        comentarios: [{ id: 7, tutorialId: 5, usuarioId: 3, texto: 'Comentário original' }],
        avaliacoes: [{ id: 9, tutorialId: 5, avaliadorId: 3, nota: 5 }]
    });
}

function poolFalso(responder = () => undefined) {
    const chamadas = [];
    const liberacoes = [];
    let conexoes = 0;
    const client = {
        async query(sql, valores) {
            chamadas.push({ sql, valores });
            return await responder(sql, valores) ?? { rows: [{ inserido: 1 }], rowCount: 1 };
        },
        release(erro) { liberacoes.push(erro); }
    };
    return {
        chamadas, liberacoes,
        get conexoes() { return conexoes; },
        async connect() { conexoes++; return client; },
        query() { throw new Error('A transação deve usar o mesmo client, não pool.query.'); }
    };
}

test('aplicarSchema lê o SQL versionado e usa uma única conexão com BEGIN/COMMIT', async () => {
    const pool = poolFalso();
    await aplicarSchema(pool);
    assert.equal(pool.conexoes, 1);
    assert.equal(pool.chamadas[0].sql, 'BEGIN');
    assert.match(pool.chamadas[1].sql, /CREATE TABLE IF NOT EXISTS public\.usuarios/);
    assert.doesNotMatch(pool.chamadas[1].sql, /\b(?:DROP|TRUNCATE)\s+(?:DATABASE|SCHEMA|TABLE)\b/i);
    assert.equal(pool.chamadas.at(-1).sql, 'COMMIT');
    assert.deepEqual(pool.liberacoes, [undefined]);
});

test('falha ao aplicar schema executa ROLLBACK e descarta o client', async () => {
    const erro = new Error('Falha simulada no DDL');
    const pool = poolFalso(sql => { if (sql.includes('CREATE TABLE')) throw erro; });
    await assert.rejects(aplicarSchema(pool), erro);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.chamadas.some(item => item.sql === 'COMMIT'), false);
    assert.equal(pool.liberacoes[0], erro);
});

test('seed usa parâmetros, a mesma transação e ajusta todas as identities depois dos inserts', async () => {
    const pool = poolFalso();
    const dados = dadosTeste();
    const inseridos = await inserirSeed(pool, dados);
    assert.equal(pool.conexoes, 1);
    assert.equal(pool.chamadas[0].sql, 'BEGIN');
    assert.equal(pool.chamadas.at(-1).sql, 'COMMIT');
    assert.deepEqual(inseridos, Object.fromEntries(Object.keys(dados).map(nome => [nome, 1])));

    const inserts = pool.chamadas.filter(item => item.sql.startsWith('INSERT'));
    for (const chamada of inserts) {
        assert.match(chamada.sql, /VALUES \(\$1/);
        assert.match(chamada.sql, /ON CONFLICT .* DO NOTHING/);
        assert.equal(chamada.sql.includes(dados.usuarios[0].nome), false);
        assert.ok(Array.isArray(chamada.valores));
    }
    assert.ok(inserts.some(item => item.valores.includes(dados.usuarios[0].nome)));
    const ajustes = pool.chamadas.filter(item => item.sql.includes('setval('));
    assert.deepEqual(ajustes.map(item => item.valores[0]), [
        'public.usuarios', 'public.tutoriais', 'public.tutorial_passos', 'public.comentarios', 'public.avaliacoes'
    ]);
    assert.ok(pool.chamadas.indexOf(ajustes[0]) > pool.chamadas.indexOf(inserts.at(-1)));
});

test('falha no meio do seed desfaz a transação, não ajusta sequences e libera o client', async () => {
    const erro = new Error('Falha simulada no passo');
    const pool = poolFalso(sql => { if (sql.startsWith('INSERT INTO public.tutorial_passos')) throw erro; });
    await assert.rejects(inserirSeed(pool, dadosTeste()), erro);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.chamadas.some(item => item.sql === 'COMMIT' || item.sql.includes('setval(')), false);
    assert.equal(pool.liberacoes[0], erro);
});

test('reexecução ignora IDs históricos legítimos sem atualizar campos ou restaurar coleções editadas', async () => {
    const dados = dadosTeste();
    const pool = poolFalso((sql, valores) => {
        if (sql.startsWith('INSERT')) return { rowCount: 0, rows: [] };
        const tabela = sql.match(/^SELECT .+ FROM public\.(\w+) WHERE id = \$1$/)?.[1];
        if (tabela) return { rows: [dados[tabela].find(item => item.id === valores[0])] };
    });
    const inseridos = await inserirSeed(pool, dados);
    assert.equal(Object.values(inseridos).every(total => total === 0), true);
    assert.equal(pool.chamadas.some(item => /^UPDATE|^DELETE/.test(item.sql)), false);
    assert.equal(pool.chamadas.some(item => /^INSERT INTO public\.(usuario_especialidades|tutorial_tags|tutorial_passos)\b/.test(item.sql)), false);
    assert.equal(pool.chamadas.at(-1).sql, 'COMMIT');
});

test('ID histórico ocupado por outro usuário cancela o seed sem associar dependentes', async () => {
    const pool = poolFalso(sql => {
        if (sql.startsWith('INSERT INTO public.usuarios')) return { rowCount: 0, rows: [] };
        if (sql.startsWith('SELECT slug')) return { rows: [{ slug: 'outra-pessoa' }] };
    });
    await assert.rejects(inserirSeed(pool, dadosTeste()), /Conflito de identidade histórica em usuarios/);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.chamadas.some(item => item.sql.startsWith('INSERT INTO public.usuario_especialidades')), false);
});

function verificadorFalso({ orfaos = 0, tabelasAusentes = false, sequenceInvalida = false } = {}) {
    const dados = dadosTeste();
    return poolFalso((sql, valores) => {
        if (sql.includes('information_schema.tables')) return { rows: tabelasAusentes ? [] : Object.keys(dados).map(table_name => ({ table_name })) };
        if (sql.includes('FROM pg_constraint')) return { rows: [{ pks: 8, fks: 9 }] };
        if (sql.includes('AS dependencias_orfas')) return { rows: [{ total: orfaos }] };
        if (sql.includes('pg_get_serial_sequence')) return { rows: [{ sequencia: valores[0] + '_id_seq' }] };
        if (sql.includes('last_value::text')) return { rows: [{ last_value: '20', is_called: true, max_id: sequenceInvalida ? '21' : '20' }] };
        if (sql.startsWith('SELECT COUNT(*)')) return { rows: [{ total: 1 }] };
    });
}

test('verificação consulta tabelas, dados, PK/FK, órfãos e identities em transação somente leitura', async () => {
    const pool = verificadorFalso();
    const resultado = await verificarBanco(pool, dadosTeste());
    assert.equal(resultado.integridade, true);
    assert.equal(Object.keys(resultado.contagens).length, 8);
    assert.equal(Object.values(resultado.proximosIds).every(id => id === '21'), true);
    assert.equal(pool.chamadas[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    assert.equal(pool.chamadas.some(item => /\b(nextval|setval|INSERT|UPDATE|DELETE)\b/i.test(item.sql)), false);
    assert.equal(pool.chamadas.at(-1).sql, 'COMMIT');
});

test('verificação rejeita registros órfãos em vez de informar sucesso', async () => {
    const pool = verificadorFalso({ orfaos: 1 });
    await assert.rejects(verificarBanco(pool, dadosTeste()), /Integridade referencial inválida/);
    assert.equal(pool.chamadas.at(-1).sql, 'ROLLBACK');
});

test('verificação rejeita schema incompleto e identities que reutilizariam IDs', async () => {
    await assert.rejects(verificarBanco(verificadorFalso({ tabelasAusentes: true }), dadosTeste()), /Schema incompleto/);
    await assert.rejects(verificarBanco(verificadorFalso({ sequenceInvalida: true }), dadosTeste()), /Identity desalinhada/);
});
