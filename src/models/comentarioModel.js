const repository = require('../repositories/repositoryFactory').criarComentarioRepository();

function idValido(id) { return Number.isSafeInteger(Number(id)) && Number(id) > 0; }

async function findAll(opcoes) { return repository.findAll(opcoes); }
async function findById(id, opcoes) { return idValido(id) ? repository.findById(Number(id), opcoes) : null; }
async function findByTutorialId(id, opcoes) { return idValido(id) ? repository.findByTutorialId(Number(id), opcoes) : []; }
async function findByUserId(id, opcoes) { return idValido(id) ? repository.findByUserId(Number(id), opcoes) : []; }

async function create(dados, opcoes) {
    return repository.create({ tutorialId: Number(dados.tutorialId), usuarioId: Number(dados.usuarioId),
        texto: dados.texto, criadoEm: new Date().toISOString(), atualizadoEm: null }, opcoes);
}
async function update(id, texto, opcoes) {
    return idValido(id) ? repository.update(Number(id), { texto, atualizadoEm: new Date().toISOString() }, opcoes) : null;
}
async function remove(id, opcoes) { return idValido(id) ? repository.remove(Number(id), opcoes) : null; }

module.exports = { findAll, findById, findByTutorialId, findByUserId, create, update, remove };
