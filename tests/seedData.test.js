const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepararDadosSeed, normalizarPassos, carregarDadosSeed } = require('../src/database/seedData');
const TutorialService = require('../src/services/tutorialService');

const vazio = () => ({ usuarios: [], tutoriais: [], comentarios: [], avaliacoes: [], categorias: [] });
const passo = alteracoes => ({ ordem: 1, titulo: 'Abra as configurações', descricao: 'Toque no aplicativo do aparelho.', ...alteracoes });

test('seed transforma os dados atuais sem perder IDs, vínculos, textos ou datas', () => {
    const dados = carregarDadosSeed();
    assert.deepEqual(Object.fromEntries(Object.entries(dados).map(([tabela, linhas]) => [tabela, linhas.length])), {
        categorias: 3, usuarios: 12, tutoriais: 18,
        tutorial_passos: 72, tutorial_tags: 94, comentarios: 10, avaliacoes: 20
    });

    for (const nome of ['usuario', 'tutorial', 'comentario', 'avaliacao']) {
        const origem = require(`../src/data/${nome}Data`);
        const destino = dados[{ usuario: 'usuarios', tutorial: 'tutoriais', comentario: 'comentarios', avaliacao: 'avaliacoes' }[nome]];
        assert.deepEqual(destino.map(item => item.id), origem.map(item => item.id));
        assert.deepEqual(destino.map(item => item.criado_em), origem.map(item => item.criadoEm));
    }
    for (const original of require('../src/data/tutorialData')) {
        const tutorial = dados.tutoriais.find(item => item.id === original.id);
        for (const campo of ['slug', 'titulo', 'resumo', 'conteudo', 'visualizacoes']) assert.equal(tutorial[campo], original[campo]);
        assert.equal(tutorial.autor_id, original.autorId);
        assert.equal(tutorial.categoria_id, original.categoriaId);
        assert.equal(tutorial.video_url, original.videoUrl || null);
        assert.equal(tutorial.atualizado_em, original.atualizadoEm);
        assert.equal('passos' in tutorial || 'tags' in tutorial || 'imagens' in tutorial, false);
    }
    const pix = dados.tutorial_passos.find(item => item.tutorial_id === 17 && item.ordem === 1);
    assert.equal(pix.imagem_url, '/images/tutorials/pix-seguranca.jpg');
    assert.equal(pix.imagem_legenda, 'Confira os dados do destinatário antes de confirmar o Pix.');
});

test('usuários preservam hash e pontos e descartam tipo/nivel/senha', () => {
    const dados = carregarDadosSeed();
    const originais = require('../src/data/usuarioData');
    for (const usuario of dados.usuarios) {
        const original = originais.find(item => item.id === usuario.id);
        // Comparação booleana evita que uma falha de assert imprima o hash.
        assert.equal(usuario.senha_hash === original.senhaHash, true, 'O hash original deve ser preservado.');
        assert.equal(/^\$2[aby]\$\d{2}\$/.test(usuario.senha_hash), true, 'Senha persistida deve ser bcrypt.');
        assert.equal(usuario.pontos, original.pontos);
        assert.equal(['senha', 'senhaHash', 'tipo', 'nivel'].some(campo => campo in usuario), false);
    }
});

test('contatos vazios viram NULL, email é lowercase e telefone mantém somente dígitos', () => {
    const dados = prepararDadosSeed({ ...vazio(), usuarios: [
        { id: 1, email: '  EXEMPLO@EXAMPLE.COM  ', telefone: ' ' },
        { id: 2, email: '', telefone: '(24) 99999-0000' }
    ] });
    assert.equal(dados.usuarios[0].email, 'exemplo@example.com');
    assert.equal(dados.usuarios[0].telefone, null);
    assert.equal(dados.usuarios[1].email, null);
    assert.equal(dados.usuarios[1].telefone, '24999990000');
});

test('transformação é pura e não modifica os arrays demonstrativos', () => {
    const entrada = {
        usuarios: require('../src/data/usuarioData'), tutoriais: require('../src/data/tutorialData'),
        comentarios: require('../src/data/comentarioData'), avaliacoes: require('../src/data/avaliacaoData'),
        categorias: require('../src/utils/categorias').listarCategorias()
    };
    const anterior = JSON.stringify(entrada);
    const dados = prepararDadosSeed(entrada);
    dados.usuarios[0].nome = 'Outro nome';
    dados.tutorial_passos[0].titulo = 'Outro título';
    assert.equal(JSON.stringify(entrada) === anterior, true, 'A origem deve permanecer intacta.');
});

test('imagens legadas usam a ordem original e imagens integradas têm precedência como no Service', async () => {
    const tutorial = {
        id: 100, passos: [passo({ ordem: 4 }), passo({ ordem: 8, imagem: { url: '/integrada.jpg', alt: 'Integrada', legenda: 'Legenda' } })],
        imagens: [{ ordem: 8, url: '/antiga.jpg' }, { ordem: 4, url: '/legada.jpg', alt: 'Legada', legenda: 'Legenda legada' }]
    };
    const normalizados = normalizarPassos(tutorial);
    const compativeis = (await TutorialService.enriquecerTutorial(tutorial)).passos;
    assert.deepEqual(normalizados.map(item => item.ordem), [1, 2]);
    assert.deepEqual(normalizados.map(item => item.imagem_url), ['/legada.jpg', '/integrada.jpg']);
    for (const [index, item] of normalizados.entries()) {
        assert.equal(item.imagem_url, compativeis[index].imagem.url);
        assert.equal(item.imagem_alt, compativeis[index].imagem.alt);
        assert.equal(item.imagem_legenda, compativeis[index].imagem.legenda);
    }
});

test('imagem null explícita não restaura legado e outra ordem não é associada por posição', () => {
    const dados = normalizarPassos({
        id: 1, passos: [passo({ imagem: null }), passo({ ordem: 9 })],
        imagens: [{ ordem: 1, url: '/removida.jpg' }, { ordem: 2, url: '/outro-passo.jpg' }]
    });
    assert.equal(dados.every(item => item.imagem_url === null && item.imagem_alt === null && item.imagem_legenda === null), true);
});

test('passos preservam data URLs grandes e achatam links em atributos opcionais', () => {
    const url = 'data:image/png;base64,' + 'A'.repeat(90000);
    const [item, semLink] = normalizarPassos({ id: 1, passos: [
        passo({ imagem: { url }, linkExterno: { url: 'https://example.com/ajuda', texto: 'Leia a ajuda' } }),
        passo({ ordem: 2 })
    ] });
    assert.equal(item.imagem_url, url);
    assert.equal(item.imagem_alt, 'Imagem do passo 1');
    assert.equal(item.link_url, 'https://example.com/ajuda');
    assert.equal(item.link_texto, 'Leia a ajuda');
    assert.equal('imagem' in item || 'linkExterno' in item, false);
    assert.equal(semLink.link_url, null);
    assert.equal(semLink.link_texto, null);
});

test('tags viram linhas associativas sem vazios ou duplicações', () => {
    const dados = prepararDadosSeed({ ...vazio(),
        tutoriais: [{ id: 2, tags: ['Pix', ' pix ', '', 'SEGURANÇA'] }]
    });
    assert.deepEqual(dados.tutorial_tags, [{ tutorial_id: 2, tag: 'pix' }, { tutorial_id: 2, tag: 'segurança' }]);
});

test('seed e dados demonstrativos não dependem de especialidades', () => {
    const usuario = { id: 1, nome: 'Pessoa', pontos: 123, senhaHash: 'hash-ficticio' };
    Object.defineProperty(usuario, 'especialidades', { get() { throw new Error('Campo abandonado não deve ser lido.'); } });
    const dados = prepararDadosSeed({ ...vazio(), usuarios: [usuario] });
    assert.equal(Object.hasOwn(dados, 'usuario_especialidades'), false);
    assert.equal(Object.hasOwn(dados.usuarios[0], 'especialidades'), false);
    assert.equal(dados.usuarios[0].pontos, 123);
    assert.equal(dados.usuarios[0].senha_hash === usuario.senhaHash, true);
    assert.equal(require('../src/data/usuarioData').some(item => Object.hasOwn(item, 'especialidades')), false);
});
