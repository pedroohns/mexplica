const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');

function listarArquivos(diretorio) {
    return fs.readdirSync(diretorio, { withFileTypes: true }).flatMap(item => {
        const caminho = path.join(diretorio, item.name);
        return item.isDirectory() ? listarArquivos(caminho) : [caminho];
    });
}

test('URLs estáticas de HTML, EJS e CSS apontam para arquivos públicos com caixa exata', () => {
    const publicos = listarArquivos(path.join(raiz, 'public'));
    const caminhos = new Set(publicos.map(arquivo => path.relative(raiz, arquivo).replaceAll('\\', '/')));
    const fontes = [...publicos.filter(arquivo => /\.(html|css)$/.test(arquivo)),
        ...listarArquivos(path.join(raiz, 'src', 'views')).filter(arquivo => arquivo.endsWith('.ejs'))];

    for (const arquivo of fontes) {
        const conteudo = fs.readFileSync(arquivo, 'utf8');
        const css = arquivo.endsWith('.css');
        if (!css && !arquivo.includes(`${path.sep}partials${path.sep}`)) {
            assert.match(conteudo, /<link\b[^>]*rel=['"](?:shortcut )?icon['"][^>]*href=['"]\/?icons\/favicon\.ico['"]/i,
                `${path.relative(raiz, arquivo)}: declarar o favicon existente evita o request automático /favicon.ico`);
        }
        const referencias = css
            ? [...conteudo.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)].map(item => item[1])
            : [...conteudo.matchAll(/(?:src|href)\s*=\s*['"]([^'"]+)['"]/g)].map(item => item[1]);
        const base = css ? '/' + path.relative(path.join(raiz, 'public'), arquivo).replaceAll('\\', '/') : '/';

        for (const referencia of referencias) {
            if (/^(https?:|data:|\/\/|#|mailto:|tel:)/i.test(referencia) || referencia.includes('<%')) continue;
            if (!/\.(css|js|png|jpe?g|webp|svg|ico|otf|ttf|woff2?)(?:[?#]|$)/i.test(referencia)) continue;
            const destino = 'public' + decodeURIComponent(new URL(referencia, 'https://mexplica.test' + base).pathname);
            assert.ok(caminhos.has(destino), `${path.relative(raiz, arquivo)}: asset ausente ou caixa incorreta: ${referencia}`);
        }
    }
});
