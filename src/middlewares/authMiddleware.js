const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const TokenService = require('../services/tokenService');
const { NOME_COOKIE, limparCookie } = require('../utils/authCookie');

async function carregarUsuario(
    req,
    res,
    next
) {

    const authorization = req.get('authorization') || '';
    const usarBearer = req.path.startsWith('/api/') && /^Bearer(?:\s|$)/i.test(authorization);
    const cookie = req.cookies?.[NOME_COOKIE];
    let usuario = null;

    if (usarBearer || cookie !== undefined) {
        // Bearer explícito sempre vence, inclusive quando vazio ou malformado.
        const token = usarBearer
            ? (/^Bearer[ \t]+(\S+)$/i.exec(authorization)?.[1] || '')
            : cookie;
        const payload = TokenService.verificarToken(token);
        if (payload) usuario = await UsuarioModel.findById(payload.sub);
        if (!usuario && !usarBearer) limparCookie(res);
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


function exigirAdministrador(
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
        req.usuario.administrador !== true
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Esta ação é restrita à administração do MExplica.'

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

    exigirAdministrador,

    exigirPlatina

};
