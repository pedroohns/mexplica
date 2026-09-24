const express =
    require('express');


const avaliacaoController =
    require(
        '../controllers/avaliacaoController'
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

    avaliacaoController.atualizar

);


router.delete(

    '/:id',

    exigirAutenticacao,

    avaliacaoController.excluir

);


module.exports =
    router;