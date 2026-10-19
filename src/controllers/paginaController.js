const TutorialService =
    require(
        '../services/tutorialService'
    );

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

const PerfilService =
    require(
        '../services/perfilService'
    );

const {
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
                    TutorialService.enriquecerTutorial(
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

    const dadosPerfil =
        PerfilService
            .montarPerfil(

                req.params.slug,

                req.usuario?.id
                || null

            );


    if (!dadosPerfil) {

        return res
            .status(404)
            .send(
                'Perfil não encontrado.'
            );

    }


    return res.render(
        'perfil',
        dadosPerfil
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
        TutorialService.enriquecerTutorial(

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
                TutorialService.enriquecerTutorial(

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