const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


function carregarUsuario(
    req,
    res,
    next
) {

    const usuarioId =
        req.session
            ?.usuarioId;


    const usuario =
        usuarioId

            ? UsuarioModel
                .findById(
                    usuarioId
                )

            : null;


    if (
        usuarioId
        &&
        !usuario
    ) {

        req.session =
            null;

    }


    req.usuario =
        usuario;


    res.locals.usuarioAtual =
        UsuarioModel
            .toPrivate(
                usuario
            );


    next();

}


function exigirAutenticacao(
    req,
    res,
    next
) {

    if (!req.usuario) {

        return res
            .status(401)
            .json({

                erro:
                    'Você precisa estar autenticado para realizar esta ação.'

            });

    }


    return next();

}


function exigirColaborador(
    req,
    res,
    next
) {

    if (!req.usuario) {

        return res
            .status(401)
            .json({

                erro:
                    'Você precisa estar autenticado para realizar esta ação.'

            });

    }


    if (
        !req.usuario.colaborador
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Apenas colaboradores podem publicar ou editar tutoriais.'

            });

    }


    return next();

}


function exigirPlatina(
    req,
    res,
    next
) {

    if (!req.usuario) {

        return res
            .status(401)
            .json({

                erro:
                    'Você precisa estar autenticado para realizar esta ação.'

            });

    }


    if (
        !req.usuario.colaborador

        ||

        req.usuario.nivel
        !== 'Platina'
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Este recurso é exclusivo para colaboradores Platina.'

            });

    }


    return next();

}


module.exports = {

    carregarUsuario,

    exigirAutenticacao,

    exigirColaborador,

    exigirPlatina

};