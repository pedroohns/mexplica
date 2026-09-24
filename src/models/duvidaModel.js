const duvidas = [

    {
        id: 1,

        slug:
            'como-aumentar-as-letras-do-celular',

        usuarioId:
            1,

        titulo:
            'Como aumentar as letras do celular?',

        categoria:
            'Acessibilidade',

        conteudo:
            'Estou com dificuldade para ler os textos do meu celular. Como faço para aumentar o tamanho das letras?',

        visualizacoes:
            37,

        criadoEm:
            '2026-09-22T14:30:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 2,

        slug:
            'como-identificar-um-golpe-no-whatsapp',

        usuarioId:
            1,

        titulo:
            'Como identificar um golpe no WhatsApp?',

        categoria:
            'Segurança',

        conteudo:
            'Recebi uma mensagem pedindo meus dados e dizendo que eu ganhei um prêmio. Como saber se é golpe?',

        visualizacoes:
            42,

        criadoEm:
            '2026-09-23T10:15:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 3,

        slug:
            'como-fazer-uma-chamada-de-video',

        usuarioId:
            2,

        titulo:
            'Como fazer uma chamada de vídeo?',

        categoria:
            'Comunicação',

        conteudo:
            'Quero aprender a fazer uma chamada de vídeo pelo WhatsApp. Onde fica essa opção?',

        visualizacoes:
            29,

        criadoEm:
            '2026-09-20T18:00:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 4,

        slug:
            'como-criar-uma-conta-no-gov-br',

        usuarioId:
            3,

        titulo:
            'Como criar uma conta no Gov.br?',

        categoria:
            'Serviços digitais',

        conteudo:
            'Preciso acessar um serviço do governo, mas ainda não tenho conta Gov.br. Como posso criar uma?',

        visualizacoes:
            25,

        criadoEm:
            '2026-09-19T12:40:00.000Z',

        atualizadoEm:
            null
    }

];

// =============================
// AUXILIARES
// =============================
function normalizarTexto(
    valor = ''
) {

    return String(valor)

        .normalize('NFD')

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
        || 'duvida';


    let slug =
        base;


    let sufixo =
        2;


    while (
        duvidas.some(
            duvida =>
                duvida.slug
                === slug
        )
    ) {

        slug =
            `${base}-${sufixo}`;

        sufixo += 1;

    }


    return slug;

}


function proximoId() {

    if (
        duvidas.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...duvidas.map(
                duvida =>
                    duvida.id
            )
        )
        + 1
    );

}

// =============================
// READ
// =============================
function findAll() {

    return [
        ...duvidas
    ].sort(
        (a, b) =>
            new Date(b.criadoEm)
            -
            new Date(a.criadoEm)
    );

}


function findById(id) {

    const numero =
        Number(id);


    return (
        duvidas.find(
            duvida =>
                duvida.id === numero
        )
        || null
    );

}


function findBySlug(slug) {

    return (
        duvidas.find(
            duvida =>
                duvida.slug
                === String(slug)
        )
        || null
    );

}


function findByUserId(
    usuarioId
) {

    const numero =
        Number(
            usuarioId
        );


    return duvidas.filter(
        duvida =>
            duvida.usuarioId
            === numero
    );

}

// =============================
// BUSCA
// =============================
function buscar(
    termo,
    limite = 8
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

            .split(/\s+/)

            .filter(
                Boolean
            );


    return duvidas

        .map(
            duvida => {

                const titulo =
                    normalizarTexto(
                        duvida.titulo
                    );

                const categoria =
                    normalizarTexto(
                        duvida.categoria
                    );

                const conteudo =
                    normalizarTexto(
                        duvida.conteudo
                    );


                let pontuacao =
                    0;


                // correspondencia da
                // frase inteira
                if (
                    titulo.includes(
                        consulta
                    )
                ) {

                    pontuacao +=
                        20;

                }


                if (
                    categoria.includes(
                        consulta
                    )
                ) {

                    pontuacao +=
                        10;

                }


                if (
                    conteudo.includes(
                        consulta
                    )
                ) {

                    pontuacao +=
                        5;

                }


                // correspondencia
                // palavra por palavra
                palavras.forEach(
                    palavra => {

                        if (
                            titulo.includes(
                                palavra
                            )
                        ) {

                            pontuacao +=
                                5;

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
                                1;

                        }

                    }
                );


                return {

                    duvida,

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
                b.duvida.visualizacoes
                -
                a.duvida.visualizacoes
        )

        .slice(
            0,
            limite
        )

        .map(
            item =>
                item.duvida
        );

}


// =============================
// DESTAQUES DA SEMANA
// =============================
function maioresDaSemana(
    limite = 5
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
        duvidas.filter(
            duvida => {

                const data =
                    new Date(
                        duvida.criadoEm
                    ).getTime();


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


    // caso os dados de demonstraçao
    // fiquem antigos futuramente,
    // ainda mostramos os mais vistos
    const base =
        recentes.length > 0
            ? recentes
            : duvidas;


    return [
        ...base
    ]

        .sort(
            (a, b) =>
                b.visualizacoes
                -
                a.visualizacoes
                ||
                new Date(b.criadoEm)
                -
                new Date(a.criadoEm)
        )

        .slice(
            0,
            limite
        );

}


function incrementarVisualizacao(
    id
) {

    const duvida =
        findById(id);


    if (!duvida) {
        return null;
    }


    duvida.visualizacoes +=
        1;


    return duvida;

}


// =============================
// CREATE
// =============================
function create(dados) {

    const novaDuvida = {

        id:
            proximoId(),

        slug:
            criarSlugUnico(
                dados.titulo
            ),

        usuarioId:
            Number(
                dados.usuarioId
            ),

        titulo:
            dados.titulo,

        categoria:
            dados.categoria,

        conteudo:
            dados.conteudo,

        visualizacoes:
            0,

        criadoEm:
            new Date()
                .toISOString(),

        atualizadoEm:
            null

    };


    duvidas.push(
        novaDuvida
    );


    return novaDuvida;

}


// =============================
// UPDATE
// =============================
function update(
    id,
    alteracoes
) {

    const duvida =
        findById(id);


    if (!duvida) {
        return null;
    }


    Object.assign(

        duvida,

        alteracoes,

        {

            atualizadoEm:
                new Date()
                    .toISOString()

        }

    );


    /*
        O slug NÃO muda quando
        o título é editado.

        Isso evita quebrar URLs
        que já foram compartilhadas.
    */

    return duvida;

}


// =============================
// DELETE
// =============================
function remove(id) {

    const numero =
        Number(id);


    const indice =
        duvidas.findIndex(
            duvida =>
                duvida.id === numero
        );


    if (
        indice === -1
    ) {

        return null;

    }


    const [removida] =
        duvidas.splice(
            indice,
            1
        );


    return removida;

}


module.exports = {

    normalizarTexto,

    findAll,

    findById,

    findBySlug,

    findByUserId,

    buscar,

    maioresDaSemana,

    incrementarVisualizacao,

    create,

    update,

    remove

};