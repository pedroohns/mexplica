const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'public/js/core/site.js'), 'utf8');

function clicar({ referrer = '', length = 1, href = '/', target = '', marcado = true, ...opcoes } = {}) {
    let voltar = 0;
    const destinos = [];
    const listeners = {};
    const link = { target, getAttribute: () => href };
    const event = {
        target: { closest: () => marcado ? link : null }, button: 0, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }, ...opcoes
    };
    const document = { referrer, addEventListener: (tipo, listener) => { listeners[tipo] = listener; } };
    const window = {
        MExplicaVLibras: {}, // O teste exercita apenas a navegação, sem rede ou DOM global.
        history: { length, back: () => { voltar++; } },
        location: { href: 'https://mexplica.test/tutoriais/novo', origin: 'https://mexplica.test', assign: destino => destinos.push(destino) }
    };
    vm.runInNewContext(source, { document, window, URL });
    listeners.click(event);
    return { voltar, destinos, interceptou: event.defaultPrevented };
}

test('Voltar usa o histórico para uma origem interna com entrada anterior', () => {
    const resultado = clicar({ referrer: 'https://mexplica.test/comunidade', length: 2, href: '/comunidade' });
    assert.equal(resultado.voltar, 1);
    assert.deepEqual(resultado.destinos, []);
    assert.equal(resultado.interceptou, true);
});

test('acesso direto, nova aba e origem externa usam o fallback interno', () => {
    for (const caso of [
        { referrer: '', length: 1 },
        { referrer: '', length: 5 },
        { referrer: 'https://mexplica.test/comunidade', length: 1 },
        { referrer: 'https://externo.test/busca', length: 2 },
        { referrer: 'https://outro.mexplica.test/', length: 3 },
        { referrer: 'http://mexplica.test/', length: 3 },
        { referrer: 'referrer inválido', length: 2 }
    ]) {
        const resultado = clicar({ ...caso, href: '/tutoriais/exemplo?origem=editor#inicio' });
        assert.equal(resultado.voltar, 0);
        assert.deepEqual(resultado.destinos, ['/tutoriais/exemplo?origem=editor#inicio']);
    }
});

test('fallback ausente, inválido ou externo é substituído pela home', () => {
    for (const href of [null, '', 'https://externo.test/', '//externo.test/', 'javascript:alert(1)', 'data:text/html,externo', 'http://[']) {
        assert.deepEqual(clicar({ href }).destinos, ['/']);
    }
});

test('Voltar preserva cliques modificados e abertura em outra aba', () => {
    for (const opcoes of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { target: '_blank' }]) {
        assert.deepEqual(clicar(opcoes), { voltar: 0, destinos: [], interceptou: false });
    }
});

test('links não marcados e eventos já tratados preservam o comportamento original', () => {
    assert.deepEqual(clicar({ marcado: false }), { voltar: 0, destinos: [], interceptou: false });
    const tratado = clicar({ defaultPrevented: true, referrer: 'https://mexplica.test/', length: 2 });
    assert.equal(tratado.voltar, 0);
    assert.deepEqual(tratado.destinos, []);
});
