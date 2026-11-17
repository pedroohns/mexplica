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
    comentario,
    autores = null
) {

    if (!comentario) {

        return null;

    }


    return {

        ...comentario,

        autor:
            UsuarioModel
                .toPublic(

                    (autores ? autores.get(comentario.usuarioId) : await UsuarioModel
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

    const comentarios = await ComentarioModel.findByTutorialId(tutorialId);
    const ids = [...new Set(comentarios.map(comentario => comentario.usuarioId))];
    const autores = new Map(await Promise.all(ids.map(async id => [id, await UsuarioModel.findById(id)])));
    return Promise.all(comentarios.map(comentario => enriquecerComentario(comentario, autores)));

}


module.exports = {

    enriquecerComentario,

    listarPorTutorial

};
