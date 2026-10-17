const usuarios =
    require(
        '../data/usuarioData'
    );

const NIVEL_DIAMANTE =
    1000;


const NIVEL_PLATINA =
    2500;

function normalizarTelefone(
    valor = ''
) {

    return String(valor)
        .replace(
            /\D/g,
            ''
        );

}

function criarSlugBase(
    valor = ''
) {

    return String(valor)

        .normalize(
            'NFD'
        )

        .replace(
            /[\u0300-\u036f]/g,
            ''
        )

        .toLowerCase()

        .trim()

        .replace(
            /[^a-z0-9]+/g,
            '-'
        )

        .replace(
            /^-+|-+$/g,
            ''
        );

}


function criarSlugUnico(
    nomeCompleto
) {

    const base =
        criarSlugBase(
            nomeCompleto
        )
        || 'usuario';


    let slug =
        base;


    let sufixo =
        2;


    while (
        usuarios.some(
            usuario =>
                usuario.slug
                === slug
        )
    ) {

        slug =
            `${base}-${sufixo}`;

        sufixo +=
            1;

    }


    return slug;

}


function proximoId() {

    if (
        usuarios.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...usuarios.map(
                usuario =>
                    usuario.id
            )
        )
        +
        1
    );

}


function calcularNivel(
    pontos,
    colaborador
) {

    if (!colaborador) {

        return null;

    }


    if (
        pontos >= NIVEL_PLATINA
    ) {

        return 'Platina';

    }


    if (
        pontos >= NIVEL_DIAMANTE
    ) {

        return 'Diamante';

    }


    return 'Comum';

}


function sincronizarNivel(
    usuario
) {

    if (!usuario) {

        return null;

    }


    usuario.nivel =
        calcularNivel(

            usuario.pontos,

            usuario.colaborador

        );


    usuario.tipo =
        usuario.colaborador

            ? 'colaborador'

            : 'usuario';


    if (
        usuario.nivel
        !== 'Platina'
    ) {

        usuario.disponivelAtendimento =
            false;

    }


    return usuario;

}

function gerarIniciais(
    nome = '',
    sobrenome = ''
) {

    const partes =
        `${nome} ${sobrenome}`
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (
        partes.length === 0
    ) {

        return 'MX';

    }


    return partes

        .slice(
            0,
            2
        )

        .map(
            parte =>
                parte
                    .charAt(0)
                    .toUpperCase()
        )

        .join('');

}

function toPublic(
    usuario
) {

    if (!usuario) {

        return null;

    }


    return {

        id:
            usuario.id,

        slug:
            usuario.slug,

        nome:
            usuario.nome,

        sobrenome:
            usuario.sobrenome,

        nomeCompleto:
            `${usuario.nome} ${usuario.sobrenome}`
                .trim(),

        iniciais:
            gerarIniciais(
                usuario.nome,
                usuario.sobrenome
            ),

        handle:
            `@${String(
                usuario.slug
                || 'usuario'
            ).replace(/-/g, '')}`,

        localizacao:
            usuario.localizacao
            || 'Brasil',

        tipo:
            usuario.tipo,

        colaborador:
            usuario.colaborador,

        nivel:
            usuario.nivel,

        pontos:
            usuario.pontos,

        bio:
            usuario.bio,

        especialidades:
            [
                ...(
                    usuario.especialidades
                    || []
                )
            ],

        disponivelAtendimento:
            Boolean(
                usuario
                    .disponivelAtendimento
            ),

        podeAtendimentoDireto:
            usuario.nivel
            === 'Platina',

        criadoEm:
            usuario.criadoEm

    };

}


function toPrivate(
    usuario
) {

    if (!usuario) {

        return null;

    }


    return {

        ...toPublic(
            usuario
        ),

        email:
            usuario.email,

        telefone:
            usuario.telefone,

        idade:
            usuario.idade,

        genero:
            usuario.genero

    };

}


function findAll() {

    return usuarios;

}


function findById(id) {

    const numero =
        Number(id);


    return (
        usuarios.find(
            usuario =>
                usuario.id
                === numero
        )
        ||
        null
    );

}


function findBySlug(
    slug
) {

    return (
        usuarios.find(
            usuario =>
                usuario.slug
                === String(slug)
        )
        ||
        null
    );

}


function findByIdentifier(
    identificador
) {

    const valor =
        String(
            identificador
            || ''
        )
            .trim();


    if (!valor) {

        return null;

    }


    if (
        valor.includes('@')
    ) {

        const email =
            valor.toLowerCase();


        return (
            usuarios.find(
                usuario =>
                    usuario.email
                        .toLowerCase()
                    === email
            )
            ||
            null
        );

    }


    const telefone =
        normalizarTelefone(
            valor
        );


    return (
        usuarios.find(
            usuario =>
                normalizarTelefone(
                    usuario.telefone
                )
                === telefone
        )
        ||
        null
    );

}


function getRanking(
    limite = 10
) {

    return usuarios

        .filter(
            usuario =>

                usuario.colaborador

                &&

                [
                    'Diamante',
                    'Platina'
                ]
                    .includes(
                        usuario.nivel
                    )
        )

        .sort(
            (a, b) =>
                b.pontos
                -
                a.pontos
        )

        .slice(
            0,
            limite
        );

}


function getPlatinaDisponiveis() {

    return usuarios.filter(
        usuario =>

            usuario.colaborador

            &&

            usuario.nivel
            === 'Platina'

            &&

            usuario
                .disponivelAtendimento
    );

}


function create(
    dados
) {

    const colaborador =
        Boolean(
            dados.colaborador
        );


    const novoUsuario = {

        id:
            proximoId(),

        slug:
            criarSlugUnico(
                `${dados.nome} ${dados.sobrenome}`
            ),

        nome:
            dados.nome,

        sobrenome:
            dados.sobrenome,

        email:
            dados.email
            || '',

        telefone:
            dados.telefone
            || '',

        idade:
            Number(
                dados.idade
            ),

        genero:
            dados.genero,

        tipo:
            colaborador
                ? 'colaborador'
                : 'usuario',

        colaborador,

        nivel:
            colaborador
                ? 'Comum'
                : null,

        pontos:
            0,

        bio:
            dados.bio
            || '',

        localizacao:
            dados.localizacao
            || 'Brasil',

        especialidades:
            Array.isArray(
                dados.especialidades
            )

                ? dados.especialidades

                : [],

        disponivelAtendimento:
            false,

        senhaHash:
            dados.senhaHash,

        criadoEm:
            new Date()
                .toISOString()

    };


    usuarios.push(
        novoUsuario
    );


    return novoUsuario;

}


function update(
    id,
    alteracoes
) {

    const usuario =
        findById(id);


    if (!usuario) {

        return null;

    }


    Object.assign(
        usuario,
        alteracoes
    );


    sincronizarNivel(
        usuario
    );


    return usuario;

}


function adicionarPontos(
    id,
    quantidade
) {

    const usuario =
        findById(id);


    if (
        !usuario
        ||
        !usuario.colaborador
    ) {

        return null;

    }


    const valor =
        Number(
            quantidade
        );


    if (
        !Number.isFinite(
            valor
        )
    ) {

        return usuario;

    }


    usuario.pontos =
        Math.max(

            0,

            usuario.pontos
            +
            valor

        );


    sincronizarNivel(
        usuario
    );


    return usuario;

}


function definirDisponibilidade(
    id,
    disponivel
) {

    const usuario =
        findById(id);


    if (
        !usuario
        ||
        usuario.nivel
        !== 'Platina'
    ) {

        return null;

    }


    usuario.disponivelAtendimento =
        Boolean(
            disponivel
        );


    return usuario;

}


function remove(id) {

    const numero =
        Number(id);


    const indice =
        usuarios.findIndex(
            usuario =>
                usuario.id
                === numero
        );


    if (
        indice === -1
    ) {

        return null;

    }


    const [
        removido
    ] =
        usuarios.splice(
            indice,
            1
        );


    return removido;

}


module.exports = {

    NIVEL_DIAMANTE,

    NIVEL_PLATINA,

    normalizarTelefone,

    criarSlugBase,

    calcularNivel,

    sincronizarNivel,

    toPublic,

    toPrivate,

    findAll,

    findById,

    findBySlug,

    findByIdentifier,

    getRanking,

    getPlatinaDisponiveis,

    create,

    update,

    adicionarPontos,

    definirDisponibilidade,

    remove

};