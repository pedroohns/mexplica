const RespostaModel =
    require(
        '../models/respostaModel'
    );

const DuvidaModel =
    require(
        '../models/duvidaModel'
    );

const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );

const {
    removerRespostaCompleta
} =
    require(
        '../utils/relacionamentos'
    );


function normalizarMidias(
    midias
) {

    if (
        !Array.isArray(midias)
    ) {

        return [];

    }


    return midias

        .slice(
            0,
            3
        )

        .map(
            midia => ({

                tipo:
                    String(
                        midia?.tipo
                        || ''
                    )
                        .trim()
                        .toLowerCase(),

                url:
                    String(
                        midia?.url
                        || ''
                    )
                        .trim()

            })
        )

        .filter(
            midia =>

                [
                    'imagem',
                    'video'
                ].includes(
                    midia.tipo
                )

                &&

                (
                    /^https?:\/\//i
                        .test(
                            midia.url
                        )

                    ||

                    midia.url
                        .startsWith('/')
                )
        );

}


function enriquecerResposta(
    resposta,
    usuarioAtualId = null
) {

    const avaliacaoDoUsuario =
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

        avaliacao:
            AvaliacaoModel
                .resumoDaResposta(
                    resposta.id
                ),

        minhaAvaliacao:
            avaliacaoDoUsuario

                ? {

                    id:
                        avaliacaoDoUsuario.id,

                    nota:
                        avaliacaoDoUsuario.nota

                }

                : null

    };

}


// READ
function listarPorDuvida(
    req,
    res
) {

    const duvida =
        DuvidaModel.findById(
            req.params.duvidaId
        );


    if (!duvida) {

        return res
            .status(404)
            .json({

                erro:
                    'Dúvida não encontrada.'

            });

    }


    const usuarioAtualId =
        req.usuario?.id
        || null;


    return res.json(

        RespostaModel

            .findByDuvidaId(
                duvida.id
            )

            .map(
                resposta =>
                    enriquecerResposta(
                        resposta,
                        usuarioAtualId
                    )
            )

    );

}


// CREATE
function criar(
    req,
    res
) {

    const duvida =
        DuvidaModel.findById(
            req.params.duvidaId
        );


    if (!duvida) {

        return res
            .status(404)
            .json({

                erro:
                    'Dúvida não encontrada.'

            });

    }


    const texto =
        String(
            req.body.texto
            || ''
        ).trim();


    if (
        texto.length < 10
        ||
        texto.length > 4000
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'A resposta deve ter entre 10 e 4000 caracteres.'

            });

    }


    const resposta =
        RespostaModel.create({

            duvidaId:
                duvida.id,

            usuarioId:
                req.usuario.id,

            texto,

            midias:
                normalizarMidias(
                    req.body.midias
                )

        });


    return res
        .status(201)
        .json({

            mensagem:
                'Resposta enviada com sucesso.',

            resposta:
                enriquecerResposta(
                    resposta,
                    req.usuario.id
                )

        });

}


// UPDATE
function atualizar(
    req,
    res
) {

    const resposta =
        RespostaModel.findById(
            req.params.id
        );


    if (!resposta) {

        return res
            .status(404)
            .json({

                erro:
                    'Resposta não encontrada.'

            });

    }


    if (
        resposta.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar as próprias respostas.'

            });

    }


    const texto =
        String(
            req.body.texto
            ??
            resposta.texto
        ).trim();


    if (
        texto.length < 10
        ||
        texto.length > 4000
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'A resposta deve ter entre 10 e 4000 caracteres.'

            });

    }


    const alteracoes = {
        texto
    };


    if (
        req.body.midias
        !== undefined
    ) {

        alteracoes.midias =
            normalizarMidias(
                req.body.midias
            );

    }


    const atualizada =
        RespostaModel.update(

            resposta.id,

            alteracoes

        );


    return res.json({

        mensagem:
            'Resposta atualizada com sucesso.',

        resposta:
            enriquecerResposta(
                atualizada,
                req.usuario.id
            )

    });

}


// DELETE
function excluir(
    req,
    res
) {

    const resposta =
        RespostaModel.findById(
            req.params.id
        );


    if (!resposta) {

        return res
            .status(404)
            .json({

                erro:
                    'Resposta não encontrada.'

            });

    }


    if (
        resposta.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir as próprias respostas.'

            });

    }


    removerRespostaCompleta(
        resposta.id
    );


    return res.json({

        mensagem:
            'Resposta excluída com sucesso.'

    });

}


module.exports = {

    listarPorDuvida,

    criar,

    atualizar,

    excluir

};