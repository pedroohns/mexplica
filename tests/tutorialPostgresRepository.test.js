const { test } = require('node:test');
const assert = require('node:assert/strict');
const TutorialPostgresRepository = require('../src/repositories/tutorialPostgresRepository');
const UsuarioPostgresRepository = require('../src/repositories/usuarioPostgresRepository');

const linha = alteracoes => ({ id: 41, slug: 'tutorial-teste', autor_id: 2, categoria_id: 'sistemas-acessibilidade',
    titulo: 'Tutorial de teste', resumo: 'Resumo do tutorial de teste.', conteudo: 'Conteúdo completo do tutorial de teste.',
    video_url: null, visualizacoes: 12, criado_em: new Date('2026-09-01T12:00:00Z'), atualizado_em: null, ...alteracoes });
const passosSql = () => [
    { tutorial_id: 41, ordem: 2, titulo: 'Segunda etapa', descricao: 'Faça a segunda etapa.', imagem_url: '/imagem.jpg', imagem_alt: 'Tela', imagem_legenda: 'Legenda', link_url: 'https://example.com', link_texto: 'Ajuda' },
    { tutorial_id: 41, ordem: 1, titulo: 'Primeira etapa', descricao: 'Faça a primeira etapa.', imagem_url: null, imagem_alt: null, imagem_legenda: null, link_url: null, link_texto: null }
];
const dados = () => ({ slug: 'tutorial-teste', autorId: 2, categoriaId: 'sistemas-acessibilidade',
    titulo: "Tutorial ' de teste", resumo: 'Resumo do tutorial de teste.', conteudo: 'Conteúdo completo do tutorial de teste.',
    videoUrl: '', visualizacoes: 0, criadoEm: '2026-09-01T12:00:00.000Z', atualizadoEm: null,
    passos: [{ ordem: 1, titulo: 'Primeira etapa', descricao: 'Faça a primeira etapa.', imagem: null, linkExterno: null }],
    imagens: [], tags: ['tutorial', 'tutorial', 'acessibilidade'] });

function poolFalso({ linhas = [linha()], passos = passosSql(), tags = [{ tutorial_id: 41, tag: 'acessibilidade' }, { tutorial_id: 41, tag: 'tutorial' }], responder } = {}) {
    const consultas = [], liberacoes = [];
    let conexoes = 0;
    async function query(executor, sql, valores = []) {
        consultas.push({ executor, sql, valores });
        const resposta = await responder?.(sql, valores);
        if (resposta) return resposta;
        if (sql.startsWith('SELECT t.*')) return { rows: linhas };
        if (sql.startsWith('SELECT * FROM public.tutorial_passos')) return { rows: passos };
        if (sql.startsWith('SELECT tutorial_id, tag')) return { rows: tags };
        if (sql.startsWith('SELECT id FROM public.tutoriais')) return { rows: linhas.map(item => ({ id: item.id })) };
        if (sql.startsWith('INSERT INTO public.tutoriais') || sql.startsWith('UPDATE public.tutoriais')) return { rows: linhas };
        if (sql.startsWith('UPDATE public.usuarios') || sql.startsWith('SELECT u.*')) return { rows: [{ id: 2, colaborador: true, pontos: 1200 }] };
        return { rows: [], rowCount: 1 };
    }
    return { consultas, liberacoes,
        get conexoes() { return conexoes; },
        query(sql, valores) { return query('pool', sql, valores); },
        async connect() {
            conexoes++;
            return { query(sql, valores) { return query('client', sql, valores); }, release(erro) { liberacoes.push(erro); } };
        }
    };
}

test('hidratação reconstrói camelCase, passos ordenados, imagens derivadas, links e tags sem duplicação', async () => {
    const pool = poolFalso({ tags: [{ tutorial_id: 41, tag: 'a' }, { tutorial_id: 41, tag: 'b' }, { tutorial_id: 41, tag: 'b' }] });
    const tutorial = await new TutorialPostgresRepository(pool).findById(41);
    assert.equal(tutorial.autorId, 2);
    assert.equal(tutorial.categoriaId, 'sistemas-acessibilidade');
    assert.equal(tutorial.videoUrl, '');
    assert.equal(tutorial.criadoEm, '2026-09-01T12:00:00.000Z');
    assert.equal(tutorial.atualizadoEm, null);
    assert.deepEqual(tutorial.passos.map(passo => passo.ordem), [1, 2]);
    assert.equal(tutorial.passos[0].imagem, null);
    assert.equal(tutorial.passos[0].linkExterno, null);
    assert.deepEqual(tutorial.passos[1].imagem, { url: '/imagem.jpg', alt: 'Tela', legenda: 'Legenda' });
    assert.deepEqual(tutorial.passos[1].linkExterno, { url: 'https://example.com', texto: 'Ajuda' });
    assert.deepEqual(tutorial.imagens, [{ ordem: 2, url: '/imagem.jpg', alt: 'Tela', legenda: 'Legenda' }]);
    assert.deepEqual(tutorial.tags, ['a', 'b']);
    assert.equal(['autor_id', 'categoria_id', 'video_url', 'criado_em'].some(campo => campo in tutorial), false);
    assert.equal('imagem_url' in tutorial.passos[1], false);
});

test('findAll usa três SELECTs para muitos tutoriais e agrupa coleções pelos IDs', async () => {
    const linhas = Array.from({ length: 30 }, (_, indice) => linha({ id: indice + 41 }));
    const pool = poolFalso({ linhas, passos: [...passosSql(), { ...passosSql()[0], tutorial_id: 42 }], tags: [{ tutorial_id: 42, tag: 'outro' }] });
    const tutoriais = await new TutorialPostgresRepository(pool).findAll();
    assert.equal(tutoriais.length, 30);
    assert.equal(pool.consultas.length, 3);
    assert.match(pool.consultas[0].sql, /ORDER BY t\.criado_em DESC/);
    assert.deepEqual(pool.consultas[1].valores, [linhas.map(item => item.id)]);
    assert.deepEqual(pool.consultas[2].valores, [linhas.map(item => item.id)]);
    assert.equal(tutoriais[0].passos.length, 2);
    assert.deepEqual(tutoriais[0].tags, []);
    assert.deepEqual(tutoriais[1].tags, ['outro']);
    assert.deepEqual(tutoriais[2].passos, []);
});

test('findById/findBySlug/findByAutorId parametrizam filtros sem concatenar entradas', async () => {
    const pool = poolFalso();
    const repo = new TutorialPostgresRepository(pool);
    await repo.findById(41);
    assert.deepEqual(pool.consultas[0].valores, [41]);
    const slug = "endereco' OR TRUE --";
    await repo.findBySlug(slug);
    assert.deepEqual(pool.consultas[3].valores, [slug]);
    assert.equal(pool.consultas[3].sql.includes(slug), false);
    await repo.findByAutorId(2);
    assert.deepEqual(pool.consultas[6].valores, [2]);
    assert.match(pool.consultas[6].sql, /t\.autor_id = \$1 ORDER BY t\.criado_em DESC/);
});

test('consulta vazia não busca coleções e buscas individuais retornam null', async () => {
    const pool = poolFalso({ linhas: [] });
    const repo = new TutorialPostgresRepository(pool);
    assert.deepEqual(await repo.findAll(), []);
    assert.equal(await repo.findById(999), null);
    assert.equal(await repo.findBySlug('ausente'), null);
    assert.equal(pool.consultas.length, 3);
    assert.equal(pool.consultas.every(item => item.sql.startsWith('SELECT t.*')), true);
});

test('create grava tutorial/passos/tags com parâmetros e um único client até o commit', async () => {
    const pool = poolFalso();
    const entrada = dados();
    const tutorial = await new TutorialPostgresRepository(pool).create(entrada);
    assert.equal(tutorial.id, 41);
    assert.equal(pool.conexoes, 1);
    assert.equal(pool.consultas.every(item => item.executor === 'client'), true);
    assert.equal(pool.consultas[0].sql, 'BEGIN');
    assert.equal(pool.consultas.at(-1).sql, 'COMMIT');
    const insert = pool.consultas.find(item => item.sql.startsWith('INSERT INTO public.tutoriais'));
    assert.equal(insert.sql.includes(entrada.titulo), false);
    assert.equal(insert.valores.includes(entrada.titulo), true);
    const tags = pool.consultas.filter(item => item.sql.startsWith('INSERT INTO public.tutorial_tags'));
    assert.deepEqual(tags.map(item => item.valores), [[41, 'tutorial'], [41, 'acessibilidade']]);
    assert.equal(pool.consultas.some(item => /public\.(comentarios|avaliacoes)/.test(item.sql)), false);
    assert.deepEqual(pool.liberacoes, [undefined]);
});

test('escrita preserva data URL extensa e mapeia imagem/link para colunas do passo', async () => {
    const pool = poolFalso();
    const entrada = dados();
    const url = 'data:image/png;base64,' + 'A'.repeat(90000);
    entrada.passos[0].imagem = { url, alt: 'Tela', legenda: 'Legenda' };
    entrada.passos[0].linkExterno = { url: 'https://example.com', texto: "Ajuda ' externa" };
    await new TutorialPostgresRepository(pool).create(entrada);
    const insert = pool.consultas.find(item => item.sql.startsWith('INSERT INTO public.tutorial_passos'));
    assert.equal(insert.valores[4] === url, true, 'A imagem completa deve ser parametrizada.');
    assert.deepEqual(insert.valores.slice(5), ['Tela', 'Legenda', 'https://example.com', "Ajuda ' externa"]);
    assert.equal(insert.sql.includes(url), false);
});

test('serialização respeita imagem integrada, null explícito e associação legada por ordem', async () => {
    const pool = poolFalso();
    const entrada = dados();
    entrada.passos = [
        { ordem: 7, titulo: 'Passo legado', descricao: 'Descrição legada' },
        { ordem: 2, titulo: 'Imagem removida', descricao: 'Descrição atual', imagem: null }
    ];
    entrada.imagens = [{ ordem: 7, url: '/legada.jpg', alt: 'Legada' }, { ordem: 2, url: '/removida.jpg' }];
    await new TutorialPostgresRepository(pool).create(entrada);
    const passos = pool.consultas.filter(item => item.sql.startsWith('INSERT INTO public.tutorial_passos'));
    assert.equal(passos[0].valores[1], 1);
    assert.equal(passos[0].valores[4], '/legada.jpg');
    assert.equal(passos[1].valores[4], null);
});

test('update substitui coleções na transação e não altera slug, autor ou visualizações', async () => {
    const pool = poolFalso();
    const entrada = { ...dados(), id: 999, slug: 'indevido', autorId: 88, visualizacoes: 999, atualizadoEm: '2026-10-01T00:00:00Z' };
    const tutorial = await new TutorialPostgresRepository(pool).update(41, entrada);
    const atualizacao = pool.consultas.find(item => item.sql.startsWith('UPDATE public.tutoriais'));
    assert.doesNotMatch(atualizacao.sql, /\b(slug|autor_id|visualizacoes|criado_em)\s*=/);
    assert.match(pool.consultas[1].sql, /FOR UPDATE/);
    for (const tabela of ['tutorial_passos', 'tutorial_tags']) {
        const exclusao = pool.consultas.find(item => item.sql.startsWith(`DELETE FROM public.${tabela}`));
        const inclusao = pool.consultas.find(item => item.sql.startsWith(`INSERT INTO public.${tabela}`));
        assert.deepEqual(exclusao.valores, [41]);
        assert.ok(pool.consultas.indexOf(exclusao) < pool.consultas.indexOf(inclusao));
    }
    assert.equal(tutorial.slug, 'tutorial-teste');
    assert.equal(pool.consultas.at(-1).sql, 'COMMIT');
    assert.equal(pool.conexoes, 1);
});

test('update parcial preserva coleções não enviadas e tutorial ausente não recebe escritas', async () => {
    const pool = poolFalso();
    await new TutorialPostgresRepository(pool).update(41, { titulo: 'Novo título' });
    assert.equal(pool.consultas.some(item => item.sql.startsWith('DELETE')), false);
    const ausente = poolFalso({ linhas: [] });
    assert.equal(await new TutorialPostgresRepository(ausente).update(999, { tags: [] }), null);
    assert.equal(ausente.consultas.some(item => /^(INSERT|UPDATE|DELETE)/.test(item.sql)), false);
});

test('falhas de passos ou tags em create/update causam rollback e descarte do client', async () => {
    for (const metodo of ['create', 'update']) {
        for (const tabela of ['tutorial_passos', 'tutorial_tags']) {
            const erro = new Error('Falha simulada na coleção');
            const pool = poolFalso({ responder: sql => { if (sql.startsWith(`INSERT INTO public.${tabela}`)) throw erro; } });
            const repo = new TutorialPostgresRepository(pool);
            await assert.rejects(metodo === 'create' ? repo.create(dados()) : repo.update(41, dados()), erro);
            assert.equal(pool.consultas.at(-1).sql, 'ROLLBACK');
            assert.equal(pool.consultas.some(item => item.sql === 'COMMIT'), false);
            assert.equal(pool.liberacoes[0], erro);
        }
    }
});

test('conflito UNIQUE de slug é traduzido sem expor erro privado ou constraint', async () => {
    const pool = poolFalso({ responder: sql => {
        if (sql.startsWith('INSERT INTO public.tutoriais')) throw Object.assign(new Error('Detalhe SQL privado'), { code: '23505', constraint: 'tutoriais_slug_key' });
    } });
    await assert.rejects(new TutorialPostgresRepository(pool).create(dados()), erro =>
        erro.code === 'TUTORIAL_SLUG_CONFLITO' && !erro.message.includes('privado') && !('constraint' in erro));
    assert.equal(pool.consultas.at(-1).sql, 'ROLLBACK');
});

test('incremento de visualização é um UPDATE atômico e retorna o contrato hidratado', async () => {
    const pool = poolFalso();
    const tutorial = await new TutorialPostgresRepository(pool).incrementarVisualizacao(41);
    assert.equal(tutorial.id, 41);
    assert.equal(pool.consultas.length, 3);
    assert.match(pool.consultas[0].sql, /visualizacoes = visualizacoes \+ 1/);
    assert.deepEqual(pool.consultas[0].valores, [41]);
    assert.equal(pool.consultas.some(item => item.sql.startsWith('SELECT t.*')), false);
});

test('delete e ajuste de pontos usam a mesma transação entre os dois Repositories', async () => {
    const pool = poolFalso();
    const usuarios = new UsuarioPostgresRepository(pool);
    await new TutorialPostgresRepository(pool).remove(41, {
        antesDeRemover: (tutorial, client) => usuarios.adicionarPontos(tutorial.autorId, -50, 2500, { client })
    });
    assert.equal(pool.conexoes, 1);
    assert.equal(pool.consultas.filter(item => item.sql === 'BEGIN').length, 1);
    const pontos = pool.consultas.find(item => item.sql.startsWith('UPDATE public.usuarios'));
    const exclusao = pool.consultas.find(item => item.sql.startsWith('DELETE FROM public.tutoriais'));
    assert.deepEqual(pontos.valores, [2, -50, 2500]);
    assert.deepEqual(exclusao.valores, [41]);
    assert.ok(pool.consultas.indexOf(pontos) < pool.consultas.indexOf(exclusao));
    assert.equal(pool.consultas.at(-1).sql, 'COMMIT');
});

test('falha no delete após ajustar pontos desfaz ambos e não confirma transação parcial', async () => {
    const erro = new Error('Falha simulada no DELETE');
    const pool = poolFalso({ responder: sql => { if (sql.startsWith('DELETE FROM public.tutoriais')) throw erro; } });
    const usuarios = new UsuarioPostgresRepository(pool);
    await assert.rejects(new TutorialPostgresRepository(pool).remove(41, {
        antesDeRemover: (tutorial, client) => usuarios.adicionarPontos(tutorial.autorId, -50, 2500, { client })
    }), erro);
    assert.equal(pool.consultas.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.consultas.some(item => item.sql === 'COMMIT'), false);
    assert.equal(pool.conexoes, 1);
});

test('remove ausente não chama ajuste de pontos nem emite DELETE', async () => {
    const pool = poolFalso({ linhas: [] });
    let ajustes = 0;
    const resultado = await new TutorialPostgresRepository(pool).remove(999, { antesDeRemover() { ajustes++; } });
    assert.equal(resultado, null);
    assert.equal(ajustes, 0);
    assert.equal(pool.consultas.some(item => item.sql.startsWith('DELETE')), false);
});
