const UsuarioModel = require('../models/usuarioModel');
const TutorialModel = require('../models/tutorialModel');
const ComentarioModel = require('../models/comentarioModel');
const AvaliacaoModel = require('../models/avaliacaoModel');

// Tempor?rio: serializa muta??es entre arrays deste processo e pontos no PG.
// N?o representa uma transa??o distribu?da entre inst?ncias serverless.
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
        const tutorial = TutorialModel.findById(avaliacao.tutorialId);
        if (tutorial) await UsuarioModel.adicionarPontos(tutorial.autorId, -AvaliacaoModel.pontosPorNota(avaliacao.nota));
        // S? altera o array depois que a altera??o persistente foi confirmada.
        return AvaliacaoModel.remove(avaliacao.id);
    });
}

function removerTutorialCompleto(tutorialId) {
    return executarOperacaoHibrida(async () => {
        const tutorial = TutorialModel.findById(tutorialId);
        if (!tutorial) return null;
        const avaliacoes = AvaliacaoModel.findByTutorialId(tutorial.id);
        const pontos = avaliacoes.reduce((total, avaliacao) => total + AvaliacaoModel.pontosPorNota(avaliacao.nota), 0);
        if (pontos) await UsuarioModel.adicionarPontos(tutorial.autorId, -pontos);
        avaliacoes.forEach(avaliacao => AvaliacaoModel.remove(avaliacao.id));
        ComentarioModel.findByTutorialId(tutorial.id).forEach(comentario => ComentarioModel.remove(comentario.id));
        return TutorialModel.remove(tutorial.id);
    });
}

function removerDadosDoUsuario(usuarioId) {
    return executarOperacaoHibrida(async () => {
        const id = Number(usuarioId);
        const tutoriais = TutorialModel.findByAutorId(id);
        const idsTutoriais = new Set(tutoriais.map(tutorial => tutorial.id));
        const avaliacoes = AvaliacaoModel.findAll().filter(avaliacao =>
            avaliacao.avaliadorId === id || idsTutoriais.has(avaliacao.tutorialId));
        const comentarios = ComentarioModel.findAll().filter(comentario =>
            comentario.usuarioId === id || idsTutoriais.has(comentario.tutorialId));
        const pontosPorAutor = new Map();
        for (const avaliacao of avaliacoes) {
            const tutorial = TutorialModel.findById(avaliacao.tutorialId);
            if (tutorial) pontosPorAutor.set(tutorial.autorId,
                (pontosPorAutor.get(tutorial.autorId) || 0) - AvaliacaoModel.pontosPorNota(avaliacao.nota));
        }

        // Uma transa??o PG cobre pontos e usu?rio; cascatas cuidam do seed persistido.
        const removido = await UsuarioModel.remove(id, {
            ajustesPontos: [...pontosPorAutor].map(([autorId, delta]) => ({ id: autorId, delta }))
        });
        if (!removido) return null;

        // Sem await: os arrays s? s?o limpos ap?s o commit, sem estado parcial.
        avaliacoes.forEach(avaliacao => AvaliacaoModel.remove(avaliacao.id));
        comentarios.forEach(comentario => ComentarioModel.remove(comentario.id));
        tutoriais.forEach(tutorial => TutorialModel.remove(tutorial.id));
        return removido;
    });
}

module.exports = { removerAvaliacaoComAjuste, removerTutorialCompleto, removerDadosDoUsuario, executarOperacaoHibrida };
