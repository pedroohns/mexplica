const express =
    require('express');

const paginaController =
    require(
        '../controllers/paginaController'
    );

const router =
    express.Router();

router.get(
    '/entrar',
    paginaController.entrar
);

router.get(
    '/comunidade',
    paginaController.comunidade
);

router.get(
    '/perfil/:slug',
    paginaController.perfil
);

module.exports =
    router;