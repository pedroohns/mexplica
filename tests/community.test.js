const { test } = require('node:test');
const assert = require('node:assert/strict');
const TutorialService = require('../src/services/tutorialService');
const UsuarioModel = require('../src/models/usuarioModel');
const tutoriais = require('../src/data/tutorialData');

test('ranking de respostas conta publicações dos últimos sete dias e desempata por nome', () => {
    const originais = [...tutoriais];
    const agora = Date.parse('2026-11-12T12:00:00Z');
    const semana = 7 * 24 * 60 * 60 * 1000;
    const autores = UsuarioModel.findAll().filter(u => u.colaborador)
        .sort((a, b) => `${a.nome} ${a.sobrenome}`.localeCompare(`${b.nome} ${b.sobrenome}`, 'pt-BR'));
    const usuario = UsuarioModel.findAll().find(u => !u.colaborador);
    const publicar = (autorId, data) => ({ autorId, criadoEm: new Date(data).toISOString() });

    try {
        tutoriais.splice(0, tutoriais.length,
            publicar(autores[1].id, agora - 1000),
            publicar(autores[1].id, agora - semana),
            publicar(autores[0].id, agora),
            publicar(autores[0].id, agora - 2000),
            publicar(autores[2].id, agora - 3000),
            publicar(autores[2].id, agora - semana - 1),
            publicar(autores[2].id, agora + 1),
            publicar(usuario.id, agora),
            publicar(999999, agora),
            { autorId: autores[2].id, criadoEm: 'invalida' }
        );

        const ranking = TutorialService.rankingDeRespostas(10, agora);
        assert.deepEqual(ranking.map(u => [u.id, u.quantidadeTutoriais]), [
            [autores[0].id, 2], [autores[1].id, 2], [autores[2].id, 1]
        ]);
        assert.equal(ranking[0].iniciais, UsuarioModel.toPublic(autores[0]).iniciais);
        assert.equal('senhaHash' in ranking[0], false);
        assert.equal(TutorialService.rankingDeRespostas(1, agora).length, 1);
        assert.deepEqual(TutorialService.rankingDeRespostas(10, agora + semana + 2), []);
        assert.equal(tutoriais.length, 10);
    } finally {
        tutoriais.splice(0, tutoriais.length, ...originais);
    }
});
