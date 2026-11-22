const RepositoryFactory = require('../repositories/repositoryFactory');
const repository = RepositoryFactory.criarTutorialRepository();

function normalizarTexto(
    valor = ''
) {
    return String(valor)
        .normalize(
            'NFD'
        )
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .toLowerCase()
        .trim();
}

function criarSlugBase(
    valor = ''
) {
    return normalizarTexto(
        valor
    )
        .replace(
            /[^a-z0-9]+/g,
            '-'
        )
        .replace(
            /^-+|-+$/g,
            ''
        );
}


async function findAll(opcoes) { return repository.findAll(opcoes); }
async function count() { return repository.count(); }
async function listarParaModeracao() { return repository.listarParaModeracao(); }

async function findById(id, opcoes) {
    const numero = Number(id);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? repository.findById(numero, opcoes) : null;
}

async function findBySlug(slug) { return repository.findBySlug(String(slug)); }

async function findByAutorId(autorId) {
    const numero = Number(autorId);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? repository.findByAutorId(numero) : [];
}

// =============================
// BUSCA PRINCIPAL DO MEXPLICA
// =============================
async function buscar(
    termo,
    limite = 10
) {
    const consulta =
        normalizarTexto(
            termo
        );

    if (
        consulta.length < 2
    ) {
        return [];
    }

    const palavras =
        consulta
            .split(
                /\s+/
            )
            .filter(
                Boolean
            );

    // A ordem de IDs preserva os desempates historicos da colecao em memoria.
    const tutoriais = await repository.findAll({ ordem: 'id' });

    return tutoriais

        .map(
            tutorial => {

                const titulo =
                    normalizarTexto(
                        tutorial.titulo
                    );
                const resumo =
                    normalizarTexto(
                        tutorial.resumo
                    );
                const conteudo =
                    normalizarTexto(
                        tutorial.conteudo
                    );
                const categoria =
                    normalizarTexto(
                        tutorial.categoriaId
                    );
                const tags =
                    normalizarTexto(

                        (
                            tutorial.tags
                            || []
                        )
                        .join(' ')
                    );
                const passos =
                    normalizarTexto(
                        (
                            tutorial.passos
                            || []
                        )
                        .map(
                            passo =>
                                `${passo.titulo} ${passo.descricao}`
                        )
                        .join(' ')
                    );

                let pontuacao =
                    0;

                if (
                    titulo.includes(
                        consulta
                    )
                ) {
                    pontuacao +=
                        30;
                }

                if (
                    tags.includes(
                        consulta
                    )
                ) {

                    pontuacao +=
                        16;
                }

                if (
                    resumo.includes(
                        consulta
                    )
                ) {
                    pontuacao +=
                        12;
                }

                if (
                    categoria.includes(
                        consulta
                    )
                ) {
                    pontuacao +=
                        8;
                }

                if (
                    conteudo.includes(
                        consulta
                    )
                ) {
                    pontuacao +=
                        5;
                }

                if (
                    passos.includes(
                        consulta
                    )
                ) {

                    pontuacao +=
                        3;
                }

                palavras.forEach(
                    palavra => {
                        if (
                            titulo.includes(
                                palavra
                            )
                        ) {
                            pontuacao +=
                                7;
                        }

                        if (
                            tags.includes(
                                palavra
                            )
                        ) {
                            pontuacao +=
                                5;
                        }

                        if (
                            resumo.includes(
                                palavra
                            )
                        ) {
                            pontuacao +=
                                4;
                        }

                        if (
                            categoria.includes(
                                palavra
                            )
                        ) {
                            pontuacao +=
                                3;
                        }

                        if (
                            conteudo.includes(
                                palavra
                            )
                        ) {
                            pontuacao +=
                                2;
                        }

                        if (
                            passos.includes(
                                palavra
                            )
                        ) {
                            pontuacao +=
                                1;
                        }
                    }
                );

                return {
                    tutorial,
                    pontuacao
                };
            }
        )

        .filter(
            item =>
                item.pontuacao > 0
        )
        .sort(
            (a, b) =>
                b.pontuacao
                -
                a.pontuacao

                ||

                b.tutorial
                    .visualizacoes

                -

                a.tutorial
                    .visualizacoes
        )
        .slice(
            0,
            limite
        )
        .map(
            item =>
                item.tutorial
        );
}

async function maisAcessadosDaSemana(
    limite = 6
) {
    const agora =
        Date.now();

    const seteDias =
        7
        *
        24
        *
        60
        *
        60
        *
        1000;

    const tutoriais = await repository.findAll({ ordem: 'id' });

    const recentes =
        tutoriais.filter(
            tutorial => {

                const data =
                    new Date(
                        tutorial.criadoEm
                    )
                    .getTime();

                return (
                    Number.isFinite(
                        data
                    )

                    &&

                    agora - data
                    <= seteDias
                );
            }
        );

    const base =
        recentes.length > 0
            ? recentes
            : tutoriais;

    return [
        ...base
    ]
        .sort(
            (a, b) =>

                b.visualizacoes
                -
                a.visualizacoes

                ||

                new Date(
                    b.criadoEm
                )

                -

                new Date(
                    a.criadoEm
                )
        )
        .slice(
            0,
            limite
        );
}

async function incrementarVisualizacao(id) {
    const numero = Number(id);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? repository.incrementarVisualizacao(numero) : null;
}

async function create(dados) {
    const base = criarSlugBase(dados.titulo) || 'tutorial';
    const tutorial = {
        autorId: Number(dados.autorId), categoriaId: dados.categoriaId,
        titulo: dados.titulo, resumo: dados.resumo, conteudo: dados.conteudo,
        passos: Array.isArray(dados.passos) ? dados.passos : [],
        imagens: Array.isArray(dados.imagens) ? dados.imagens : [],
        videoUrl: dados.videoUrl || '', tags: Array.isArray(dados.tags) ? dados.tags : [],
        visualizacoes: 0, criadoEm: new Date().toISOString(), atualizadoEm: null
    };
    for (let tentativa = 1; tentativa <= 50; tentativa++) {
        const slug = tentativa === 1 ? base : base + '-' + tentativa;
        if (await repository.findBySlug(slug)) continue;
        try {
            return await repository.create({ ...tutorial, slug });
        } catch (erro) {
            if (erro.code !== 'TUTORIAL_SLUG_CONFLITO') throw erro;
        }
    }
    const erro = new Error('Não foi possível reservar o endereço do tutorial. Tente novamente.');
    erro.code = 'TUTORIAL_SLUG_CONFLITO';
    throw erro;
}

async function update(id, alteracoes) {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero <= 0 || numero > 2147483647) return null;
    const permitidas = { atualizadoEm: new Date().toISOString() };
    for (const campo of ['titulo', 'resumo', 'conteudo', 'categoriaId', 'passos', 'imagens', 'videoUrl', 'tags']) {
        if (Object.hasOwn(alteracoes, campo)) permitidas[campo] = alteracoes[campo];
    }
    return repository.update(numero, permitidas);
}

async function remove(id, opcoes = {}) {
    const numero = Number(id);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? repository.remove(numero, opcoes) : null;
}

module.exports = {
    normalizarTexto, findAll, count, listarParaModeracao, findById, findBySlug, findByAutorId, buscar,
    maisAcessadosDaSemana, incrementarVisualizacao, create, update, remove
};
