const TutorialModel =
    require(
        '../models/tutorialModel'
    );

const {
    categoriaValida
} =
    require(
        '../utils/categorias'
    );

const TutorialService =
    require(
        '../services/tutorialService'
    );

const {
    removerTutorialCompleto
} =
    require(
        '../services/relacionamentoService'
    );


function listar(
    req,
    res
) {

    const usuarioAtualId =
        req.usuario?.id
        || null;


    return res.json(

        TutorialModel
            .findAll()

            .map(
                tutorial =>

                    TutorialService.enriquecerTutorial(
                        tutorial,
                        usuarioAtualId
                    )
            )

    );

}


function buscar(
    req,
    res
) {

    const termo =
        String(
            req.query.q
            || ''
        )
        .trim();


    const categoriaId =
        String(
            req.query.categoria
            || ''
        )
        .trim();


    const usuarioAtualId =
        req.usuario?.id
        || null;


    if (
        termo.length < 2
    ) {

        return res.json({

            termo,

            categoria:
                categoriaId
                || null,

            quantidade:
                0,

            resultados:
                []

        });

    }


    /*
        Se uma categoria foi enviada,
        garantimos que ela realmente existe.
    */

    if (
        categoriaId
        &&
        !categoriaValida(
            categoriaId
        )
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Categoria de pesquisa inválida.'

            });

    }


    /*
        Buscamos todos os resultados compatíveis.

        Antes havia um limite padrão no Model.
        Como a interface agora pode crescer
        verticalmente, pedimos todos os resultados.
    */

    let encontrados =
        TutorialModel
            .buscar(

                termo,

                Number.MAX_SAFE_INTEGER

            );


    /*
        Se o usuário escolheu um filtro,
        mantemos somente aquela categoria.
    */

    if (
        categoriaId
    ) {

        encontrados =
            encontrados.filter(
                tutorial =>

                    tutorial.categoriaId
                    === categoriaId
            );

    }


    const resultados =
        encontrados.map(
            tutorial =>

                TutorialService.enriquecerTutorial(
                    tutorial,
                    usuarioAtualId
                )
        );


    return res.json({

        termo,

        categoria:
            categoriaId
            || null,

        quantidade:
            resultados.length,

        resultados

    });

}


function populares(
    req,
    res
) {

    const limiteSolicitado =
        Number(
            req.query.limite
            || 6
        );


    const limite =
        Number.isInteger(
            limiteSolicitado
        )

            ? Math.min(

                Math.max(
                    limiteSolicitado,
                    1
                ),

                20

            )

            : 6;


    return res.json(

        TutorialModel
            .maisAcessadosDaSemana(
                limite
            )

            .map(
                tutorial =>
                    TutorialService.enriquecerTutorial(
                        tutorial
                    )
            )

    );

}


function buscarPorId(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.id
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

        TutorialService.enriquecerTutorial(

            tutorial,

            req.usuario?.id
            || null

        )

    );

}


function criar(
    req,
    res
) {

    const validacao =
        TutorialService.validarCampos(
            req.body
        );


    if (
        validacao.erro
    ) {

        return res
            .status(400)
            .json({

                erro:
                    validacao.erro

            });

    }


    const tutorial =
        TutorialModel
            .create({

                autorId:
                    req.usuario.id,

                ...validacao.dados

            });


    return res
        .status(201)
        .json({

            mensagem:
                'Tutorial publicado com sucesso.',

            tutorial:
                TutorialService.enriquecerTutorial(

                    tutorial,

                    req.usuario.id

                )

        });

}


function atualizar(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.id
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    if (
        tutorial.autorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar os próprios tutoriais.'

            });

    }


    const validacao =
        TutorialService.validarCampos({

            titulo:
                req.body.titulo
                ??
                tutorial.titulo,

            resumo:
                req.body.resumo
                ??
                tutorial.resumo,

            conteudo:
                req.body.conteudo
                ??
                tutorial.conteudo,

            categoriaId:
                req.body.categoriaId
                ??
                tutorial.categoriaId,

            passos:
                req.body.passos
                ??
                tutorial.passos,

            imagens:
                req.body.imagens
                ??
                tutorial.imagens,

            videoUrl:
                req.body.videoUrl
                ??
                tutorial.videoUrl,

            tags:
                req.body.tags
                ??
                tutorial.tags

        });


    if (
        validacao.erro
    ) {

        return res
            .status(400)
            .json({

                erro:
                    validacao.erro

            });

    }


    const atualizado =
        TutorialModel
            .update(

                tutorial.id,

                validacao.dados

            );


    return res.json({

        mensagem:
            'Tutorial atualizado com sucesso.',

        tutorial:
            TutorialService.enriquecerTutorial(

                atualizado,

                req.usuario.id

            )

    });

}


function excluir(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.id
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    if (
        tutorial.autorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir os próprios tutoriais.'

            });

    }


    removerTutorialCompleto(
        tutorial.id
    );


    return res.json({

        mensagem:
            'Tutorial excluído com sucesso.'

    });

}


module.exports = {

    listar,

    buscar,

    populares,

    buscarPorId,

    criar,

    atualizar,

    excluir

};