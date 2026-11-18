const express =
    require('express');


const authController =
    require(
        '../controllers/authController'
    );


const router =
    express.Router();

// Respostas de autenticação e tokens não devem ser armazenados por caches.
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

router.post(
    '/verificar',
    authController.verificar
);


router.post(
    '/login',
    authController.login
);

router.post(
    '/token',
    authController.token
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
