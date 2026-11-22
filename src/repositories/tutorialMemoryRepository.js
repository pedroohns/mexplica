const emTransacao = require('./transacaoMemory');

class TutorialMemoryRepository {
    constructor(tutoriais = require('../data/tutorialData'), { comentarios = [], avaliacoes = [] } = {}) {
        this.tutoriais = tutoriais;
        this.comentarios = comentarios;
        this.avaliacoes = avaliacoes;
    }

    async findAll({ ordem = 'data' } = {}) {
        const lista = [...this.tutoriais];
        return ordem === 'id' ? lista : lista.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    }
    async findById(id) { return this.tutoriais.find(tutorial => tutorial.id === Number(id)) || null; }
    async count() { return this.tutoriais.length; }
    async listarParaModeracao() {
        return (await this.findAll()).map(({ id, slug, autorId, categoriaId, titulo, visualizacoes, criadoEm }) =>
            ({ id, slug, autorId, categoriaId, titulo, visualizacoes, criadoEm }));
    }
    async findBySlug(slug) { return this.tutoriais.find(tutorial => tutorial.slug === slug) || null; }
    async findByAutorId(id) {
        return this.tutoriais.filter(tutorial => tutorial.autorId === Number(id))
            .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    }

    async create(dados) {
        if (this.tutoriais.some(tutorial => tutorial.slug === dados.slug)) {
            const erro = new Error('Endereço de tutorial já utilizado.');
            erro.code = 'TUTORIAL_SLUG_CONFLITO';
            throw erro;
        }
        const tutorial = { ...dados, id: Math.max(0, ...this.tutoriais.map(item => item.id)) + 1 };
        this.tutoriais.push(tutorial);
        return tutorial;
    }

    async update(id, alteracoes) {
        const tutorial = await this.findById(id);
        if (!tutorial) return null;
        const campos = ['titulo', 'resumo', 'conteudo', 'categoriaId', 'passos', 'imagens', 'videoUrl', 'tags', 'atualizadoEm'];
        for (const campo of campos) if (Object.hasOwn(alteracoes, campo)) tutorial[campo] = alteracoes[campo];
        return tutorial;
    }

    async incrementarVisualizacao(id) {
        const tutorial = await this.findById(id);
        if (tutorial) tutorial.visualizacoes++;
        return tutorial;
    }

    async remove(id, { antesDeRemover } = {}) {
        return emTransacao(async client => {
            const tutorial = await this.findById(id);
            if (!tutorial) return null;
            if (antesDeRemover) await antesDeRemover(tutorial, client);
            for (const colecao of [this.comentarios, this.avaliacoes]) {
                for (let indice = colecao.length - 1; indice >= 0; indice--) {
                    if (colecao[indice].tutorialId === tutorial.id) colecao.splice(indice, 1);
                }
            }
            this.tutoriais.splice(this.tutoriais.indexOf(tutorial), 1);
            return tutorial;
        }, { colecoes: [this.tutoriais, this.comentarios, this.avaliacoes] });
    }
}

module.exports = TutorialMemoryRepository;
