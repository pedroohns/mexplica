const comentarios = [

    {
        id: 1,
        postId: 1,
        usuarioId: 2,
        texto:
            'No Android, normalmente essa opção fica em Configurações > Tela > Tamanho da fonte. O caminho pode variar de acordo com a marca.',
        criadoEm:
            '2026-09-21T18:45:00.000Z',
        atualizadoEm:
            null
    },


    {
        id: 2,
        postId: 1,
        usuarioId: 3,
        texto:
            'Se você disser qual é o modelo do aparelho, fica mais fácil indicar o caminho exato.',
        criadoEm:
            '2026-09-21T18:50:00.000Z',
        atualizadoEm:
            null
    }
];


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
        ) + 1
    );

}


function findAll() {

    return [
        ...comentarios
    ];

}


function findById(id) {
    const numero =
        Number(id);

    return (
        comentarios.find(
            comentario =>
                comentario.id === numero
        ) || null
    );

}


function findByPostId(
    postId
) {

    const numero =
        Number(postId);


    return comentarios.filter(
        comentario =>
            comentario.postId
            === numero
    );

}


// CREATE

function create(dados) {

    const novoComentario = {

        id:
            proximoId(),

        postId:
            Number(
                dados.postId
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
    alteracoes
) {

    const comentario =
        findById(id);


    if (!comentario) {
        return null;
    }


    Object.assign(
        comentario,
        alteracoes,
        {
            atualizadoEm:
                new Date()
                    .toISOString()
        }
    );


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


    if (indice === -1) {
        return null;
    }


    const [removido] =
        comentarios.splice(
            indice,
            1
        );


    return removido;

}


function removeByPostId(
    postId
) {

    const numero =
        Number(postId);


    for (
        let i =
            comentarios.length - 1;

        i >= 0;

        i -= 1
    ) {

        if (
            comentarios[i].postId
            === numero
        ) {

            comentarios.splice(
                i,
                1
            );

        }

    }

}


function removeByUserId(
    usuarioId
) {

    const numero =
        Number(usuarioId);


    for (
        let i =
            comentarios.length - 1;

        i >= 0;

        i -= 1
    ) {

        if (
            comentarios[i].usuarioId
            === numero
        ) {

            comentarios.splice(
                i,
                1
            );

        }

    }

}


module.exports = {

    findAll,

    findById,

    findByPostId,

    create,

    update,

    remove,

    removeByPostId,

    removeByUserId

};