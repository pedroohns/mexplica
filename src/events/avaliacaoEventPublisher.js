class AvaliacaoEventPublisher {
    #observers = new Set();

    registrar(observer) {
        this.#observers.add(observer);
    }

    async notificar(evento, contexto) {
        // Sequencial e aguardado: nenhuma reação pode continuar depois do COMMIT.
        // A rejeição de qualquer observer deve alcançar o coordenador da transação.
        for (const observer of this.#observers) {
            await observer.atualizar(evento, contexto);
        }
    }
}

module.exports = AvaliacaoEventPublisher;
