const repository = require('../repositories/repositoryFactory').criarAvaliacaoRepository();

function idValido(id) { return Number.isSafeInteger(Number(id)) && Number(id) > 0 && Number(id) <= 2147483647; }

function pontosPorNota(nota) { return Number(nota) * 10; }
async function findAll(opcoes) { return repository.findAll(opcoes); }
async function count() { return repository.count(); }
async function findById(id, opcoes) { return idValido(id) ? repository.findById(Number(id), opcoes) : null; }
async function findByTutorialId(id, opcoes) { return idValido(id) ? repository.findByTutorialId(Number(id), opcoes) : []; }
async function findByAvaliadorId(id, opcoes) { return idValido(id) ? repository.findByAvaliadorId(Number(id), opcoes) : []; }
async function findByTutorialEAvaliador(tutorialId, avaliadorId, opcoes) {
    return idValido(tutorialId) && idValido(avaliadorId)
        ? repository.findByTutorialEAvaliador(Number(tutorialId), Number(avaliadorId), opcoes) : null;
}
async function resumoDoTutorial(tutorialId, opcoes) {
    const lista = await findByTutorialId(tutorialId, opcoes);
    return { media: lista.length ? Number((lista.reduce((soma, item) => soma + item.nota, 0) / lista.length).toFixed(1)) : 0,
        quantidade: lista.length };
}
async function create(dados, opcoes) {
    return repository.create({ tutorialId: Number(dados.tutorialId), avaliadorId: Number(dados.avaliadorId),
        nota: Number(dados.nota), criadoEm: new Date().toISOString(), atualizadoEm: null }, opcoes);
}
async function update(id, nota, opcoes) {
    return idValido(id) ? repository.update(Number(id), { nota: Number(nota), atualizadoEm: new Date().toISOString() }, opcoes) : null;
}
async function remove(id, opcoes) { return idValido(id) ? repository.remove(Number(id), opcoes) : null; }
async function emTransacao(tarefa) { return repository.emTransacao(tarefa); }

module.exports = { pontosPorNota, findAll, count, findById, findByTutorialId, findByAvaliadorId,
    findByTutorialEAvaliador, resumoDoTutorial, create, update, remove, emTransacao };
