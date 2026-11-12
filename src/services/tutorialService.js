const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const TutorialModel = require('../models/tutorialModel');

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
//=====================================//    

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

// A semana acompanha a janela móvel de sete dias usada na comunidade.
// Sem publicações recentes, não substituímos o período por dados antigos.
function rankingDeRespostas(limite = 10, agora = Date.now()) {
    const inicio = agora - 7 * 24 * 60 * 60 * 1000;
    const publicacoesPorAutor = new Map();

    TutorialModel.findAll().forEach(tutorial => {
        const data = new Date(tutorial.criadoEm).getTime();
        if (!Number.isFinite(data) || data < inicio || data > agora) {
            return;
        }

        publicacoesPorAutor.set(
            tutorial.autorId,
            (publicacoesPorAutor.get(tutorial.autorId) || 0) + 1
        );
    });

    return [...publicacoesPorAutor].map(([autorId, quantidadeTutoriais]) => {
        const autor = UsuarioModel.findById(autorId);
        if (!autor?.colaborador) return null;

        return {
            ...UsuarioModel.toPublic(autor),
            quantidadeTutoriais
        };
    }).filter(Boolean).sort((a, b) =>
        b.quantidadeTutoriais - a.quantidadeTutoriais
        || a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')
        || a.id - b.id
    ).slice(0, limite);
}

module.exports = {
    rankingDeRespostas,
    validarCampos,
    enriquecerTutorial
};
