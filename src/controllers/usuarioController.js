const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


const {
    removerDadosDoUsuario
} =
    require(
        '../utils/relacionamentos'
    );


function listar(
    req,
    res
) {

    return res.json(

        UsuarioModel
            .findAll()

            .map(
                UsuarioModel.toPublic
            )

    );

}


function ranking(
    req,
    res
) {

    const limiteSolicitado =
        Number(
            req.query.limite
            || 10
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

                50

            )

            : 10;


    return res.json(

        UsuarioModel
            .getRanking(
                limite
            )

            .map(
                UsuarioModel.toPublic
            )

    );

}


function platinaDisponiveis(
    req,
    res
) {

    return res.json(

        UsuarioModel
            .getPlatinaDisponiveis()

            .map(
                UsuarioModel.toPublic
            )

    );

}


function buscarPorId(
    req,
    res
) {

    const usuario =
        UsuarioModel
            .findById(
                req.params.id
            );


    if (!usuario) {

        return res
            .status(404)
            .json({

                erro:
                    'Usuário não encontrado.'

            });

    }


    return res.json(

        UsuarioModel
            .toPublic(
                usuario
            )

    );

}


function atualizar(
    req,
    res
) {

    const id =
        Number(
            req.params.id
        );


    if (
        req.usuario.id
        !== id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar o próprio perfil.'

            });

    }


    const alteracoes =
        {};


    if (
        typeof req.body.nome
        === 'string'

        &&

        req.body.nome.trim()
    ) {

        alteracoes.nome =
            req.body.nome

                .trim()

                .slice(
                    0,
                    60
                );

    }


    if (
        typeof req.body.sobrenome
        === 'string'

        &&

        req.body
            .sobrenome
            .trim()
    ) {

        alteracoes.sobrenome =
            req.body.sobrenome

                .trim()

                .slice(
                    0,
                    80
                );

    }


    if (
        typeof req.body.bio
        === 'string'
    ) {

        alteracoes.bio =
            req.body.bio

                .trim()

                .slice(
                    0,
                    500
                );

    }


    if (
        req.body.idade
        !== undefined
    ) {

        const idade =
            Number(
                req.body.idade
            );


        if (
            !Number.isInteger(
                idade
            )

            ||

            idade < 10

            ||

            idade > 120
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        'Informe uma idade válida entre 10 e 120 anos.'

                });

        }


        alteracoes.idade =
            idade;

    }


    if (
        typeof req.body.genero
        === 'string'

        &&

        req.body.genero.trim()
    ) {

        alteracoes.genero =
            req.body.genero
                .trim();

    }


    if (
        req.usuario.colaborador

        &&

        Array.isArray(
            req.body.especialidades
        )
    ) {

        alteracoes.especialidades =
            req.body.especialidades

                .map(
                    item =>
                        String(item)
                            .trim()
                )

                .filter(
                    Boolean
                )

                .slice(
                    0,
                    5
                );

    }


    const usuarioAtualizado =
        UsuarioModel
            .update(

                id,

                alteracoes

            );


    return res.json({

        mensagem:
            'Perfil atualizado com sucesso.',

        usuario:
            UsuarioModel
                .toPrivate(
                    usuarioAtualizado
                )

    });

}


function atualizarDisponibilidade(
    req,
    res
) {

    const disponivel =
        req.body.disponivel
        === true

        ||

        req.body.disponivel
        === 'true';


    const usuario =
        UsuarioModel
            .definirDisponibilidade(

                req.usuario.id,

                disponivel

            );


    return res.json({

        mensagem:
            disponivel

                ? 'Você está disponível para atendimentos diretos.'

                : 'Você ficou indisponível para atendimentos diretos.',

        usuario:
            UsuarioModel
                .toPrivate(
                    usuario
                )

    });

}


function excluir(
    req,
    res
) {

    const id =
        Number(
            req.params.id
        );


    if (
        req.usuario.id
        !== id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir a própria conta.'

            });

    }


    removerDadosDoUsuario(
        id
    );


    req.session =
        null;


    return res.json({

        mensagem:
            'Conta excluída com sucesso.'

    });

}


module.exports = {

    listar,

    ranking,

    platinaDisponiveis,

    buscarPorId,

    atualizar,

    atualizarDisponibilidade,

    excluir

};