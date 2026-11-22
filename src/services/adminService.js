const UsuarioModel = require('../models/usuarioModel');
const TutorialModel = require('../models/tutorialModel');
const ComentarioModel = require('../models/comentarioModel');
const AvaliacaoModel = require('../models/avaliacaoModel');
const { listarCategorias } = require('../utils/categorias');

const tamanhoPagina = 20;
const normalizar = valor => TutorialModel.normalizarTexto(valor).replace(/[@-]/g, '');

function paginar(itens, { q = '', pagina = 1 } = {}, textoBusca) {
    const consulta = normalizar(typeof q === 'string' ? q.slice(0, 160) : '');
    const encontrados = itens.filter(item => normalizar(textoBusca(item)).includes(consulta))
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm) || b.id - a.id);
    const paginas = Math.max(1, Math.ceil(encontrados.length / tamanhoPagina));
    const solicitada = Number(pagina);
    const atual = Number.isSafeInteger(solicitada) && solicitada > 0 ? Math.min(solicitada, paginas) : 1;
    return { itens: encontrados.slice((atual - 1) * tamanhoPagina, atual * tamanhoPagina),
        total: encontrados.length, pagina: atual, paginas, tamanhoPagina };
}

function autorResumido(usuario) {
    if (!usuario) return { nomeCompleto: 'Conta indisponível', iniciais: 'MX', handle: '', slug: null };
    const { id, slug, nomeCompleto, iniciais, handle } = UsuarioModel.toPublic(usuario);
    return { id, slug, nomeCompleto, iniciais, handle };
}

async function referencias() {
    // Duas leituras em lote, independentemente da quantidade de registros exibidos.
    const [usuarios, tutoriais] = await Promise.all([UsuarioModel.findAll(), TutorialModel.listarParaModeracao()]);
    const autores = new Map(usuarios.map(item => [item.id, autorResumido(item)]));
    return { usuarios: autores,
        tutoriais: new Map(tutoriais.map(item => [item.id, { id: item.id, slug: item.slug,
            titulo: item.titulo, autor: autores.get(item.autorId) || autorResumido(null) }])) };
}

async function resumo() {
    const [usuarios, tutoriais, comentarios, avaliacoes] = await Promise.all([
        UsuarioModel.count(), TutorialModel.count(), ComentarioModel.count(), AvaliacaoModel.count()
    ]);
    return { usuarios, tutoriais, comentarios, avaliacoes };
}

async function listarUsuarios(opcoes) {
    const itens = (await UsuarioModel.findAll()).map(usuario => {
        // Whitelist: nenhuma propriedade do objeto persistente é serializada por spread.
        const { id, slug, nomeCompleto, iniciais, handle, tipo, colaborador, nivel, pontos, criadoEm } = UsuarioModel.toPublic(usuario);
        return { id, slug, nomeCompleto, iniciais, handle, tipo, colaborador, nivel, pontos, criadoEm,
            email: usuario.email, administrador: usuario.administrador === true };
    });
    return paginar(itens, opcoes, item => `${item.nomeCompleto} ${item.slug} ${item.handle} ${item.email}`);
}

async function listarTutoriais(opcoes) {
    const [usuarios, tutoriais, comentarios, avaliacoes] = await Promise.all([
        UsuarioModel.findAll(), TutorialModel.listarParaModeracao(), ComentarioModel.findAll(), AvaliacaoModel.findAll()
    ]);
    const autores = new Map(usuarios.map(item => [item.id, autorResumido(item)]));
    const categorias = new Map(listarCategorias().map(item => [item.id, item.nome]));
    const contar = lista => {
        const contagens = new Map();
        for (const item of lista) contagens.set(item.tutorialId, (contagens.get(item.tutorialId) || 0) + 1);
        return contagens;
    };
    const totaisComentarios = contar(comentarios), totaisAvaliacoes = contar(avaliacoes);
    const itens = tutoriais.map(({ id, slug, titulo, criadoEm, visualizacoes, categoriaId, autorId }) => ({
        id, slug, titulo, criadoEm, visualizacoes, categoria: categorias.get(categoriaId) || categoriaId,
        autor: autores.get(autorId) || autorResumido(null),
        comentarios: totaisComentarios.get(id) || 0, avaliacoes: totaisAvaliacoes.get(id) || 0
    }));
    return paginar(itens, opcoes, item => `${item.titulo} ${item.slug} ${item.autor.nomeCompleto} ${item.autor.handle}`);
}

async function listarComentarios(opcoes) {
    const [refs, comentarios] = await Promise.all([referencias(), ComentarioModel.findAll()]);
    const itens = comentarios.map(item => ({ id: item.id, texto: item.texto, criadoEm: item.criadoEm,
        autor: refs.usuarios.get(item.usuarioId) || autorResumido(null), tutorial: refs.tutoriais.get(item.tutorialId) || null }));
    return paginar(itens, opcoes, item => `${item.texto} ${item.autor.nomeCompleto} ${item.autor.handle} ${item.tutorial?.titulo || ''}`);
}

async function listarAvaliacoes(opcoes) {
    const [refs, avaliacoes] = await Promise.all([referencias(), AvaliacaoModel.findAll()]);
    const itens = avaliacoes.map(item => ({ id: item.id, nota: item.nota, criadoEm: item.criadoEm,
        autor: refs.usuarios.get(item.avaliadorId) || autorResumido(null), tutorial: refs.tutoriais.get(item.tutorialId) || null }));
    return paginar(itens, opcoes, item => `${item.autor.nomeCompleto} ${item.autor.handle} ${item.tutorial?.titulo || ''} ${item.tutorial?.autor.nomeCompleto || ''}`);
}

module.exports = { resumo, listarUsuarios, listarTutoriais, listarComentarios, listarAvaliacoes };
