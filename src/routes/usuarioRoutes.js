const express =
    require('express');


const usuarioController =
    require(
        '../controllers/usuarioController'
    );


const {
    exigirAutenticacao
} =
    require(
        '../middlewares/authMiddleware'
    );


const router =
    express.Router();


// READ
router.get(
    '/',
    usuarioController.listar
);


router.get(
    '/:id',
    usuarioController.buscarPorId
);


// UPDATE
router.put(
    '/:id',

    exigirAutenticacao,

    usuarioController.atualizar
);


// DELETE
router.delete(
    '/:id',

    exigirAutenticacao,

    usuarioController.excluir
);


module.exports =
    router;