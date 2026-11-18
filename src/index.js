require(
    'dotenv'
)
.config();


const express =
    require(
        'express'
    );


const path =
    require(
        'path'
    );


const cookieParser =
    require(
        'cookie-parser'
    );


const authRoutes =
    require(
        './routes/authRoutes'
    );


const usuarioRoutes =
    require(
        './routes/usuarioRoutes'
    );


const tutorialRoutes =
    require(
        './routes/tutorialRoutes'
    );


const comentarioRoutes =
    require(
        './routes/comentarioRoutes'
    );


const avaliacaoRoutes =
    require(
        './routes/avaliacaoRoutes'
    );


const paginaRoutes =
    require(
        './routes/paginaRoutes'
    );


const healthController =
    require(
        './controllers/healthController'
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
// EXPRESS / VIEWS
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
// ARQUIVOS PUBLICOS
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
    '/api/health/database',
    healthController.verificarBanco
);


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
                'Persistência do domínio em PostgreSQL',

            dominio:
                'tutoriais, comentários, avaliações e ranking'

        });

    }
);


// =============================
// API
// =============================
// Arquivos estáticos e health checks não precisam ler cookies, verificar JWT ou consultar usuário.
app.use(cookieParser());
app.use(carregarUsuario);

app.use(
    '/api/auth',
    authRoutes
);


app.use(
    '/api/usuarios',
    usuarioRoutes
);


app.use(
    '/api/tutoriais',
    tutorialRoutes
);


app.use(
    '/api/comentarios',
    comentarioRoutes
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

        if (err.type === 'entity.too.large') {
            return res.status(413).json({ erro: 'O tutorial excede o limite total de 1 MB. Reduza as imagens.' });
        }

        if (err.code === 'JWT_SECRET_AUSENTE') {
            console.error('JWT_SECRET não configurada para autenticação.');
            const mensagem = 'Autenticação indisponível. Verifique a configuração JWT_SECRET do servidor.';
            return req.path.startsWith('/api/')
                ? res.status(503).json({ erro: mensagem })
                : res.status(503).send(mensagem);
        }

        if (err.code === 'USUARIO_IDENTIFICADOR_CONFLITO') {
            return res.status(409).json({ erro: 'Este email ou telefone já está cadastrado.' });
        }
        if (err.code === 'USUARIO_SLUG_CONFLITO') {
            return res.status(409).json({ erro: 'Não foi possível reservar um nome de perfil. Tente novamente.' });
        }
        if (err.code === 'TUTORIAL_SLUG_CONFLITO') {
            return res.status(409).json({ erro: 'Não foi possível reservar o endereço do tutorial. Tente novamente.' });
        }

        const errosRelacionamento = {
            AVALIACAO_DUPLICADA: [409, 'Você já avaliou este tutorial. Edite sua avaliação existente.'],
            AVALIACAO_NAO_ENCONTRADA: [404, 'Avaliação não encontrada.'],
            TUTORIAL_NAO_ENCONTRADO: [404, 'Tutorial não encontrado.'],
            AVALIACAO_PROPRIO_TUTORIAL: [403, 'Você não pode avaliar o próprio tutorial.'],
            AVALIACAO_EDICAO_PROIBIDA: [403, 'Você só pode editar a própria avaliação.'],
            AVALIACAO_EXCLUSAO_PROIBIDA: [403, 'Você só pode excluir a própria avaliação.']
        };
        if (Object.hasOwn(errosRelacionamento, err.code)) {
            const [status, erro] = errosRelacionamento[err.code];
            return res.status(status).json({ erro });
        }

        // Erros do driver podem conter query, contatos e credenciais. Não registrar a exceção.
        console.error(err.code === 'DATABASE_URL_AUSENTE'
            ? 'DATABASE_URL não configurada para conexão com PostgreSQL.'
            : 'Erro interno ao processar a requisição.');


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
