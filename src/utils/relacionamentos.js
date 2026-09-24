const UsuarioModel =
    require(
        '../models/usuarioModel'
    );

const DuvidaModel =
    require(
        '../models/duvidaModel'
    );

const RespostaModel =
    require(
        '../models/respostaModel'
    );

const AvaliacaoModel =
    require(
        '../models/avaliacaoModel'
    );


function removerAvaliacaoComAjuste(
    avaliacaoId
) {

    const avaliacao =
        AvaliacaoModel.findById(
            avaliacaoId
        );


    if (!avaliacao) {
        return null;
    }


    const resposta =
        RespostaModel.findById(
            avaliacao.respostaId
        );


    if (resposta) {

        UsuarioModel
            .adicionarPontos(

                resposta.usuarioId,

                -AvaliacaoModel
                    .pontosPorNota(
                        avaliacao.nota
                    )

            );

    }


    return AvaliacaoModel
        .remove(
            avaliacao.id
        );

}


function removerRespostaCompleta(
    respostaId
) {

    const resposta =
        RespostaModel.findById(
            respostaId
        );


    if (!resposta) {
        return null;
    }


    const avaliacoes =
        [
            ...AvaliacaoModel
                .findByRespostaId(
                    resposta.id
                )
        ];


    avaliacoes.forEach(
        avaliacao =>

            removerAvaliacaoComAjuste(
                avaliacao.id
            )

    );


    return RespostaModel
        .remove(
            resposta.id
        );

}


function removerDuvidaCompleta(
    duvidaId
) {

    const duvida =
        DuvidaModel.findById(
            duvidaId
        );


    if (!duvida) {
        return null;
    }


    const respostas =
        [
            ...RespostaModel
                .findByDuvidaId(
                    duvida.id
                )
        ];


    respostas.forEach(
        resposta =>

            removerRespostaCompleta(
                resposta.id
            )

    );


    return DuvidaModel
        .remove(
            duvida.id
        );

}


function removerDadosDoUsuario(
    usuarioId
) {

    const id =
        Number(
            usuarioId
        );


    // 1. remove duvidas e tudo que depende delas
    const duvidas =
        [
            ...DuvidaModel
                .findByUserId(id)
        ];


    duvidas.forEach(
        duvida =>

            removerDuvidaCompleta(
                duvida.id
            )

    );


    // 2. remove respostas do usuario em outras duvidas
    const respostas =
        [
            ...RespostaModel
                .findByUserId(id)
        ];


    respostas.forEach(
        resposta =>

            removerRespostaCompleta(
                resposta.id
            )

    );


    // 3. remove avaliações que o usuario fez em respostas de outras pessoas
    const avaliacoes =
        [
            ...AvaliacaoModel
                .findByAvaliadorId(id)
        ];


    avaliacoes.forEach(
        avaliacao =>

            removerAvaliacaoComAjuste(
                avaliacao.id
            )

    );


    // 4. só depois remove a conta
    return UsuarioModel
        .remove(id);

}


module.exports = {

    removerAvaliacaoComAjuste,

    removerRespostaCompleta,

    removerDuvidaCompleta,

    removerDadosDoUsuario

};