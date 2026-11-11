const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


// =============================
// ENRIQUECER COMENTARIO
// =============================
function enriquecerComentario(
    comentario
) {

    if (!comentario) {

        return null;

    }


    return {

        ...comentario,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel
                        .findById(
                            comentario.usuarioId
                        )

                )

    };

}


// =============================
// LISTAR COMENTÁRIOS DO TUTORIAL
// =============================
function listarPorTutorial(
    tutorialId
) {

    return ComentarioModel

        .findByTutorialId(
            tutorialId
        )

        .map(
            enriquecerComentario
        );

}


module.exports = {

    enriquecerComentario,

    listarPorTutorial

};