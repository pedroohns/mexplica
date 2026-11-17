const UsuarioModel = require('../models/usuarioModel');
const TutorialModel = require('../models/tutorialModel');
const AvaliacaoModel = require('../models/avaliacaoModel');

function falha(code) { throw Object.assign(new Error('Operação de relacionamento recusada.'), { code }); }

function conferirAvaliador(avaliacao, avaliadorId, acao) {
    if (avaliadorId !== undefined && avaliacao.avaliadorId !== Number(avaliadorId)) {
        falha(acao === 'editar' ? 'AVALIACAO_EDICAO_PROIBIDA' : 'AVALIACAO_EXCLUSAO_PROIBIDA');
    }
}

async function resultadoDaAvaliacao(avaliacao, tutorial, colaboradorAnterior, delta, client) {
    const colaborador = await UsuarioModel.adicionarPontos(tutorial.autorId, delta, { client });
    const nivelAnterior = colaboradorAnterior?.nivel || null;
    return {
        avaliacao, resumo: await AvaliacaoModel.resumoDoTutorial(tutorial.id, { client }),
        colaborador: UsuarioModel.toPublic(colaborador),
        mudouNivel: Boolean(colaborador && nivelAnterior !== colaborador.nivel),
        nivelAnterior, nivelAtual: colaborador?.nivel || null
    };
}

async function criarAvaliacaoComPontos(tutorialId, avaliadorId, nota) {
    return AvaliacaoModel.emTransacao(async client => {
        // O mesmo bloqueio de tutorial coordena notas concorrentes e sua exclusão no banco.
        const tutorial = await TutorialModel.findById(tutorialId, { client, bloquear: true });
        if (!tutorial) falha('TUTORIAL_NAO_ENCONTRADO');
        if (tutorial.autorId === Number(avaliadorId)) falha('AVALIACAO_PROPRIO_TUTORIAL');
        if (await AvaliacaoModel.findByTutorialEAvaliador(tutorial.id, avaliadorId, { client })) falha('AVALIACAO_DUPLICADA');
        const colaborador = await UsuarioModel.findById(tutorial.autorId, { client });
        const avaliacao = await AvaliacaoModel.create({ tutorialId: tutorial.id, avaliadorId, nota }, { client });
        return resultadoDaAvaliacao(avaliacao, tutorial, colaborador, AvaliacaoModel.pontosPorNota(nota), client);
    });
}

async function atualizarAvaliacaoComPontos(id, nota, { avaliadorId } = {}) {
    return AvaliacaoModel.emTransacao(async client => {
        const referencia = await AvaliacaoModel.findById(id, { client });
        if (!referencia) falha('AVALIACAO_NAO_ENCONTRADA');
        const tutorial = await TutorialModel.findById(referencia.tutorialId, { client, bloquear: true });
        if (!tutorial) falha('TUTORIAL_NAO_ENCONTRADO');
        const anterior = await AvaliacaoModel.findById(id, { client, bloquear: true });
        if (!anterior) falha('AVALIACAO_NAO_ENCONTRADA');
        conferirAvaliador(anterior, avaliadorId, 'editar');
        const delta = AvaliacaoModel.pontosPorNota(nota) - AvaliacaoModel.pontosPorNota(anterior.nota);
        const colaborador = await UsuarioModel.findById(tutorial.autorId, { client });
        const avaliacao = await AvaliacaoModel.update(id, nota, { client });
        return resultadoDaAvaliacao(avaliacao, tutorial, colaborador, delta, client);
    });
}

async function removerAvaliacaoComAjuste(id, { avaliadorId } = {}) {
    return AvaliacaoModel.emTransacao(async client => {
        const referencia = await AvaliacaoModel.findById(id, { client });
        if (!referencia) return null;
        const tutorial = await TutorialModel.findById(referencia.tutorialId, { client, bloquear: true });
        const avaliacao = await AvaliacaoModel.findById(id, { client, bloquear: true });
        if (!avaliacao) return null;
        conferirAvaliador(avaliacao, avaliadorId, 'excluir');
        const removida = await AvaliacaoModel.remove(id, { client });
        if (tutorial) await UsuarioModel.adicionarPontos(tutorial.autorId, -AvaliacaoModel.pontosPorNota(avaliacao.nota), { client });
        return removida;
    });
}

async function removerTutorialCompleto(id) {
    return TutorialModel.remove(id, {
        antesDeRemover: async (tutorial, client) => {
            const avaliacoes = await AvaliacaoModel.findByTutorialId(tutorial.id, { client, bloquear: true });
            const pontos = avaliacoes.reduce((soma, item) => soma + AvaliacaoModel.pontosPorNota(item.nota), 0);
            if (pontos) await UsuarioModel.adicionarPontos(tutorial.autorId, -pontos, { client });
        }
    });
}

async function removerDadosDoUsuario(id) {
    return UsuarioModel.remove(id, {
        antesDeRemover: async (usuario, client) => {
            const avaliacoes = await AvaliacaoModel.findByAvaliadorId(usuario.id, { client, bloquear: true });
            if (!avaliacoes.length) return;
            const tutoriais = new Map((await TutorialModel.findAll({ client })).map(item => [item.id, item]));
            const pontosPorAutor = new Map();
            for (const avaliacao of avaliacoes) {
                const tutorial = tutoriais.get(avaliacao.tutorialId);
                if (tutorial && tutorial.autorId !== usuario.id) {
                    pontosPorAutor.set(tutorial.autorId,
                        (pontosPorAutor.get(tutorial.autorId) || 0) - AvaliacaoModel.pontosPorNota(avaliacao.nota));
                }
            }
            for (const [autorId, delta] of [...pontosPorAutor].sort((a, b) => a[0] - b[0])) {
                await UsuarioModel.adicionarPontos(autorId, delta, { client });
            }
        }
    });
}

module.exports = { criarAvaliacaoComPontos, atualizarAvaliacaoComPontos,
    removerAvaliacaoComAjuste, removerTutorialCompleto, removerDadosDoUsuario };
