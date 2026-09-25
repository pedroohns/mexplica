const TutorialModel =
    require(
        '../models/tutorialModel'
    );


const UsuarioModel =
    require(
        '../models/usuarioModel'
    );


const ComentarioModel =
    require(
        '../models/comentarioModel'
    );


const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );


const {

    getCategoria,

    categoriaValida

} =
    require(
        '../utils/categorias'
    );


const {
    removerTutorialCompleto
} =
    require(
        '../utils/relacionamentos'
    );


function normalizarPassos(
    passos
) {

    if (
        !Array.isArray(
            passos
        )
    ) {

        return [];

    }


    return passos

        .slice(
            0,
            12
        )

        .map(
            (
                passo,
                index
            ) => {

                const titulo =
                    String(

                        passo?.titulo

                        ||

                        `Passo ${index + 1}`

                    )
                    .trim()
                    .slice(
                        0,
                        120
                    );


                const descricao =
                    String(
                        passo?.descricao
                        || ''
                    )
                    .trim()
                    .slice(
                        0,
                        1000
                    );


                return {

                    ordem:
                        index + 1,

                    titulo:
                        titulo
                        ||
                        `Passo ${index + 1}`,

                    descricao

                };

            }
        )

        .filter(
            passo =>
                passo.descricao
                    .length >= 3
        );

}


function urlPermitida(
    url
) {

    const valor =
        String(
            url || ''
        )
        .trim();


    return (
        /^https?:\/\//i
            .test(valor)

        ||

        valor.startsWith('/')
    );

}


function normalizarImagens(
    imagens
) {

    if (
        !Array.isArray(
            imagens
        )
    ) {

        return [];

    }


    return imagens

        .slice(
            0,
            6
        )

        .map(
            (
                imagem,
                index
            ) => ({

                ordem:
                    index + 1,

                url:
                    String(
                        imagem?.url
                        || ''
                    )
                    .trim(),

                alt:
                    String(

                        imagem?.alt

                        ||

                        `Imagem do passo ${index + 1}`

                    )
                    .trim()
                    .slice(
                        0,
                        180
                    ),

                legenda:
                    String(
                        imagem?.legenda
                        || ''
                    )
                    .trim()
                    .slice(
                        0,
                        240
                    )

            })
        )

        .filter(
            imagem =>
                urlPermitida(
                    imagem.url
                )
        );

}


function normalizarTags(
    tags
) {

    if (
        !Array.isArray(
            tags
        )
    ) {

        return [];

    }


    const unicas =
        new Set();


    tags.forEach(
        tag => {

            const valor =
                String(
                    tag || ''
                )
                .trim()
                .toLowerCase()
                .slice(
                    0,
                    40
                );


            if (valor) {

                unicas.add(
                    valor
                );

            }

        }
    );


    return [
        ...unicas
    ]
    .slice(
        0,
        10
    );

}


function normalizarVideoUrl(
    videoUrl
) {

    const valor =
        String(
            videoUrl || ''
        )
        .trim();


    if (!valor) {

        return '';

    }


    return urlPermitida(
        valor
    )

        ? valor

        : null;

}


function validarCampos(
    dados
) {

    const titulo =
        String(
            dados.titulo
            || ''
        )
        .trim();


    const resumo =
        String(
            dados.resumo
            || ''
        )
        .trim();


    const conteudo =
        String(
            dados.conteudo
            || ''
        )
        .trim();


    const categoriaId =
        String(
            dados.categoriaId
            || ''
        )
        .trim();


    const passos =
        normalizarPassos(
            dados.passos
        );


    const imagens =
        normalizarImagens(
            dados.imagens
        );


    const tags =
        normalizarTags(
            dados.tags
        );


    const videoUrl =
        normalizarVideoUrl(
            dados.videoUrl
        );


    if (
        titulo.length < 8
        ||
        titulo.length > 160
    ) {

        return {

            erro:
                'O título deve ter entre 8 e 160 caracteres.'

        };

    }


    if (
        resumo.length < 15
        ||
        resumo.length > 320
    ) {

        return {

            erro:
                'O resumo deve ter entre 15 e 320 caracteres.'

        };

    }


    if (
        conteudo.length < 30
        ||
        conteudo.length > 6000
    ) {

        return {

            erro:
                'A introdução do tutorial deve ter entre 30 e 6000 caracteres.'

        };

    }


    if (
        !categoriaValida(
            categoriaId
        )
    ) {

        return {

            erro:
                'Selecione uma categoria válida.'

        };

    }


    if (
        passos.length === 0
    ) {

        return {

            erro:
                'Adicione pelo menos um passo ao tutorial.'

        };

    }


    if (
        videoUrl === null
    ) {

        return {

            erro:
                'A URL do vídeo precisa começar com http://, https:// ou /.'

        };

    }


    return {

        dados: {

            titulo,

            resumo,

            conteudo,

            categoriaId,

            passos,

            imagens,

            videoUrl,

            tags

        }

    };

}


function enriquecerTutorial(
    tutorial,
    usuarioAtualId = null
) {

    const minhaAvaliacao =
        usuarioAtualId

            ? AvaliacaoModel
                .findByTutorialEAvaliador(

                    tutorial.id,

                    usuarioAtualId

                )

            : null;


    return {

        ...tutorial,

        autor:
            UsuarioModel
                .toPublic(

                    UsuarioModel
                        .findById(
                            tutorial.autorId
                        )

                ),

        categoria:
            getCategoria(
                tutorial.categoriaId
            ),

        avaliacao:
            AvaliacaoModel
                .resumoDoTutorial(
                    tutorial.id
                ),

        quantidadeComentarios:
            ComentarioModel
                .findByTutorialId(
                    tutorial.id
                )
                .length,

        minhaAvaliacao:
            minhaAvaliacao

                ? {

                    id:
                        minhaAvaliacao.id,

                    nota:
                        minhaAvaliacao.nota

                }

                : null

    };

}


function listar(
    req,
    res
) {

    const usuarioAtualId =
        req.usuario?.id
        || null;


    return res.json(

        TutorialModel
            .findAll()

            .map(
                tutorial =>

                    enriquecerTutorial(
                        tutorial,
                        usuarioAtualId
                    )
            )

    );

}


function buscar(
    req,
    res
) {

    const termo =
        String(
            req.query.q
            || ''
        )
        .trim();


    const usuarioAtualId =
        req.usuario?.id
        || null;


    if (
        termo.length < 2
    ) {

        return res.json({

            termo,

            quantidade:
                0,

            resultados:
                []

        });

    }


    const resultados =
        TutorialModel

            .buscar(
                termo
            )

            .map(
                tutorial =>

                    enriquecerTutorial(
                        tutorial,
                        usuarioAtualId
                    )
            );


    return res.json({

        termo,

        quantidade:
            resultados.length,

        resultados

    });

}


function populares(
    req,
    res
) {

    const limiteSolicitado =
        Number(
            req.query.limite
            || 6
        );


    const limite =
        Number.isInteger(
            limiteSolicitado
        )

            ? Math.min(

                Math.max(
                    limiteSolicitado,
                    1
                ),

                20

            )

            : 6;


    return res.json(

        TutorialModel
            .maisAcessadosDaSemana(
                limite
            )

            .map(
                tutorial =>
                    enriquecerTutorial(
                        tutorial
                    )
            )

    );

}


function buscarPorId(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.id
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    return res.json(

        enriquecerTutorial(

            tutorial,

            req.usuario?.id
            || null

        )

    );

}


function criar(
    req,
    res
) {

    const validacao =
        validarCampos(
            req.body
        );


    if (
        validacao.erro
    ) {

        return res
            .status(400)
            .json({

                erro:
                    validacao.erro

            });

    }


    const tutorial =
        TutorialModel
            .create({

                autorId:
                    req.usuario.id,

                ...validacao.dados

            });


    return res
        .status(201)
        .json({

            mensagem:
                'Tutorial publicado com sucesso.',

            tutorial:
                enriquecerTutorial(

                    tutorial,

                    req.usuario.id

                )

        });

}


function atualizar(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.id
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    if (
        tutorial.autorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode editar os próprios tutoriais.'

            });

    }


    const validacao =
        validarCampos({

            titulo:
                req.body.titulo
                ??
                tutorial.titulo,

            resumo:
                req.body.resumo
                ??
                tutorial.resumo,

            conteudo:
                req.body.conteudo
                ??
                tutorial.conteudo,

            categoriaId:
                req.body.categoriaId
                ??
                tutorial.categoriaId,

            passos:
                req.body.passos
                ??
                tutorial.passos,

            imagens:
                req.body.imagens
                ??
                tutorial.imagens,

            videoUrl:
                req.body.videoUrl
                ??
                tutorial.videoUrl,

            tags:
                req.body.tags
                ??
                tutorial.tags

        });


    if (
        validacao.erro
    ) {

        return res
            .status(400)
            .json({

                erro:
                    validacao.erro

            });

    }


    const atualizado =
        TutorialModel
            .update(

                tutorial.id,

                validacao.dados

            );


    return res.json({

        mensagem:
            'Tutorial atualizado com sucesso.',

        tutorial:
            enriquecerTutorial(

                atualizado,

                req.usuario.id

            )

    });

}


function excluir(
    req,
    res
) {

    const tutorial =
        TutorialModel
            .findById(
                req.params.id
            );


    if (!tutorial) {

        return res
            .status(404)
            .json({

                erro:
                    'Tutorial não encontrado.'

            });

    }


    if (
        tutorial.autorId
        !== req.usuario.id
    ) {

        return res
            .status(403)
            .json({

                erro:
                    'Você só pode excluir os próprios tutoriais.'

            });

    }


    removerTutorialCompleto(
        tutorial.id
    );


    return res.json({

        mensagem:
            'Tutorial excluído com sucesso.'

    });

}


module.exports = {

    enriquecerTutorial,

    validarCampos,

    listar,

    buscar,

    populares,

    buscarPorId,

    criar,

    atualizar,

    excluir

};