const UsuarioModel = require('../models/usuarioModel');
const TutorialModel = require('../models/tutorialModel');
const ComentarioModel = require('../models/comentarioModel');
const AvaliacaoModel = require('../models/avaliacaoModel');
const { getCategoria, categoriaValida } = require('../utils/categorias');
const { limites, urlHttp, urlImagem, youtubeId } = require('../../public/js/tutorial/contrato');
const { validarImagemSerializada } = require('./tutorialImagem');

function imagemDoPasso(imagem, ordem) {
    if (!imagem) return null;
    const url = String(imagem.url || '').trim();
    const segura = url.startsWith('data:') ? validarImagemSerializada(url) : urlImagem(url);
    if (!segura) throw new Error('A imagem precisa ser JPEG, PNG, WebP ou ter uma URL válida.');
    return {
        url: segura,
        alt: String(imagem.alt || '').trim().slice(0, 180) || `Imagem do passo ${ordem}`,
        legenda: String(imagem.legenda || '').trim().slice(0, 240)
    };
}

function linkDoPasso(link) {
    if (!link) return null;
    const url = urlHttp(String(link.url || '').trim());
    const texto = String(link.texto || '').trim();
    if (!url) throw new Error('O link externo precisa ser uma URL http:// ou https:// válida.');
    if (!texto || texto.length > limites.textoLink) throw new Error('O texto do link deve ter entre 1 e 120 caracteres.');
    return { url, texto };
}

// Ausência de imagem usa o legado por ordem. null explícito significa remoção.
function passosCompativeis(tutorial) {
    return (tutorial.passos || []).map((passo, index) => {
        const ordem = passo.ordem || index + 1;
        const origem = Object.hasOwn(passo, 'imagem') ? passo.imagem
            : (tutorial.imagens || []).find((imagem, indexImagem) => (imagem?.ordem || indexImagem + 1) === ordem);
        let imagem = null;
        let linkExterno = null;
        try { imagem = imagemDoPasso(origem, ordem); } catch { /* Legado inválido não vira src. */ }
        try { linkExterno = linkDoPasso(passo.linkExterno); } catch { /* Nunca renderizar URL insegura. */ }
        return { ...passo, ordem: index + 1, imagem, linkExterno };
    });
}

function validarCampos(dados, { videoLegado } = {}) {
    try {
        // A atualização parcial pode trazer a coleção derivada do Model junto dos
        // mesmos dados dentro dos passos. Ela não integra o JSON enviado pelo editor.
        const entrada = { ...dados };
        if (Array.isArray(dados?.passos) && dados.passos.every(passo => passo && Object.hasOwn(passo, 'imagem'))) {
            delete entrada.imagens;
        }
        if (!dados || Buffer.byteLength(JSON.stringify(entrada), 'utf8') > limites.payloadBytes) {
            return { erro: 'O tutorial excede o limite total de 1 MB. Reduza as imagens.' };
        }
        const titulo = String(dados.titulo || '').trim();
        const resumo = String(dados.resumo || '').trim();
        const conteudo = String(dados.conteudo || '').trim();
        const categoriaId = String(dados.categoriaId || '').trim();
        if (titulo.length < 8 || titulo.length > 160) return { erro: 'O título deve ter entre 8 e 160 caracteres.' };
        if (resumo.length < 15 || resumo.length > 320) return { erro: 'O resumo deve ter entre 15 e 320 caracteres.' };
        if (conteudo.length < 30 || conteudo.length > 6000) return { erro: 'A introdução do tutorial deve ter entre 30 e 6000 caracteres.' };
        if (!categoriaValida(categoriaId)) return { erro: 'Selecione uma categoria válida.' };
        if (!Array.isArray(dados.passos) || !dados.passos.length) return { erro: 'Adicione pelo menos um passo ao tutorial.' };
        if (dados.passos.length > limites.passos) return { erro: 'O tutorial pode ter no máximo 9 passos.' };

        const passos = dados.passos.map((passo, index) => {
            const titulo = String(passo?.titulo || '').trim();
            const descricao = String(passo?.descricao || '').trim();
            if (titulo.length < 3 || titulo.length > limites.tituloPasso) {
                throw new Error(`O título do bloco ${index + 1} deve ter entre 3 e 120 caracteres.`);
            }
            if (descricao.length < 3 || descricao.length > limites.descricaoPasso) {
                throw new Error(`A descrição do bloco ${index + 1} deve ter entre 3 e 1000 caracteres.`);
            }
            const origem = Object.hasOwn(passo, 'imagem') ? passo.imagem
                : (Array.isArray(dados.imagens) ? dados.imagens : []).find((imagem, indexImagem) =>
                    (imagem?.ordem || indexImagem + 1) === (passo.ordem || index + 1));
            // A antiga API descartava URLs de imagem inválidas.
            const imagem = origem && !Object.hasOwn(passo, 'imagem') && !urlImagem(origem.url)
                ? null : imagemDoPasso(origem, index + 1);
            return { ordem: index + 1, titulo, descricao, imagem, linkExterno: linkDoPasso(passo.linkExterno) };
        });
        const imagens = passos.filter(passo => passo.imagem).map(passo => ({ ordem: passo.ordem, ...passo.imagem }));
        const tags = [...new Set((Array.isArray(dados.tags) ? dados.tags : []).map(tag =>
            String(tag || '').trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 10);
        const valorVideo = String(dados.videoUrl || '').trim();
        const id = youtubeId(valorVideo);
        let videoUrl = '';
        if (valorVideo) {
            if (id) videoUrl = `https://www.youtube.com/watch?v=${id}`;
            else if (valorVideo === videoLegado && urlImagem(valorVideo)) videoUrl = valorVideo;
            else if (!urlImagem(valorVideo)) return { erro: 'A URL do vídeo precisa começar com http://, https:// ou /.' };
            else return { erro: 'Informe um link válido de vídeo do YouTube (youtube.com ou youtu.be).' };
        }
        return { dados: { titulo, resumo, conteudo, categoriaId, passos, imagens, videoUrl, tags } };
    } catch (erro) {
        return { erro: erro.message };
    }
}

function enriquecerTutorial(tutorial, usuarioAtualId = null) {
    const minhaAvaliacao = usuarioAtualId
        ? AvaliacaoModel.findByTutorialEAvaliador(tutorial.id, usuarioAtualId) : null;
    const passos = passosCompativeis(tutorial);
    const videoId = youtubeId(tutorial.videoUrl);
    return {
        ...tutorial,
        passos,
        imagens: passos.filter(passo => passo.imagem).map(passo => ({ ordem: passo.ordem, ...passo.imagem })),
        videoId,
        videoUrl: urlImagem(tutorial.videoUrl) || '',
        autor: UsuarioModel.toPublic(UsuarioModel.findById(tutorial.autorId)),
        categoria: getCategoria(tutorial.categoriaId),
        avaliacao: AvaliacaoModel.resumoDoTutorial(tutorial.id),
        quantidadeComentarios: ComentarioModel.findByTutorialId(tutorial.id).length,
        minhaAvaliacao: minhaAvaliacao ? { id: minhaAvaliacao.id, nota: minhaAvaliacao.nota } : null
    };
}

// A semana acompanha a janela móvel de sete dias usada na comunidade.
// Sem publicações recentes, não substituímos o período por dados antigos.
function rankingDeRespostas(limite = 10, agora = Date.now()) {
    const inicio = agora - 7 * 24 * 60 * 60 * 1000;
    const publicacoesPorAutor = new Map();

    TutorialModel.findAll().forEach(tutorial => {
        const data = new Date(tutorial.criadoEm).getTime();
        if (!Number.isFinite(data) || data < inicio || data > agora) {
            return;
        }

        publicacoesPorAutor.set(
            tutorial.autorId,
            (publicacoesPorAutor.get(tutorial.autorId) || 0) + 1
        );
    });

    return [...publicacoesPorAutor].map(([autorId, quantidadeTutoriais]) => {
        const autor = UsuarioModel.findById(autorId);
        if (!autor?.colaborador) return null;

        return {
            ...UsuarioModel.toPublic(autor),
            quantidadeTutoriais
        };
    }).filter(Boolean).sort((a, b) =>
        b.quantidadeTutoriais - a.quantidadeTutoriais
        || a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')
        || a.id - b.id
    ).slice(0, limite);
}

module.exports = {
    rankingDeRespostas,
    validarCampos,
    enriquecerTutorial
};
