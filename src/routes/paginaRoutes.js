const express =
    require(
        'express'
    );


const paginaController =
    require(
        '../controllers/paginaController'
    );


const router =
    express.Router();

const adminController = require('../controllers/adminController');
const { exigirAdministrador } = require('../middlewares/authMiddleware');
router.get('/admin', adminController.acessoPagina, exigirAdministrador, adminController.pagina);


router.get(
    '/comunidade',
    paginaController.comunidade
);


router.get(
    '/perfil/:slug',
    paginaController.perfil
);


router.get(
    '/tutoriais/novo',
    paginaController.novoTutorial
);


router.get(
    '/tutoriais/:slug/editar',
    paginaController.editarTutorial
);


router.get(
    '/tutoriais/:slug',
    paginaController.tutorial
);


module.exports =
    router;
