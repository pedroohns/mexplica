const posts = [

    {
        id: 1,
        usuarioId: 1,
        titulo:
            'Como aumentar o tamanho das letras no celular?',
        conteudo:
            'Troquei de celular recentemente e estou com dificuldade para aumentar o tamanho dos textos. Onde encontro essa configuração?',
        categoria:
            'Acessibilidade',
        criadoEm:
            '2026-09-21T18:30:00.000Z',
        atualizadoEm:
            null
    },


    {
        id: 2,
        usuarioId: 2,
        titulo:
            'Como identificar uma mensagem falsa do banco?',
        conteudo:
            'Separei algumas dicas para verificar mensagens, links e números antes de clicar ou informar dados pessoais.',
        categoria:
            'Segurança',
        criadoEm:
            '2026-09-21T19:10:00.000Z',
        atualizadoEm:
            null
    }

];


function proximoId() {
    if (posts.length === 0) {
        return 1;
    }
    return (
        Math.max(
            ...posts.map(
                post => post.id
            )
        ) + 1
    );

}


function findAll() {
    return [...posts]
        .sort(
            (a, b) =>
                b.id - a.id
        );

}


function findById(id) {
    const numero =
        Number(id);

    return (
        posts.find(
            post =>
                post.id === numero
        ) || null
    );

}


function findByUserId(
    usuarioId
) {

    const numero =
        Number(usuarioId);


    return posts.filter(
        post =>
            post.usuarioId === numero
    );

}


// CREATE

function create(dados) {

    const novoPost = {

        id:
            proximoId(),

        usuarioId:
            Number(
                dados.usuarioId
            ),

        titulo:
            dados.titulo,

        conteudo:
            dados.conteudo,

        categoria:
            dados.categoria,

        criadoEm:
            new Date()
                .toISOString(),

        atualizadoEm:
            null

    };


    posts.push(
        novoPost
    );


    return novoPost;

}


// UPDATE

function update(
    id,
    alteracoes
) {

    const post =
        findById(id);


    if (!post) {
        return null;
    }


    Object.assign(
        post,
        alteracoes,
        {
            atualizadoEm:
                new Date()
                    .toISOString()
        }
    );


    return post;

}


// DELETE

function remove(id) {

    const numero =
        Number(id);


    const indice =
        posts.findIndex(
            post =>
                post.id === numero
        );


    if (indice === -1) {
        return null;
    }


    const [removido] =
        posts.splice(
            indice,
            1
        );


    return removido;

}


function removeByUserId(
    usuarioId
) {

    const numero =
        Number(usuarioId);


    const idsRemovidos =
        posts

            .filter(
                post =>
                    post.usuarioId
                    === numero
            )

            .map(
                post => post.id
            );


    for (
        let i = posts.length - 1;
        i >= 0;
        i -= 1
    ) {

        if (
            posts[i].usuarioId
            === numero
        ) {

            posts.splice(
                i,
                1
            );

        }

    }


    return idsRemovidos;

}


module.exports = {

    findAll,

    findById,

    findByUserId,

    create,

    update,

    remove,

    removeByUserId

};