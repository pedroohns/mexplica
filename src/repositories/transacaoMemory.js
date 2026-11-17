// Exclusivo dos MemoryRepositories: simula isolamento, rollback e cascatas nos testes.
// Nenhum estado de domínio do runtime PostgreSQL passa por este mecanismo.
let fila = Promise.resolve();

function emTransacao(tarefa, { client, colecoes = [] } = {}) {
    if (client?.memoria) return tarefa(client);
    const executar = async () => {
        const arrays = [...new Set([
            require('../data/usuarioData'), require('../data/tutorialData'),
            require('../data/comentarioData'), require('../data/avaliacaoData'), ...colecoes
        ])];
        const anteriores = arrays.map(array => structuredClone(array));
        try { return await tarefa({ memoria: true }); }
        catch (erro) {
            arrays.forEach((array, indice) => array.splice(0, array.length, ...anteriores[indice]));
            throw erro;
        }
    };
    const resultado = fila.then(executar);
    fila = resultado.catch(() => {});
    return resultado;
}

module.exports = emTransacao;
