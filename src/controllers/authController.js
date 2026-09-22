const bcrypt =
    require('bcryptjs');


const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


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
function verificar(
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
        UsuarioModel
            .findByIdentifier(
                identificador
            );


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


// LOGIN
async function login(
    req,
    res
) {

    const {
        identificador,
        senha
    } = req.body;


    if (
        !validarIdentificador(
            identificador
        )
        ||
        !senha
    ) {

        return res
            .status(400)
            .json({

                erro:
                    'Informe o email/telefone e a senha.'

            });

    }


    const usuario =
        UsuarioModel
            .findByIdentifier(
                identificador
            );


    if (!usuario) {

        return res
            .status(401)
            .json({

                erro:
                    'Credenciais inválidas.'

            });

    }


    const senhaCorreta =
        await bcrypt.compare(

            String(senha),

            usuario.senhaHash

        );


    if (!senhaCorreta) {

        return res
            .status(401)
            .json({

                erro:
                    'Credenciais inválidas.'

            });

    }


    req.session.usuarioId =
        usuario.id;


    return res.json({

        mensagem:
            'Login realizado com sucesso.',

        usuario:
            UsuarioModel
                .toPrivate(
                    usuario
                )

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
        UsuarioModel
            .findByIdentifier(
                identificador
            )
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


    const senhaHash =
        await bcrypt.hash(
            String(senha),
            10
        );


    const usuario =
        UsuarioModel.create({

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

        });


    // Depois do cadastro,
    // o usuário já fica logado.
    req.session.usuarioId =
        usuario.id;


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

    req.session =
        null;


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

    cadastro,

    logout,

    sessao

};