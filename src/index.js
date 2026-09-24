require('dotenv').config();

const express =
    require('express');

const path =
    require('path');


const cookieSession =
    require(
        'cookie-session'
    );

const authRoutes =
    require(
        './routes/authRoutes'
    );

const usuarioRoutes =
    require(
        './routes/usuarioRoutes'
    );

const duvidaRoutes =
    require(
        './routes/duvidaRoutes'
    );

const respostaRoutes =
    require(
        './routes/respostaRoutes'
    );

const avaliacaoRoutes =
    require(
        './routes/avaliacaoRoutes'
    );

const paginaRoutes =
    require(
        './routes/paginaRoutes'
    );

const {
    carregarUsuario
} =
    require(
        './middlewares/authMiddleware'
    );

const app =
    express();

const PORT =
    process.env.PORT
    || 3000;


// =============================
// EXPRESS
// =============================
app.set(
    'trust proxy',
    1
);


app.set(
    'view engine',
    'ejs'
);


app.set(

    'views',

    path.join(
        __dirname,
        'views'
    )

);


// =============================
// BODY
// =============================
app.use(

    express.json({
        limit: '1mb'
    })

);


app.use(

    express.urlencoded({
        extended: true
    })

);


// =============================
// SESSAO
// =============================
app.use(

    cookieSession({

        name:
            'mexplica_session',

        keys: [

            process.env
                .SESSION_SECRET

            ||

            'mexplica-chave-dev-troque-em-producao'

        ],

        httpOnly:
            true,

        sameSite:
            'lax',

        secure:
            process.env.NODE_ENV
            === 'production',

        maxAge:
            1000
            *
            60
            *
            60
            *
            8

    })

);


// =============================
// USUARIO DA SESSAO
// =============================
app.use(
    carregarUsuario
);


// =============================
// PUBLIC
// =============================
app.use(

    express.static(

        path.join(
            __dirname,
            '..',
            'public'
        )

    )

);


// =============================
// HEALTH CHECK
// =============================
app.get(
    '/api/health',
    (
        req,
        res
    ) => {

        res.json({

            status:
                'ok',

            projeto:
                'MExplica',

            arquitetura:
                'MVC com arrays de objetos',

            dominio:
                'dúvidas, respostas e avaliações'

        });

    }
);


// =============================
// API
// =============================
app.use(
    '/api/auth',
    authRoutes
);


app.use(
    '/api/usuarios',
    usuarioRoutes
);


app.use(
    '/api/duvidas',
    duvidaRoutes
);


app.use(
    '/api/respostas',
    respostaRoutes
);


app.use(
    '/api/avaliacoes',
    avaliacaoRoutes
);


// =============================
// PAGINAS
// =============================
app.use(
    '/',
    paginaRoutes
);


// =============================
// 404
// =============================
app.use(
    (
        req,
        res
    ) => {

        if (
            req.path
                .startsWith(
                    '/api/'
                )
        ) {

            return res
                .status(404)
                .json({

                    erro:
                        'Rota não encontrada.'

                });

        }


        return res
            .status(404)
            .send(
                'Página não encontrada.'
            );

    }
);


// =============================
// ERROS
// =============================
app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            err
        );


        if (
            res.headersSent
        ) {

            return next(
                err
            );

        }


        if (
            req.path
                .startsWith(
                    '/api/'
                )
        ) {

            return res
                .status(500)
                .json({

                    erro:
                        'Erro interno do servidor.'

                });

        }


        return res
            .status(500)
            .send(
                'Erro interno do servidor.'
            );

    }
);


// =============================
// SERVIDOR LOCAL
// =============================
if (
    require.main
    === module
) {

    app.listen(
        PORT,
        () => {

            console.log(
                `MExplica rodando em http://localhost:${PORT}`
            );

        }
    );

}


module.exports =
    app;