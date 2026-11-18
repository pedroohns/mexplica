const { test } = require('node:test');
const assert = require('node:assert/strict');
const AvaliacaoEventPublisher = require('../src/events/avaliacaoEventPublisher');
const PontuacaoAvaliacaoObserver = require('../src/observers/pontuacaoAvaliacaoObserver');
const UsuarioModel = require('../src/models/usuarioModel');

test('publisher entrega evento e contexto ao observer registrado', async () => {
    const publisher = new AvaliacaoEventPublisher();
    const evento = { tipo: 'avaliacaoCriada', autorId: 2, deltaPontos: 30 };
    const contexto = { client: {} };
    const recebidos = [];
    publisher.registrar({ atualizar: (evento, contexto) => recebidos.push({ evento, contexto }) });

    await publisher.notificar(evento, contexto);

    assert.equal(recebidos.length, 1);
    assert.equal(recebidos[0].evento, evento);
    assert.equal(recebidos[0].contexto, contexto);
});

test('publisher sem observers permite notificação sem efeito', async () => {
    await new AvaliacaoEventPublisher().notificar({ tipo: 'avaliacaoCriada' }, { client: {} });
});

test('registrar a mesma instância de observer duas vezes não duplica a reação', async () => {
    const publisher = new AvaliacaoEventPublisher();
    let chamadas = 0;
    const observer = { atualizar: () => { chamadas++; } };
    publisher.registrar(observer);
    publisher.registrar(observer);

    await publisher.notificar({ tipo: 'avaliacaoCriada' }, { client: {} });

    assert.equal(chamadas, 1);
});

test('instâncias de publisher mantêm registros independentes', async () => {
    const primeiro = new AvaliacaoEventPublisher();
    const segundo = new AvaliacaoEventPublisher();
    let chamadas = 0;
    primeiro.registrar({ atualizar: () => { chamadas++; } });

    await segundo.notificar({ tipo: 'avaliacaoCriada' }, { client: {} });
    assert.equal(chamadas, 0);
    await primeiro.notificar({ tipo: 'avaliacaoCriada' }, { client: {} });
    assert.equal(chamadas, 1);
});

test('publisher aguarda observers async em sequência antes de concluir', async () => {
    const publisher = new AvaliacaoEventPublisher();
    const ordem = [];
    let liberar, sinalizarInicio;
    const bloqueio = new Promise(resolve => { liberar = resolve; });
    const iniciou = new Promise(resolve => { sinalizarInicio = resolve; });
    publisher.registrar({ atualizar: async () => {
        ordem.push('início');
        sinalizarInicio();
        await bloqueio;
        ordem.push('fim');
    } });
    publisher.registrar({ atualizar: () => { ordem.push('segundo'); } });

    const notificacao = publisher.notificar({}, {}).then(() => { ordem.push('concluído'); });
    await iniciou;
    try { assert.deepEqual(ordem, ['início']); }
    finally { liberar(); }
    await notificacao;
    assert.deepEqual(ordem, ['início', 'fim', 'segundo', 'concluído']);
});

test('publisher propaga rejeição async e interrompe as reações seguintes', async () => {
    const publisher = new AvaliacaoEventPublisher();
    const falha = new Error('Reação recusada');
    let seguinteExecutou = false;
    publisher.registrar({ atualizar: async () => { await Promise.resolve(); throw falha; } });
    publisher.registrar({ atualizar: () => { seguinteExecutou = true; } });

    await assert.rejects(publisher.notificar({}, {}), erro => erro === falha);
    assert.equal(seguinteExecutou, false);
});

test('observer aplica o delta recebido pelo Model com o mesmo client, sem recalcular a regra', async t => {
    const client = {};
    const chamadas = [];
    t.mock.method(UsuarioModel, 'adicionarPontos', async (...args) => { chamadas.push(args); });

    await new PontuacaoAvaliacaoObserver().atualizar(
        { tipo: 'avaliacaoAtualizada', autorId: 2, deltaPontos: -20 }, { client });

    assert.equal(chamadas.length, 1);
    assert.deepEqual(chamadas[0].slice(0, 2), [2, -20]);
    assert.equal(chamadas[0][2].client, client);
});

test('observer recusa ausência de client para impedir ajuste fora da transação', async t => {
    const ajuste = t.mock.method(UsuarioModel, 'adicionarPontos');
    await assert.rejects(new PontuacaoAvaliacaoObserver().atualizar(
        { tipo: 'avaliacaoCriada', autorId: 2, deltaPontos: 30 }), /exige o client da transação/);
    assert.equal(ajuste.mock.callCount(), 0);
});
