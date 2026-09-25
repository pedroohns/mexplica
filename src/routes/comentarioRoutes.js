const express =
    require(
        'express'
    );


const comentarioController =
    require(
        '../controllers/comentarioController'
    );


const {
    exigirAutenticacao
} =
    require(
        '../middlewares/authMiddleware'
    );


const router =
    express.Router();


router.put(

    '/:id',

    exigirAutenticacao,

    comentarioController.atualizar

);


router.delete(

    '/:id',

    exigirAutenticacao,

    comentarioController.excluir

);


module.exports =
    router;