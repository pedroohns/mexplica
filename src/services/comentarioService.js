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
async function enriquecerComentario(
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

                    (await UsuarioModel
                        .findById(
                            comentario.usuarioId
                        ))

                )

    };

}


// =============================
// LISTAR COMENTÁRIOS DO TUTORIAL
// =============================
async function listarPorTutorial(
    tutorialId
) {

    return Promise.all(ComentarioModel

        .findByTutorialId(
            tutorialId
        )

        .map(
            enriquecerComentario
        ));

}


module.exports = {

    enriquecerComentario,

    listarPorTutorial

};