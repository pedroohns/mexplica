const avaliacoes = [

    {
        id: 1,

        respostaId:
            1,

        avaliadorId:
            1,

        nota:
            5,

        criadoEm:
            '2026-09-22T17:00:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 2,

        respostaId:
            2,

        avaliadorId:
            1,

        nota:
            5,

        criadoEm:
            '2026-09-22T17:02:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 3,

        respostaId:
            3,

        avaliadorId:
            1,

        nota:
            4,

        criadoEm:
            '2026-09-23T11:20:00.000Z',

        atualizadoEm:
            null
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
        + 1
    );

}


function pontosPorNota(
    nota
) {

    return Number(nota)
        * 10;

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
        || null
    );

}


function findByRespostaId(
    respostaId
) {

    const numero =
        Number(
            respostaId
        );


    return avaliacoes.filter(
        avaliacao =>
            avaliacao.respostaId
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


function findByRespostaEAvaliador(
    respostaId,
    avaliadorId
) {

    const respostaNumero =
        Number(
            respostaId
        );


    const avaliadorNumero =
        Number(
            avaliadorId
        );


    return (
        avaliacoes.find(
            avaliacao =>
                avaliacao.respostaId
                === respostaNumero
                &&
                avaliacao.avaliadorId
                === avaliadorNumero
        )
        || null
    );

}


function resumoDaResposta(
    respostaId
) {

    const lista =
        findByRespostaId(
            respostaId
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
                ).toFixed(1)
            ),

        quantidade:
            lista.length

    };

}


// CREATE
function create(dados) {

    const novaAvaliacao = {

        id:
            proximoId(),

        respostaId:
            Number(
                dados.respostaId
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


// UPDATE
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
        Number(
            nota
        );


    avaliacao.atualizadoEm =
        new Date()
            .toISOString();


    return avaliacao;

}


// DELETE
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


    const [removida] =
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

    findByRespostaId,

    findByAvaliadorId,

    findByRespostaEAvaliador,

    resumoDaResposta,

    create,

    update,

    remove

};