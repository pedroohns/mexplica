const {
    test
} =
    require(
        'node:test'
    );


const assert =
    require(
        'node:assert/strict'
    );


const TutorialService =
    require(
        '../src/services/tutorialService'
    );


const TutorialModel =
    require(
        '../src/models/tutorialModel'
    );


function dadosValidos() {

    return {

        titulo:
            'Como usar um aplicativo com segurança',

        resumo:
            'Tutorial simples para utilizar um aplicativo com mais segurança.',

        conteudo:
            'Neste tutorial você aprenderá algumas etapas importantes para utilizar o aplicativo com segurança.',

        categoriaId:
            'seguranca-usabilidade',

        passos: [

            {

                titulo:
                    'Abra o aplicativo',

                descricao:
                    'Localize o aplicativo no celular e toque no ícone.'

            }

        ],

        imagens:
            [],

        videoUrl:
            '',

        tags: [
            'segurança'
        ]

    };

}


// =============================
// VALIDAÇÃO VÁLIDA
// =============================
test(
    'validarCampos aceita e normaliza dados válidos de tutorial',
    () => {

        const resultado =
            TutorialService
                .validarCampos({

                    ...dadosValidos(),

                    tags: [

                        ' WhatsApp ',

                        'whatsapp',

                        'SEGURANÇA'

                    ],

                    imagens: [

                        {

                            url:
                                'https://exemplo.com/imagem.png',

                            alt:
                                'Imagem válida'

                        },

                        {

                            url:
                                'javascript:alert(1)',

                            alt:
                                'Imagem inválida'

                        }

                    ]

                });


        assert.ok(
            resultado.dados
        );


        assert.equal(
            resultado.erro,
            undefined
        );


        assert.deepEqual(

            resultado.dados.tags,

            [
                'whatsapp',
                'segurança'
            ]

        );


        assert.equal(
            resultado.dados.imagens.length,
            1
        );


        assert.equal(
            resultado.dados.passos[0].ordem,
            1
        );

    }
);


// =============================
// CATEGORIA INVÁLIDA
// =============================
test(
    'validarCampos rejeita categoria inexistente',
    () => {

        const resultado =
            TutorialService
                .validarCampos({

                    ...dadosValidos(),

                    categoriaId:
                        'categoria-inexistente'

                });


        assert.equal(
            resultado.erro,
            'Selecione uma categoria válida.'
        );

    }
);


// =============================
// URL DE VÍDEO INVÁLIDA
// =============================
test(
    'validarCampos rejeita URL de vídeo inválida',
    () => {

        const resultado =
            TutorialService
                .validarCampos({

                    ...dadosValidos(),

                    videoUrl:
                        'youtube.com/video-sem-protocolo'

                });


        assert.equal(
            resultado.erro,
            'A URL do vídeo precisa começar com http://, https:// ou /.'
        );

    }
);


// =============================
// ENRIQUECIMENTO
// =============================
test(
    'enriquecerTutorial adiciona informações relacionadas ao tutorial',
    () => {

        const tutorial =
            TutorialModel
                .findAll()[0];


        assert.ok(
            tutorial
        );


        const enriquecido =
            TutorialService
                .enriquecerTutorial(
                    tutorial
                );


        assert.equal(
            enriquecido.id,
            tutorial.id
        );


        assert.ok(
            enriquecido.autor
        );


        assert.ok(
            enriquecido.categoria
        );


        assert.ok(
            enriquecido.avaliacao
        );


        assert.equal(
            typeof enriquecido.quantidadeComentarios,
            'number'
        );

    }
);