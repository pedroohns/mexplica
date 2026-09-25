const avaliacoes = [

    {
        id: 1,
        tutorialId: 1,
        avaliadorId: 1,
        nota: 5,
        criadoEm: '2026-09-24T10:12:00.000Z',
        atualizadoEm: null
    },

    {
        id: 2,
        tutorialId: 1,
        avaliadorId: 5,
        nota: 5,
        criadoEm: '2026-09-24T11:20:00.000Z',
        atualizadoEm: null
    },

    {
        id: 3,
        tutorialId: 2,
        avaliadorId: 6,
        nota: 4,
        criadoEm: '2026-09-24T09:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 4,
        tutorialId: 3,
        avaliadorId: 1,
        nota: 5,
        criadoEm: '2026-09-23T20:05:00.000Z',
        atualizadoEm: null
    },

    {
        id: 5,
        tutorialId: 3,
        avaliadorId: 10,
        nota: 5,
        criadoEm: '2026-09-23T21:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 6,
        tutorialId: 4,
        avaliadorId: 12,
        nota: 5,
        criadoEm: '2026-09-23T17:10:00.000Z',
        atualizadoEm: null
    },

    {
        id: 7,
        tutorialId: 5,
        avaliadorId: 10,
        nota: 4,
        criadoEm: '2026-09-23T13:05:00.000Z',
        atualizadoEm: null
    },

    {
        id: 8,
        tutorialId: 6,
        avaliadorId: 5,
        nota: 5,
        criadoEm: '2026-09-22T19:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 9,
        tutorialId: 7,
        avaliadorId: 1,
        nota: 5,
        criadoEm: '2026-09-22T16:35:00.000Z',
        atualizadoEm: null
    },

    {
        id: 10,
        tutorialId: 8,
        avaliadorId: 6,
        nota: 4,
        criadoEm: '2026-09-21T18:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 11,
        tutorialId: 9,
        avaliadorId: 12,
        nota: 5,
        criadoEm: '2026-09-21T14:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 12,
        tutorialId: 10,
        avaliadorId: 5,
        nota: 5,
        criadoEm: '2026-09-21T09:45:00.000Z',
        atualizadoEm: null
    },

    {
        id: 13,
        tutorialId: 10,
        avaliadorId: 6,
        nota: 5,
        criadoEm: '2026-09-21T10:20:00.000Z',
        atualizadoEm: null
    },

    {
        id: 14,
        tutorialId: 11,
        avaliadorId: 10,
        nota: 4,
        criadoEm: '2026-09-20T16:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 15,
        tutorialId: 12,
        avaliadorId: 6,
        nota: 5,
        criadoEm: '2026-09-20T12:25:00.000Z',
        atualizadoEm: null
    },

    {
        id: 16,
        tutorialId: 13,
        avaliadorId: 1,
        nota: 4,
        criadoEm: '2026-09-20T08:30:00.000Z',
        atualizadoEm: null
    },

    {
        id: 17,
        tutorialId: 14,
        avaliadorId: 10,
        nota: 5,
        criadoEm: '2026-09-20T08:15:00.000Z',
        atualizadoEm: null
    },

    {
        id: 18,
        tutorialId: 15,
        avaliadorId: 12,
        nota: 5,
        criadoEm: '2026-09-19T12:00:00.000Z',
        atualizadoEm: null
    },

    {
        id: 19,
        tutorialId: 17,
        avaliadorId: 12,
        nota: 5,
        criadoEm: '2026-09-19T15:15:00.000Z',
        atualizadoEm: null
    },

    {
        id: 20,
        tutorialId: 18,
        avaliadorId: 5,
        nota: 5,
        criadoEm: '2026-09-18T11:00:00.000Z',
        atualizadoEm: null
    }

];


function proximoId() {

    if (
        avaliacoes.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...avaliacoes.map(
                avaliacao =>
                    avaliacao.id
            )
        )
        +
        1
    );

}


function pontosPorNota(
    nota
) {

    return Number(nota)
        *
        10;

}


function findAll() {

    return avaliacoes;

}


function findById(id) {

    const numero =
        Number(id);


    return (
        avaliacoes.find(
            avaliacao =>
                avaliacao.id
                === numero
        )
        ||
        null
    );

}


function findByTutorialId(
    tutorialId
) {

    const numero =
        Number(
            tutorialId
        );


    return avaliacoes.filter(
        avaliacao =>
            avaliacao.tutorialId
            === numero
    );

}


function findByAvaliadorId(
    avaliadorId
) {

    const numero =
        Number(
            avaliadorId
        );


    return avaliacoes.filter(
        avaliacao =>
            avaliacao.avaliadorId
            === numero
    );

}


function findByTutorialEAvaliador(
    tutorialId,
    avaliadorId
) {

    const tutorialNumero =
        Number(
            tutorialId
        );


    const avaliadorNumero =
        Number(
            avaliadorId
        );


    return (
        avaliacoes.find(
            avaliacao =>

                avaliacao.tutorialId
                === tutorialNumero

                &&

                avaliacao.avaliadorId
                === avaliadorNumero
        )
        ||
        null
    );

}


function resumoDoTutorial(
    tutorialId
) {

    const lista =
        findByTutorialId(
            tutorialId
        );


    if (
        lista.length === 0
    ) {

        return {

            media:
                0,

            quantidade:
                0

        };

    }


    const soma =
        lista.reduce(
            (
                total,
                avaliacao
            ) =>
                total
                +
                avaliacao.nota,
            0
        );


    return {

        media:
            Number(

                (
                    soma
                    /
                    lista.length
                )

                .toFixed(1)

            ),

        quantidade:
            lista.length

    };

}


function create(
    dados
) {

    const novaAvaliacao = {

        id:
            proximoId(),

        tutorialId:
            Number(
                dados.tutorialId
            ),

        avaliadorId:
            Number(
                dados.avaliadorId
            ),

        nota:
            Number(
                dados.nota
            ),

        criadoEm:
            new Date()
                .toISOString(),

        atualizadoEm:
            null

    };


    avaliacoes.push(
        novaAvaliacao
    );


    return novaAvaliacao;

}


function update(
    id,
    nota
) {

    const avaliacao =
        findById(id);


    if (!avaliacao) {

        return null;

    }


    avaliacao.nota =
        Number(nota);


    avaliacao.atualizadoEm =
        new Date()
            .toISOString();


    return avaliacao;

}


function remove(id) {

    const numero =
        Number(id);


    const indice =
        avaliacoes.findIndex(
            avaliacao =>
                avaliacao.id
                === numero
        );


    if (
        indice === -1
    ) {

        return null;

    }


    const [
        removida
    ] =
        avaliacoes.splice(
            indice,
            1
        );


    return removida;

}


module.exports = {

    pontosPorNota,

    findAll,

    findById,

    findByTutorialId,

    findByAvaliadorId,

    findByTutorialEAvaliador,

    resumoDoTutorial,

    create,

    update,

    remove

};