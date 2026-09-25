const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


const TutorialModel =
    require(
        '../models/tutorialModel'
    );


const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );


const {

    getCategoria,

    listarCategorias

} =
    require(
        '../utils/categorias'
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


function enriquecerTutorial(
    tutorial,
    usuarioAtualId = null
) {

    const minhaAvaliacao =
        usuarioAtualId

            ? AvaliacaoModel
                .findByTutorialEAvaliador(

                    tutorial.id,

                    usuarioAtualId

                )

            : null;


    return {

        ...tutorial,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel
                        .findById(
                            tutorial.autorId
                        )

                ),

        categoria:
            getCategoria(
                tutorial.categoriaId
            ),

        avaliacao:
            AvaliacaoModel
                .resumoDoTutorial(
                    tutorial.id
                ),

        quantidadeComentarios:
            ComentarioModel
                .findByTutorialId(
                    tutorial.id
                )
                .length,

        minhaAvaliacao:
            minhaAvaliacao

                ? {

                    id:
                        minhaAvaliacao.id,

                    nota:
                        minhaAvaliacao.nota

                }

                : null

    };

}


function comunidade(
    req,
    res
) {

    const ranking =
        UsuarioModel

            .getRanking(10)

            .map(
                UsuarioModel.toPublic
            );


    const tutoriaisEmAlta =
        TutorialModel

            .maisAcessadosDaSemana(
                6
            )

            .map(
                tutorial =>
                    enriquecerTutorial(
                        tutorial
                    )
            );


    return res.render(
        'comunidade',
        {

            ranking,

            tutoriaisEmAlta

        }
    );

}


function perfil(
    req,
    res
) {

    const usuario =
        UsuarioModel
            .findBySlug(
                req.params.slug
            );


    if (!usuario) {

        return res
            .status(404)
            .send(
                'Perfil não encontrado.'
            );

    }


    const tutoriais =
        TutorialModel

            .findByAutorId(
                usuario.id
            )

            .map(
                tutorial =>

                    enriquecerTutorial(

                        tutorial,

                        req.usuario?.id
                        || null

                    )
            );


    const comentariosFeitos =
        ComentarioModel
            .findByUserId(
                usuario.id
            );


    const avaliacoesFeitas =
        AvaliacaoModel
            .findByAvaliadorId(
                usuario.id
            );


    const avaliacoesRecebidas =
        tutoriais.flatMap(
            tutorial =>

                AvaliacaoModel
                    .findByTutorialId(
                        tutorial.id
                    )
        );


    const mediaGeral =
        avaliacoesRecebidas.length

            ? Number(

                (
                    avaliacoesRecebidas
                        .reduce(
                            (
                                soma,
                                item
                            ) =>
                                soma
                                +
                                item.nota,
                            0
                        )

                    /

                    avaliacoesRecebidas
                        .length
                )

                .toFixed(1)

            )

            : 0;


    return res.render(
        'perfil',
        {

            perfil:
                UsuarioModel
                    .toPublic(
                        usuario
                    ),

            tutoriais,

            estatisticas: {

                totalTutoriais:
                    tutoriais.length,

                totalComentarios:
                    comentariosFeitos
                        .length,

                totalAvaliacoesFeitas:
                    avaliacoesFeitas
                        .length,

                totalAvaliacoesRecebidas:
                    avaliacoesRecebidas
                        .length,

                mediaGeral

            }

        }
    );

}


function tutorial(
    req,
    res
) {

    const encontrado =
        TutorialModel
            .findBySlug(
                req.params.slug
            );


    if (!encontrado) {

        return res
            .status(404)
            .send(
                'Tutorial não encontrado.'
            );

    }


    TutorialModel
        .incrementarVisualizacao(
            encontrado.id
        );


    const tutorialAtualizado =
        TutorialModel
            .findById(
                encontrado.id
            );


    const usuarioAtualId =
        req.usuario?.id
        || null;


    const tutorialCompleto =
        enriquecerTutorial(

            tutorialAtualizado,

            usuarioAtualId

        );


    const comentarios =
        ComentarioModel

            .findByTutorialId(
                tutorialAtualizado.id
            )

            .map(
                enriquecerComentario
            );


    return res.render(
        'tutorial',
        {

            tutorial:
                tutorialCompleto,

            comentarios

        }
    );

}


function novoTutorial(
    req,
    res
) {

    if (!req.usuario) {

        const redirect =
            encodeURIComponent(
                '/tutoriais/novo'
            );


        return res.redirect(
            `/cadastro.html?redirect=${redirect}`
        );

    }


    if (
        !req.usuario.colaborador
    ) {

        return res
            .status(403)
            .send(
                'Apenas colaboradores podem publicar tutoriais.'
            );

    }


    return res.render(
        'editor-tutorial',
        {

            modo:
                'criar',

            tutorial:
                null,

            categorias:
                listarCategorias()

        }
    );

}


function editarTutorial(
    req,
    res
) {

    if (!req.usuario) {

        const destino =
            `/tutoriais/${req.params.slug}/editar`;


        const redirect =
            encodeURIComponent(
                destino
            );


        return res.redirect(
            `/cadastro.html?redirect=${redirect}`
        );

    }


    const tutorial =
        TutorialModel
            .findBySlug(
                req.params.slug
            );


    if (!tutorial) {

        return res
            .status(404)
            .send(
                'Tutorial não encontrado.'
            );

    }


    if (
        !req.usuario.colaborador

        ||

        tutorial.autorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .send(
                'Você só pode editar os próprios tutoriais.'
            );

    }


    return res.render(
        'editor-tutorial',
        {

            modo:
                'editar',

            tutorial:
                enriquecerTutorial(

                    tutorial,

                    req.usuario.id

                ),

            categorias:
                listarCategorias()

        }
    );

}


module.exports = {

    comunidade,

    perfil,

    tutorial,

    novoTutorial,

    editarTutorial

};