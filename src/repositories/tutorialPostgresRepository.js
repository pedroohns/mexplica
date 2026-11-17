const DatabaseConnection = require('../database/databaseConnection');

function agrupar(linhas) {
    const grupos = new Map();
    for (const linha of linhas) {
        if (!grupos.has(linha.tutorial_id)) grupos.set(linha.tutorial_id, []);
        grupos.get(linha.tutorial_id).push(linha);
    }
    return grupos;
}

function hidratar(linhas, linhasPassos, linhasTags) {
    const passosPorTutorial = agrupar(linhasPassos);
    const tagsPorTutorial = agrupar(linhasTags);
    const dataIso = valor => valor instanceof Date ? valor.toISOString() : valor;
    return linhas.map(linha => {
        const passos = (passosPorTutorial.get(linha.id) || []).sort((a, b) => a.ordem - b.ordem).map(passo => ({
            ordem: passo.ordem, titulo: passo.titulo, descricao: passo.descricao,
            imagem: passo.imagem_url ? { url: passo.imagem_url, alt: passo.imagem_alt, legenda: passo.imagem_legenda || '' } : null,
            linkExterno: passo.link_url ? { url: passo.link_url, texto: passo.link_texto } : null
        }));
        return {
            id: linha.id, slug: linha.slug, autorId: linha.autor_id, categoriaId: linha.categoria_id,
            titulo: linha.titulo, resumo: linha.resumo, conteudo: linha.conteudo,
            passos, imagens: passos.filter(passo => passo.imagem).map(passo => ({ ordem: passo.ordem, ...passo.imagem })),
            videoUrl: linha.video_url || '', tags: [...new Set((tagsPorTutorial.get(linha.id) || []).map(item => item.tag))],
            visualizacoes: linha.visualizacoes, criadoEm: dataIso(linha.criado_em), atualizadoEm: dataIso(linha.atualizado_em) ?? null
        };
    });
}

function traduzirConflito(erro) {
    if (erro.code !== '23505' || erro.constraint !== 'tutoriais_slug_key') return erro;
    const conflito = new Error('Não foi possível reservar o endereço do tutorial.');
    conflito.code = 'TUTORIAL_SLUG_CONFLITO';
    return conflito;
}

class TutorialPostgresRepository {
    constructor(pool = null) { this.pool = pool; }

    getPool() { return this.pool || DatabaseConnection.getInstance().getPool(); }

    async #hidratar(linhas, executor) {
        if (!linhas.length) return [];
        const ids = linhas.map(linha => linha.id);
        const [passos, tags] = await Promise.all([
            executor.query('SELECT * FROM public.tutorial_passos WHERE tutorial_id = ANY($1::integer[]) ORDER BY tutorial_id, ordem', [ids]),
            executor.query('SELECT tutorial_id, tag FROM public.tutorial_tags WHERE tutorial_id = ANY($1::integer[]) ORDER BY tutorial_id, tag', [ids])
        ]);
        return hidratar(linhas, passos.rows, tags.rows);
    }

    async #buscar(condicao, parametros, executor = this.getPool()) {
        const resultado = await executor.query(`SELECT t.* FROM public.tutoriais t ${condicao}`, parametros);
        return this.#hidratar(resultado.rows, executor);
    }

    async findAll({ ordem = 'data', client } = {}) {
        return this.#buscar(ordem === 'id' ? 'ORDER BY t.id' : 'ORDER BY t.criado_em DESC, t.id', [], client);
    }
    async findById(id, { client, bloquear = false } = {}) {
        return (await this.#buscar(`WHERE t.id = $1${bloquear ? ' FOR UPDATE' : ''}`, [id], client))[0] || null;
    }
    async findBySlug(slug) { return (await this.#buscar('WHERE t.slug = $1', [slug]))[0] || null; }
    async findByAutorId(autorId) { return this.#buscar('WHERE t.autor_id = $1 ORDER BY t.criado_em DESC, t.id', [autorId]); }

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

    async #inserirPassos(client, tutorialId, dados) {
        for (const [indice, passo] of dados.passos.entries()) {
            const ordem = indice + 1;
            const imagem = Object.hasOwn(passo, 'imagem') ? passo.imagem
                : (dados.imagens || []).find((item, i) => (item.ordem || i + 1) === (passo.ordem || ordem));
            await client.query(`INSERT INTO public.tutorial_passos
                (tutorial_id, ordem, titulo, descricao, imagem_url, imagem_alt, imagem_legenda, link_url, link_texto)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [tutorialId, ordem, passo.titulo, passo.descricao, imagem?.url || null,
                imagem ? imagem.alt || `Imagem do passo ${ordem}` : null, imagem?.legenda || null,
                passo.linkExterno?.url || null, passo.linkExterno?.texto || null]);
        }
    }

    async #inserirTags(client, tutorialId, tags) {
        for (const tag of new Set(tags)) {
            await client.query('INSERT INTO public.tutorial_tags (tutorial_id, tag) VALUES ($1, $2)', [tutorialId, tag]);
        }
    }

    async create(dados) {
        return this.#emTransacao(async client => {
            const resultado = await client.query(`INSERT INTO public.tutoriais
                (slug, autor_id, categoria_id, titulo, resumo, conteudo, video_url, visualizacoes, criado_em)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [dados.slug, dados.autorId, dados.categoriaId, dados.titulo, dados.resumo, dados.conteudo,
                dados.videoUrl || null, dados.visualizacoes, dados.criadoEm]);
            const linha = resultado.rows[0];
            await this.#inserirPassos(client, linha.id, dados);
            await this.#inserirTags(client, linha.id, dados.tags);
            return (await this.#hidratar([linha], client))[0];
        });
    }

    async update(id, alteracoes) {
        return this.#emTransacao(async client => {
            const existente = await client.query('SELECT id FROM public.tutoriais WHERE id = $1 FOR UPDATE', [id]);
            if (!existente.rows[0]) return null;
            const colunas = { titulo: 'titulo', resumo: 'resumo', conteudo: 'conteudo', categoriaId: 'categoria_id', videoUrl: 'video_url', atualizadoEm: 'atualizado_em' };
            const campos = Object.keys(colunas).filter(campo => Object.hasOwn(alteracoes, campo));
            if (campos.length) {
                await client.query(`UPDATE public.tutoriais SET ${campos.map((campo, indice) => `${colunas[campo]} = $${indice + 2}`).join(', ')} WHERE id = $1`,
                    [id, ...campos.map(campo => campo === 'videoUrl' ? alteracoes[campo] || null : alteracoes[campo])]);
            }
            if (Array.isArray(alteracoes.passos)) {
                await client.query('DELETE FROM public.tutorial_passos WHERE tutorial_id = $1', [id]);
                await this.#inserirPassos(client, id, alteracoes);
            }
            if (Array.isArray(alteracoes.tags)) {
                await client.query('DELETE FROM public.tutorial_tags WHERE tutorial_id = $1', [id]);
                await this.#inserirTags(client, id, alteracoes.tags);
            }
            return (await this.#buscar('WHERE t.id = $1', [id], client))[0];
        });
    }

    async incrementarVisualizacao(id) {
        const pool = this.getPool();
        const resultado = await pool.query('UPDATE public.tutoriais SET visualizacoes = visualizacoes + 1 WHERE id = $1 RETURNING *', [id]);
        return (await this.#hidratar(resultado.rows, pool))[0] || null;
    }

    async remove(id, { antesDeRemover } = {}) {
        return this.#emTransacao(async client => {
            const bloqueado = await client.query('SELECT id FROM public.tutoriais WHERE id = $1 FOR UPDATE', [id]);
            if (!bloqueado.rows[0]) return null;
            const tutorial = (await this.#buscar('WHERE t.id = $1', [id], client))[0];
            // A composição de pontos fica no Service; ambos os Repositories usam este client.
            if (antesDeRemover) await antesDeRemover(tutorial, client);
            await client.query('DELETE FROM public.tutoriais WHERE id = $1', [id]);
            return tutorial;
        });
    }
}

module.exports = TutorialPostgresRepository;
