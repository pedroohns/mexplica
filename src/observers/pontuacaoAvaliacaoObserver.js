const UsuarioModel = require('../models/usuarioModel');

class PontuacaoAvaliacaoObserver {
    async atualizar({ autorId, deltaPontos }, { client } = {}) {
        if (!client) throw new Error('Observer de pontuação exige o client da transação.');
        await UsuarioModel.adicionarPontos(autorId, deltaPontos, { client });
    }
}

module.exports = PontuacaoAvaliacaoObserver;
