const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const DuvidaModel =
    require(
        '../models/duvidaModel'
    );

const RespostaModel =
    require(
        '../models/respostaModel'
    );

const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );


function enriquecerResposta(
    resposta,
    usuarioAtualId = null
) {

    const minhaAvaliacao =
        usuarioAtualId

            ? AvaliacaoModel
                .findByRespostaEAvaliador(
                    resposta.id,
                    usuarioAtualId
                )

            : null;


    return {

        ...resposta,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel
                        .findById(
                            resposta.usuarioId
                        )

                ),

        duvida:
            DuvidaModel.findById(
                resposta.duvidaId
            ),

        avaliacao:
            AvaliacaoModel
                .resumoDaResposta(
                    resposta.id
                ),

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


function enriquecerDuvida(
    duvida
) {

    return {

        ...duvida,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel
                        .findById(
                            duvida.usuarioId
                        )

                ),

        quantidadeRespostas:
            RespostaModel
                .findByDuvidaId(
                    duvida.id
                )
                .length

    };

}


// =============================
// COMUNIDADE
// =============================
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


    const maioresDuvidas =
        DuvidaModel

            .maioresDaSemana(6)

            .map(
                enriquecerDuvida
            );


    return res.render(
        'comunidade',
        {

            ranking,

            maioresDuvidas

        }
    );

}


// =============================
// PERFIL
// =============================
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


    const duvidas =
        DuvidaModel

            .findByUserId(
                usuario.id
            )

            .map(
                enriquecerDuvida
            );


    const respostas =
        RespostaModel

            .findByUserId(
                usuario.id
            )

            .map(
                resposta =>
                    enriquecerResposta(
                        resposta,
                        req.usuario?.id
                        || null
                    )
            );


    const avaliacoesRecebidas =
        respostas.flatMap(
            resposta =>
                AvaliacaoModel
                    .findByRespostaId(
                        resposta.id
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
                ).toFixed(1)
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

            duvidas,

            respostas,

            estatisticas: {

                totalDuvidas:
                    duvidas.length,

                totalRespostas:
                    respostas.length,

                totalAvaliacoes:
                    avaliacoesRecebidas
                        .length,

                mediaGeral

            }

        }
    );

}


// =============================
// PAGINA DA DUVIDA
// =============================
function duvida(
    req,
    res
) {

    const encontrada =
        DuvidaModel
            .findBySlug(
                req.params.slug
            );


    if (!encontrada) {

        return res
            .status(404)
            .send(
                'Dúvida não encontrada.'
            );

    }


    DuvidaModel
        .incrementarVisualizacao(
            encontrada.id
        );


    const duvidaAtualizada =
        DuvidaModel
            .findById(
                encontrada.id
            );


    const usuarioAtualId =
        req.usuario?.id
        || null;


    const respostas =
        RespostaModel

            .findByDuvidaId(
                duvidaAtualizada.id
            )

            .map(
                resposta =>
                    enriquecerResposta(
                        resposta,
                        usuarioAtualId
                    )
            );


    return res.render(
        'duvida',
        {

            duvida:
                enriquecerDuvida(
                    duvidaAtualizada
                ),

            respostas

        }
    );

}


module.exports = {

    comunidade,

    perfil,

    duvida

};