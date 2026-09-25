const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );


const TutorialModel =
    require(
        '../models/tutorialModel'
    );


const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


const {
    removerAvaliacaoComAjuste
} =
    require(
        '../utils/relacionamentos'
    );


function validarNota(
    nota
) {

    const numero =
        Number(
            nota
        );


    return (
        Number.isInteger(
            numero
        )

        &&

        numero >= 1

        &&

        numero <= 5
    )

        ? numero

        : null;

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


    return res.json({

        tutorialId:
            tutorial.id,

        ...AvaliacaoModel
            .resumoDoTutorial(
                tutorial.id
            )

    });

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


    if (
        tutorial.autorId
        === req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você não pode avaliar o próprio tutorial.'

            });

    }


    const existente =
        AvaliacaoModel
            .findByTutorialEAvaliador(

                tutorial.id,

                req.usuario.id

            );


    if (existente) {

        return res
            .status(409)
            .json({

                erro:
                    'Você já avaliou este tutorial. Edite sua avaliação existente.'

            });

    }


    const nota =
        validarNota(
            req.body.nota
        );


    if (!nota) {

        return res
            .status(400)
            .json({

                erro:
                    'A avaliação deve ser uma nota inteira de 1 a 5.'

            });

    }


    const colaborador =
        UsuarioModel
            .findById(
                tutorial.autorId
            );


    const nivelAnterior =
        colaborador?.nivel
        || null;


    const avaliacao =
        AvaliacaoModel
            .create({

                tutorialId:
                    tutorial.id,

                avaliadorId:
                    req.usuario.id,

                nota

            });


    const atualizado =
        UsuarioModel
            .adicionarPontos(

                tutorial.autorId,

                AvaliacaoModel
                    .pontosPorNota(
                        nota
                    )

            );


    return res
        .status(201)
        .json({

            mensagem:
                'Avaliação registrada com sucesso.',

            avaliacao,

            resumo:
                AvaliacaoModel
                    .resumoDoTutorial(
                        tutorial.id
                    ),

            colaborador:
                UsuarioModel
                    .toPublic(
                        atualizado
                    ),

            mudouNivel:
                Boolean(

                    atualizado

                    &&

                    nivelAnterior
                    !== atualizado.nivel

                ),

            nivelAnterior,

            nivelAtual:
                atualizado?.nivel
                || null

        });

}


function atualizar(
    req,
    res
) {

    const avaliacao =
        AvaliacaoModel
            .findById(
                req.params.id
            );


    if (!avaliacao) {

        return res
            .status(404)
            .json({

                erro:
                    'Avaliação não encontrada.'

            });

    }


    if (
        avaliacao.avaliadorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar a própria avaliação.'

            });

    }


    const nota =
        validarNota(
            req.body.nota
        );


    if (!nota) {

        return res
            .status(400)
            .json({

                erro:
                    'A avaliação deve ser uma nota inteira de 1 a 5.'

            });

    }


    const tutorial =
        TutorialModel
            .findById(
                avaliacao.tutorialId
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'O tutorial relacionado não foi encontrado.'

            });

    }


    const colaborador =
        UsuarioModel
            .findById(
                tutorial.autorId
            );


    const nivelAnterior =
        colaborador?.nivel
        || null;


    /*
        Exemplo:

        nota antiga = 5 - 50 pontos
        nota nova   = 3 - 30 pontos

        diferença = -20
    */

    const diferenca =

        AvaliacaoModel
            .pontosPorNota(
                nota
            )

        -

        AvaliacaoModel
            .pontosPorNota(
                avaliacao.nota
            );


    const atualizada =
        AvaliacaoModel
            .update(

                avaliacao.id,

                nota

            );


    const usuarioAtualizado =
        UsuarioModel
            .adicionarPontos(

                tutorial.autorId,

                diferenca

            );


    return res.json({

        mensagem:
            'Avaliação atualizada com sucesso.',

        avaliacao:
            atualizada,

        resumo:
            AvaliacaoModel
                .resumoDoTutorial(
                    tutorial.id
                ),

        colaborador:
            UsuarioModel
                .toPublic(
                    usuarioAtualizado
                ),

        mudouNivel:
            Boolean(

                usuarioAtualizado

                &&

                nivelAnterior
                !== usuarioAtualizado.nivel

            ),

        nivelAnterior,

        nivelAtual:
            usuarioAtualizado?.nivel
            || null

    });

}


function excluir(
    req,
    res
) {

    const avaliacao =
        AvaliacaoModel
            .findById(
                req.params.id
            );


    if (!avaliacao) {

        return res
            .status(404)
            .json({

                erro:
                    'Avaliação não encontrada.'

            });

    }


    if (
        avaliacao.avaliadorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir a própria avaliação.'

            });

    }


    removerAvaliacaoComAjuste(
        avaliacao.id
    );


    return res.json({

        mensagem:
            'Avaliação removida com sucesso.'

    });

}


module.exports = {

    listarPorTutorial,

    criar,

    atualizar,

    excluir

};