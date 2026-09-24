const express =
    require('express');


const respostaController =
    require(
        '../controllers/respostaController'
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


// UPDATE
router.put(

    '/:id',

    exigirAutenticacao,

    exigirColaborador,

    respostaController.atualizar

);


// DELETE
router.delete(

    '/:id',

    exigirAutenticacao,

    exigirColaborador,

    respostaController.excluir

);


// READ AVALIAÇOES
router.get(

    '/:respostaId/avaliacoes',

    avaliacaoController
        .listarPorResposta

);


// CREATE AVALIAÇAO
router.post(

    '/:respostaId/avaliacoes',

    exigirAutenticacao,

    avaliacaoController.criar

);


module.exports =
    router;