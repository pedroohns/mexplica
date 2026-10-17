const comentarios =
    require(
        '../data/comentarioData'
    );


function proximoId() {

    if (
        comentarios.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...comentarios.map(
                comentario =>
                    comentario.id
            )
        )
        +
        1
    );

}


function findAll() {

    return comentarios;

}


function findById(id) {

    const numero =
        Number(id);


    return (
        comentarios.find(
            comentario =>
                comentario.id
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


    return comentarios

        .filter(
            comentario =>
                comentario.tutorialId
                === numero
        )

        .sort(
            (a, b) =>

                new Date(
                    a.criadoEm
                )

                -

                new Date(
                    b.criadoEm
                )
        );

}


function findByUserId(
    usuarioId
) {

    const numero =
        Number(
            usuarioId
        );


    return comentarios.filter(
        comentario =>
            comentario.usuarioId
            === numero
    );

}


// CREATE
function create(
    dados
) {

    const novoComentario = {

        id:
            proximoId(),

        tutorialId:
            Number(
                dados.tutorialId
            ),

        usuarioId:
            Number(
                dados.usuarioId
            ),

        texto:
            dados.texto,

        criadoEm:
            new Date()
                .toISOString(),

        atualizadoEm:
            null

    };


    comentarios.push(
        novoComentario
    );


    return novoComentario;

}


// UPDATE
function update(
    id,
    texto
) {

    const comentario =
        findById(id);


    if (!comentario) {

        return null;

    }


    comentario.texto =
        texto;


    comentario.atualizadoEm =
        new Date()
            .toISOString();


    return comentario;

}


// DELETE
function remove(id) {

    const numero =
        Number(id);


    const indice =
        comentarios.findIndex(
            comentario =>
                comentario.id
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
        comentarios.splice(
            indice,
            1
        );


    return removido;

}


module.exports = {

    findAll,

    findById,

    findByTutorialId,

    findByUserId,

    create,

    update,

    remove

};