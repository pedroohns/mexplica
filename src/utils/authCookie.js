const { CONFIGURACAO } = require('../services/tokenService');

const NOME_COOKIE = 'mexplica_token';

function opcoesCookie() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    };
}

function definirCookie(res, token) {
    res.cookie(NOME_COOKIE, token, {
        ...opcoesCookie(),
        maxAge: CONFIGURACAO.expiraEm * 1000
    });
}

function limparCookie(res) {
    // clearCookie define sua própria expiração; os demais atributos são os mesmos.
    res.clearCookie(NOME_COOKIE, opcoesCookie());
}

module.exports = { NOME_COOKIE, definirCookie, limparCookie };
