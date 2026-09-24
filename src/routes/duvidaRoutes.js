const express =
    require('express');


const duvidaController =
    require(
        '../controllers/duvidaController'
    );


const respostaController =
    require(
        '../controllers/respostaController'
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


// =============================
// READ / BUSCA
// =============================
router.get(
    '/',
    duvidaController.listar
);


router.get(
    '/buscar',
    duvidaController.buscar
);


router.get(
    '/:id',
    duvidaController.buscarPorId
);


// =============================
// CRUD DUVIDAS
// =============================
router.post(
    '/',
    exigirAutenticacao,
    duvidaController.criar
);


router.put(
    '/:id',
    exigirAutenticacao,
    duvidaController.atualizar
);


router.delete(
    '/:id',
    exigirAutenticacao,
    duvidaController.excluir
);


// =============================
// RESPOSTAS DA DUVIDA
// =============================
router.get(
    '/:duvidaId/respostas',
    respostaController.listarPorDuvida
);


router.post(

    '/:duvidaId/respostas',

    exigirAutenticacao,

    exigirColaborador,

    respostaController.criar

);


module.exports =
    router;