const DuvidaModel =
    require(
        '../models/duvidaModel'
    );

const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const RespostaModel =
    require(
        '../models/respostaModel'
    );

const {
    removerDuvidaCompleta
} =
    require(
        '../utils/relacionamentos'
    );


const CATEGORIAS = [

    'Geral',

    'Segurança',

    'Comunicação',

    'Acessibilidade',

    'Sistemas',

    'Serviços digitais'

];


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


function validarCampos({
    titulo,
    categoria,
    conteudo
}) {

    const tituloLimpo =
        String(
            titulo || ''
        ).trim();


    const categoriaLimpa =
        String(
            categoria || ''
        ).trim();


    const conteudoLimpo =
        String(
            conteudo || ''
        ).trim();


    if (
        tituloLimpo.length < 5
        ||
        tituloLimpo.length > 160
    ) {

        return {

            erro:
                'O título deve ter entre 5 e 160 caracteres.'

        };

    }


    if (
        !CATEGORIAS.includes(
            categoriaLimpa
        )
    ) {

        return {

            erro:
                'Selecione uma categoria válida.'

        };

    }


    if (
        conteudoLimpo.length < 10
        ||
        conteudoLimpo.length > 3000
    ) {

        return {

            erro:
                'Explique sua dúvida usando entre 10 e 3000 caracteres.'

        };

    }


    return {

        dados: {

            titulo:
                tituloLimpo,

            categoria:
                categoriaLimpa,

            conteudo:
                conteudoLimpo

        }

    };

}


// =============================
// READ
// =============================
function listar(
    req,
    res
) {

    return res.json(

        DuvidaModel
            .findAll()

            .map(
                enriquecerDuvida
            )

    );

}


// =============================
// BUSCA
// =============================
function buscar(
    req,
    res
) {

    const termo =
        String(
            req.query.q || ''
        ).trim();


    if (
        termo.length < 2
    ) {

        return res.json({

            termo,

            quantidade:
                0,

            resultados:
                []

        });

    }


    const resultados =
        DuvidaModel

            .buscar(
                termo
            )

            .map(
                enriquecerDuvida
            );


    return res.json({

        termo,

        quantidade:
            resultados.length,

        resultados

    });

}


function buscarPorId(
    req,
    res
) {

    const duvida =
        DuvidaModel
            .findById(
                req.params.id
            );


    if (!duvida) {

        return res
            .status(404)
            .json({

                erro:
                    'Dúvida não encontrada.'

            });

    }


    return res.json(
        enriquecerDuvida(
            duvida
        )
    );

}


// =============================
// CREATE
// =============================
function criar(
    req,
    res
) {

    const validacao =
        validarCampos(
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


    const duvida =
        DuvidaModel.create({

            usuarioId:
                req.usuario.id,

            ...validacao.dados

        });


    return res
        .status(201)
        .json({

            mensagem:
                'Dúvida enviada com sucesso.',

            duvida:
                enriquecerDuvida(
                    duvida
                )

        });

}

// =============================
// UPDATE
// =============================
function atualizar(
    req,
    res
) {

    const duvida =
        DuvidaModel.findById(
            req.params.id
        );


    if (!duvida) {

        return res
            .status(404)
            .json({

                erro:
                    'Dúvida não encontrada.'

            });

    }


    if (
        duvida.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar as próprias dúvidas.'

            });

    }


    const validacao =
        validarCampos({

            titulo:
                req.body.titulo
                ??
                duvida.titulo,

            categoria:
                req.body.categoria
                ??
                duvida.categoria,

            conteudo:
                req.body.conteudo
                ??
                duvida.conteudo

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


    const atualizada =
        DuvidaModel.update(

            duvida.id,

            validacao.dados

        );


    return res.json({

        mensagem:
            'Dúvida atualizada com sucesso.',

        duvida:
            enriquecerDuvida(
                atualizada
            )

    });

}

// =============================
// DELETE
// =============================
function excluir(
    req,
    res
) {

    const duvida =
        DuvidaModel.findById(
            req.params.id
        );


    if (!duvida) {

        return res
            .status(404)
            .json({

                erro:
                    'Dúvida não encontrada.'

            });

    }


    if (
        duvida.usuarioId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir as próprias dúvidas.'

            });

    }


    removerDuvidaCompleta(
        duvida.id
    );


    return res.json({

        mensagem:
            'Dúvida excluída com sucesso.'

    });

}


module.exports = {

    CATEGORIAS,

    listar,

    buscar,

    buscarPorId,

    criar,

    atualizar,

    excluir

};