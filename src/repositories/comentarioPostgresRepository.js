const DatabaseConnection = require('../database/databaseConnection');

function mapear(linha) {
    if (!linha) return null;
    const dataIso = valor => valor instanceof Date ? valor.toISOString() : valor;
    return { id: linha.id, tutorialId: linha.tutorial_id, usuarioId: linha.usuario_id, texto: linha.texto,
        criadoEm: dataIso(linha.criado_em), atualizadoEm: dataIso(linha.atualizado_em) ?? null };
}

class ComentarioPostgresRepository {
    constructor(pool = null) { this.pool = pool; }
    getPool() { return this.pool || DatabaseConnection.getInstance().getPool(); }

    async #buscar(condicao, parametros, { client } = {}) {
        const resultado = await (client || this.getPool()).query(`SELECT c.* FROM public.comentarios c ${condicao}`, parametros);
        return resultado.rows.map(mapear);
    }
    async findAll(opcoes) { return this.#buscar('ORDER BY c.id', [], opcoes); }
    async count() { return Number((await this.getPool().query('SELECT COUNT(*) AS total FROM public.comentarios')).rows[0].total); }
    async findById(id, opcoes) { return (await this.#buscar('WHERE c.id = $1', [id], opcoes))[0] || null; }
    async findByTutorialId(id, opcoes) { return this.#buscar('WHERE c.tutorial_id = $1 ORDER BY c.criado_em, c.id', [id], opcoes); }
    async findByUserId(id, opcoes) { return this.#buscar('WHERE c.usuario_id = $1 ORDER BY c.id', [id], opcoes); }

    async create(dados, { client } = {}) {
        const resultado = await (client || this.getPool()).query(`INSERT INTO public.comentarios
            (tutorial_id, usuario_id, texto, criado_em) VALUES ($1, $2, $3, $4) RETURNING *`,
        [dados.tutorialId, dados.usuarioId, dados.texto, dados.criadoEm]);
        return mapear(resultado.rows[0]);
    }
    async update(id, dados, { client } = {}) {
        const resultado = await (client || this.getPool()).query(`UPDATE public.comentarios
            SET texto = $2, atualizado_em = $3 WHERE id = $1 RETURNING *`, [id, dados.texto, dados.atualizadoEm]);
        return mapear(resultado.rows[0]);
    }
    async remove(id, { client } = {}) {
        const resultado = await (client || this.getPool()).query('DELETE FROM public.comentarios WHERE id = $1 RETURNING *', [id]);
        return mapear(resultado.rows[0]);
    }
}

module.exports = ComentarioPostgresRepository;
