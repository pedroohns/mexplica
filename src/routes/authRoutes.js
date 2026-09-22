const express =
    require('express');


const authController =
    require(
        '../controllers/authController'
    );


const router =
    express.Router();


router.post(
    '/verificar',
    authController.verificar
);


router.post(
    '/login',
    authController.login
);


router.post(
    '/cadastro',
    authController.cadastro
);


router.post(
    '/logout',
    authController.logout
);


router.get(
    '/sessao',
    authController.sessao
);


module.exports =
    router;