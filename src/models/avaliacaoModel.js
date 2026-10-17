const avaliacoes =
    require(
        '../data/avaliacaoData'
    )


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