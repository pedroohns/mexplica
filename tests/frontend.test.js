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


const arquivos = [

    'public/js/core/site.js',

    'public/js/auth/cadastro.js',

    'public/js/home-search.js',

    'public/js/perfil.js',

    'public/js/tutorial.js',

    'public/js/editor-tutorial.js'

];


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