const {
    test
} = require(
    'node:test'
);


const assert =
    require(
        'node:assert/strict'
    );


const fs =
    require(
        'node:fs'
    );


const path =
    require(
        'node:path'
    );


const arquivosCss = [

    'base.css',
    'home.css',
    'auth.css',
    'community.css',
    'tutorial.css',
    'search.css',
    'profile.css',
    'mexplicai.css',
    'admin.css'

];

function declaracoesAdmin(seletor) {
    const css = fs.readFileSync(path.join(__dirname, '../public/css/admin.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const regra = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].find(item => item[1].trim() === seletor);
    assert.ok(regra, `Regra administrativa ausente: ${seletor}`);
    return Object.fromEntries(regra[2].split(';').filter(item => item.includes(':')).map(item => {
        const indice = item.indexOf(':');
        return [item.slice(0, indice).trim(), item.slice(indice + 1).trim()];
    }));
}

function contraste(corA, corB) {
    const luminancia = hexadecimal => {
        const valor = hexadecimal.replace('#', '');
        const completa = valor.length === 3 ? [...valor].map(parte => parte + parte).join('') : valor;
        return completa.match(/../g).map(parte => parseInt(parte, 16) / 255)
            .map(parte => parte <= .04045 ? parte / 12.92 : ((parte + .055) / 1.055) ** 2.4)
            .reduce((total, parte, indice) => total + parte * [.2126, .7152, .0722][indice], 0);
    };
    const maior = Math.max(luminancia(corA), luminancia(corB)), menor = Math.min(luminancia(corA), luminancia(corB));
    return (maior + .05) / (menor + .05);
}

test('botões primários administrativos mantêm contraste de texto AA no estado normal e hover', () => {
    for (const estado of ['', ':hover']) {
        const regra = declaracoesAdmin('body.admin-page :is(.mexp-primary-button, .mexp-primary-link, .btn-acessar)' + estado);
        assert.ok(contraste(regra.color, regra.background) >= 4.5, 'Texto de botão administrativo deve atingir 4.5:1');
    }
});

test('descrições do menu de acessibilidade administrativo usam texto legível nos dois temas', () => {
    assert.equal(declaracoesAdmin('.admin-page #menu-acc span + span').color, 'var(--admin-muted) !important');
    const claro = declaracoesAdmin('.admin-page'), escuro = declaracoesAdmin('.admin-page.dark-blue');
    assert.ok(contraste(claro['--admin-muted'], '#ffffff') >= 4.5);
    assert.ok(contraste(escuro['--admin-muted'], '#1a2535') >= 4.5);
    assert.ok(contraste(escuro['--admin-muted'], '#223344') >= 4.5);
});


test(
    'arquivos CSS modulares existem e possuem conteúdo',
    () => {

        arquivosCss.forEach(
            arquivo => {

                const caminho =
                    path.resolve(
                        __dirname,
                        '..',
                        'public',
                        'css',
                        arquivo
                    );


                assert.equal(
                    fs.existsSync(
                        caminho
                    ),
                    true,
                    `Arquivo CSS não encontrado: ${arquivo}`
                );


                const conteudo =
                    fs.readFileSync(
                        caminho,
                        'utf8'
                    );


                assert.ok(
                    conteudo.trim().length > 0,
                    `Arquivo CSS vazio: ${arquivo}`
                );

            }
        );

    }
);


test(
    'style.css importa os módulos na ordem correta da cascata',
    () => {

        const caminho =
            path.resolve(
                __dirname,
                '..',
                'public',
                'css',
                'style.css'
            );


        const conteudo =
            fs.readFileSync(
                caminho,
                'utf8'
            );


        let posicaoAnterior =
            -1;


        arquivosCss.forEach(
            arquivo => {

                const importacao =
                    `@import url('./${arquivo}');`;


                const posicaoAtual =
                    conteudo.indexOf(
                        importacao
                    );


                assert.ok(
                    posicaoAtual >= 0,
                    `Import ausente em style.css: ${arquivo}`
                );


                assert.ok(
                    posicaoAtual > posicaoAnterior,
                    `Ordem incorreta dos imports em style.css: ${arquivo}`
                );


                posicaoAnterior =
                    posicaoAtual;

            }
        );

    }
);
