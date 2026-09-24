const express =
    require('express');


const usuarioController =
    require(
        '../controllers/usuarioController'
    );


const {

    exigirAutenticacao,

    exigirPlatina

} =
    require(
        '../middlewares/authMiddleware'
    );


const router =
    express.Router();


// IMPORTANTE: rotas especificas precisam vir antes de /:id.
router.get(
    '/',
    usuarioController.listar
);


router.get(
    '/ranking',
    usuarioController.ranking
);


router.get(
    '/platina-disponiveis',
    usuarioController
        .platinaDisponiveis
);


router.put(

    '/me/disponibilidade',

    exigirAutenticacao,

    exigirPlatina,

    usuarioController
        .atualizarDisponibilidade

);


router.get(
    '/:id',
    usuarioController.buscarPorId
);


router.put(

    '/:id',

    exigirAutenticacao,

    usuarioController.atualizar

);


router.delete(

    '/:id',

    exigirAutenticacao,

    usuarioController.excluir

);


module.exports =
    router;