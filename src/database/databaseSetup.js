const { readFile } = require('node:fs/promises');
const path = require('node:path');

// Identificadores SQL são definidos pelo projeto, nunca pelos dados importados.
const tabelas = [
    { nome: 'categorias', colunas: ['id', 'nome'], chave: ['id'] },
    {
        nome: 'usuarios', chave: ['id'], identidade: ['slug'],
        colunas: ['id', 'slug', 'nome', 'sobrenome', 'email', 'telefone', 'idade', 'genero',
            'colaborador', 'pontos', 'bio', 'localizacao', 'disponivel_atendimento', 'senha_hash', 'criado_em']
    },
    { nome: 'usuario_especialidades', colunas: ['usuario_id', 'especialidade'], chave: ['usuario_id', 'especialidade'], pai: 'usuarios', campoPai: 'usuario_id' },
    {
        nome: 'tutoriais', chave: ['id'], identidade: ['slug'],
        colunas: ['id', 'slug', 'autor_id', 'categoria_id', 'titulo', 'resumo', 'conteudo',
            'video_url', 'visualizacoes', 'criado_em', 'atualizado_em']
    },
    {
        nome: 'tutorial_passos', chave: ['tutorial_id', 'ordem'], pai: 'tutoriais', campoPai: 'tutorial_id',
        colunas: ['tutorial_id', 'ordem', 'titulo', 'descricao', 'imagem_url', 'imagem_alt', 'imagem_legenda', 'link_url', 'link_texto']
    },
    { nome: 'tutorial_tags', colunas: ['tutorial_id', 'tag'], chave: ['tutorial_id', 'tag'], pai: 'tutoriais', campoPai: 'tutorial_id' },
    {
        nome: 'comentarios', chave: ['id'], identidade: ['tutorial_id', 'usuario_id'],
        colunas: ['id', 'tutorial_id', 'usuario_id', 'texto', 'criado_em', 'atualizado_em']
    },
    {
        nome: 'avaliacoes', chave: ['id'], identidade: ['tutorial_id', 'avaliador_id'],
        colunas: ['id', 'tutorial_id', 'avaliador_id', 'nota', 'criado_em', 'atualizado_em']
    }
];
const tabelasIdentity = ['usuarios', 'tutoriais', 'tutorial_passos', 'comentarios', 'avaliacoes'];

async function emTransacao(pool, tarefa, inicio = 'BEGIN') {
    const client = await pool.connect();
    let falha;
    try {
        await client.query(inicio);
        const resultado = await tarefa(client);
        await client.query('COMMIT');
        return resultado;
    } catch (erro) {
        falha = erro;
        await client.query('ROLLBACK').catch(() => {});
        throw erro;
    } finally {
        // Descarta o cliente em caso de falha, inclusive se o ROLLBACK não responder.
        client.release(falha);
    }
}

async function aplicarSchema(pool) {
    const sql = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');
    await emTransacao(pool, client => client.query(sql));
}

async function inserirRegistro(client, tabela, registro) {
    const parametros = tabela.colunas.map((_, index) => `$${index + 1}`).join(', ');
    const resultado = await client.query(
        `INSERT INTO public.${tabela.nome} (${tabela.colunas.join(', ')}) VALUES (${parametros})
         ON CONFLICT (${tabela.chave.join(', ')}) DO NOTHING RETURNING 1 AS inserido`,
        tabela.colunas.map(coluna => registro[coluna])
    );

    if (!resultado.rowCount && tabela.identidade) {
        const existente = await client.query(
            `SELECT ${tabela.identidade.join(', ')} FROM public.${tabela.nome} WHERE id = $1`,
            [registro.id]
        );
        if (!existente.rows[0] || tabela.identidade.some(coluna => existente.rows[0][coluna] !== registro[coluna])) {
            throw new Error(`Conflito de identidade histórica em ${tabela.nome}. Seed cancelado.`);
        }
    }

    return resultado.rowCount > 0;
}

async function inserirSeed(pool, dados) {
    return emTransacao(pool, async client => {
        // Serializa o seed e mantém MAX(id) estável durante o ajuste das identities.
        await client.query(`LOCK TABLE ${tabelas.map(tabela => `public.${tabela.nome}`).join(', ')} IN SHARE ROW EXCLUSIVE MODE`);
        const novos = {};
        const inseridos = {};

        for (const tabela of tabelas) {
            novos[tabela.nome] = new Set();
            inseridos[tabela.nome] = 0;
            for (const registro of dados[tabela.nome]) {
                // Não restaura coleções que alguém editou/removeu em pais já existentes.
                if (tabela.pai && !novos[tabela.pai].has(registro[tabela.campoPai])) continue;
                if (await inserirRegistro(client, tabela, registro)) {
                    inseridos[tabela.nome]++;
                    if (registro.id !== undefined) novos[tabela.nome].add(registro.id);
                }
            }
        }

        for (const tabela of tabelasIdentity) {
            // Os IDs são calculados em SQL; pg_get_serial_sequence também atende identity.
            // setval não é transacional: fica por último e nunca fica abaixo do MAX(id).
            await client.query(
                `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.${tabela}`,
                [`public.${tabela}`]
            );
        }

        return inseridos;
    });
}

async function verificarBanco(pool, dadosEsperados) {
    return emTransacao(pool, async client => {
        const nomes = tabelas.map(tabela => tabela.nome);
        const existentes = await client.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = ANY($1::text[])`,
            [nomes]
        );
        if (existentes.rows.length !== nomes.length) throw new Error('Schema incompleto. Execute db:schema.');

        const contagens = {};
        for (const tabela of tabelas) {
            const resultado = await client.query(`SELECT COUNT(*)::integer AS total FROM public.${tabela.nome}`);
            contagens[tabela.nome] = resultado.rows[0].total;
            if (contagens[tabela.nome] < dadosEsperados[tabela.nome].length) {
                throw new Error(`Dados demonstrativos incompletos em ${tabela.nome}.`);
            }

            if (tabela.chave.length === 1) {
                const ids = dadosEsperados[tabela.nome].map(registro => registro.id);
                const tipo = tabela.nome === 'categorias' ? 'text' : 'integer';
                const presentes = await client.query(
                    `SELECT COUNT(*)::integer AS total FROM public.${tabela.nome} WHERE id = ANY($1::${tipo}[])`, [ids]
                );
                if (presentes.rows[0].total !== ids.length) throw new Error(`IDs demonstrativos ausentes em ${tabela.nome}.`);
            }
        }

        const chaves = await client.query(
            `SELECT COUNT(*) FILTER (WHERE c.contype = 'p')::integer AS pks,
                    COUNT(*) FILTER (WHERE c.contype = 'f')::integer AS fks
             FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
             JOIN pg_namespace n ON n.oid = t.relnamespace
             WHERE n.nspname = 'public' AND t.relname = ANY($1::text[])`, [nomes]
        );
        if (chaves.rows[0].pks !== 8 || chaves.rows[0].fks < 9) throw new Error('PKs/FKs esperadas não encontradas.');

        const orfaos = await client.query(`
            SELECT COUNT(*)::integer AS total FROM (
                SELECT 1 FROM public.tutoriais t LEFT JOIN public.usuarios u ON u.id = t.autor_id
                    LEFT JOIN public.categorias c ON c.id = t.categoria_id WHERE u.id IS NULL OR c.id IS NULL
                UNION ALL SELECT 1 FROM public.comentarios c LEFT JOIN public.usuarios u ON u.id = c.usuario_id
                    LEFT JOIN public.tutoriais t ON t.id = c.tutorial_id WHERE u.id IS NULL OR t.id IS NULL
                UNION ALL SELECT 1 FROM public.avaliacoes a LEFT JOIN public.usuarios u ON u.id = a.avaliador_id
                    LEFT JOIN public.tutoriais t ON t.id = a.tutorial_id WHERE u.id IS NULL OR t.id IS NULL
                UNION ALL SELECT 1 FROM public.tutorial_passos p LEFT JOIN public.tutoriais t ON t.id = p.tutorial_id WHERE t.id IS NULL
                UNION ALL SELECT 1 FROM public.tutorial_tags g LEFT JOIN public.tutoriais t ON t.id = g.tutorial_id WHERE t.id IS NULL
                UNION ALL SELECT 1 FROM public.usuario_especialidades e LEFT JOIN public.usuarios u ON u.id = e.usuario_id WHERE u.id IS NULL
            ) AS dependencias_orfas`);
        if (orfaos.rows[0].total !== 0) throw new Error('Integridade referencial inválida.');

        const proximosIds = {};
        for (const tabela of tabelasIdentity) {
            const resultado = await client.query('SELECT pg_get_serial_sequence($1, $2) AS sequencia', [`public.${tabela}`, 'id']);
            const sequencia = resultado.rows[0].sequencia;
            // Identificador vindo do catálogo; restringe antes de usá-lo como identificador SQL.
            if (!/^public\.[a-z_][a-z0-9_]*$/.test(sequencia)) throw new Error('Identity não encontrada.');
            const estado = await client.query(
                `SELECT last_value::text, is_called, (SELECT COALESCE(MAX(id), 0)::text FROM public.${tabela}) AS max_id FROM ${sequencia}`
            );
            const linha = estado.rows[0];
            const proximo = BigInt(linha.last_value) + (linha.is_called ? 1n : 0n);
            if (proximo <= BigInt(linha.max_id)) throw new Error(`Identity desalinhada em ${tabela}.`);
            proximosIds[tabela] = proximo.toString();
        }

        return { contagens, proximosIds, integridade: true };
    }, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
}

module.exports = { aplicarSchema, inserirSeed, verificarBanco };
