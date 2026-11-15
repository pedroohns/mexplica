const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ler = arquivo => fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
const source = ler('public/js/core/site.js');

// DOM mínimo para testar somente o carregador, sem rede nem bibliotecas.
function ambiente({ preloaded = false, throws = false, existingScript = false } = {}) {
    const elements = [];
    class Element extends EventTarget {
        constructor(tag) { super(); this.tagName = tag; this.dataset = {}; this.attrs = {}; this.children = []; elements.push(this); }
        setAttribute(key, value) { this.attrs[key] = value; }
        append(...children) { this.children.push(...children); }
        appendChild(child) { this.append(child); }
    }
    const document = {
        readyState: 'complete', body: new Element('body'), head: new Element('head'),
        createElement: tag => new Element(tag), addEventListener() {},
        querySelector(selector) {
            return selector === '[vw]' ? elements.find(e => Object.hasOwn(e.attrs, 'vw'))
                : elements.find(e => e.tagName === 'script' && e.src === 'https://vlibras.gov.br/app/vlibras-plugin.js');
        }
    };
    let calls = 0;
    const styles = () => ({ properties: {}, setProperty(key, value, priority = '') { this.properties[key] = { value, priority }; } });
    const access = { style: styles() };
    const initBtn = { style: styles() };
    const Widget = function (options) {
        calls++;
        assert.equal(options.rootPath, 'https://vlibras.gov.br/app');
        assert.equal(options.position, 'L');
        if (throws) throw Error('externo');
        window.VLibrasWidget = { access, initBtn };
    };
    const window = preloaded ? { VLibras: { Widget } } : {};
    if (existingScript) { const script = new Element('script'); script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'; document.head.appendChild(script); }
    const context = vm.createContext({ document, window });
    vm.runInContext(source, context);
    return { document, window, elements, context, Widget, access, initBtn, calls: () => calls };
}

test('VLibras global aguarda load e inicializa somente uma vez, inclusive com site.js repetido', async () => {
    const a = ambiente();
    const first = a.window.MExplicaVLibras.inicializar();
    assert.equal(a.calls(), 0);
    assert.equal(a.elements.filter(e => e.tagName === 'script').length, 1);
    a.window.VLibras = { Widget: a.Widget };
    a.document.querySelector('script').dispatchEvent(new Event('load'));
    assert.equal(await first, true);
    vm.runInContext(source, a.context);
    await a.window.MExplicaVLibras.inicializar();
    assert.equal(a.calls(), 1);
    assert.equal(a.elements.filter(e => Object.hasOwn(e.attrs, 'vw')).length, 1);
});

test('VLibras reaproveita biblioteca já carregada ou script ainda em carregamento', async () => {
    const loaded = ambiente({ preloaded: true });
    assert.equal(await loaded.window.MExplicaVLibras.inicializar(), true);
    assert.equal(loaded.calls(), 1);
    assert.equal(loaded.elements.filter(e => e.tagName === 'script').length, 0);
    const pending = ambiente({ existingScript: true });
    pending.window.VLibras = { Widget: pending.Widget };
    pending.document.querySelector('script').dispatchEvent(new Event('load'));
    assert.equal(await pending.window.MExplicaVLibras.inicializar(), true);
    assert.equal(pending.elements.filter(e => e.tagName === 'script').length, 1);
});

test('VLibras tolera erro de rede, biblioteca ausente e falha no construtor', async () => {
    for (const event of ['error', 'load']) {
        const a = ambiente();
        a.document.querySelector('script').dispatchEvent(new Event(event));
        assert.equal(await a.window.MExplicaVLibras.inicializar(), false);
        assert.equal(a.calls(), 0);
    }
    const a = ambiente({ preloaded: true, throws: true });
    assert.equal(await a.window.MExplicaVLibras.inicializar(), false);
});

test('todas as páginas principais carregam site.js e não duplicam integração do VLibras', () => {
    for (const file of ['public/index.html', 'public/cadastro.html', 'src/views/comunidade.ejs',
        'src/views/perfil.ejs', 'src/views/tutorial.ejs', 'src/views/editor-tutorial.ejs']) {
        const html = ler(file);
        assert.equal((html.match(/src="\/js\/core\/site.js"/g) || []).length, 1, file);
        assert.doesNotMatch(html, /vlibras-plugin\.js|new window\.VLibras|vw-access-button/, file);
    }
});

test('posição do host legado do VLibras é global à esquerda e acima do painel MExplicAI', () => {
    const css = ler('public/css/base.css');
    const host = css.match(/#mexplicaVLibras\[vw\]\s*\{([^}]+)\}/)[1];
    assert.match(host, /left: max\(16px, env\(safe-area-inset-left\)\) !important/);
    assert.match(host, /right: auto !important/);
    assert.match(host, /position: fixed !important/);
    assert.match(host, /z-index: 600 !important/);
});

test('posiciona o acesso real do VLibras e usa altura responsiva sem alterar bottom', async () => {
    const a = ambiente({ preloaded: true });
    assert.equal(await a.window.MExplicaVLibras.inicializar(), true);
    assert.deepEqual(a.access.style.properties.left, { value: 'max(20px, env(safe-area-inset-left))', priority: 'important' });
    assert.deepEqual(a.access.style.properties.right, { value: 'auto', priority: 'important' });
    assert.deepEqual(a.initBtn.style.properties.left, { value: '0', priority: 'important' });
    assert.deepEqual(a.initBtn.style.properties.right, { value: 'auto', priority: 'important' });
    assert.deepEqual(a.access.style.properties.top, { value: 'var(--mexplica-vlibras-top, calc(50vh - 20px))', priority: 'important' });
    assert.equal(a.access.style.properties.bottom, undefined);
});
