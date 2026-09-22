const bcrypt = require('bcryptjs');


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
        senhaHash:
            bcrypt.hashSync('123456', 10),
        criadoEm:
            '2026-09-08T12:00:00.000Z'
    }

];


// FUNÇÕES AUXILIARES
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

        slug = `${base}-${sufixo}`;

        sufixo += 1;

    }


    return slug;

}


function proximoId() {

    if (usuarios.length === 0) {
        return 1;
    }

    return (
        Math.max(
            ...usuarios.map(
                usuario => usuario.id
            )
        ) + 1
    );

}

// OBJETO PÚBLICO
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
        idade:
            usuario.idade,
        genero:
            usuario.genero,
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
        criadoEm:
            usuario.criadoEm

    };

}


// OBJETO PRIVADO
function toPrivate(usuario) {

    if (!usuario) {
        return null;
    }


    return {

        ...toPublic(usuario),

        email:
            usuario.email,

        telefone:
            usuario.telefone

    };

}


// READ
function findAll() {

    return usuarios;

}


function findById(id) {

    const numero = Number(id);
    return (
        usuarios.find(
            usuario =>
                usuario.id === numero
        ) || null
    );

}


function findBySlug(slug) {
    return (
        usuarios.find(
            usuario =>
                usuario.slug === String(slug)
        ) || null
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

    if (valor.includes('@')) {

        const email =
            valor.toLowerCase();


        return (
            usuarios.find(
                usuario =>
                    usuario.email.toLowerCase()
                    === email
            ) || null
        );

    }


    // TELEFONE

    const telefone =
        normalizarTelefone(valor);


    return (
        usuarios.find(
            usuario =>
                normalizarTelefone(
                    usuario.telefone
                ) === telefone
        ) || null
    );

}


// CREATE
function create(dados) {

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
            Number(dados.idade),

        genero:
            dados.genero,

        tipo:
            dados.colaborador
                ? 'colaborador'
                : 'usuario',

        colaborador:
            Boolean(
                dados.colaborador
            ),

        nivel:
            dados.colaborador
                ? 'Comum'
                : null,

        pontos:
            0,

        bio:
            dados.bio || '',

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


// UPDATE
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


    return usuario;

}

// DELETE
function remove(id) {

    const numero =
        Number(id);


    const indice =
        usuarios.findIndex(
            usuario =>
                usuario.id === numero
        );


    if (indice === -1) {
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

    normalizarTelefone,

    toPublic,

    toPrivate,

    findAll,

    findById,

    findBySlug,

    findByIdentifier,

    create,

    update,

    remove

};