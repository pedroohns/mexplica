const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../public/js/home/mexplicai-engine');
const TutorialModel = require('../src/models/tutorialModel');

test('MExplicAI normaliza acentos, caixa, pontuação e espaços', () => {
    assert.equal(engine.normalizarTexto('  OlÁ! Como CONECTAR o CarPlay?  '), 'ola como conectar o carplay');
    assert.equal(engine.normalizarTexto('  conexão   Wi-Fi\n '), 'conexao wi fi');
});

test('MExplicAI reconhece CarPlay e prioriza palavras-chave sobre termos secundários', () => {
    assert.equal(engine.encontrarIntencao('Como conectar o CarPlay do meu carro?').id, 'carplay-conectar');
    assert.match(engine.gerarRespostaLocal('meu iPhone não conecta no CarPlay').texto, /Apple CarPlay/);
    assert.equal(engine.calcularScore('iphone carro conectar', engine.intencoes[0]), 0);
});

test('MExplicAI reconhece todas as dez intenções pelos exemplos versionados', () => {
    assert.equal(engine.intencoes.length, 10);
    for (const intencao of engine.intencoes) {
        for (const exemplo of intencao.exemplos) {
            assert.equal(engine.encontrarIntencao(exemplo)?.id, intencao.id, exemplo);
        }
        assert.ok(intencao.resposta.length < 700);
    }
});

test('MExplicAI evita falsos positivos por substrings e mensagens sociais em perguntas', () => {
    for (const texto of ['car', 'carpintaria', 'encachei as peças', 'teclados musicais', 'foice', 'celular carro bluetooth']) {
        assert.equal(engine.gerarRespostaLocal(texto).tipo, 'fallback', texto);
    }
    assert.equal(engine.gerarRespostaLocal('oi, como conectar carplay?').tipo, 'local');
});

test('MExplicAI usa fallback e respostas sociais curtas', () => {
    assert.equal(engine.gerarRespostaLocal('qual a cor de uma estrela distante?').tipo, 'fallback');
    assert.equal(engine.gerarRespostaLocal('').tipo, 'fallback');
    for (const texto of ['oi', 'Olá!', 'Bom dia', 'Boa tarde', 'boa noite', 'obrigado', 'obrigada']) {
        assert.equal(engine.gerarRespostaLocal(texto).tipo, 'social');
    }
});

function buscar(texto) {
    return TutorialModel.buscar(engine.criarConsulta(texto), Number.MAX_SAFE_INTEGER);
}

test('MExplicAI indica o tutorial humano real de fonte com slug preservado', () => {
    const texto = 'Como aumentar a fonte das letras do meu celular?';
    const resposta = engine.resolverResposta(texto, buscar(texto));
    assert.equal(resposta.tipo, 'tutorial');
    assert.equal(resposta.tutorial.slug, 'saiba-como-aumentar-a-fonte-do-celular');
});

test('MExplicAI filtra resultados amplos da API antes de responder CarPlay e outras intenções', () => {
    for (const intencao of engine.intencoes) {
        const texto = intencao.exemplos[0];
        assert.equal(engine.resolverResposta(texto, buscar(texto)).tipo, 'local', texto);
    }
    const texto = 'Como conectar o CarPlay do meu carro?';
    assert.ok(buscar(texto).length > 0, 'A busca real também devolve o tutorial de Spotify no carro');
    assert.equal(engine.resolverResposta(texto, buscar(texto)).tipo, 'local');
    for (const pergunta of ['Como conectar CarPlay no carro por Bluetooth?', 'Como conectar fone Bluetooth no celular?']) {
        assert.equal(engine.resolverResposta(pergunta, buscar(pergunta)).tipo, 'local', pergunta);
    }
});

test('MExplicAI prefere um novo tutorial humano mesmo quando existe resposta local', () => {
    const texto = 'como conectar carplay';
    const tutorial = { titulo: 'Como conectar CarPlay', slug: 'como-conectar-carplay', tags: ['carplay'] };
    const resposta = engine.resolverResposta(texto, [tutorial]);
    assert.equal(resposta.tipo, 'tutorial');
    assert.equal(resposta.tutorial.slug, tutorial.slug);
    assert.doesNotMatch(resposta.texto, /porta USB/);
});

test('MExplicAI encaminha os temas existentes aos tutoriais humanos relacionados', () => {
    const exemplos = [
        ['autenticação de dois fatores no Instagram', 'instagram'],
        ['identificar golpe no WhatsApp', 'golpe'],
        ['chamada de vídeo no WhatsApp', 'chamada-de-video'],
        ['Spotify no carro via Bluetooth', 'spotify'],
        ['enviar localização pelo WhatsApp', 'localizacao'],
        ['conta gov br', 'gov'],
        ['criar grupo no WhatsApp', 'grupo'],
        ['aumentar volume do celular', 'volume'],
        ['saber se um site é seguro', 'site'],
        ['recuperar senha do Facebook', 'facebook'],
        ['ler QR Code', 'qr-code'],
        ['bloquear contato no WhatsApp', 'bloquear'],
        ['ativar modo escuro', 'modo-escuro'],
        ['enviar foto no WhatsApp', 'foto'],
        ['atualizar apps', 'atualizar'],
        ['Pix', 'pix'],
        ['ativar leitor de tela', 'leitor']
    ];
    for (const [texto, slug] of exemplos) {
        const resposta = engine.resolverResposta(texto, buscar(texto));
        assert.equal(resposta.tipo, 'tutorial', texto);
        assert.ok(resposta.tutorial.slug.includes(slug), `${texto}: ${resposta.tutorial.slug}`);
    }
});

test('MExplicAI descarta links de tutorial perigosos vindos de dados dinâmicos', () => {
    for (const slug of ['javascript:alert(1)', '//externo.com', '../perfil', 'a?x=1', 'a#x', '<img>']) {
        assert.equal(engine.selecionarTutorial('CarPlay', [{ titulo: 'CarPlay', slug }]), null);
    }
});

test('MExplicAI limita histórico, tamanho das mensagens e campos persistidos', () => {
    const entrada = Array.from({ length: 70 }, (_, timestamp) => ({
        role: 'user', text: 'x'.repeat(1200), timestamp, token: 'não guardar', avatar: 'não guardar'
    }));
    const saida = engine.limitarHistorico(entrada);
    assert.equal(saida.length, 40);
    assert.equal(saida[0].timestamp, 30);
    assert.equal(saida[0].text.length, 800);
    assert.deepEqual(Object.keys(saida[0]), ['role', 'text', 'timestamp']);
    assert.equal(entrada.length, 70);
});

test('MExplicAI valida estrutura do histórico e preserva somente links internos seguros', () => {
    assert.deepEqual(engine.limitarHistorico({ messages: [] }), []);
    const saida = engine.limitarHistorico([
        null, {}, { role: 'system', text: 'falso' }, { role: 'user', text: '  ' },
        { role: 'user', text: '<img src=x onerror=alert(1)>', timestamp: 'inválido', tutorial: { titulo: 'CarPlay', slug: 'carplay' } },
        { role: 'assistant', text: 'teste', tutorial: { titulo: 'CarPlay', slug: 'javascript:alert(1)' } },
        { role: 'assistant', text: 'tutorial', tutorial: { titulo: 'Fonte', slug: 'fonte-do-celular' } }
    ]);
    assert.equal(saida.length, 3);
    assert.equal(saida[0].text, '<img src=x onerror=alert(1)>');
    assert.equal(saida[0].timestamp, 0);
    assert.equal(saida[0].tutorial, undefined);
    assert.equal(saida[1].tutorial, undefined);
    assert.equal(saida[2].tutorial.slug, 'fonte-do-celular');
});

test('home mantém CTA fora do renderer e carrega API e engine antes da interface', () => {
    const ler = arquivo => fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
    const html = ler('public/index.html');
    const scripts = ['/js/core/api.js', '/js/home/mexplicai-engine.js', '/js/home/mexplicai.js'];
    assert.ok(scripts.every(script => html.includes(`src="${script}"`)));
    assert.ok(html.indexOf(scripts[0]) < html.indexOf(scripts[1]));
    assert.ok(html.indexOf(scripts[1]) < html.indexOf(scripts[2]));
    assert.ok(html.indexOf('id="searchResults"') < html.indexOf('id="mexplicaiCta"'));
    assert.ok(html.indexOf('id="mexplicaiCta"') < html.indexOf('<footer'));
    assert.match(html, /Iniciar conversa com/);
    assert.doesNotMatch(ler('public/js/home/search-render.js'), /mexplicai/i);
    assert.match(ler('public/css/mexplicai.css'), /\.hero-section\.search-mode ~ \.mexplicai-cta/);
    assert.doesNotMatch(ler('public/js/home/mexplicai.js'), /innerHTML|\bfetch\s*\(/);
});
