const {
    test
} =
    require(
        'node:test'
    );


const assert =
    require(
        'node:assert/strict'
    );


const {
    spawnSync
} =
    require(
        'node:child_process'
    );


const path =
    require(
        'node:path'
    );
    

const fs =
    require(
        'node:fs'
    );


const arquivos = [

    'public/js/core/site.js',

    'public/js/core/api.js',

    'public/js/auth/cadastro.js',

    'public/js/home/search-render.js',

    'public/js/home/search.js',

    'public/js/perfil.js',

    'public/js/tutorial.js',

    'public/js/editor-tutorial.js'

];


test(
    'API compartilhada é carregada antes dos scripts que dependem dela',
    () => {

        const paginas = [

            {
                arquivo:
                    'public/index.html',

                consumidor:
                    '/js/home/search.js'
            },

            {
                arquivo:
                    'public/cadastro.html',

                consumidor:
                    '/js/auth/cadastro.js'
            },

            {
                arquivo:
                    'src/views/perfil.ejs',

                consumidor:
                    '/js/perfil.js'
            },

            {
                arquivo:
                    'src/views/tutorial.ejs',

                consumidor:
                    '/js/tutorial.js'
            },

            {
                arquivo:
                    'src/views/editor-tutorial.ejs',

                consumidor:
                    '/js/editor-tutorial.js'
            }

        ];


        paginas.forEach(
            ({
                arquivo,
                consumidor
            }) => {

                const caminho =
                    path.resolve(
                        __dirname,
                        '..',
                        arquivo
                    );


                const conteudo =
                    fs.readFileSync(
                        caminho,
                        'utf8'
                    );


                const posicaoApi =
                    conteudo.indexOf(
                        '/js/core/api.js'
                    );


                const posicaoConsumidor =
                    conteudo.indexOf(
                        consumidor
                    );


                assert.ok(
                    posicaoApi >= 0,
                    `${arquivo} não carrega /js/core/api.js`
                );


                assert.ok(
                    posicaoConsumidor >= 0,
                    `${arquivo} não carrega ${consumidor}`
                );


                assert.ok(
                    posicaoApi
                    <
                    posicaoConsumidor,
                    `${arquivo} precisa carregar api.js antes de ${consumidor}`
                );

            }
        );

    }
);


test(
    'JavaScript do frontend possui sintaxe válida',
    () => {

        arquivos.forEach(
            arquivo => {

                const caminho =
                    path.resolve(
                        __dirname,
                        '..',
                        arquivo
                    );


                const resultado =
                    spawnSync(

                        process.execPath,

                        [
                            '--check',
                            caminho
                        ],

                        {
                            encoding:
                                'utf8'
                        }

                    );


                assert.equal(

                    resultado.status,

                    0,

                    `Erro de sintaxe em ${arquivo}:\n${resultado.stderr}`

                );

            }
        );

    }
);