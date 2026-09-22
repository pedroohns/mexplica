const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const PostModel =
    require(
        '../models/postModel'
    );

const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


function enriquecerComentario(
    comentario
) {

    return {

        ...comentario,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel.findById(
                        comentario.usuarioId
                    )

                )

    };

}


function enriquecerPost(
    post
) {

    return {

        ...post,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel.findById(
                        post.usuarioId
                    )

                ),

        comentarios:
            ComentarioModel

                .findByPostId(
                    post.id
                )

                .map(
                    enriquecerComentario
                )

    };

}


function comunidade(
    req,
    res
) {

    const posts =
        PostModel

            .findAll()

            .map(
                enriquecerPost
            );


    return res.render(
        'comunidade',
        {
            posts
        }
    );

}


function perfil(
    req,
    res
) {

    const usuario =
        UsuarioModel.findBySlug(
            req.params.slug
        );


    if (!usuario) {

        return res
            .status(404)
            .send(
                'Perfil não encontrado.'
            );

    }


    const posts =
        PostModel

            .findByUserId(
                usuario.id
            )

            .map(
                enriquecerPost
            );


    return res.render(
        'perfil',
        {

            perfil:
                UsuarioModel
                    .toPublic(
                        usuario
                    ),

            posts

        }
    );

}


// pagina provisoria para testar
// autenticaçao enquanto o layout
// definitivo nao esta pronto.
function entrar(
    req,
    res
) {

    return res.render(
        'entrar-temp'
    );

}


module.exports = {

    comunidade,

    perfil,

    entrar

};