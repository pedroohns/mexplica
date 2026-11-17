function conflito(codigo) {
    const erro = new Error('Conflito de usuário.');
    erro.code = codigo;
    return erro;
}

class UsuarioMemoryRepository {
    constructor(usuarios = require('../data/usuarioData'), tutoriais = []) {
        this.usuarios = usuarios;
        this.tutoriais = tutoriais;
    }

    async findAll() { return this.usuarios; }
    async findById(id) { return this.usuarios.find(usuario => usuario.id === Number(id)) || null; }
    async findBySlug(slug) { return this.usuarios.find(usuario => usuario.slug === slug) || null; }

    async findByIdentifier(identificador) {
        const valor = String(identificador || '').trim();
        if (!valor) return null;
        return this.usuarios.find(usuario => valor.includes('@')
            ? usuario.email.toLowerCase() === valor.toLowerCase()
            : usuario.telefone.replace(/\D/g, '') === valor.replace(/\D/g, '')) || null;
    }

    async getRanking(limite, pontosMinimos) {
        return this.usuarios.filter(usuario => usuario.colaborador && usuario.pontos >= pontosMinimos)
            .sort((a, b) => b.pontos - a.pontos || a.id - b.id).slice(0, limite);
    }

    async getPlatinaDisponiveis(pontosMinimos) {
        return this.usuarios.filter(usuario => usuario.colaborador && usuario.pontos >= pontosMinimos && usuario.disponivelAtendimento);
    }

    async create(dados) {
        // Sem await entre a validação e o push: simula as UNIQUEs de forma atômica no processo.
        if (this.usuarios.some(usuario => usuario.slug === dados.slug)) throw conflito('USUARIO_SLUG_CONFLITO');
        if (this.usuarios.some(usuario =>
            (dados.email && usuario.email.toLowerCase() === dados.email.toLowerCase()) ||
            (dados.telefone && usuario.telefone.replace(/\D/g, '') === dados.telefone))) {
            throw conflito('USUARIO_IDENTIFICADOR_CONFLITO');
        }
        const campos = ['slug', 'nome', 'sobrenome', 'email', 'telefone', 'idade', 'genero', 'colaborador',
            'pontos', 'bio', 'localizacao', 'disponivelAtendimento', 'senhaHash', 'criadoEm'];
        const usuario = {
            ...Object.fromEntries(campos.map(campo => [campo, dados[campo]])),
            id: Math.max(0, ...this.usuarios.map(item => item.id)) + 1
        };
        this.usuarios.push(usuario);
        return usuario;
    }

    async update(id, alteracoes) {
        const usuario = await this.findById(id);
        if (!usuario) return null;
        for (const campo of ['nome', 'sobrenome', 'bio', 'localizacao', 'idade', 'genero']) {
            if (Object.hasOwn(alteracoes, campo)) usuario[campo] = alteracoes[campo];
        }
        return usuario;
    }

    async adicionarPontos(id, delta, pontosPlatina) {
        const usuario = await this.findById(id);
        if (!usuario?.colaborador) return null;
        usuario.pontos = Math.max(0, usuario.pontos + delta);
        if (usuario.pontos < pontosPlatina) usuario.disponivelAtendimento = false;
        return usuario;
    }

    async definirDisponibilidade(id, disponivel, pontosPlatina) {
        const usuario = await this.findById(id);
        if (!usuario?.colaborador || usuario.pontos < pontosPlatina) return null;
        usuario.disponivelAtendimento = disponivel;
        return usuario;
    }

    async remove(id, { ajustesPontos = [], pontosPlatina } = {}) {
        const usuario = await this.findById(id);
        if (!usuario) return null;
        for (const ajuste of ajustesPontos) await this.adicionarPontos(ajuste.id, ajuste.delta, pontosPlatina);
        // Simula a FK usuarios → tutoriais dos Repositories PostgreSQL nos testes.
        for (let indice = this.tutoriais.length - 1; indice >= 0; indice--) {
            if (this.tutoriais[indice].autorId === usuario.id) this.tutoriais.splice(indice, 1);
        }
        this.usuarios.splice(this.usuarios.indexOf(usuario), 1);
        return usuario;
    }
}

module.exports = UsuarioMemoryRepository;
