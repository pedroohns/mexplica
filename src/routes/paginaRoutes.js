const express =
    require('express');


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
    '/duvidas/:slug',
    paginaController.duvida
);


module.exports =
    router;