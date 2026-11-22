const AdminService = require('../services/adminService');
const RelacionamentoService = require('../services/relacionamentoService');
const ComentarioModel = require('../models/comentarioModel');

function acessoPagina(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!req.usuario) return res.redirect('/cadastro.html?redirect=%2Fadmin');
    if (req.usuario.administrador !== true) return res.status(403).render('admin', { negado: true, resumo: null });
    return next();
}

async function pagina(req, res) { return res.render('admin', { negado: false, resumo: await AdminService.resumo() }); }
async function resumo(req, res) { return res.json(await AdminService.resumo()); }
async function usuarios(req, res) { return res.json(await AdminService.listarUsuarios(req.query)); }
async function tutoriais(req, res) { return res.json(await AdminService.listarTutoriais(req.query)); }
async function comentarios(req, res) { return res.json(await AdminService.listarComentarios(req.query)); }
async function avaliacoes(req, res) { return res.json(await AdminService.listarAvaliacoes(req.query)); }

function respostaExclusao(res, removido, entidade) {
    if (!removido) return res.status(404).json({ erro: `${entidade} não ${entidade === 'Avaliação' ? 'encontrada' : 'encontrado'}.` });
    return res.json({ mensagem: entidade === 'Avaliação' ? 'Avaliação removida com sucesso.' : `${entidade} excluído com sucesso.` });
}

async function excluirUsuario(req, res) {
    try {
        const removido = await RelacionamentoService.removerDadosDoUsuario(req.params.id, { administradorId: req.usuario.id });
        return respostaExclusao(res, removido, 'Usuário');
    } catch (erro) {
        if (erro.code === 'ADMIN_AUTOEXCLUSAO') return res.status(403).json({ erro: 'Você não pode excluir a própria conta pela moderação.' });
        if (erro.code === 'ADMIN_USUARIO_PROTEGIDO') return res.status(403).json({ erro: 'Contas administrativas são protegidas e não podem ser excluídas pela moderação.' });
        throw erro;
    }
}
async function excluirTutorial(req, res) {
    return respostaExclusao(res, await RelacionamentoService.removerTutorialCompleto(req.params.id), 'Tutorial');
}
async function excluirComentario(req, res) {
    return respostaExclusao(res, await ComentarioModel.remove(req.params.id), 'Comentário');
}
async function excluirAvaliacao(req, res) {
    // Sem avaliadorId: autorização administrativa explícita na rota, sem simular autoria.
    return respostaExclusao(res, await RelacionamentoService.removerAvaliacaoComAjuste(req.params.id), 'Avaliação');
}

module.exports = { acessoPagina, pagina, resumo, usuarios, tutoriais, comentarios, avaliacoes,
    excluirUsuario, excluirTutorial, excluirComentario, excluirAvaliacao };
