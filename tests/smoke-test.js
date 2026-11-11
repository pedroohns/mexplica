const {
    test,
    before,
    after
} = require('node:test');


const assert =
    require('node:assert/strict');


process.env.NODE_ENV =
    'test';


process.env.SESSION_SECRET =
    process.env.SESSION_SECRET
    || 'mexplica-chave-exclusiva-para-testes';


const app =
    require('../src/index');


let server;
let baseUrl;


// =============================
// INICIA SERVIDOR DE TESTE
// =============================
before(
    async () => {

        server =
            app.listen(
                0,
                '127.0.0.1'
            );


        await new Promise(
            (
                resolve,
                reject
            ) => {

                server.once(
                    'listening',
                    resolve
                );


                server.once(
                    'error',
                    reject
                );

            }
        );


        const endereco =
            server.address();


        baseUrl =
            `http://127.0.0.1:${endereco.port}`;

    }
);


// =============================
// ENCERRA SERVIDOR
// =============================
after(
    async () => {

        await new Promise(
            (
                resolve,
                reject
            ) => {

                server.close(
                    erro => {

                        if (erro) {

                            return reject(
                                erro
                            );

                        }


                        resolve();

                    }
                );

            }
        );

    }
);


// =============================
// HOME
// =============================
test(
    'GET / retorna a página inicial',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/`
            );


        assert.equal(
            resposta.status,
            200
        );

    }
);


// =============================
// HEALTH CHECK
// =============================
test(
    'GET /api/health confirma que a API está funcionando',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/health`
            );


        assert.equal(
            resposta.status,
            200
        );


        const dados =
            await resposta.json();


        assert.equal(
            dados.status,
            'ok'
        );


        assert.equal(
            dados.projeto,
            'MExplica'
        );

    }
);


// =============================
// AUTENTICAÇÃO
// =============================
test(
    'POST /api/auth/verificar encontra usuário existente',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/auth/verificar`,
                {

                    method:
                        'POST',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify({

                            identificador:
                                'lucas@mexplica.com'

                        })

                }
            );


        assert.equal(
            resposta.status,
            200
        );


        const dados =
            await resposta.json();


        assert.equal(
            dados.cadastrado,
            true
        );


        assert.equal(
            dados.proximoPasso,
            'login'
        );


        assert.equal(
            dados.usuario.nome,
            'Lucas'
        );

    }
);


// =============================
// TUTORIAIS
// =============================
test(
    'GET /api/tutoriais retorna a lista de tutoriais',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/tutoriais`
            );


        assert.equal(
            resposta.status,
            200
        );


        const dados =
            await resposta.json();


        assert.ok(
            Array.isArray(
                dados
            )
        );


        assert.ok(
            dados.length > 0
        );

    }
);


// =============================
// AUTORIZAÇÃO
// =============================
test(
    'POST /api/tutoriais bloqueia usuário não autenticado',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/tutoriais`,
                {

                    method:
                        'POST',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify({})

                }
            );


        assert.equal(
            resposta.status,
            401
        );


        const dados =
            await resposta.json();


        assert.ok(
            dados.erro
        );

    }
);


// =============================
// VIEW EJS
// =============================
test(
    'GET /comunidade renderiza a comunidade',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/comunidade`
            );


        assert.equal(
            resposta.status,
            200
        );


        const tipo =
            resposta.headers.get(
                'content-type'
            );


        assert.match(
            tipo,
            /text\/html/
        );

    }
);

// =============================
// USUÁRIOS / RANKING
// =============================
test(
    'GET /api/usuarios/ranking retorna o ranking de colaboradores',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/usuarios/ranking`
            );


        assert.equal(
            resposta.status,
            200
        );


        const dados =
            await resposta.json();


        assert.ok(
            Array.isArray(
                dados
            )
        );


        assert.ok(
            dados.length > 0
        );

    }
);


// =============================
// COMENTÁRIOS
// =============================
test(
    'GET /api/tutoriais/1/comentarios retorna comentários do tutorial',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/tutoriais/1/comentarios`
            );


        assert.equal(
            resposta.status,
            200
        );


        const dados =
            await resposta.json();


        assert.ok(
            Array.isArray(
                dados
            )
        );

    }
);


// =============================
// AVALIAÇÕES
// =============================
test(
    'GET /api/tutoriais/1/avaliacoes retorna resumo das avaliações',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/tutoriais/1/avaliacoes`
            );


        assert.equal(
            resposta.status,
            200
        );


        const dados =
            await resposta.json();


        assert.equal(
            dados.tutorialId,
            1
        );


        assert.equal(
            typeof dados.media,
            'number'
        );


        assert.equal(
            typeof dados.quantidade,
            'number'
        );

    }
);

// =============================
// PÁGINA DE PERFIL
// =============================
test(
    'GET /perfil/lucas-mendes renderiza um perfil',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/perfil/lucas-mendes`
            );


        assert.equal(
            resposta.status,
            200
        );


        const tipo =
            resposta.headers.get(
                'content-type'
            );


        assert.match(
            tipo,
            /text\/html/
        );

    }
);


// =============================
// PÁGINA DE TUTORIAL
// =============================
test(
    'GET /tutoriais/saiba-como-aumentar-a-fonte-do-celular renderiza um tutorial',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/tutoriais/saiba-como-aumentar-a-fonte-do-celular`
            );


        assert.equal(
            resposta.status,
            200
        );


        const tipo =
            resposta.headers.get(
                'content-type'
            );


        assert.match(
            tipo,
            /text\/html/
        );

    }
);

// =============================
// ARQUIVOS ESTÁTICOS
// =============================
test(
    'arquivos estáticos principais são servidos corretamente',
    async () => {

        const arquivos = [

            '/css/style.css',

            '/js/core/site.js',

            '/js/core/api.js',

            '/js/auth/cadastro.js',

            '/js/home/search-render.js',

            '/js/home/search.js',

            '/js/perfil/ui.js',
            
            '/js/perfil/account.js',

            '/js/tutorial/view.js',
            
            '/js/tutorial/editor.js',

            '/icons/favicon.ico',

            '/images/tutorials/pix-seguranca.jpg'

        ];


        for (
            const arquivo
            of arquivos
        ) {

            const resposta =
                await fetch(
                    `${baseUrl}${arquivo}`
                );


            assert.equal(

                resposta.status,

                200,

                `Falha ao carregar ${arquivo}`

            );

        }

    }
);

test(
    'home carrega o renderer antes do script principal da busca',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/`
            );


        assert.equal(
            resposta.status,
            200
        );


        const html =
            await resposta.text();


        const posicaoRenderer =
            html.indexOf(
                '/js/home/search-render.js'
            );


        const posicaoBusca =
            html.indexOf(
                '/js/home/search.js'
            );


        assert.ok(
            posicaoRenderer >= 0
        );


        assert.ok(
            posicaoBusca >= 0
        );


        assert.ok(
            posicaoRenderer
            <
            posicaoBusca
        );

    }
);

// =============================
// 404
// =============================
test(
    'rota inexistente da API retorna 404',
    async () => {

        const resposta =
            await fetch(
                `${baseUrl}/api/rota-que-nao-existe`
            );


        assert.equal(
            resposta.status,
            404
        );


        const dados =
            await resposta.json();


        assert.equal(
            dados.erro,
            'Rota não encontrada.'
        );

    }
);


// =============================
// VERCEL
// =============================
test(
    'api/index.js continua exportando a aplicação Express',
    () => {

        const appVercel =
            require('../api/index');


        assert.equal(
            appVercel,
            app
        );

    }
);