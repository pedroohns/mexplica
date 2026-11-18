const { test, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const Factory = require('../src/repositories/repositoryFactory');
const UsuarioPostgresRepository = require('../src/repositories/usuarioPostgresRepository');
const TutorialPostgresRepository = require('../src/repositories/tutorialPostgresRepository');
const AvaliacaoPostgresRepository = require('../src/repositories/avaliacaoPostgresRepository');
const ComentarioPostgresRepository = require('../src/repositories/comentarioPostgresRepository');
const AvaliacaoEventPublisher = require('../src/events/avaliacaoEventPublisher');

const usuario = (id, pontos = 1000) => ({ id, slug: 'usuario-' + id, nome: 'Pessoa', sobrenome: 'Sintética',
    email: '', telefone: '', idade: 30, genero: 'outro', colaborador: true, pontos, bio: '', localizacao: 'Brasil',
    disponivel_atendimento: false, senha_hash: 'hash-ficticio', criado_em: '2026-10-01T00:00:00Z' });
const tutorial = (id, autorId) => ({ id, autor_id: autorId, slug: 'tutorial-' + id, categoria_id: 'sistemas-acessibilidade',
    titulo: 'Tutorial sintético', resumo: 'Resumo sintético completo.', conteudo: 'Introdução sintética completa para testes.',
    visualizacoes: 0, criado_em: '2026-10-01T00:00:00Z', atualizado_em: null, video_url: null });
const avaliacao = (id, tutorialId, avaliadorId, nota) => ({ id, tutorial_id: tutorialId, avaliador_id: avaliadorId, nota,
    criado_em: '2026-10-01T00:00:00Z', atualizado_em: null });

class BancoFalso {
    constructor() {
        this.estado = { usuarios: [usuario(1), usuario(2), usuario(3), usuario(8)],
            tutoriais: [tutorial(11, 2), tutorial(12, 2), tutorial(21, 3), tutorial(81, 8)],
            avaliacoes: [], comentarios: [], passos: [], tags: [] };
        this.consultas = [];
        this.liberacoes = [];
        this.conexoes = 0;
    }
    async query(sql, valores) { return this.executar('pool', this.estado, sql, valores); }
    async connect() {
        this.conexoes++;
        const estado = structuredClone(this.estado);
        return { query: (sql, valores) => this.executar('client', estado, sql, valores),
            release: erro => this.liberacoes.push(erro) };
    }
    async executar(executor, estado, sql, valores = []) {
        const s = sql.replace(/\s+/g, ' ').trim();
        this.consultas.push({ executor, sql: s, valores });
        this.antesDaQuery?.(s, estado, valores);
        if (this.falhar?.(s)) throw new Error('Falha intermediária simulada');
        const resultado = rows => ({ rows: structuredClone(rows), rowCount: rows.length });
        if (s === 'BEGIN' || s === 'ROLLBACK') return resultado([]);
        if (s === 'COMMIT') { this.estado = estado; return resultado([]); }
        if (s.startsWith('SELECT id FROM public.usuarios')) return resultado(estado.usuarios.filter(item => item.id === valores[0]).map(item => ({ id: item.id })));
        if (s.startsWith('SELECT u.*')) return resultado(estado.usuarios.filter(item => item.id === valores[0]));
        if (s.startsWith('SELECT id FROM public.tutoriais')) return resultado(estado.tutoriais.filter(item => item.id === valores[0]).map(item => ({ id: item.id })));
        if (s.startsWith('SELECT t.*')) return resultado(s.includes('WHERE') ? estado.tutoriais.filter(item => item.id === valores[0]) : estado.tutoriais);
        if (s.startsWith('SELECT * FROM public.tutorial_passos')) return resultado(estado.passos.filter(item => valores[0].includes(item.tutorial_id)));
        if (s.startsWith('SELECT tutorial_id, tag')) return resultado(estado.tags.filter(item => valores[0].includes(item.tutorial_id)));
        if (s.startsWith('SELECT a.*')) {
            let rows = estado.avaliacoes;
            if (s.includes('a.id =')) rows = rows.filter(item => item.id === valores[0]);
            if (s.includes('a.tutorial_id =')) rows = rows.filter(item => item.tutorial_id === valores[0]);
            if (s.includes('a.avaliador_id =')) rows = rows.filter(item => item.avaliador_id === valores[s.includes('a.tutorial_id =') ? 1 : 0]);
            return resultado(rows);
        }
        if (s.startsWith('INSERT INTO public.avaliacoes')) {
            const row = { ...avaliacao(Math.max(0, ...estado.avaliacoes.map(item => item.id)) + 1, ...valores.slice(0, 3)), criado_em: valores[3] };
            estado.avaliacoes.push(row);
            return resultado([row]);
        }
        if (s.startsWith('UPDATE public.avaliacoes')) {
            const row = estado.avaliacoes.find(item => item.id === valores[0]);
            if (!row) return resultado([]);
            row.nota = valores[1]; row.atualizado_em = valores[2];
            return resultado([row]);
        }
        if (s.startsWith('UPDATE public.usuarios')) {
            const row = estado.usuarios.find(item => item.id === valores[0] && item.colaborador);
            if (!row) return resultado([]);
            row.pontos = Math.max(0, row.pontos + valores[1]);
            row.disponivel_atendimento &&= row.pontos >= valores[2];
            return resultado([row]);
        }
        if (s.startsWith('DELETE FROM public.avaliacoes')) {
            const indice = estado.avaliacoes.findIndex(item => item.id === valores[0]);
            return resultado(indice < 0 ? [] : estado.avaliacoes.splice(indice, 1));
        }
        const removerTutoriais = ids => {
            estado.tutoriais = estado.tutoriais.filter(item => !ids.has(item.id));
            for (const tabela of ['avaliacoes', 'comentarios', 'passos', 'tags']) estado[tabela] = estado[tabela].filter(item => !ids.has(item.tutorial_id));
        };
        if (s.startsWith('DELETE FROM public.tutoriais')) { removerTutoriais(new Set([valores[0]])); return resultado([]); }
        if (s.startsWith('DELETE FROM public.usuarios')) {
            removerTutoriais(new Set(estado.tutoriais.filter(item => item.autor_id === valores[0]).map(item => item.id)));
            estado.avaliacoes = estado.avaliacoes.filter(item => item.avaliador_id !== valores[0]);
            estado.comentarios = estado.comentarios.filter(item => item.usuario_id !== valores[0]);
            estado.usuarios = estado.usuarios.filter(item => item.id !== valores[0]);
            return resultado([]);
        }
        throw new Error('Query não simulada: ' + s);
    }
}

let banco;
const pool = { query: (...args) => banco.query(...args), connect: () => banco.connect() };
mock.method(Factory, 'criarUsuarioRepository', () => new UsuarioPostgresRepository(pool));
mock.method(Factory, 'criarTutorialRepository', () => new TutorialPostgresRepository(pool));
mock.method(Factory, 'criarAvaliacaoRepository', () => new AvaliacaoPostgresRepository(pool));
mock.method(Factory, 'criarComentarioRepository', () => new ComentarioPostgresRepository(pool));
const PontuacaoAvaliacaoObserver = require('../src/observers/pontuacaoAvaliacaoObserver');
const Service = require('../src/services/relacionamentoService');
const AvaliacaoModel = require('../src/models/avaliacaoModel');
const ComentarioModel = require('../src/models/comentarioModel');
beforeEach(() => { banco = new BancoFalso(); });

function conferirTransacao(final = 'COMMIT') {
    assert.equal(banco.conexoes, 1);
    assert.equal(banco.consultas.every(item => item.executor === 'client'), true, 'Nenhuma operação pode escapar para o Pool');
    assert.equal(banco.consultas.filter(item => item.sql === 'BEGIN').length, 1);
    assert.equal(banco.consultas.at(-1).sql, final);
    assert.equal(banco.liberacoes.length, 1);
}

test('criar avaliação e somar pontos compartilha o client da transação entre três Repositories', async () => {
    const resultado = await Service.criarAvaliacaoComPontos(11, 1, 3);
    assert.equal(resultado.avaliacao.nota, 3);
    assert.deepEqual(resultado.resumo, { media: 3, quantidade: 1 });
    assert.equal(resultado.colaborador.pontos, 1030);
    assert.equal('senhaHash' in resultado.colaborador, false);
    assert.match(banco.consultas.find(item => item.sql.startsWith('SELECT t.*')).sql, /FOR UPDATE$/);
    assert.deepEqual(banco.consultas.find(item => item.sql.startsWith('UPDATE public.usuarios')).valores.slice(0, 2), [2, 30]);
    conferirTransacao();
});

test('editar avaliação aplica somente delta e preserva identity, vínculos e criação', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 3)];
    const resultado = await Service.atualizarAvaliacaoComPontos(51, 5, { avaliadorId: 1 });
    assert.equal(resultado.avaliacao.id, 51);
    assert.equal(resultado.avaliacao.tutorialId, 11);
    assert.equal(resultado.avaliacao.avaliadorId, 1);
    assert.equal(resultado.avaliacao.criadoEm, '2026-10-01T00:00:00Z');
    assert.ok(resultado.avaliacao.atualizadoEm);
    assert.equal(banco.estado.usuarios.find(item => item.id === 2).pontos, 1020);
    assert.equal(banco.estado.avaliacoes.length, 1);
    conferirTransacao();
});

test('delta usa a nota obtida sob FOR UPDATE, mesmo se a leitura anterior estiver desatualizada', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 3)];
    banco.antesDaQuery = (sql, estado) => {
        if (sql.startsWith('SELECT a.*') && sql.endsWith('FOR UPDATE')) estado.avaliacoes[0].nota = 4;
    };
    await Service.atualizarAvaliacaoComPontos(51, 5);
    assert.equal(banco.consultas.find(item => item.sql.startsWith('UPDATE public.usuarios')).valores[1], 10);
    conferirTransacao();
});

test('remover avaliação desconta pontos com piso zero e retorna avaliação removida', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 5)];
    banco.estado.usuarios.find(item => item.id === 2).pontos = 10;
    assert.equal((await Service.removerAvaliacaoComAjuste(51)).id, 51);
    assert.equal(banco.estado.avaliacoes.length, 0);
    assert.equal(banco.estado.usuarios.find(item => item.id === 2).pontos, 0);
    conferirTransacao();
});

test('excluir tutorial soma avaliações antes do DELETE e deixa dependentes para CASCADE', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 3), avaliacao(52, 11, 8, 5), avaliacao(53, 21, 1, 4)];
    banco.estado.comentarios = [{ id: 1, tutorial_id: 11, usuario_id: 1 }, { id: 2, tutorial_id: 21, usuario_id: 1 }];
    banco.estado.passos = [{ tutorial_id: 11, ordem: 1, imagem_url: null, link_url: null }];
    banco.estado.tags = [{ tutorial_id: 11, tag: 'teste' }];
    assert.equal((await Service.removerTutorialCompleto(11)).id, 11);
    assert.equal(banco.estado.usuarios.find(item => item.id === 2).pontos, 920);
    assert.deepEqual(banco.estado.avaliacoes.map(item => item.id), [53]);
    assert.deepEqual(banco.estado.comentarios.map(item => item.id), [2]);
    assert.equal(banco.estado.passos.length, 0);
    assert.equal(banco.estado.tags.length, 0);
    assert.deepEqual(banco.consultas.filter(item => item.sql.startsWith('DELETE')).map(item => item.sql), ['DELETE FROM public.tutoriais WHERE id = $1']);
    conferirTransacao();
});

test('excluir usuário agrupa reversão por autor alheio e não ajusta o autor que será removido', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 8, 3), avaliacao(52, 12, 8, 5), avaliacao(53, 21, 8, 2),
        avaliacao(54, 81, 1, 4), avaliacao(55, 21, 1, 5)];
    banco.estado.comentarios = [{ id: 1, tutorial_id: 11, usuario_id: 8 }, { id: 2, tutorial_id: 81, usuario_id: 1 }, { id: 3, tutorial_id: 21, usuario_id: 1 }];
    await Service.removerDadosDoUsuario(8);
    assert.deepEqual(banco.consultas.filter(item => item.sql.startsWith('UPDATE public.usuarios')).map(item => item.valores.slice(0, 2)), [[2, -80], [3, -20]]);
    assert.equal(banco.estado.usuarios.some(item => item.id === 8), false);
    assert.equal(banco.estado.tutoriais.some(item => item.id === 81), false);
    assert.deepEqual(banco.estado.avaliacoes.map(item => item.id), [55]);
    assert.deepEqual(banco.estado.comentarios.map(item => item.id), [3]);
    assert.equal(banco.consultas.filter(item => item.sql.startsWith('DELETE')).length, 1);
    conferirTransacao();
});

for (const [nome, executar, falhar] of [
    ['criar avaliação', () => Service.criarAvaliacaoComPontos(11, 1, 4), sql => sql.startsWith('UPDATE public.usuarios')],
    ['editar avaliação', () => Service.atualizarAvaliacaoComPontos(51, 5), sql => sql.startsWith('UPDATE public.usuarios')],
    ['remover avaliação', () => Service.removerAvaliacaoComAjuste(51), sql => sql.startsWith('UPDATE public.usuarios')],
    ['excluir tutorial', () => Service.removerTutorialCompleto(11), sql => sql.startsWith('DELETE FROM public.tutoriais')],
    ['excluir usuário', () => Service.removerDadosDoUsuario(8), sql => sql.startsWith('DELETE FROM public.usuarios')]
]) {
    test('rollback restaura avaliação/pontos/dependentes ao falhar depois de ' + nome, async () => {
        banco.estado.avaliacoes = [avaliacao(51, 11, 8, 3), avaliacao(52, 21, 8, 4)];
        const anterior = structuredClone(banco.estado);
        banco.falhar = falhar;
        await assert.rejects(executar(), /Falha intermediária simulada/);
        assert.deepEqual(banco.estado, anterior);
        assert.equal(banco.consultas.some(item => item.sql === 'COMMIT'), false);
        assert.ok(banco.liberacoes[0] instanceof Error);
        conferirTransacao('ROLLBACK');
    });
}

test('duplicidade concorrente na UNIQUE faz rollback e expõe apenas conflito conhecido', async () => {
    banco.antesDaQuery = sql => {
        if (sql.startsWith('INSERT INTO public.avaliacoes')) throw Object.assign(new Error('Detalhe SQL privado'),
            { code: '23505', constraint: 'avaliacoes_tutorial_id_avaliador_id_key' });
    };
    await assert.rejects(Service.criarAvaliacaoComPontos(11, 1, 5), erro => erro.code === 'AVALIACAO_DUPLICADA' && !erro.message.includes('privado'));
    assert.equal(banco.estado.avaliacoes.length, 0);
    assert.equal(banco.consultas.some(item => item.sql.startsWith('UPDATE public.usuarios')), false);
    conferirTransacao('ROLLBACK');
});

test('autorização é conferida novamente sob bloqueio antes de editar ou excluir avaliação', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 3)];
    await assert.rejects(Service.atualizarAvaliacaoComPontos(51, 5, { avaliadorId: 8 }), { code: 'AVALIACAO_EDICAO_PROIBIDA' });
    assert.equal(banco.consultas.some(item => /^(INSERT|UPDATE|DELETE)/.test(item.sql)), false);
    conferirTransacao('ROLLBACK');
});

test('resumo mantém média com uma casa decimal e retorna zeros quando não há avaliações', async () => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 3), avaliacao(52, 11, 8, 4), avaliacao(53, 11, 3, 4)];
    assert.deepEqual(await AvaliacaoModel.resumoDoTutorial(11), { media: 3.7, quantidade: 3 });
    assert.deepEqual(await AvaliacaoModel.resumoDoTutorial(12), { media: 0, quantidade: 0 });
});

test('IDs inválidos preservam ausência no domínio sem enviar NaN ao PostgreSQL', async () => {
    for (const id of ['invalido', -1, 0, 1.5]) {
        assert.equal(await ComentarioModel.findById(id), null);
        assert.deepEqual(await ComentarioModel.findByTutorialId(id), []);
        assert.deepEqual(await ComentarioModel.findByUserId(id), []);
        assert.equal(await ComentarioModel.update(id, 'Texto'), null);
        assert.equal(await ComentarioModel.remove(id), null);
        assert.equal(await AvaliacaoModel.findById(id), null);
        assert.deepEqual(await AvaliacaoModel.findByTutorialId(id), []);
        assert.deepEqual(await AvaliacaoModel.findByAvaliadorId(id), []);
        assert.equal(await AvaliacaoModel.findByTutorialEAvaliador(11, id), null);
        assert.equal(await AvaliacaoModel.update(id, 5), null);
        assert.equal(await AvaliacaoModel.remove(id), null);
    }
    assert.equal(banco.consultas.length, 0);
});

test('CRUD publica os três eventos com deltas corretos e um ajuste por evento no mesmo client', async t => {
    const eventos = [], recebidos = [], clients = [];
    const conectar = banco.connect;
    t.mock.method(banco, 'connect', async function () {
        const client = await conectar.call(this);
        clients.push(client);
        return client;
    });
    const notificar = AvaliacaoEventPublisher.prototype.notificar;
    t.mock.method(AvaliacaoEventPublisher.prototype, 'notificar', async function (evento, contexto) {
        eventos.push({ evento, client: contexto.client, ultimaQuery: banco.consultas.at(-1).sql });
        return notificar.call(this, evento, contexto);
    });
    const atualizar = PontuacaoAvaliacaoObserver.prototype.atualizar;
    t.mock.method(PontuacaoAvaliacaoObserver.prototype, 'atualizar', async function (evento, contexto) {
        recebidos.push({ evento, client: contexto.client });
        return atualizar.call(this, evento, contexto);
    });

    const criada = await Service.criarAvaliacaoComPontos(11, 1, 3);
    assert.equal(criada.colaborador.pontos, 1030);
    const editada = await Service.atualizarAvaliacaoComPontos(criada.avaliacao.id, 5);
    assert.equal(editada.colaborador.pontos, 1050);
    await Service.atualizarAvaliacaoComPontos(criada.avaliacao.id, 5);
    await Service.removerAvaliacaoComAjuste(criada.avaliacao.id);
    assert.equal(banco.estado.usuarios.find(item => item.id === 2).pontos, 1000);
    assert.equal(await Service.removerAvaliacaoComAjuste(criada.avaliacao.id), null);

    assert.deepEqual(eventos.map(item => item.evento), [
        { tipo: 'avaliacaoCriada', autorId: 2, deltaPontos: 30 },
        { tipo: 'avaliacaoAtualizada', autorId: 2, deltaPontos: 20 },
        { tipo: 'avaliacaoAtualizada', autorId: 2, deltaPontos: 0 },
        { tipo: 'avaliacaoRemovida', autorId: 2, deltaPontos: -50 }
    ]);
    assert.equal(recebidos.length, eventos.length);
    for (let i = 0; i < eventos.length; i++) {
        assert.equal(eventos[i].client, clients[i]);
        assert.equal(recebidos[i].client, clients[i]);
        assert.equal(recebidos[i].evento, eventos[i].evento);
        assert.match(eventos[i].ultimaQuery, /^(INSERT INTO|UPDATE|DELETE FROM) public.avaliacoes/);
    }
    assert.equal(banco.consultas.filter(item => item.sql.startsWith('UPDATE public.usuarios')).length, 4);
    assert.equal(banco.consultas.filter(item => item.sql === 'COMMIT').length, 5);
    assert.equal(banco.consultas.every(item => item.executor === 'client'), true);
});

test('COMMIT aguarda o observer mesmo quando o ajuste de pontos já terminou', async t => {
    const atualizar = PontuacaoAvaliacaoObserver.prototype.atualizar;
    let liberar, sinalizarInicio;
    const bloqueio = new Promise(resolve => { liberar = resolve; });
    const iniciou = new Promise(resolve => { sinalizarInicio = resolve; });
    t.mock.method(PontuacaoAvaliacaoObserver.prototype, 'atualizar', async function (...args) {
        await atualizar.apply(this, args);
        sinalizarInicio();
        await bloqueio;
    });

    const operacao = Service.criarAvaliacaoComPontos(11, 1, 4);
    await iniciou;
    try {
        assert.equal(banco.consultas.some(item => item.sql.startsWith('UPDATE public.usuarios')), true);
        assert.equal(banco.consultas.some(item => item.sql === 'COMMIT'), false);
        assert.equal(banco.liberacoes.length, 0);
        assert.equal(banco.estado.avaliacoes.length, 0);
        assert.equal(banco.estado.usuarios.find(item => item.id === 2).pontos, 1000);
    } finally { liberar(); }
    assert.equal((await operacao).colaborador.pontos, 1040);
    conferirTransacao();
});

for (const [nome, executar] of [
    ['criação', () => Service.criarAvaliacaoComPontos(11, 1, 4)],
    ['edição', () => Service.atualizarAvaliacaoComPontos(51, 5)],
    ['remoção', () => Service.removerAvaliacaoComAjuste(51)]
]) {
    test('falha async do observer após ajustar pontos desfaz avaliação e pontos na ' + nome, async t => {
        banco.estado.avaliacoes = [avaliacao(51, 11, 8, 3)];
        const anterior = structuredClone(banco.estado);
        const falha = new Error('Falha async do observer');
        const atualizar = PontuacaoAvaliacaoObserver.prototype.atualizar;
        t.mock.method(PontuacaoAvaliacaoObserver.prototype, 'atualizar', async function (...args) {
            await atualizar.apply(this, args);
            await Promise.resolve();
            throw falha;
        });

        await assert.rejects(executar(), erro => erro === falha);

        assert.deepEqual(banco.estado, anterior);
        assert.equal(banco.consultas.filter(item => item.sql.startsWith('UPDATE public.usuarios')).length, 1);
        assert.equal(banco.consultas.some(item => item.sql === 'COMMIT'), false);
        assert.equal(banco.liberacoes[0], falha);
        conferirTransacao('ROLLBACK');
    });
}

test('operações recusadas e avaliação ausente não notificam observers', async t => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 1, 3)];
    const notificacao = t.mock.method(AvaliacaoEventPublisher.prototype, 'notificar');
    await assert.rejects(Service.criarAvaliacaoComPontos(11, 1, 5), { code: 'AVALIACAO_DUPLICADA' });
    await assert.rejects(Service.atualizarAvaliacaoComPontos(51, 5, { avaliadorId: 8 }), { code: 'AVALIACAO_EDICAO_PROIBIDA' });
    assert.equal(await Service.removerAvaliacaoComAjuste(999), null);
    assert.equal(notificacao.mock.callCount(), 0);
});

test('cascatas de tutorial e usuário preservam ajustes agregados sem publicar eventos individuais', async t => {
    banco.estado.avaliacoes = [avaliacao(51, 11, 8, 3), avaliacao(52, 12, 8, 5), avaliacao(53, 21, 8, 2)];
    const notificacao = t.mock.method(AvaliacaoEventPublisher.prototype, 'notificar');
    await Service.removerTutorialCompleto(11);
    await Service.removerDadosDoUsuario(8);
    assert.equal(notificacao.mock.callCount(), 0);
    assert.deepEqual(banco.consultas.filter(item => item.sql.startsWith('UPDATE public.usuarios'))
        .map(item => item.valores.slice(0, 2)), [[2, -30], [2, -50], [3, -20]]);
    assert.equal(banco.estado.avaliacoes.length, 0);
});

test('observer preserva a projeção de mudança de nível ao subir e descer de Platina', async () => {
    banco.estado.usuarios.find(item => item.id === 2).pontos = 2470;
    const criada = await Service.criarAvaliacaoComPontos(11, 1, 3);
    assert.equal(criada.nivelAnterior, 'Diamante');
    assert.equal(criada.nivelAtual, 'Platina');
    assert.equal(criada.mudouNivel, true);
    assert.equal(criada.colaborador.pontos, 2500);
    banco.estado.usuarios.find(item => item.id === 2).disponivel_atendimento = true;
    const editada = await Service.atualizarAvaliacaoComPontos(criada.avaliacao.id, 1);
    assert.equal(editada.nivelAnterior, 'Platina');
    assert.equal(editada.nivelAtual, 'Diamante');
    assert.equal(editada.mudouNivel, true);
    assert.equal(editada.colaborador.pontos, 2480);
    assert.equal(editada.colaborador.disponivelAtendimento, false);
});
