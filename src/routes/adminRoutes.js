const router = require('express').Router();
const controller = require('../controllers/adminController');
const { exigirAdministrador } = require('../middlewares/authMiddleware');

router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(exigirAdministrador);
router.get('/resumo', controller.resumo);
router.get('/usuarios', controller.usuarios);
router.delete('/usuarios/:id', controller.excluirUsuario);
router.get('/tutoriais', controller.tutoriais);
router.delete('/tutoriais/:id', controller.excluirTutorial);
router.get('/comentarios', controller.comentarios);
router.delete('/comentarios/:id', controller.excluirComentario);
router.get('/avaliacoes', controller.avaliacoes);
router.delete('/avaliacoes/:id', controller.excluirAvaliacao);

module.exports = router;
