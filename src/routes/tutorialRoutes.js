const express =
    require(
        'express'
    );


const tutorialController =
    require(
        '../controllers/tutorialController'
    );


const comentarioController =
    require(
        '../controllers/comentarioController'
    );


const avaliacaoController =
    require(
        '../controllers/avaliacaoController'
    );


const {

    exigirAutenticacao,

    exigirColaborador

} =
    require(
        '../middlewares/authMiddleware'
    );


const router =
    express.Router();


// READ / BUSCA
router.get(
    '/',
    tutorialController.listar
);


router.get(
    '/buscar',
    tutorialController.buscar
);


router.get(
    '/populares',
    tutorialController.populares
);


router.get(
    '/:id',
    tutorialController.buscarPorId
);


// CRUD TUTORIAL
router.post(

    '/',

    exigirAutenticacao,

    exigirColaborador,

    tutorialController.criar

);


router.put(

    '/:id',

    exigirAutenticacao,

    exigirColaborador,

    tutorialController.atualizar

);


router.delete(

    '/:id',

    exigirAutenticacao,

    exigirColaborador,

    tutorialController.excluir

);


// COMENTARIOS
router.get(

    '/:tutorialId/comentarios',

    comentarioController
        .listarPorTutorial

);


router.post(

    '/:tutorialId/comentarios',

    exigirAutenticacao,

    comentarioController.criar

);


// AVALIAÇOES
router.get(

    '/:tutorialId/avaliacoes',

    avaliacaoController
        .listarPorTutorial

);


router.post(

    '/:tutorialId/avaliacoes',

    exigirAutenticacao,

    avaliacaoController.criar

);


module.exports =
    router;