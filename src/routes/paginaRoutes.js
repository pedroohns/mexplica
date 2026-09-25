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