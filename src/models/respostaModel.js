const respostas = [

    {
        id: 1,

        duvidaId:
            1,

        usuarioId:
            2,

        texto:
            'No Samsung, normalmente você pode acessar Configurações > Visor > Tamanho e estilo da fonte. Depois, mova o controle para aumentar o tamanho.',

        midias: [],

        criadoEm:
            '2026-09-22T15:10:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 2,

        duvidaId:
            1,

        usuarioId:
            3,

        texto:
            'Também é possível usar os recursos de acessibilidade e ampliação do aparelho caso somente aumentar a fonte não seja suficiente.',

        midias: [],

        criadoEm:
            '2026-09-22T16:05:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 3,

        duvidaId:
            2,

        usuarioId:
            2,

        texto:
            'Desconfie de mensagens que criam urgência, pedem senhas, códigos ou dados bancários. Evite clicar em links e confirme a informação pelos canais oficiais.',

        midias: [],

        criadoEm:
            '2026-09-23T10:40:00.000Z',

        atualizadoEm:
            null
    },

    {
        id: 4,

        duvidaId:
            3,

        usuarioId:
            4,

        texto:
            'Abra a conversa da pessoa no WhatsApp e toque no ícone de câmera no topo da tela. Se o aplicativo pedir permissão para câmera e microfone, permita para realizar a chamada.',

        midias: [],

        criadoEm:
            '2026-09-20T18:25:00.000Z',

        atualizadoEm:
            null
    }

];


function proximoId() {

    if (
        respostas.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...respostas.map(
                resposta =>
                    resposta.id
            )
        )
        + 1
    );

}


function findAll() {

    return respostas;

}


function findById(id) {

    const numero =
        Number(id);


    return (
        respostas.find(
            resposta =>
                resposta.id === numero
        )
        || null
    );

}


function findByDuvidaId(
    duvidaId
) {

    const numero =
        Number(
            duvidaId
        );


    return respostas

        .filter(
            resposta =>
                resposta.duvidaId
                === numero
        )

        .sort(
            (a, b) =>
                new Date(a.criadoEm)
                -
                new Date(b.criadoEm)
        );

}


function findByUserId(
    usuarioId
) {

    const numero =
        Number(
            usuarioId
        );


    return respostas.filter(
        resposta =>
            resposta.usuarioId
            === numero
    );

}


// CREATE
function create(dados) {

    const novaResposta = {

        id:
            proximoId(),

        duvidaId:
            Number(
                dados.duvidaId
            ),

        usuarioId:
            Number(
                dados.usuarioId
            ),

        texto:
            dados.texto,

        midias:
            Array.isArray(
                dados.midias
            )
                ? dados.midias
                : [],

        criadoEm:
            new Date()
                .toISOString(),

        atualizadoEm:
            null

    };


    respostas.push(
        novaResposta
    );


    return novaResposta;

}


// UPDATE
function update(
    id,
    alteracoes
) {

    const resposta =
        findById(id);


    if (!resposta) {
        return null;
    }


    Object.assign(

        resposta,

        alteracoes,

        {

            atualizadoEm:
                new Date()
                    .toISOString()

        }

    );


    return resposta;

}


// DELETE
function remove(id) {

    const numero =
        Number(id);


    const indice =
        respostas.findIndex(
            resposta =>
                resposta.id
                === numero
        );


    if (
        indice === -1
    ) {

        return null;

    }


    const [removida] =
        respostas.splice(
            indice,
            1
        );


    return removida;

}


module.exports = {

    findAll,

    findById,

    findByDuvidaId,

    findByUserId,

    create,

    update,

    remove

};