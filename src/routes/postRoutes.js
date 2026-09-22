const express =
    require('express');


const postController =
    require(
        '../controllers/postController'
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



// POSTS
//====================

// READ
router.get(
    '/',
    postController.listar
);


router.get(
    '/:id',
    postController.buscarPorId
);


// CREATE
router.post(
    '/',

    exigirAutenticacao,

    postController.criar
);


// UPDATE
router.put(
    '/:id',

    exigirAutenticacao,

    postController.atualizar
);


// DELETE
router.delete(
    '/:id',

    exigirAutenticacao,

    postController.excluir
);


// COMENTÁRIOS DO POST
router.get(
    '/:postId/comentarios',

    comentarioController
        .listarPorPost
);


router.post(
    '/:postId/comentarios',

    exigirAutenticacao,

    comentarioController.criar
);


module.exports =
    router;