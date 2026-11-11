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
    'profile.css'

];


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
