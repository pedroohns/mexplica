const {
    test
} = require(
    'node:test'
);


const assert =
    require(
        'node:assert/strict'
    );


const UsuarioModel =
    require(
        '../src/models/usuarioModel'
    );


const TutorialModel =
    require(
        '../src/models/tutorialModel'
    );


const ComentarioModel =
    require(
        '../src/models/comentarioModel'
    );


const AvaliacaoModel =
    require(
        '../src/models/avaliacaoModel'
    );


const RelacionamentoService =
    require(
        '../src/services/relacionamentoService'
    );


// =============================
// HELPERS DE TESTE
// =============================
function criarUsuarioTeste(
    nome,
    colaborador = false
) {

    return UsuarioModel.create({

        nome,

        sobrenome:
            'Teste',

        email:
            `${nome.toLowerCase()}@teste.local`,

        telefone:
            '',

        idade:
            30,

        genero:
            'outro',

        colaborador,

        senhaHash:
            'hash-apenas-para-teste'

    });

}


function criarTutorialTeste(
    autorId,
    titulo
) {

    return TutorialModel.create({

        autorId,

        categoriaId:
            1,

        titulo,

        resumo:
            'Tutorial temporário utilizado em teste.',

        conteudo:
            'Conteúdo temporário utilizado em teste.',

        passos:
            [],

        imagens:
            [],

        videoUrl:
            '',

        tags: [
            'teste'
        ]

    });

}


// =============================
// REMOVER AVALIAÇÃO
// =============================
test(
    'removerAvaliacaoComAjuste remove avaliação e devolve os pontos do autor',
    t => {

        const autor =
            criarUsuarioTeste(
                'AutorAvaliacao',
                true
            );


        const avaliador =
            criarUsuarioTeste(
                'AvaliadorAvaliacao'
            );


        const tutorial =
            criarTutorialTeste(
                autor.id,
                'Tutorial teste de avaliação'
            );


        const avaliacao =
            AvaliacaoModel.create({

                tutorialId:
                    tutorial.id,

                avaliadorId:
                    avaliador.id,

                nota:
                    5

            });


        const pontos =
            AvaliacaoModel
                .pontosPorNota(
                    avaliacao.nota
                );


        UsuarioModel.adicionarPontos(
            autor.id,
            pontos
        );


        // LIMPEZA, MESMO SE O TESTE FALHAR
        t.after(
            () => {

                AvaliacaoModel.remove(
                    avaliacao.id
                );

                TutorialModel.remove(
                    tutorial.id
                );

                UsuarioModel.remove(
                    avaliador.id
                );

                UsuarioModel.remove(
                    autor.id
                );

            }
        );


        assert.equal(
            UsuarioModel
                .findById(
                    autor.id
                )
                .pontos,
            50
        );


        const removida =
            RelacionamentoService
                .removerAvaliacaoComAjuste(
                    avaliacao.id
                );


        assert.equal(
            removida.id,
            avaliacao.id
        );


        assert.equal(
            AvaliacaoModel.findById(
                avaliacao.id
            ),
            null
        );


        assert.equal(
            UsuarioModel
                .findById(
                    autor.id
                )
                .pontos,
            0
        );

    }
);


// =============================
// REMOVER TUTORIAL
// =============================
test(
    'removerTutorialCompleto remove tutorial e seus dados relacionados',
    t => {

        const autor =
            criarUsuarioTeste(
                'AutorTutorial',
                true
            );


        const avaliador =
            criarUsuarioTeste(
                'AvaliadorTutorial'
            );


        const comentarista =
            criarUsuarioTeste(
                'ComentaristaTutorial'
            );


        const tutorial =
            criarTutorialTeste(
                autor.id,
                'Tutorial teste de exclusão completa'
            );


        const comentario =
            ComentarioModel.create({

                tutorialId:
                    tutorial.id,

                usuarioId:
                    comentarista.id,

                texto:
                    'Comentário temporário.'

            });


        const avaliacao =
            AvaliacaoModel.create({

                tutorialId:
                    tutorial.id,

                avaliadorId:
                    avaliador.id,

                nota:
                    4

            });


        UsuarioModel.adicionarPontos(

            autor.id,

            AvaliacaoModel
                .pontosPorNota(
                    avaliacao.nota
                )

        );


        t.after(
            () => {

                ComentarioModel.remove(
                    comentario.id
                );

                AvaliacaoModel.remove(
                    avaliacao.id
                );

                TutorialModel.remove(
                    tutorial.id
                );

                UsuarioModel.remove(
                    comentarista.id
                );

                UsuarioModel.remove(
                    avaliador.id
                );

                UsuarioModel.remove(
                    autor.id
                );

            }
        );


        assert.equal(
            UsuarioModel
                .findById(
                    autor.id
                )
                .pontos,
            40
        );


        const removido =
            RelacionamentoService
                .removerTutorialCompleto(
                    tutorial.id
                );


        assert.equal(
            removido.id,
            tutorial.id
        );


        assert.equal(
            TutorialModel.findById(
                tutorial.id
            ),
            null
        );


        assert.equal(
            ComentarioModel
                .findByTutorialId(
                    tutorial.id
                )
                .length,
            0
        );


        assert.equal(
            AvaliacaoModel
                .findByTutorialId(
                    tutorial.id
                )
                .length,
            0
        );


        assert.equal(
            UsuarioModel
                .findById(
                    autor.id
                )
                .pontos,
            0
        );

    }
);


// =============================
// REMOVER USUÁRIO
// =============================
test(
    'removerDadosDoUsuario remove conta e relacionamentos sem afetar outros usuários',
    t => {

        const usuarioRemovido =
            criarUsuarioTeste(
                'UsuarioRemovido',
                true
            );


        const outroAutor =
            criarUsuarioTeste(
                'OutroAutor',
                true
            );


        const usuarioApoio =
            criarUsuarioTeste(
                'UsuarioApoio'
            );


        const tutorialDoUsuario =
            criarTutorialTeste(

                usuarioRemovido.id,

                'Tutorial do usuário removido'

            );


        const tutorialDoOutroAutor =
            criarTutorialTeste(

                outroAutor.id,

                'Tutorial que deve permanecer'

            );


        const comentarioNoTutorialDoUsuario =
            ComentarioModel.create({

                tutorialId:
                    tutorialDoUsuario.id,

                usuarioId:
                    usuarioApoio.id,

                texto:
                    'Comentário que deve ser removido junto do tutorial.'

            });


        const avaliacaoNoTutorialDoUsuario =
            AvaliacaoModel.create({

                tutorialId:
                    tutorialDoUsuario.id,

                avaliadorId:
                    usuarioApoio.id,

                nota:
                    3

            });


        UsuarioModel.adicionarPontos(

            usuarioRemovido.id,

            AvaliacaoModel
                .pontosPorNota(
                    3
                )

        );


        const comentarioDoUsuario =
            ComentarioModel.create({

                tutorialId:
                    tutorialDoOutroAutor.id,

                usuarioId:
                    usuarioRemovido.id,

                texto:
                    'Comentário feito pelo usuário que será removido.'

            });


        const avaliacaoDoUsuario =
            AvaliacaoModel.create({

                tutorialId:
                    tutorialDoOutroAutor.id,

                avaliadorId:
                    usuarioRemovido.id,

                nota:
                    5

            });


        UsuarioModel.adicionarPontos(

            outroAutor.id,

            AvaliacaoModel
                .pontosPorNota(
                    5
                )

        );


        t.after(
            () => {

                ComentarioModel.remove(
                    comentarioNoTutorialDoUsuario.id
                );

                ComentarioModel.remove(
                    comentarioDoUsuario.id
                );

                AvaliacaoModel.remove(
                    avaliacaoNoTutorialDoUsuario.id
                );

                AvaliacaoModel.remove(
                    avaliacaoDoUsuario.id
                );

                TutorialModel.remove(
                    tutorialDoUsuario.id
                );

                TutorialModel.remove(
                    tutorialDoOutroAutor.id
                );

                UsuarioModel.remove(
                    usuarioRemovido.id
                );

                UsuarioModel.remove(
                    usuarioApoio.id
                );

                UsuarioModel.remove(
                    outroAutor.id
                );

            }
        );


        assert.equal(
            UsuarioModel
                .findById(
                    outroAutor.id
                )
                .pontos,
            50
        );


        const removido =
            RelacionamentoService
                .removerDadosDoUsuario(
                    usuarioRemovido.id
                );


        // CONTA REMOVIDA
        assert.equal(
            removido.id,
            usuarioRemovido.id
        );


        assert.equal(
            UsuarioModel.findById(
                usuarioRemovido.id
            ),
            null
        );


        // TUTORIAL DO USUÁRIO REMOVIDO
        assert.equal(
            TutorialModel.findById(
                tutorialDoUsuario.id
            ),
            null
        );


        // DEPENDÊNCIAS DO TUTORIAL REMOVIDO
        assert.equal(
            ComentarioModel
                .findByTutorialId(
                    tutorialDoUsuario.id
                )
                .length,
            0
        );


        assert.equal(
            AvaliacaoModel
                .findByTutorialId(
                    tutorialDoUsuario.id
                )
                .length,
            0
        );


        // COMENTÁRIOS FEITOS PELO USUÁRIO
        assert.equal(
            ComentarioModel
                .findByUserId(
                    usuarioRemovido.id
                )
                .length,
            0
        );


        // AVALIAÇÕES FEITAS PELO USUÁRIO
        assert.equal(
            AvaliacaoModel
                .findByAvaliadorId(
                    usuarioRemovido.id
                )
                .length,
            0
        );


        // TUTORIAL DO OUTRO AUTOR CONTINUA
        assert.ok(
            TutorialModel.findById(
                tutorialDoOutroAutor.id
            )
        );


        // PONTOS DA AVALIAÇÃO REMOVIDA
        // FORAM DEVOLVIDOS
        assert.equal(
            UsuarioModel
                .findById(
                    outroAutor.id
                )
                .pontos,
            0
        );


        // OUTROS USUÁRIOS CONTINUAM EXISTINDO
        assert.ok(
            UsuarioModel.findById(
                outroAutor.id
            )
        );


        assert.ok(
            UsuarioModel.findById(
                usuarioApoio.id
            )
        );

    }
);