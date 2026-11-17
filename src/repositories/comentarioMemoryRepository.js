class ComentarioMemoryRepository {
    constructor(comentarios = require('../data/comentarioData')) { this.comentarios = comentarios; }
    async findAll() { return this.comentarios; }
    async findById(id) { return this.comentarios.find(item => item.id === Number(id)) || null; }
    async findByTutorialId(id) {
        return this.comentarios.filter(item => item.tutorialId === Number(id))
            .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm) || a.id - b.id);
    }
    async findByUserId(id) { return this.comentarios.filter(item => item.usuarioId === Number(id)); }
    async create(dados) {
        const comentario = { ...dados, id: Math.max(0, ...this.comentarios.map(item => item.id)) + 1 };
        this.comentarios.push(comentario);
        return comentario;
    }
    async update(id, dados) {
        const comentario = await this.findById(id);
        if (!comentario) return null;
        comentario.texto = dados.texto;
        comentario.atualizadoEm = dados.atualizadoEm;
        return comentario;
    }
    async remove(id) {
        const indice = this.comentarios.findIndex(item => item.id === Number(id));
        return indice < 0 ? null : this.comentarios.splice(indice, 1)[0];
    }
}

module.exports = ComentarioMemoryRepository;
