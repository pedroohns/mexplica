const DatabaseConnection = require('../database/databaseConnection');

const selecionarUsuario = 'SELECT u.* FROM public.usuarios u';
const camposPerfil = { nome: 'nome', sobrenome: 'sobrenome', bio: 'bio', localizacao: 'localizacao', idade: 'idade', genero: 'genero' };

function mapearUsuario(row) {
    if (!row) return null;
    return {
        id: row.id, slug: row.slug, nome: row.nome, sobrenome: row.sobrenome,
        email: row.email ?? '', telefone: row.telefone ?? '', idade: row.idade, genero: row.genero,
        colaborador: row.colaborador, pontos: row.pontos, bio: row.bio, localizacao: row.localizacao,
        disponivelAtendimento: row.disponivel_atendimento, senhaHash: row.senha_hash,
        criadoEm: row.criado_em instanceof Date ? row.criado_em.toISOString() : row.criado_em
    };
}

function traduzirConflito(erro) {
    if (erro.code !== '23505') return erro;
    if (!['usuarios_slug_key', 'usuarios_email_lower_unique', 'usuarios_telefone_key'].includes(erro.constraint)) return erro;
    const conflito = new Error('Já existe um usuário com estes dados.');
    conflito.code = erro.constraint === 'usuarios_slug_key' ? 'USUARIO_SLUG_CONFLITO' : 'USUARIO_IDENTIFICADOR_CONFLITO';
    return conflito;
}

class UsuarioPostgresRepository {
    constructor(pool = null) {
        this.pool = pool;
    }

    getPool() {
        return this.pool || DatabaseConnection.getInstance().getPool();
    }

    async #buscar(condicao, parametros, client = this.getPool()) {
        const resultado = await client.query(`${selecionarUsuario} ${condicao}`, parametros);
        return resultado.rows.map(mapearUsuario);
    }

    async findAll() { return this.#buscar('ORDER BY u.id', []); }
    async findById(id) { return (await this.#buscar('WHERE u.id = $1', [id]))[0] || null; }
    async findBySlug(slug) { return (await this.#buscar('WHERE u.slug = $1', [slug]))[0] || null; }

    async findByIdentifier(identificador) {
        const valor = String(identificador || '').trim();
        if (!valor) return null;
        return (await this.#buscar(valor.includes('@') ? 'WHERE lower(u.email) = $1' : 'WHERE u.telefone = $1',
            [valor.includes('@') ? valor.toLowerCase() : valor.replace(/\D/g, '')]))[0] || null;
    }

    async getRanking(limite, pontosMinimos) {
        return this.#buscar('WHERE u.colaborador AND u.pontos >= $1 ORDER BY u.pontos DESC, u.id LIMIT $2', [pontosMinimos, limite]);
    }

    async getPlatinaDisponiveis(pontosMinimos) {
        return this.#buscar('WHERE u.colaborador AND u.pontos >= $1 AND u.disponivel_atendimento ORDER BY u.id', [pontosMinimos]);
    }

    async #emTransacao(tarefa) {
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
        } finally {
            client.release(falha);
        }
    }

    async create(dados) {
        try {
            const resultado = await this.getPool().query(`INSERT INTO public.usuarios
                (slug, nome, sobrenome, email, telefone, idade, genero, colaborador, pontos, bio,
                 localizacao, disponivel_atendimento, senha_hash, criado_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [dados.slug, dados.nome, dados.sobrenome, dados.email || null, dados.telefone || null,
                dados.idade, dados.genero, dados.colaborador, dados.pontos, dados.bio, dados.localizacao,
                dados.disponivelAtendimento, dados.senhaHash, dados.criadoEm]);
            return mapearUsuario(resultado.rows[0]);
        } catch (erro) {
            throw traduzirConflito(erro);
        }
    }

    async update(id, alteracoes) {
        const campos = Object.keys(camposPerfil).filter(campo => Object.hasOwn(alteracoes, campo));
        if (!campos.length) return this.findById(id);
        const resultado = await this.getPool().query(
            `UPDATE public.usuarios SET ${campos.map((campo, index) => `${camposPerfil[campo]} = $${index + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
            [id, ...campos.map(campo => alteracoes[campo])]
        );
        return mapearUsuario(resultado.rows[0]);
    }

    async #ajustarPontos(client, id, delta, pontosPlatina) {
        const resultado = await client.query(`UPDATE public.usuarios
            SET pontos = GREATEST(0, pontos + $2),
                disponivel_atendimento = disponivel_atendimento AND GREATEST(0, pontos + $2) >= $3
            WHERE id = $1 AND colaborador RETURNING *`, [id, delta, pontosPlatina]);
        return resultado.rows[0] || null;
    }

    async adicionarPontos(id, delta, pontosPlatina, { client } = {}) {
        const tarefa = async executor => {
            if (!await this.#ajustarPontos(executor, id, delta, pontosPlatina)) return null;
            return (await this.#buscar('WHERE u.id = $1', [id], executor))[0];
        };
        return client ? tarefa(client) : this.#emTransacao(tarefa);
    }

    async definirDisponibilidade(id, disponivel, pontosPlatina) {
        return this.#emTransacao(async client => {
            const resultado = await client.query(`UPDATE public.usuarios SET disponivel_atendimento = $2
                WHERE id = $1 AND colaborador AND pontos >= $3 RETURNING id`, [id, disponivel, pontosPlatina]);
            if (!resultado.rows[0]) return null;
            return (await this.#buscar('WHERE u.id = $1', [id], client))[0];
        });
    }

    async remove(id, { ajustesPontos = [], pontosPlatina } = {}) {
        return this.#emTransacao(async client => {
            const bloqueado = await client.query('SELECT id FROM public.usuarios WHERE id = $1 FOR UPDATE', [id]);
            if (!bloqueado.rows[0]) return null;
            for (const ajuste of [...ajustesPontos].sort((a, b) => a.id - b.id)) {
                await this.#ajustarPontos(client, ajuste.id, ajuste.delta, pontosPlatina);
            }
            const usuario = (await this.#buscar('WHERE u.id = $1', [id], client))[0];
            await client.query('DELETE FROM public.usuarios WHERE id = $1', [id]);
            return usuario;
        });
    }
}

module.exports = UsuarioPostgresRepository;
