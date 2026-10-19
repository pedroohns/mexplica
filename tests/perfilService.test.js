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


const PerfilService =
    require(
        '../src/services/perfilService'
    );


const UsuarioModel =
    require(
        '../src/models/usuarioModel'
    );


// =============================
// PERFIL EXISTENTE
// =============================
test(
    'montarPerfil retorna dados completos de um usuário existente',
    () => {

        const resultado =
            PerfilService
                .montarPerfil(
                    'lucas-mendes'
                );


        assert.ok(
            resultado
        );


        assert.equal(
            resultado.perfil.slug,
            'lucas-mendes'
        );


        assert.ok(
            Array.isArray(
                resultado.tutoriais
            )
        );


        assert.equal(
            typeof resultado.estatisticas,
            'object'
        );


        assert.equal(
            typeof resultado
                .estatisticas
                .totalTutoriais,
            'number'
        );


        assert.equal(
            typeof resultado
                .estatisticas
                .totalComentarios,
            'number'
        );


        assert.equal(
            typeof resultado
                .estatisticas
                .totalAvaliacoesFeitas,
            'number'
        );


        assert.equal(
            typeof resultado
                .estatisticas
                .totalAvaliacoesRecebidas,
            'number'
        );


        assert.equal(
            typeof resultado
                .estatisticas
                .mediaGeral,
            'number'
        );

    }
);


// =============================
// PERFIL INEXISTENTE
// =============================
test(
    'montarPerfil retorna null para usuário inexistente',
    () => {

        const resultado =
            PerfilService
                .montarPerfil(
                    'usuario-que-nao-existe'
                );


        assert.equal(
            resultado,
            null
        );

    }
);


// =============================
// PERFIL PRÓPRIO
// =============================
test(
    'montarPerfil identifica quando o usuário acessa o próprio perfil',
    () => {

        const usuario =
            UsuarioModel
                .findBySlug(
                    'lucas-mendes'
                );


        assert.ok(
            usuario
        );


        const proprioPerfil =
            PerfilService
                .montarPerfil(

                    usuario.slug,

                    usuario.id

                );


        assert.equal(
            proprioPerfil
                .ehPerfilProprio,
            true
        );


        const outroAcesso =
            PerfilService
                .montarPerfil(
                    usuario.slug
                );


        assert.equal(
            outroAcesso
                .ehPerfilProprio,
            false
        );

    }
);