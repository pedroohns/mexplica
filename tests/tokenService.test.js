const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const TokenService = require('../src/services/tokenService');

function assinar(payload = {}, opcoes = {}, segredo = process.env.JWT_SECRET) {
    return jwt.sign({ sub: '1', ...payload }, segredo, {
        algorithm: 'HS256', issuer: 'mexplica', audience: 'mexplica-web', expiresIn: 28800,
        ...opcoes
    });
}

test('criarToken emite JWT verificável com subject e somente claims mínimas', () => {
    const token = TokenService.criarToken(1);
    const { header, payload } = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'], issuer: 'mexplica', audience: 'mexplica-web', complete: true
    });
    assert.equal(header.alg, 'HS256');
    assert.deepEqual(Object.keys(payload).sort(), ['aud', 'exp', 'iat', 'iss', 'sub']);
    assert.equal(payload.sub, '1');
    assert.equal(payload.exp - payload.iat, 28800);
    assert.equal(TokenService.verificarToken(token).sub, '1');
});

test('token adulterado não passa na assinatura', () => {
    const partes = TokenService.criarToken(1).split('.');
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
    partes[1] = Buffer.from(JSON.stringify({ ...payload, sub: '2' })).toString('base64url');
    assert.equal(TokenService.verificarToken(partes.join('.')), null);
});

test('token assinado com outra chave é rejeitado', () => {
    assert.equal(TokenService.verificarToken(assinar({}, {}, 'outra-chave-somente-de-teste')), null);
});

test('token expirado é rejeitado sem esperar tempo real', () => {
    assert.equal(TokenService.verificarToken(assinar({}, { expiresIn: -1 })), null);
});

test('token com issuer errado é rejeitado', () => {
    assert.equal(TokenService.verificarToken(assinar({}, { issuer: 'outro-emissor' })), null);
});

test('token com audience errada é rejeitado', () => {
    assert.equal(TokenService.verificarToken(assinar({}, { audience: 'outro-cliente' })), null);
});

test('algoritmos HS384, HS512 e none são rejeitados', () => {
    for (const algorithm of ['HS384', 'HS512', 'none']) {
        assert.equal(TokenService.verificarToken(assinar({}, { algorithm })), null);
    }
});

test('token ausente, malformado ou de tipo inesperado é rejeitado', () => {
    for (const token of [undefined, null, '', 'invalido', 'a.b.c', {}, ['a.b.c']]) {
        assert.equal(TokenService.verificarToken(token), null);
    }
});

test('subject inválido é rejeitado antes de chegar ao Model', () => {
    for (const sub of ['', '0', '-1', '1.2', '1e1', '01', 'abc', '9007199254740992', 1, null]) {
        assert.equal(TokenService.verificarToken(assinar({ sub })), null);
    }
    for (const id of [undefined, null, 0, -1, 1.2, 'abc']) {
        assert.throws(() => TokenService.criarToken(id), TypeError);
    }
});

test('tokens sem expiração ou sem subject são rejeitados', () => {
    const semExpiracao = jwt.sign({ sub: '1' }, process.env.JWT_SECRET, {
        issuer: 'mexplica', audience: 'mexplica-web', algorithm: 'HS256'
    });
    assert.equal(TokenService.verificarToken(semExpiracao), null);
    const semSubject = jwt.sign({}, process.env.JWT_SECRET, {
        issuer: 'mexplica', audience: 'mexplica-web', algorithm: 'HS256', expiresIn: 28800
    });
    assert.equal(TokenService.verificarToken(semSubject), null);
});

test('validade maior que oito horas e token ainda não ativo são rejeitados', () => {
    assert.equal(TokenService.verificarToken(assinar({}, { expiresIn: 28801 })), null);
    assert.equal(TokenService.verificarToken(assinar({}, { notBefore: 60 })), null);
});

test('JWT_SECRET ausente ou vazia falha explicitamente em criação e verificação, inclusive em produção', t => {
    const segredo = process.env.JWT_SECRET;
    const ambiente = process.env.NODE_ENV;
    const token = TokenService.criarToken(1);
    t.after(() => { process.env.JWT_SECRET = segredo; process.env.NODE_ENV = ambiente; });
    for (const modo of ['test', 'production']) {
        process.env.NODE_ENV = modo;
        for (const valor of [undefined, '', '   ']) {
            if (valor === undefined) delete process.env.JWT_SECRET;
            else process.env.JWT_SECRET = valor;
            assert.throws(() => TokenService.criarToken(1), { code: 'JWT_SECRET_AUSENTE' });
            assert.throws(() => TokenService.verificarToken(token), { code: 'JWT_SECRET_AUSENTE' });
        }
    }
});
