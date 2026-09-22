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
        req.session?.usuarioId;


    const usuario =
        usuarioId

            ? UsuarioModel.findById(
                usuarioId
            )

            : null;


    req.usuario =
        usuario;


    res.locals.usuarioAtual =
        UsuarioModel.toPrivate(
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


module.exports = {

    carregarUsuario,

    exigirAutenticacao

};