const ComentarioModel =
    require(
        '../models/comentarioModel'
    );

const PostModel =
    require(
        '../models/postModel'
    );

const UsuarioModel =
    require(
        '../models/usuarioModel'
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


// READ
function listarPorPost(
    req,
    res
) {

    const post =
        PostModel.findById(
            req.params.postId
        );


    if (!post) {

        return res
            .status(404)
            .json({

                erro:
                    'Publicação não encontrada.'

            });

    }


    const comentarios =
        ComentarioModel

            .findByPostId(
                post.id
            )

            .map(
                enriquecerComentario
            );


    return res.json(
        comentarios
    );

}


// CREATE
function criar(
    req,
    res
) {

    const post =
        PostModel.findById(
            req.params.postId
        );


    const texto =
        String(
            req.body.texto || ''
        ).trim();


    if (!post) {

        return res
            .status(404)
            .json({

                erro:
                    'Publicação não encontrada.'

            });

    }


    if (
        texto.length < 2
        ||
        texto.length > 1000
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'O comentário deve ter entre 2 e 1000 caracteres.'

            });

    }


    const comentario =
        ComentarioModel.create({

            postId:
                post.id,

            usuarioId:
                req.usuario.id,

            texto

        });


    return res
        .status(201)
        .json({

            mensagem:
                'Comentário criado com sucesso.',

            comentario:
                enriquecerComentario(
                    comentario
                )

        });

}


// UPDATE
function atualizar(
    req,
    res
) {

    const comentario =
        ComentarioModel
            .findById(
                req.params.id
            );


    if (!comentario) {

        return res
            .status(404)
            .json({

                erro:
                    'Comentário não encontrado.'

            });

    }


    if (
        comentario.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar os próprios comentários.'

            });

    }


    const texto =
        String(
            req.body.texto || ''
        ).trim();


    if (
        texto.length < 2
        ||
        texto.length > 1000
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'O comentário deve ter entre 2 e 1000 caracteres.'

            });

    }


    const atualizado =
        ComentarioModel.update(

            comentario.id,

            {
                texto
            }

        );


    return res.json({

        mensagem:
            'Comentário atualizado com sucesso.',

        comentario:
            enriquecerComentario(
                atualizado
            )

    });

}


// DELETE
function excluir(
    req,
    res
) {

    const comentario =
        ComentarioModel
            .findById(
                req.params.id
            );


    if (!comentario) {

        return res
            .status(404)
            .json({

                erro:
                    'Comentário não encontrado.'

            });

    }


    if (
        comentario.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir os próprios comentários.'

            });

    }


    ComentarioModel.remove(
        comentario.id
    );


    return res.json({

        mensagem:
            'Comentário excluído com sucesso.'

    });

}


module.exports = {

    listarPorPost,

    criar,

    atualizar,

    excluir

};