const bcrypt = require('bcryptjs');

const NIVEL_DIAMANTE = 1000;
const NIVEL_PLATINA = 2500;

const usuarios = [
    {
        id: 1,
        slug: 'maria-oliveira',
        nome: 'Maria',
        sobrenome: 'Oliveira',
        email: 'maria@mexplica.com',
        telefone: '24999990001',
        idade: 67,
        genero: 'feminino',
        tipo: 'usuario',
        colaborador: false,
        nivel: null,
        pontos: 0,
        bio:
            'Estou aprendendo a usar melhor o celular e os aplicativos do dia a dia.',
        especialidades: [],
        disponivelAtendimento: false,
        senhaHash:
            bcrypt.hashSync('123456', 10),
        criadoEm:
            '2026-09-15T14:00:00.000Z'
    },

    {
        id: 2,
        slug: 'lucas-mendes',
        nome: 'Lucas',
        sobrenome: 'Mendes',
        email: 'lucas@mexplica.com',
        telefone: '24999990002',
        idade: 24,
        genero: 'masculino',
        tipo: 'colaborador',
        colaborador: true,
        nivel: 'Diamante',
        pontos: 1250,
        bio:
            'Gosto de ajudar pessoas com segurança digital, smartphones e aplicativos.',
        especialidades: [
            'Segurança',
            'Smartphones'
        ],
        disponivelAtendimento: false,
        senhaHash:
            bcrypt.hashSync('123456', 10),
        criadoEm:
            '2026-09-10T17:30:00.000Z'
    },

    {
        id: 3,
        slug: 'ana-souza',
        nome: 'Ana',
        sobrenome: 'Souza',
        email: 'ana@mexplica.com',
        telefone: '24999990003',
        idade: 31,
        genero: 'feminino',
        tipo: 'colaborador',
        colaborador: true,
        nivel: 'Platina',
        pontos: 2840,
        bio:
            'Ajudo principalmente com serviços digitais, acessibilidade e aplicativos de comunicação.',
        especialidades: [
            'Acessibilidade',
            'Comunicação',
            'Serviços digitais'
        ],
        disponivelAtendimento: true,
        senhaHash:
            bcrypt.hashSync('123456', 10),
        criadoEm:
            '2026-09-08T12:00:00.000Z'
    },

    {
        id: 4,
        slug: 'carlos-lima',
        nome: 'Carlos',
        sobrenome: 'Lima',
        email: 'carlos@mexplica.com',
        telefone: '24999990004',
        idade: 27,
        genero: 'masculino',
        tipo: 'colaborador',
        colaborador: true,
        nivel: 'Comum',
        pontos: 980,
        bio:
            'Gosto de ensinar configurações básicas de celulares e aplicativos de comunicação.',
        especialidades: [
            'Smartphones',
            'Comunicação'
        ],
        disponivelAtendimento: false,
        senhaHash:
            bcrypt.hashSync('123456', 10),
        criadoEm:
            '2026-09-18T11:00:00.000Z'
    }
];


// =============================
// FUNÇOES AUXILIARES
// =============================
function normalizarTelefone(valor = '') {

    return String(valor)
        .replace(/\D/g, '');

}


function criarSlugBase(valor = '') {

    return String(valor)

        .normalize('NFD')

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


function criarSlugUnico(nomeCompleto) {

    const base =
        criarSlugBase(nomeCompleto)
        || 'usuario';

    let slug = base;
    let sufixo = 2;


    while (
        usuarios.some(
            usuario =>
                usuario.slug === slug
        )
    ) {

        slug =
            `${base}-${sufixo}`;

        sufixo += 1;

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
        ) + 1
    );

}


// =============================
// NÍVEIS DE COLABORADOR
// =============================
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


    // somente PLATINA pode
    // ficar disponivel para
    // atendimento direto.
    if (
        usuario.nivel
        !== 'Platina'
    ) {

        usuario.disponivelAtendimento =
            false;

    }


    return usuario;

}


// =============================
// OBJETO PÚBLICO
// =============================
function toPublic(usuario) {

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


// =============================
// OBJETO PRIVADO
// =============================
function toPrivate(usuario) {

    if (!usuario) {
        return null;
    }


    return {

        ...toPublic(usuario),

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


// =============================
// READ
// =============================
function findAll() {

    return usuarios;

}


function findById(id) {

    const numero =
        Number(id);


    return (
        usuarios.find(
            usuario =>
                usuario.id === numero
        )
        || null
    );

}


function findBySlug(slug) {

    return (
        usuarios.find(
            usuario =>
                usuario.slug
                === String(slug)
        )
        || null
    );

}


function findByIdentifier(
    identificador
) {

    const valor =
        String(
            identificador || ''
        ).trim();


    if (!valor) {
        return null;
    }


    // EMAIL
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
            || null
        );

    }


    // TELEFONE
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
        || null
    );

}


// =============================
// RANKING
// =============================
function getRanking(
    limite = 10
) {

    return usuarios

        .filter(
            usuario =>
                usuario.colaborador
                &&
                (
                    usuario.nivel
                    === 'Diamante'
                    ||
                    usuario.nivel
                    === 'Platina'
                )
        )

        .sort(
            (a, b) =>
                b.pontos - a.pontos
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


// =============================
// CREATE
// =============================
function create(dados) {

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
            dados.email || '',

        telefone:
            dados.telefone || '',

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
            dados.bio || '',

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


// =============================
// UPDATE
// =============================
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


// =============================
// PONTUAÇÃO
// =============================
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
        !Number.isFinite(valor)
    ) {

        return usuario;

    }


    usuario.pontos =
        Math.max(
            0,
            usuario.pontos + valor
        );


    sincronizarNivel(
        usuario
    );

    return usuario;
}

// =============================
// DISPONIBILIDADE PLATINA
// =============================
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

// =============================
// DELETE
// =============================
function remove(id) {

    const numero =
        Number(id);


    const indice =
        usuarios.findIndex(
            usuario =>
                usuario.id === numero
        );

    if (
        indice === -1
    ) {

        return null;

    }


    const [removido] =
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