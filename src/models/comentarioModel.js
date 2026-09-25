const comentarios = [

    {
        id: 1,

        tutorialId:
            1,

        usuarioId:
            1,

        texto:
            'Muito obrigado! Consegui aumentar a fonte do meu celular.',

        criadoEm:
            '2026-09-24T10:10:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 2,

        tutorialId:
            1,

        usuarioId:
            5,

        texto:
            'As etapas ficaram bem fáceis de acompanhar. Ajudou bastante.',

        criadoEm:
            '2026-09-24T11:15:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 3,

        tutorialId:
            3,

        usuarioId:
            6,

        texto:
            'Eu quase cliquei num link parecido. Agora vou conferir o número antes.',

        criadoEm:
            '2026-09-23T20:00:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 4,

        tutorialId:
            4,

        usuarioId:
            12,

        texto:
            'Funcionou aqui. Consegui falar por vídeo com minha filha.',

        criadoEm:
            '2026-09-23T17:05:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 5,

        tutorialId:
            5,

        usuarioId:
            10,

        texto:
            'Meu carro mostrou um código para confirmar e depois conectou normalmente.',

        criadoEm:
            '2026-09-23T13:00:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 6,

        tutorialId:
            7,

        usuarioId:
            1,

        texto:
            'Gostei do aviso para usar somente o canal oficial.',

        criadoEm:
            '2026-09-22T16:30:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 7,

        tutorialId:
            10,

        usuarioId:
            5,

        texto:
            'A explicação sobre HTTPS ficou clara, principalmente que ele não garante sozinho que o site é confiável.',

        criadoEm:
            '2026-09-21T09:40:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 8,

        tutorialId:
            12,

        usuarioId:
            6,

        texto:
            'Eu não sabia que a câmera já conseguia ler QR Code sem instalar outro aplicativo.',

        criadoEm:
            '2026-09-20T12:20:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 9,

        tutorialId:
            14,

        usuarioId:
            10,

        texto:
            'Ativei o modo escuro e ficou bem melhor para usar o celular à noite.',

        criadoEm:
            '2026-09-20T08:10:00.000Z',

        atualizadoEm:
            null
    },


    {
        id: 10,

        tutorialId:
            17,

        usuarioId:
            12,

        texto:
            'Conferir o nome antes de confirmar o Pix é uma dica simples, mas muito importante.',

        criadoEm:
            '2026-09-19T15:10:00.000Z',

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