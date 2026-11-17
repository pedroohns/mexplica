const emTransacao = require('./transacaoMemory');

class AvaliacaoMemoryRepository {
    constructor(avaliacoes = require('../data/avaliacaoData')) { this.avaliacoes = avaliacoes; }
    emTransacao(tarefa) { return emTransacao(tarefa, { colecoes: [this.avaliacoes] }); }
    async findAll() { return this.avaliacoes; }
    async findById(id) { return this.avaliacoes.find(item => item.id === Number(id)) || null; }
    async findByTutorialId(id) { return this.avaliacoes.filter(item => item.tutorialId === Number(id)); }
    async findByAvaliadorId(id) { return this.avaliacoes.filter(item => item.avaliadorId === Number(id)); }
    async findByTutorialEAvaliador(tutorialId, avaliadorId) {
        return this.avaliacoes.find(item => item.tutorialId === Number(tutorialId) && item.avaliadorId === Number(avaliadorId)) || null;
    }
    async create(dados) {
        if (this.avaliacoes.some(item => item.tutorialId === dados.tutorialId && item.avaliadorId === dados.avaliadorId)) {
            const erro = new Error('Você já avaliou este tutorial. Edite sua avaliação existente.');
            erro.code = 'AVALIACAO_DUPLICADA';
            throw erro;
        }
        const avaliacao = { ...dados, id: Math.max(0, ...this.avaliacoes.map(item => item.id)) + 1 };
        this.avaliacoes.push(avaliacao);
        return avaliacao;
    }
    async update(id, dados) {
        const avaliacao = await this.findById(id);
        if (!avaliacao) return null;
        avaliacao.nota = dados.nota;
        avaliacao.atualizadoEm = dados.atualizadoEm;
        return avaliacao;
    }
    async remove(id) {
        const indice = this.avaliacoes.findIndex(item => item.id === Number(id));
        return indice < 0 ? null : this.avaliacoes.splice(indice, 1)[0];
    }
}

module.exports = AvaliacaoMemoryRepository;
