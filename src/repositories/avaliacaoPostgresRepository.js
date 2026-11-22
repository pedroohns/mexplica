const DatabaseConnection = require('../database/databaseConnection');

function mapear(linha) {
    if (!linha) return null;
    const dataIso = valor => valor instanceof Date ? valor.toISOString() : valor;
    return { id: linha.id, tutorialId: linha.tutorial_id, avaliadorId: linha.avaliador_id, nota: Number(linha.nota),
        criadoEm: dataIso(linha.criado_em), atualizadoEm: dataIso(linha.atualizado_em) ?? null };
}

function traduzirConflito(erro) {
    if (erro.code !== '23505' || erro.constraint !== 'avaliacoes_tutorial_id_avaliador_id_key') return erro;
    const conflito = new Error('Você já avaliou este tutorial. Edite sua avaliação existente.');
    conflito.code = 'AVALIACAO_DUPLICADA';
    return conflito;
}

class AvaliacaoPostgresRepository {
    constructor(pool = null) { this.pool = pool; }
    getPool() { return this.pool || DatabaseConnection.getInstance().getPool(); }

    async emTransacao(tarefa) {
        const client = await this.getPool().connect();
        let falha;
        try {
            await client.query('BEGIN');
            const resultado = await tarefa(client);
            await client.query('COMMIT');
            return resultado;
        } catch (erro) {
            falha = erro;
            await client.query('ROLLBACK').catch(() => {});
            throw traduzirConflito(erro);
        } finally { client.release(falha); }
    }

    async #buscar(condicao, parametros, { client, bloquear = false } = {}) {
        const resultado = await (client || this.getPool()).query(
            `SELECT a.* FROM public.avaliacoes a ${condicao}${bloquear ? ' FOR UPDATE' : ''}`, parametros);
        return resultado.rows.map(mapear);
    }
    async findAll(opcoes) { return this.#buscar('ORDER BY a.id', [], opcoes); }
    async count() { return Number((await this.getPool().query('SELECT COUNT(*) AS total FROM public.avaliacoes')).rows[0].total); }
    async findById(id, opcoes) { return (await this.#buscar('WHERE a.id = $1', [id], opcoes))[0] || null; }
    async findByTutorialId(id, opcoes) { return this.#buscar('WHERE a.tutorial_id = $1 ORDER BY a.id', [id], opcoes); }
    async findByAvaliadorId(id, opcoes) { return this.#buscar('WHERE a.avaliador_id = $1 ORDER BY a.id', [id], opcoes); }
    async findByTutorialEAvaliador(tutorialId, avaliadorId, opcoes) {
        return (await this.#buscar('WHERE a.tutorial_id = $1 AND a.avaliador_id = $2', [tutorialId, avaliadorId], opcoes))[0] || null;
    }

    async create(dados, { client } = {}) {
        try {
            const resultado = await (client || this.getPool()).query(`INSERT INTO public.avaliacoes
                (tutorial_id, avaliador_id, nota, criado_em) VALUES ($1, $2, $3, $4) RETURNING *`,
            [dados.tutorialId, dados.avaliadorId, dados.nota, dados.criadoEm]);
            return mapear(resultado.rows[0]);
        } catch (erro) { throw traduzirConflito(erro); }
    }
    async update(id, dados, { client } = {}) {
        const resultado = await (client || this.getPool()).query(`UPDATE public.avaliacoes
            SET nota = $2, atualizado_em = $3 WHERE id = $1 RETURNING *`, [id, dados.nota, dados.atualizadoEm]);
        return mapear(resultado.rows[0]);
    }
    async remove(id, { client } = {}) {
        const resultado = await (client || this.getPool()).query('DELETE FROM public.avaliacoes WHERE id = $1 RETURNING *', [id]);
        return mapear(resultado.rows[0]);
    }
}

module.exports = AvaliacaoPostgresRepository;
