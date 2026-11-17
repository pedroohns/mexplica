const RepositoryFactory = require('../repositories/repositoryFactory');
const repository = RepositoryFactory.criarUsuarioRepository();

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

async function findAll() {
    return (await repository.findAll()).map(sincronizarNivel);
}

async function findById(id) {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero <= 0) return null;
    return sincronizarNivel(await repository.findById(numero));
}

async function findBySlug(slug) {
    return sincronizarNivel(await repository.findBySlug(String(slug)));
}

async function findByIdentifier(identificador) {
    return sincronizarNivel(await repository.findByIdentifier(identificador));
}

async function getRanking(limite = 10) {
    return (await repository.getRanking(limite, NIVEL_DIAMANTE)).map(sincronizarNivel);
}

async function getPlatinaDisponiveis() {
    return (await repository.getPlatinaDisponiveis(NIVEL_PLATINA)).map(sincronizarNivel);
}

async function create(dados) {
    const colaborador = Boolean(dados.colaborador);
    const base = criarSlugBase(dados.nome + ' ' + dados.sobrenome) || 'usuario';
    const usuario = {
        nome: dados.nome, sobrenome: dados.sobrenome,
        email: String(dados.email || '').trim().toLowerCase(),
        telefone: normalizarTelefone(dados.telefone),
        idade: Number(dados.idade), genero: dados.genero, colaborador,
        pontos: 0, bio: dados.bio || '', localizacao: dados.localizacao || 'Brasil',
        disponivelAtendimento: false, senhaHash: dados.senhaHash, criadoEm: new Date().toISOString()
    };

    // A consulta evita colis?es comuns; UNIQUE ? a garantia final para concorr?ncia.
    for (let tentativa = 1; tentativa <= 50; tentativa++) {
        const slug = tentativa === 1 ? base : base + '-' + tentativa;
        if (await repository.findBySlug(slug)) continue;
        try {
            return sincronizarNivel(await repository.create({ ...usuario, slug }));
        } catch (erro) {
            if (erro.code !== 'USUARIO_SLUG_CONFLITO') throw erro;
        }
    }
    const erro = new Error('N?o foi poss?vel reservar um nome de perfil. Tente novamente.');
    erro.code = 'USUARIO_SLUG_CONFLITO';
    throw erro;
}

async function update(id, alteracoes) {
    const usuario = await findById(id);
    if (!usuario) return null;
    const permitidas = {};
    for (const campo of ['nome', 'sobrenome', 'bio', 'localizacao', 'idade', 'genero']) {
        if (Object.hasOwn(alteracoes, campo)) permitidas[campo] = alteracoes[campo];
    }
    return sincronizarNivel(await repository.update(usuario.id, permitidas));
}

async function adicionarPontos(id, quantidade) {
    const valor = Number(quantidade);
    if (!Number.isFinite(valor)) return findById(id);
    return sincronizarNivel(await repository.adicionarPontos(Number(id), valor, NIVEL_PLATINA));
}

async function definirDisponibilidade(id, disponivel) {
    const usuario = await findById(id);
    if (!usuario || usuario.nivel !== 'Platina') return null;
    return sincronizarNivel(await repository.definirDisponibilidade(usuario.id, Boolean(disponivel), NIVEL_PLATINA));
}

async function remove(id, { ajustesPontos = [] } = {}) {
    return sincronizarNivel(await repository.remove(Number(id), { ajustesPontos, pontosPlatina: NIVEL_PLATINA }));
}

module.exports = {
    NIVEL_DIAMANTE, NIVEL_PLATINA, normalizarTelefone, criarSlugBase,
    calcularNivel, sincronizarNivel, toPublic, toPrivate,
    findAll, findById, findBySlug, findByIdentifier, getRanking, getPlatinaDisponiveis,
    create, update, adicionarPontos, definirDisponibilidade, remove
};
