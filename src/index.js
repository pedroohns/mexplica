require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const postRoutes = require('./routes/postRoutes');
const comentarioRoutes = require('./routes/comentarioRoutes');
const paginaRoutes = require('./routes/paginaRoutes');

const {
    carregarUsuario
} = require('./middlewares/authMiddleware');

const app = express();

const PORT = process.env.PORT || 3000;


// CONFIGURAÇÕES DO EXPRESS
app.set('trust proxy', 1);

app.set('view engine', 'ejs');

app.set(
    'views',
    path.join(__dirname, 'views')
);


// LEITURA DE JSON E FORMULÁRIOS
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


// SESSÃO DO USUÁRIO
app.use(
    cookieSession({
        name: 'mexplica_session',

        keys: [
            process.env.SESSION_SECRET ||
            'mexplica-chave-dev-troque-em-producao'
        ],

        httpOnly: true,

        sameSite: 'lax',

        secure:
            process.env.NODE_ENV === 'production',

        maxAge:
            1000 * 60 * 60 * 8
    })
);


// IDENTIFICA USUÁRIO LOGADO
app.use(carregarUsuario);


// ARQUIVOS ESTÁTICOS

// Necessário para rodar localmente.
// Na Vercel, public/** é servido pela
// própria plataforma.

app.use(
    express.static(
        path.join(__dirname, '..', 'public')
    )
);


// ROTA DE TESTE
app.get('/api/health', (req, res) => {

    res.json({
        status: 'ok',
        projeto: 'MExplica',
        arquitetura: 'MVC com arrays de objetos'
    });

});


// ROTAS DA API
app.use('/api/auth', authRoutes);

app.use('/api/usuarios', usuarioRoutes);

app.use('/api/posts', postRoutes);

app.use(
    '/api/comentarios',
    comentarioRoutes
);


// ROTAS DAS PÁGINAS
app.use('/', paginaRoutes);


// ROTA NÃO ENCONTRADA
app.use((req, res) => {

    if (req.path.startsWith('/api/')) {

        return res.status(404).json({
            erro: 'Rota não encontrada.'
        });

    }

    return res
        .status(404)
        .send('Página não encontrada.');

});


// TRATAMENTO DE ERROS
app.use((err, req, res, next) => {

    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    if (req.path.startsWith('/api/')) {

        return res.status(500).json({
            erro: 'Erro interno do servidor.'
        });

    }

    return res
        .status(500)
        .send('Erro interno do servidor.');

});


// SERVIDOR LOCAL
if (require.main === module) {

    app.listen(PORT, () => {

        console.log(
            `MExplica rodando em http://localhost:${PORT}`
        );

    });

}


// Também permite que a Vercel
// utilize a aplicação Express.

module.exports = app;