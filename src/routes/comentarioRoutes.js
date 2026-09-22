const express =
    require('express');


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


// UPDATE
router.put(
    '/:id',

    exigirAutenticacao,

    comentarioController.atualizar
);


// DELETE
router.delete(
    '/:id',

    exigirAutenticacao,

    comentarioController.excluir
);


module.exports =
    router;