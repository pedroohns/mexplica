const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const TutorialModel =
    require(
        '../models/tutorialModel'
    );

const ComentarioModel =
    require(
        '../models/comentarioModel'
    );

const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );

const TutorialService =
    require(
        './tutorialService'
    );

function montarPerfil(
    slug,
    usuarioAtualId = null
) {

    const usuario =
        UsuarioModel
            .findBySlug(
                slug
            );

    if (!usuario) {
        return null;
    }

    const tutoriais =
        TutorialModel
            .findByAutorId(
                usuario.id
            )
            .map(
                tutorial =>
                    TutorialService
                        .enriquecerTutorial(
                            tutorial,
                            usuarioAtualId
                        )
            );

    const comentariosFeitos =
        ComentarioModel
            .findByUserId(
                usuario.id
            );

    const avaliacoesFeitas =
        AvaliacaoModel
            .findByAvaliadorId(
                usuario.id
            );

    const avaliacoesRecebidas =
        tutoriais.flatMap(
            tutorial =>

                AvaliacaoModel
                    .findByTutorialId(
                        tutorial.id
                    )
        );

    const mediaGeral =
        avaliacoesRecebidas.length

            ? Number(

                (
                    avaliacoesRecebidas
                        .reduce(
                            (
                                soma,
                                item
                            ) =>
                                soma
                                +
                                item.nota,
                            0
                        )

                    /

                    avaliacoesRecebidas
                        .length
                )

                    .toFixed(1)

            )

            : 0;

    const rankingCompleto =
        UsuarioModel
            .getRanking(
                Number.MAX_SAFE_INTEGER
            );

    const indiceRanking =
        rankingCompleto
            .findIndex(
                colaborador =>
                    colaborador.id
                    === usuario.id
            );

    const posicaoRanking =
        indiceRanking >= 0

            ? `${indiceRanking + 1}º`

            : '-';

    const dataCriacao =
        new Date(
            usuario.criadoEm
        );

    const anoEntrada =
        Number.isNaN(
            dataCriacao.getTime()
        )

            ? '-'

            : dataCriacao
                .getFullYear();

    const ehPerfilProprio =
        Boolean(
            usuarioAtualId
            &&
            usuarioAtualId
            === usuario.id
        );

    return {

        perfil:
            UsuarioModel
                .toPublic(
                    usuario
                ),

        tutoriais,
        ehPerfilProprio,
        anoEntrada,
        estatisticas: {

            totalTutoriais:
                tutoriais.length,

            posicaoRanking,

            totalComentarios:
                comentariosFeitos
                    .length,

            totalAvaliacoesFeitas:
                avaliacoesFeitas
                    .length,

            totalAvaliacoesRecebidas:
                avaliacoesRecebidas
                    .length,

            mediaGeral
        }
    };
}

module.exports = {
    montarPerfil
};