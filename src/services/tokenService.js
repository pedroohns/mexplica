const jwt = require('jsonwebtoken');

const CONFIGURACAO = Object.freeze({
    algoritmo: 'HS256',
    issuer: 'mexplica',
    audience: 'mexplica-web',
    expiraEm: 8 * 60 * 60 // segundos
});

function validarConfiguracao() {
    const segredo = process.env.JWT_SECRET;
    if (!segredo || !segredo.trim()) {
        throw Object.assign(new Error('JWT_SECRET não configurada para autenticação.'), {
            code: 'JWT_SECRET_AUSENTE'
        });
    }
    return segredo;
}

function subjectValido(subject) {
    return typeof subject === 'string'
        && /^[1-9]\d*$/.test(subject)
        && Number.isSafeInteger(Number(subject));
}

function criarToken(usuarioId) {
    const segredo = validarConfiguracao();
    const subject = String(usuarioId);
    if (!subjectValido(subject)) throw new TypeError('ID de usuário inválido para autenticação.');

    return jwt.sign({}, segredo, {
        subject,
        algorithm: CONFIGURACAO.algoritmo,
        issuer: CONFIGURACAO.issuer,
        audience: CONFIGURACAO.audience,
        expiresIn: CONFIGURACAO.expiraEm
    });
}

function verificarToken(token) {
    // Configuração ausente é falha do servidor, não uma credencial inválida.
    const segredo = validarConfiguracao();
    if (typeof token !== 'string' || !token) return null;

    try {
        const payload = jwt.verify(token, segredo, {
            algorithms: [CONFIGURACAO.algoritmo],
            issuer: CONFIGURACAO.issuer,
            audience: CONFIGURACAO.audience,
            maxAge: CONFIGURACAO.expiraEm
        });

        if (!subjectValido(payload.sub)
            || !Number.isInteger(payload.iat)
            || !Number.isInteger(payload.exp)
            || payload.exp <= payload.iat
            || payload.exp - payload.iat > CONFIGURACAO.expiraEm) return null;

        return payload;
    } catch (erro) {
        if (erro instanceof jwt.JsonWebTokenError) return null;
        throw erro;
    }
}

module.exports = { CONFIGURACAO, validarConfiguracao, criarToken, verificarToken };
