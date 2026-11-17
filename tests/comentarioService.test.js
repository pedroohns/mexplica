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


const ComentarioService =
    require(
        '../src/services/comentarioService'
    );


const ComentarioModel =
    require(
        '../src/models/comentarioModel'
    );


// =============================
// ENRIQUECIMENTO
// =============================
test(
    'enriquecerComentario adiciona os dados públicos do autor',
    async () => {

        const comentario =
            (await ComentarioModel
                .findAll())[0];


        assert.ok(
            comentario
        );


        const resultado =
            (await ComentarioService
                .enriquecerComentario(
                    comentario
                ));


        assert.equal(
            resultado.id,
            comentario.id
        );


        assert.ok(
            resultado.autor
        );


        assert.equal(
            resultado.autor.id,
            comentario.usuarioId
        );


        assert.equal(
            resultado.autor.senhaHash,
            undefined
        );

    }
);


// =============================
// LISTAGEM POR TUTORIAL
// =============================
test(
    'listarPorTutorial retorna comentários enriquecidos',
    async () => {

        const comentario =
            (await ComentarioModel
                .findAll())[0];


        assert.ok(
            comentario
        );


        const resultado =
            (await ComentarioService
                .listarPorTutorial(
                    comentario.tutorialId
                ));


        assert.ok(
            Array.isArray(
                resultado
            )
        );


        assert.ok(
            resultado.length > 0
        );


        resultado.forEach(
            item => {

                assert.ok(
                    item.autor
                );


                assert.equal(
                    item.autor.senhaHash,
                    undefined
                );

            }
        );

    }
);


// =============================
// TUTORIAL SEM COMENTÁRIOS
// =============================
test(
    'listarPorTutorial retorna lista vazia quando não existem comentários',
    async () => {

        const resultado =
            (await ComentarioService
                .listarPorTutorial(
                    999999
                ));


        assert.deepEqual(
            resultado,
            []
        );

    }
);