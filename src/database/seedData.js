function opcional(valor) {
    const texto = String(valor ?? '').trim();
    return texto || null;
}

function normalizarPassos(tutorial) {
    return (tutorial.passos || []).map((passo, index) => {
        const ordemOriginal = passo.ordem || index + 1;
        // Mesma precedência do TutorialService: null explícito remove a imagem.
        const imagem = Object.hasOwn(passo, 'imagem') ? passo.imagem
            : (tutorial.imagens || []).find((item, indice) => (item?.ordem || indice + 1) === ordemOriginal);
        const ordem = index + 1;

        return {
            tutorial_id: tutorial.id,
            ordem,
            titulo: passo.titulo,
            descricao: passo.descricao,
            imagem_url: imagem ? opcional(imagem.url) : null,
            imagem_alt: imagem ? opcional(imagem.alt) || `Imagem do passo ${ordem}` : null,
            imagem_legenda: imagem ? opcional(imagem.legenda) : null,
            link_url: passo.linkExterno ? opcional(passo.linkExterno.url) : null,
            link_texto: passo.linkExterno ? opcional(passo.linkExterno.texto) : null
        };
    });
}

// Transformação pura: não altera os arrays e não recalcula pontos ou hashes.
function prepararDadosSeed({ usuarios, tutoriais, comentarios, avaliacoes, categorias }) {
    return {
        categorias: categorias.map(({ id, nome }) => ({ id, nome })),
        usuarios: usuarios.map(usuario => ({
            id: usuario.id,
            slug: usuario.slug,
            nome: usuario.nome,
            sobrenome: usuario.sobrenome,
            email: opcional(usuario.email)?.toLowerCase() ?? null,
            telefone: opcional(String(usuario.telefone ?? '').replace(/\D/g, '')),
            idade: usuario.idade,
            genero: usuario.genero,
            colaborador: usuario.colaborador,
            pontos: usuario.pontos,
            bio: usuario.bio || '',
            localizacao: usuario.localizacao || 'Brasil',
            disponivel_atendimento: Boolean(usuario.disponivelAtendimento),
            senha_hash: usuario.senhaHash,
            criado_em: usuario.criadoEm
        })),
        tutoriais: tutoriais.map(tutorial => ({
            id: tutorial.id,
            slug: tutorial.slug,
            autor_id: tutorial.autorId,
            categoria_id: tutorial.categoriaId,
            titulo: tutorial.titulo,
            resumo: tutorial.resumo,
            conteudo: tutorial.conteudo,
            video_url: opcional(tutorial.videoUrl),
            visualizacoes: tutorial.visualizacoes,
            criado_em: tutorial.criadoEm,
            atualizado_em: tutorial.atualizadoEm ?? null
        })),
        tutorial_passos: tutoriais.flatMap(normalizarPassos),
        tutorial_tags: tutoriais.flatMap(tutorial =>
            [...new Set((tutorial.tags || []).map(tag => opcional(tag)?.toLowerCase()).filter(Boolean))]
                .map(tag => ({ tutorial_id: tutorial.id, tag }))),
        comentarios: comentarios.map(comentario => ({
            id: comentario.id,
            tutorial_id: comentario.tutorialId,
            usuario_id: comentario.usuarioId,
            texto: comentario.texto,
            criado_em: comentario.criadoEm,
            atualizado_em: comentario.atualizadoEm ?? null
        })),
        avaliacoes: avaliacoes.map(avaliacao => ({
            id: avaliacao.id,
            tutorial_id: avaliacao.tutorialId,
            avaliador_id: avaliacao.avaliadorId,
            nota: avaliacao.nota,
            criado_em: avaliacao.criadoEm,
            atualizado_em: avaliacao.atualizadoEm ?? null
        }))
    };
}

function carregarDadosSeed() {
    return prepararDadosSeed({
        usuarios: require('../data/usuarioData'),
        tutoriais: require('../data/tutorialData'),
        comentarios: require('../data/comentarioData'),
        avaliacoes: require('../data/avaliacaoData'),
        categorias: require('../utils/categorias').listarCategorias()
    });
}

module.exports = { prepararDadosSeed, normalizarPassos, carregarDadosSeed };
