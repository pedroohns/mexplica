const tutoriais =
    require(
        '../data/tutorialData'
    );

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


function criarSlugUnico(
    titulo
) {
    const base =
        criarSlugBase(
            titulo
        )
        || 'tutorial';

    let slug =
        base;

    let sufixo =
        2;

    while (
        tutoriais.some(
            tutorial =>
                tutorial.slug
                === slug
        )
    ) {
        slug =
            `${base}-${sufixo}`;

        sufixo +=
            1;
    }
    return slug;
}

function proximoId() {
    if (
        tutoriais.length
        === 0
    ) {
        return 1;
    }

    return (
        Math.max(
            ...tutoriais.map(
                tutorial =>
                    tutorial.id
            )
        )
        +
        1
    );
}

function findAll() {
    return [
        ...tutoriais
    ]
        .sort(
            (a, b) =>

                new Date(
                    b.criadoEm
                )

                -

                new Date(
                    a.criadoEm
                )
        );
}


function findById(id) {
    const numero =
        Number(id);

    return (
        tutoriais.find(
            tutorial =>
                tutorial.id
                === numero
        )
        ||
        null
    );
}

function findBySlug(
    slug
) {
    return (
        tutoriais.find(
            tutorial =>
                tutorial.slug
                === String(slug)
        )
        ||
        null
    );
}

function findByAutorId(
    autorId
) {
    const numero =
        Number(
            autorId
        );

    return tutoriais

        .filter(
            tutorial =>
                tutorial.autorId
                === numero
        )
        .sort(
            (a, b) =>

                new Date(
                    b.criadoEm
                )

                -

                new Date(
                    a.criadoEm
                )
        );
}


// =============================
// BUSCA PRINCIPAL DO MEXPLICA
// =============================
function buscar(
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

function maisAcessadosDaSemana(
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

function incrementarVisualizacao(
    id
) {
    const tutorial =
        findById(id);

    if (!tutorial) {
        return null;
    }

    tutorial.visualizacoes +=
        1;
    return tutorial;
}

// CREATE
function create(
    dados
) {
    const novoTutorial = {
        id:
            proximoId(),
        slug:
            criarSlugUnico(
                dados.titulo
            ),
        autorId:
            Number(
                dados.autorId
            ),
        categoriaId:
            dados.categoriaId,
        titulo:
            dados.titulo,
        resumo:
            dados.resumo,
        conteudo:
            dados.conteudo,
        passos:
            Array.isArray(
                dados.passos
            )
                ? dados.passos
                : [],
        imagens:
            Array.isArray(
                dados.imagens
            )
                ? dados.imagens
                : [],
        videoUrl:
            dados.videoUrl
            || '',
        tags:
            Array.isArray(
                dados.tags
            )
                ? dados.tags
                : [],
        visualizacoes:
            0,
        criadoEm:
            new Date()
                .toISOString(),
        atualizadoEm:
            null
    };

    tutoriais.push(
        novoTutorial
    );
    return novoTutorial;
}

// UPDATE
function update(
    id,
    alteracoes
) {
    const tutorial =
        findById(id);

    if (!tutorial) {
        return null;
    }

    Object.assign(
        tutorial,
        alteracoes,
        {
            atualizadoEm:
                new Date()
                    .toISOString()
        }
    );
    /*
        o slug nao muda.

        Se o titulo for editado, uma URL
        que já foi compartilhada continua
        funcionando.
    */
    return tutorial;
}

// DELETE
function remove(id) {
    const numero =
        Number(id);

    const indice =
        tutoriais.findIndex(
            tutorial =>
                tutorial.id
                === numero
        );

    if (
        indice === -1
    ) {
        return null;
    }

    const [
        removido
    ] =
        tutoriais.splice(
            indice,
            1
        );

    return removido;
}

module.exports = {
    normalizarTexto,
    findAll,
    findById,
    findBySlug,
    findByAutorId,
    buscar,
    maisAcessadosDaSemana,
    incrementarVisualizacao,
    create,
    update,
    remove
};