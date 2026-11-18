const bcrypt =
    require('bcryptjs');


const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const TokenService = require('../services/tokenService');
const { definirCookie, limparCookie } = require('../utils/authCookie');


function identificarTipo(
    identificador
) {

    return String(
        identificador || ''
    ).includes('@')

        ? 'email'

        : 'telefone';

}


function validarIdentificador(
    identificador
) {

    const valor =
        String(
            identificador || ''
        ).trim();


    if (!valor) {
        return false;
    }


    if (
        valor.includes('@')
    ) {

        return (
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(valor)
        );

    }


    return (
        UsuarioModel
            .normalizarTelefone(valor)
            .length >= 8
    );

}


// VERIFICA EMAIL / TELEFONE
async function verificar(
    req,
    res
) {

    const {
        identificador
    } = req.body;


    if (
        !validarIdentificador(
            identificador
        )
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Informe um email ou telefone válido.'

            });

    }


    const usuario =
        (await UsuarioModel
            .findByIdentifier(
                identificador
            ));


    if (!usuario) {

        return res.json({

            cadastrado:
                false,

            proximoPasso:
                'cadastro'

        });

    }


    return res.json({

        cadastrado:
            true,

        proximoPasso:
            'login',

        usuario: {

            id:
                usuario.id,

            nome:
                usuario.nome

        }

    });

}


// Login web e emissão para API compartilham validação, busca e comparação bcrypt.
async function autenticarCredenciais(identificador, senha) {
    if (!validarIdentificador(identificador) || !senha) {
        return { status: 400, erro: 'Informe o email/telefone e a senha.' };
    }

    const usuario = await UsuarioModel.findByIdentifier(identificador);
    if (!usuario || !await bcrypt.compare(String(senha), usuario.senhaHash)) {
        return { status: 401, erro: 'Credenciais inválidas.' };
    }
    return { usuario };
}

// LOGIN WEB
async function login(req, res) {
    const resultado = await autenticarCredenciais(req.body.identificador, req.body.senha);
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });

    definirCookie(res, TokenService.criarToken(resultado.usuario.id));
    return res.json({
        mensagem: 'Login realizado com sucesso.',
        usuario: UsuarioModel.toPrivate(resultado.usuario)
    });
}

// CLIENTES DE API (sem cookie)
async function token(req, res) {
    const resultado = await autenticarCredenciais(req.body.identificador, req.body.senha);
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });

    return res.json({
        token: TokenService.criarToken(resultado.usuario.id),
        tipo: 'Bearer',
        expiraEm: TokenService.CONFIGURACAO.expiraEm
    });
}


// CADASTRO
async function cadastro(
    req,
    res
) {

    const {

        identificador,

        nome,

        sobrenome,

        idade,

        genero,

        senha,

        colaborador = false,

        bio = ''

    } = req.body;


    if (
        !validarIdentificador(
            identificador
        )
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Informe um email ou telefone válido.'

            });

    }


    if (
        (await UsuarioModel
            .findByIdentifier(
                identificador
            ))
    ) {

        return res
            .status(409)
            .json({

                erro:
                    'Este email ou telefone já está cadastrado.'

            });

    }


    if (
        !nome?.trim()
        ||
        !sobrenome?.trim()
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Nome e sobrenome são obrigatórios.'

            });

    }


    const idadeNumero =
        Number(idade);


    if (
        !Number.isInteger(
            idadeNumero
        )
        ||
        idadeNumero < 10
        ||
        idadeNumero > 120
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Informe uma idade válida entre 10 e 120 anos.'

            });

    }


    if (
        !genero?.trim()
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Informe o gênero.'

            });

    }


    if (
        String(
            senha || ''
        ).length < 6
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'A senha deve ter pelo menos 6 caracteres.'

            });

    }


    const tipo =
        identificarTipo(
            identificador
        );


    // Evitar persistir uma conta que não poderá receber sua credencial de autenticação.
    TokenService.validarConfiguracao();

    const senhaHash =
        await bcrypt.hash(
            String(senha),
            10
        );


    const usuario =
        (await UsuarioModel.create({

            nome:
                nome.trim(),

            sobrenome:
                sobrenome.trim(),

            email:
                tipo === 'email'

                    ? String(
                        identificador
                    )
                        .trim()
                        .toLowerCase()

                    : '',

            telefone:
                tipo === 'telefone'

                    ? UsuarioModel
                        .normalizarTelefone(
                            identificador
                        )

                    : '',

            idade:
                idadeNumero,

            genero:
                genero.trim(),

            colaborador:
                colaborador === true
                ||
                colaborador === 'true',

            bio:
                String(
                    bio || ''
                ).trim(),

            senhaHash

        }));


    // Depois do cadastro,
    // o usuário já fica logado.
    definirCookie(res, TokenService.criarToken(usuario.id));


    return res
        .status(201)
        .json({

            mensagem:
                'Cadastro realizado com sucesso.',

            usuario:
                UsuarioModel
                    .toPrivate(
                        usuario
                    )

        });

}


// LOGOUT
function logout(
    req,
    res
) {

    limparCookie(res);


    return res.json({

        mensagem:
            'Logout realizado com sucesso.'

    });

}


// CONSULTAR SESSÃO
function sessao(
    req,
    res
) {

    if (!req.usuario) {

        return res.json({

            autenticado:
                false,

            usuario:
                null

        });

    }


    return res.json({

        autenticado:
            true,

        usuario:
            UsuarioModel
                .toPrivate(
                    req.usuario
                )

    });

}


module.exports = {

    verificar,

    login,

    token,

    cadastro,

    logout,

    sessao

};
