const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


const TutorialModel =
    require(
        '../models/tutorialModel'
    );


const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );


function removerAvaliacaoComAjuste(
    avaliacaoId
) {

    const avaliacao =
        AvaliacaoModel
            .findById(
                avaliacaoId
            );


    if (!avaliacao) {

        return null;

    }


    const tutorial =
        TutorialModel
            .findById(
                avaliacao.tutorialId
            );


    if (tutorial) {

        UsuarioModel
            .adicionarPontos(

                tutorial.autorId,

                -AvaliacaoModel
                    .pontosPorNota(
                        avaliacao.nota
                    )

            );

    }


    return AvaliacaoModel
        .remove(
            avaliacao.id
        );

}


function removerTutorialCompleto(
    tutorialId
) {

    const tutorial =
        TutorialModel
            .findById(
                tutorialId
            );


    if (!tutorial) {

        return null;

    }


    const avaliacoes =
        [
            ...AvaliacaoModel
                .findByTutorialId(
                    tutorial.id
                )
        ];


    avaliacoes.forEach(
        avaliacao =>

            removerAvaliacaoComAjuste(
                avaliacao.id
            )
    );


    const comentarios =
        [
            ...ComentarioModel
                .findByTutorialId(
                    tutorial.id
                )
        ];


    comentarios.forEach(
        comentario =>

            ComentarioModel
                .remove(
                    comentario.id
                )
    );


    return TutorialModel
        .remove(
            tutorial.id
        );

}


function removerDadosDoUsuario(
    usuarioId
) {

    const id =
        Number(
            usuarioId
        );


    /*
        1 - remove tutoriais publicados
        e tudo que depende deles
    */

    const tutoriais =
        [
            ...TutorialModel
                .findByAutorId(id)
        ];


    tutoriais.forEach(
        tutorial =>

            removerTutorialCompleto(
                tutorial.id
            )
    );


    /*
        2 - remove comentarios que
        o usuario fez em outros tutoriais
    */

    const comentarios =
        [
            ...ComentarioModel
                .findByUserId(id)
        ];


    comentarios.forEach(
        comentario =>

            ComentarioModel
                .remove(
                    comentario.id
                )
    );


    /*
        3 - remove avaliaçoes feitas
        pelo usuario e desfaz os pontos
        correspondentes.
    */

    const avaliacoes =
        [
            ...AvaliacaoModel
                .findByAvaliadorId(id)
        ];


    avaliacoes.forEach(
        avaliacao =>

            removerAvaliacaoComAjuste(
                avaliacao.id
            )
    );


    /*
        4 - so depois remove a conta
    */

    return UsuarioModel
        .remove(id);

}


module.exports = {

    removerAvaliacaoComAjuste,

    removerTutorialCompleto,

    removerDadosDoUsuario

};