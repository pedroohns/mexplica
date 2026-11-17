const UsuarioModel = require('../models/usuarioModel');
const TutorialModel = require('../models/tutorialModel');
const ComentarioModel = require('../models/comentarioModel');
const AvaliacaoModel = require('../models/avaliacaoModel');

// Temporário: serializa mutações entre arrays deste processo e dados persistidos.
// Não representa uma transação distribuída entre instâncias serverless.
let operacaoAtual = Promise.resolve();
function executarOperacaoHibrida(tarefa) {
    const resultado = operacaoAtual.then(tarefa);
    operacaoAtual = resultado.catch(() => {});
    return resultado;
}

function removerAvaliacaoComAjuste(avaliacaoId) {
    return executarOperacaoHibrida(async () => {
        const avaliacao = AvaliacaoModel.findById(avaliacaoId);
        if (!avaliacao) return null;
        const tutorial = await TutorialModel.findById(avaliacao.tutorialId);
        if (tutorial) await UsuarioModel.adicionarPontos(tutorial.autorId, -AvaliacaoModel.pontosPorNota(avaliacao.nota));
        // Só altera o array depois que a alteração persistente foi confirmada.
        return AvaliacaoModel.remove(avaliacao.id);
    });
}

function removerTutorialCompleto(tutorialId) {
    return executarOperacaoHibrida(async () => {
        const tutorial = await TutorialModel.findById(tutorialId);
        if (!tutorial) return null;
        const avaliacoes = AvaliacaoModel.findByTutorialId(tutorial.id);
        const pontos = avaliacoes.reduce((total, avaliacao) => total + AvaliacaoModel.pontosPorNota(avaliacao.nota), 0);
        const removido = await TutorialModel.remove(tutorial.id, {
            antesDeRemover: async (atual, client) => {
                if (pontos) await UsuarioModel.adicionarPontos(atual.autorId, -pontos, { client });
            }
        });
        if (!removido) return null;
        avaliacoes.forEach(avaliacao => AvaliacaoModel.remove(avaliacao.id));
        ComentarioModel.findByTutorialId(tutorial.id).forEach(comentario => ComentarioModel.remove(comentario.id));
        return removido;
    });
}

function removerDadosDoUsuario(usuarioId) {
    return executarOperacaoHibrida(async () => {
        const id = Number(usuarioId);
        // Uma carga em lote evita uma busca PostgreSQL para cada avaliação do runtime.
        const todosTutoriais = await TutorialModel.findAll();
        const tutoriais = todosTutoriais.filter(tutorial => tutorial.autorId === id);
        const porId = new Map(todosTutoriais.map(tutorial => [tutorial.id, tutorial]));
        const idsTutoriais = new Set(tutoriais.map(tutorial => tutorial.id));
        const avaliacoes = AvaliacaoModel.findAll().filter(avaliacao =>
            avaliacao.avaliadorId === id || idsTutoriais.has(avaliacao.tutorialId));
        const comentarios = ComentarioModel.findAll().filter(comentario =>
            comentario.usuarioId === id || idsTutoriais.has(comentario.tutorialId));
        const pontosPorAutor = new Map();
        for (const avaliacao of avaliacoes) {
            const tutorial = porId.get(avaliacao.tutorialId);
            if (tutorial) pontosPorAutor.set(tutorial.autorId,
                (pontosPorAutor.get(tutorial.autorId) || 0) - AvaliacaoModel.pontosPorNota(avaliacao.nota));
        }

        // Uma transação PG cobre pontos e usuário; a FK remove os tutoriais persistidos.
        const removido = await UsuarioModel.remove(id, {
            ajustesPontos: [...pontosPorAutor].map(([autorId, delta]) => ({ id: autorId, delta }))
        });
        if (!removido) return null;

        // Sem await: os arrays restantes só são limpos após o commit, sem estado parcial.
        avaliacoes.forEach(avaliacao => AvaliacaoModel.remove(avaliacao.id));
        comentarios.forEach(comentario => ComentarioModel.remove(comentario.id));
        return removido;
    });
}

module.exports = { removerAvaliacaoComAjuste, removerTutorialCompleto, removerDadosDoUsuario, executarOperacaoHibrida };
