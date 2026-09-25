const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


const TutorialModel =
    require(
        '../models/tutorialModel'
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

                    UsuarioModel
                        .findById(
                            comentario.usuarioId
                        )

                )

    };

}


function validarTexto(
    texto
) {

    const valor =
        String(
            texto || ''
        )
        .trim();


    if (
        valor.length < 2
        ||
        valor.length > 1000
    ) {

        return null;

    }


    return valor;

}


function listarPorTutorial(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.tutorialId
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    return res.json(

        ComentarioModel
            .findByTutorialId(
                tutorial.id
            )

            .map(
                enriquecerComentario
            )

    );

}


function criar(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.tutorialId
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    const texto =
        validarTexto(
            req.body.texto
        );


    if (!texto) {

        return res
            .status(400)
            .json({

                erro:
                    'O comentário deve ter entre 2 e 1000 caracteres.'

            });

    }


    const comentario =
        ComentarioModel
            .create({

                tutorialId:
                    tutorial.id,

                usuarioId:
                    req.usuario.id,

                texto

            });


    return res
        .status(201)
        .json({

            mensagem:
                'Comentário publicado com sucesso.',

            comentario:
                enriquecerComentario(
                    comentario
                )

        });

}


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
                    'Você só pode editar o próprio comentário.'

            });

    }


    const texto =
        validarTexto(
            req.body.texto
        );


    if (!texto) {

        return res
            .status(400)
            .json({

                erro:
                    'O comentário deve ter entre 2 e 1000 caracteres.'

            });

    }


    const atualizado =
        ComentarioModel
            .update(

                comentario.id,

                texto

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
                    'Você só pode excluir o próprio comentário.'

            });

    }


    ComentarioModel
        .remove(
            comentario.id
        );


    return res.json({

        mensagem:
            'Comentário excluído com sucesso.'

    });

}


module.exports = {

    enriquecerComentario,

    listarPorTutorial,

    criar,

    atualizar,

    excluir

};