const AvaliacaoModel = require('../models/avaliacaoModel');
const TutorialModel = require('../models/tutorialModel');
const {
    criarAvaliacaoComPontos, atualizarAvaliacaoComPontos, removerAvaliacaoComAjuste
} = require('../services/relacionamentoService');

function validarNota(nota) {
    const numero = Number(nota);
    return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : null;
}

async function listarPorTutorial(req, res) {
    const tutorial = await TutorialModel.findById(req.params.tutorialId);
    if (!tutorial) return res.status(404).json({ erro: 'Tutorial não encontrado.' });
    return res.json({ tutorialId: tutorial.id, ...await AvaliacaoModel.resumoDoTutorial(tutorial.id) });
}

async function criar(req, res) {
    const tutorial = await TutorialModel.findById(req.params.tutorialId);
    if (!tutorial) return res.status(404).json({ erro: 'Tutorial não encontrado.' });
    if (tutorial.autorId === req.usuario.id) {
        return res.status(403).json({ erro: 'Você não pode avaliar o próprio tutorial.' });
    }
    const existente = await AvaliacaoModel.findByTutorialEAvaliador(tutorial.id, req.usuario.id);
    if (existente) {
        return res.status(409).json({ erro: 'Você já avaliou este tutorial. Edite sua avaliação existente.' });
    }
    const nota = validarNota(req.body.nota);
    if (!nota) return res.status(400).json({ erro: 'A avaliação deve ser uma nota inteira de 1 a 5.' });
    const resultado = await criarAvaliacaoComPontos(tutorial.id, req.usuario.id, nota);
    return res.status(201).json({ mensagem: 'Avaliação registrada com sucesso.', ...resultado });
}

async function atualizar(req, res) {
    const avaliacao = await AvaliacaoModel.findById(req.params.id);
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
    if (avaliacao.avaliadorId !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode editar a própria avaliação.' });
    }
    const nota = validarNota(req.body.nota);
    if (!nota) return res.status(400).json({ erro: 'A avaliação deve ser uma nota inteira de 1 a 5.' });
    const tutorial = await TutorialModel.findById(avaliacao.tutorialId);
    if (!tutorial) return res.status(404).json({ erro: 'O tutorial relacionado não foi encontrado.' });
    const resultado = await atualizarAvaliacaoComPontos(avaliacao.id, nota, { avaliadorId: req.usuario.id });
    return res.json({ mensagem: 'Avaliação atualizada com sucesso.', ...resultado });
}

async function excluir(req, res) {
    const avaliacao = await AvaliacaoModel.findById(req.params.id);
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
    if (avaliacao.avaliadorId !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode excluir a própria avaliação.' });
    }
    await removerAvaliacaoComAjuste(avaliacao.id, { avaliadorId: req.usuario.id });
    return res.json({ mensagem: 'Avaliação removida com sucesso.' });
}

module.exports = { listarPorTutorial, criar, atualizar, excluir };
