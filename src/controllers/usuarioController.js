const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const PostModel =
    require(
        '../models/postModel'
    );

const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


// READ
function listar(
    req,
    res
) {

    const usuarios =
        UsuarioModel

            .findAll()

            .map(
                UsuarioModel.toPublic
            );


    return res.json(
        usuarios
    );

}


function buscarPorId(
    req,
    res
) {

    const usuario =
        UsuarioModel.findById(
            req.params.id
        );


    if (!usuario) {

        return res
            .status(404)
            .json({

                erro:
                    'Usuário não encontrado.'

            });

    }


    return res.json(
        UsuarioModel
            .toPublic(
                usuario
            )
    );

}


// UPDATE
function atualizar(
    req,
    res
) {

    const id =
        Number(
            req.params.id
        );


    if (
        req.usuario.id !== id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar o próprio perfil.'

            });

    }


    const alteracoes = {};


    if (
        typeof req.body.nome
        === 'string'
        &&
        req.body.nome.trim()
    ) {

        alteracoes.nome =
            req.body.nome.trim();

    }


    if (
        typeof req.body.sobrenome
        === 'string'
        &&
        req.body.sobrenome.trim()
    ) {

        alteracoes.sobrenome =
            req.body
                .sobrenome
                .trim();

    }


    if (
        typeof req.body.bio
        === 'string'
    ) {

        alteracoes.bio =
            req.body.bio
                .trim()
                .slice(
                    0,
                    500
                );

    }


    if (
        req.body.idade
        !== undefined
    ) {

        const idade =
            Number(
                req.body.idade
            );


        if (
            !Number.isInteger(
                idade
            )
            ||
            idade < 10
            ||
            idade > 120
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        'Informe uma idade válida entre 10 e 120 anos.'

                });

        }


        alteracoes.idade =
            idade;

    }


    if (
        typeof req.body.genero
        === 'string'
        &&
        req.body.genero.trim()
    ) {

        alteracoes.genero =
            req.body
                .genero
                .trim();

    }


    const usuarioAtualizado =
        UsuarioModel.update(
            id,
            alteracoes
        );


    return res.json({

        mensagem:
            'Perfil atualizado com sucesso.',

        usuario:
            UsuarioModel
                .toPrivate(
                    usuarioAtualizado
                )

    });

}


// DELETE
function excluir(
    req,
    res
) {

    const id =
        Number(
            req.params.id
        );


    if (
        req.usuario.id !== id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir a própria conta.'

            });

    }


    const postsDoUsuario =
        PostModel
            .findByUserId(id);


    // remove comentarios existentes
    // nas publicaçoes do usuario.
    postsDoUsuario.forEach(
        post =>

            ComentarioModel
                .removeByPostId(
                    post.id
                )

    );


    // remove posts.
    PostModel
        .removeByUserId(id);


    // remove comentarios que ele
    // fez em posts de outras pessoas.
    ComentarioModel
        .removeByUserId(id);


    // remove usuario.
    UsuarioModel.remove(id);


    // finaliza sessao.
    req.session =
        null;


    return res.json({

        mensagem:
            'Conta excluída com sucesso.'

    });

}


module.exports = {

    listar,

    buscarPorId,

    atualizar,

    excluir

};