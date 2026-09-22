const PostModel =
    require(
        '../models/postModel'
    );

const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


function enriquecerPost(
    post
) {

    const autor =
        UsuarioModel.findById(
            post.usuarioId
        );


    const quantidadeComentarios =
        ComentarioModel
            .findByPostId(
                post.id
            )
            .length;


    return {

        ...post,

        autor:
            UsuarioModel
                .toPublic(
                    autor
                ),

        quantidadeComentarios

    };

}


// READ
function listar(
    req,
    res
) {

    return res.json(

        PostModel
            .findAll()
            .map(
                enriquecerPost
            )

    );

}


function buscarPorId(
    req,
    res
) {

    const post =
        PostModel.findById(
            req.params.id
        );


    if (!post) {

        return res
            .status(404)
            .json({

                erro:
                    'Publicação não encontrada.'

            });

    }


    return res.json(
        enriquecerPost(
            post
        )
    );

}


// CREATE
function criar(
    req,
    res
) {

    const titulo =
        String(
            req.body.titulo || ''
        ).trim();


    const conteudo =
        String(
            req.body.conteudo || ''
        ).trim();


    const categoria =
        String(
            req.body.categoria
            || 'Geral'
        ).trim();


    if (
        titulo.length < 5
        ||
        titulo.length > 160
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'O título deve ter entre 5 e 160 caracteres.'

            });

    }


    if (
        conteudo.length < 5
        ||
        conteudo.length > 2000
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'O conteúdo deve ter entre 5 e 2000 caracteres.'

            });

    }


    const post =
        PostModel.create({

            usuarioId:
                req.usuario.id,

            titulo,

            conteudo,

            categoria:
                categoria || 'Geral'

        });


    return res
        .status(201)
        .json({

            mensagem:
                'Publicação criada com sucesso.',

            post:
                enriquecerPost(
                    post
                )

        });

}


// UPDATE
function atualizar(
    req,
    res
) {

    const post =
        PostModel.findById(
            req.params.id
        );


    if (!post) {

        return res
            .status(404)
            .json({

                erro:
                    'Publicação não encontrada.'

            });

    }


    if (
        post.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar as próprias publicações.'

            });

    }


    const alteracoes = {};


    if (
        req.body.titulo
        !== undefined
    ) {

        const titulo =
            String(
                req.body.titulo
            ).trim();


        if (
            titulo.length < 5
            ||
            titulo.length > 160
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        'O título deve ter entre 5 e 160 caracteres.'

                });

        }


        alteracoes.titulo =
            titulo;

    }


    if (
        req.body.conteudo
        !== undefined
    ) {

        const conteudo =
            String(
                req.body.conteudo
            ).trim();


        if (
            conteudo.length < 5
            ||
            conteudo.length > 2000
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        'O conteúdo deve ter entre 5 e 2000 caracteres.'

                });

        }


        alteracoes.conteudo =
            conteudo;

    }


    if (
        req.body.categoria
        !== undefined
    ) {

        alteracoes.categoria =
            String(
                req.body.categoria
            ).trim()
            || 'Geral';

    }


    const atualizado =
        PostModel.update(
            post.id,
            alteracoes
        );


    return res.json({

        mensagem:
            'Publicação atualizada com sucesso.',

        post:
            enriquecerPost(
                atualizado
            )

    });

}


// DELETE
function excluir(
    req,
    res
) {

    const post =
        PostModel.findById(
            req.params.id
        );


    if (!post) {

        return res
            .status(404)
            .json({

                erro:
                    'Publicação não encontrada.'

            });

    }


    if (
        post.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir as próprias publicações.'

            });

    }


    ComentarioModel
        .removeByPostId(
            post.id
        );


    PostModel.remove(
        post.id
    );


    return res.json({

        mensagem:
            'Publicação excluída com sucesso.'

    });

}


module.exports = {

    listar,

    buscarPorId,

    criar,

    atualizar,

    excluir

};