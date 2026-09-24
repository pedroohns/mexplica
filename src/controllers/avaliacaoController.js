const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );

const RespostaModel =
    require(
        '../models/respostaModel'
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


// READ
function listarPorResposta(
    req,
    res
) {

    const resposta =
        RespostaModel.findById(
            req.params.respostaId
        );


    if (!resposta) {

        return res
            .status(404)
            .json({

                erro:
                    'Resposta não encontrada.'

            });

    }


    return res.json({

        respostaId:
            resposta.id,

        ...AvaliacaoModel
            .resumoDaResposta(
                resposta.id
            )

    });

}


// CREATE
function criar(
    req,
    res
) {

    const resposta =
        RespostaModel.findById(
            req.params.respostaId
        );


    if (!resposta) {

        return res
            .status(404)
            .json({

                erro:
                    'Resposta não encontrada.'

            });

    }


    // nao pode avaliar a propria resposta
    if (
        resposta.usuarioId
        === req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você não pode avaliar a própria resposta.'

            });

    }


    const existente =
        AvaliacaoModel
            .findByRespostaEAvaliador(

                resposta.id,

                req.usuario.id

            );


    if (existente) {

        return res
            .status(409)
            .json({

                erro:
                    'Você já avaliou esta resposta. Edite sua avaliação existente.'

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
        UsuarioModel.findById(
            resposta.usuarioId
        );


    const nivelAnterior =
        colaborador?.nivel
        || null;


    const avaliacao =
        AvaliacaoModel.create({

            respostaId:
                resposta.id,

            avaliadorId:
                req.usuario.id,

            nota

        });


    const atualizado =
        UsuarioModel
            .adicionarPontos(

                resposta.usuarioId,

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
                    .resumoDaResposta(
                        resposta.id
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


// UPDATE
function atualizar(
    req,
    res
) {

    const avaliacao =
        AvaliacaoModel.findById(
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


    const resposta =
        RespostaModel.findById(
            avaliacao.respostaId
        );


    if (!resposta) {

        return res
            .status(404)
            .json({

                erro:
                    'A resposta relacionada não foi encontrada.'

            });

    }


    const colaborador =
        UsuarioModel.findById(
            resposta.usuarioId
        );


    const nivelAnterior =
        colaborador?.nivel
        || null;


    // exemplo:
    // antiga = 5 estrelas = 50 pontos
    // nova   = 3 estrelas = 30 pontos
    // diferença = -20
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
        AvaliacaoModel.update(
            avaliacao.id,
            nota
        );


    const usuarioAtualizado =
        UsuarioModel
            .adicionarPontos(
                resposta.usuarioId,
                diferenca
            );


    return res.json({

        mensagem:
            'Avaliação atualizada com sucesso.',

        avaliacao:
            atualizada,

        resumo:
            AvaliacaoModel
                .resumoDaResposta(
                    resposta.id
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


// DELETE
function excluir(
    req,
    res
) {

    const avaliacao =
        AvaliacaoModel.findById(
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

    listarPorResposta,

    criar,

    atualizar,

    excluir

};