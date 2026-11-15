const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const TutorialService = require('../src/services/tutorialService');
const TutorialModel = require('../src/models/tutorialModel');
const UsuarioModel = require('../src/models/usuarioModel');
const { limites, youtubeId, urlHttp } = require('../public/js/tutorial/contrato');
const app = require('../src/index');

const passo = () => ({ titulo: 'Abra as configurações', descricao: 'Toque no ícone de configurações do aparelho.', imagem: null, linkExterno: null });
const dados = () => ({ titulo: 'Tutorial de blocos para inclusão digital', resumo: 'Aprenda a configurar seu aparelho em etapas simples.', conteudo: 'Antes de começar, tenha seu aparelho em mãos e acompanhe cada passo com calma.', categoriaId: 'sistemas-acessibilidade', passos: [passo()], tags: ['inclusão'], videoUrl: '' });
const validar = alteracoes => TutorialService.validarCampos({ ...dados(), ...alteracoes });
// PNG real, com dimensões configuráveis, gerado sem dependências de imagem.
function png(largura = 120, altura = 120) {
    const zlib = require('node:zlib');
    function chunk(tipo, conteudo) {
        const corpo = Buffer.concat([Buffer.from(tipo), conteudo]);
        let crc = 0xffffffff;
        for (const byte of corpo) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
        const tamanho = Buffer.alloc(4); tamanho.writeUInt32BE(conteudo.length);
        const soma = Buffer.alloc(4); soma.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
        return Buffer.concat([tamanho, corpo, soma]);
    }
    const cabecalho = Buffer.alloc(13); cabecalho.writeUInt32BE(largura); cabecalho.writeUInt32BE(altura, 4); cabecalho[8] = 8; cabecalho[9] = 2;
    return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', cabecalho), chunk('IDAT', zlib.deflateSync(Buffer.alloc((largura * 3 + 1) * altura))), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}

test('bloco normaliza título, descrição, ordem e link sem perder caracteres de texto', () => {
    const resultado = validar({ passos: [{ ...passo(), ordem: 40, titulo: '  Título editável  ', descricao: '  Descrição <segura>  ', linkExterno: { url: 'https://example.com/ajuda', texto: ' Mais detalhes ' } }] }).dados;
    assert.equal(resultado.passos[0].ordem, 1);
    assert.equal(resultado.passos[0].titulo, 'Título editável');
    assert.equal(resultado.passos[0].descricao, 'Descrição <segura>');
    assert.equal(resultado.passos[0].linkExterno.texto, 'Mais detalhes');
    assert.equal(resultado.passos[0].imagem, null);
});
test('exige de 1 a 9 passos, sem truncar ou descartar blocos inválidos', () => {
    assert.match(validar({ passos: [] }).erro, /pelo menos/);
    assert.equal(validar({ passos: Array.from({ length: 9 }, passo) }).dados.passos.length, 9);
    assert.match(validar({ passos: Array.from({ length: 10 }, passo) }).erro, /máximo 9/);
    for (const alteracoes of [{ titulo: '' }, { titulo: 'x'.repeat(121) }, { descricao: '' }, { descricao: 'x'.repeat(1001) }]) {
        assert.ok(validar({ passos: [{ ...passo(), ...alteracoes }] }).erro);
    }
});
test('links externos rejeitam protocolos perigosos, credenciais, HTML e texto ausente', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,teste', '//example.com', '/local', 'https://user:senha@example.com', '<iframe>', 'https://example.com/<script>']) {
        assert.ok(validar({ passos: [{ ...passo(), linkExterno: { url, texto: 'Saiba mais' } }] }).erro, url);
    }
    assert.ok(validar({ passos: [{ ...passo(), linkExterno: { url: 'https://example.com', texto: '' } }] }).erro);
    assert.equal(urlHttp('http://example.com'), 'http://example.com/');
});
test('imagem opcional serializada é validada e campo imagens é derivado', () => {
    const imagem = { url: png(), alt: 'Tela das configurações' };
    const resultado = validar({ passos: [{ ...passo(), imagem }] }).dados;
    assert.equal(resultado.passos[0].imagem.url, imagem.url);
    assert.equal(resultado.imagens[0].ordem, 1);
    assert.equal(resultado.imagens[0].alt, imagem.alt);
});
test('API rejeita SVG, MIME falso, base64 inválida, dimensões e peso indevidos', () => {
    for (const url of [
        'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64'),
        'data:image/png;base64,' + Buffer.from('<svg/>').toString('base64'),
        'data:image/jpeg;base64,' + Buffer.from([255, 216, ...Array(100).fill(255)]).toString('base64'),
        'data:image/png;base64,AAAA=', png(119, 120), png(1601, 120),
        'data:image/png;base64,' + Buffer.alloc(limites.imagem.saidaBytes + 1).toString('base64')
    ]) assert.ok(validar({ passos: [{ ...passo(), imagem: { url } }] }).erro);
});
test('limite de payload mantém nove imagens dentro do JSON de 1 MB', () => {
    const pequena = Buffer.from(png().split(',')[1], 'base64');
    const imagem = { url: 'data:image/png;base64,' + Buffer.concat([pequena, Buffer.alloc(limites.imagem.saidaBytes - pequena.length)]).toString('base64') };
    const entrada = { ...dados(), passos: Array.from({ length: 9 }, () => ({ ...passo(), imagem })) };
    assert.ok(Buffer.byteLength(JSON.stringify(entrada)) < limites.payloadBytes);
    assert.equal(TutorialService.validarCampos(entrada).dados.passos.length, 9);
    const normalizado = TutorialService.validarCampos(entrada).dados;
    assert.equal(TutorialService.validarCampos(normalizado).dados.passos.length, 9, 'revalidação não conta a coleção derivada duas vezes');
    assert.match(validar({ extra: 'x'.repeat(limites.payloadBytes) }).erro, /1 MB/);
});
test('compatibilidade associa imagens antigas por ordem sem mutar dados demo', () => {
    const original = { ...TutorialModel.findById(1), passos: [{ ordem: 2, titulo: 'Título antigo', descricao: 'Descrição antiga' }], imagens: [{ ordem: 2, url: '/images/tutorials/pix-seguranca.jpg', alt: 'Imagem antiga', legenda: 'Legenda preservada' }] };
    const copia = JSON.stringify(original);
    const resultado = TutorialService.enriquecerTutorial(original);
    assert.equal(resultado.passos[0].imagem.alt, 'Imagem antiga');
    assert.equal(resultado.passos[0].imagem.legenda, 'Legenda preservada');
    assert.equal(JSON.stringify(original), copia);
    original.passos[0].imagem = null;
    assert.equal(TutorialService.enriquecerTutorial(original).passos[0].imagem, null);
    original.passos[0].imagem = { url: 'https://example.com/nova.png' };
    assert.equal(TutorialService.enriquecerTutorial(original).passos[0].imagem.url, 'https://example.com/nova.png');
});
test('validação de passos antigos não associa uma imagem de outra ordem', () => {
    const resultado = validar({ passos: [{ titulo: 'Primeiro bloco', descricao: 'Faça a primeira etapa.' }, { titulo: 'Segundo bloco', descricao: 'Faça a segunda etapa.' }], imagens: [{ ordem: 2, url: '/images/tutorials/pix-seguranca.jpg' }] }).dados;
    assert.equal(resultado.passos[0].imagem, null);
    assert.equal(resultado.passos[1].imagem.url, '/images/tutorials/pix-seguranca.jpg');
});
test('vídeo aceita URLs comuns do YouTube e rejeita domínios e IDs inválidos', () => {
    for (const url of ['https://youtu.be/t1qdmK12qZ0?t=10', 'https://www.youtube.com/watch?v=t1qdmK12qZ0', 'https://m.youtube.com/shorts/t1qdmK12qZ0', 'https://www.youtube-nocookie.com/embed/t1qdmK12qZ0']) {
        assert.equal(youtubeId(url), 't1qdmK12qZ0');
        assert.equal(validar({ videoUrl: url }).dados.videoUrl, 'https://www.youtube.com/watch?v=t1qdmK12qZ0');
    }
    for (const url of ['https://youtube.com.evil.test/watch?v=t1qdmK12qZ0', 'https://youtube.com/watch?v=curto', '<iframe src="https://youtube.com">', 'https://example.com/video']) assert.ok(validar({ videoUrl: url }).erro);
});
test('vídeo externo legado tem fallback seguro e pode ser preservado em edição', () => {
    const videoUrl = 'https://example.com/video-antigo';
    assert.equal(TutorialService.validarCampos({ ...dados(), videoUrl }, { videoLegado: videoUrl }).dados.videoUrl, videoUrl);
    assert.equal(TutorialService.enriquecerTutorial({ ...TutorialModel.findById(1), videoUrl }).videoId, null);
    assert.equal(TutorialService.enriquecerTutorial({ ...TutorialModel.findById(1), videoUrl: 'javascript:alert(1)' }).videoUrl, '');
});

let servidor, base, cookieAutor, cookieLeitor, tutorialCriado;
before(async () => {
    servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    base = 'http://127.0.0.1:' + servidor.address().port;
    async function login(identificador) {
        const resposta = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador, senha: '123456' }) });
        assert.equal(resposta.status, 200);
        return resposta.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    }
    cookieAutor = await login('lucas@mexplica.com');
    cookieLeitor = await login(UsuarioModel.findAll().find(usuario => !usuario.colaborador).email);
});
after(async () => { await new Promise(resolve => servidor.close(resolve)); });
const request = (caminho, cookie, method = 'GET', body) => fetch(base + caminho, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });

test('editor exige sessão e colaborador; criação começa vazia no editor compartilhado', async () => {
    assert.equal((await request('/tutoriais/novo')).status, 302);
    assert.equal((await request('/tutoriais/novo', cookieLeitor)).status, 403);
    const html = await (await request('/tutoriais/novo', cookieAutor)).text();
    assert.match(html, /id="formTutorial" data-modo="criar"/);
    assert.match(html, /type="radio"/);
    assert.match(html, /id="passosIniciais">\[\]/);
    assert.match(html, /<footer class="footer">/);
});
test('criação, leitura e edição preservam blocos, imagens, links, tags e slug', async () => {
    const entrada = { ...dados(), passos: [{ ...passo(), imagem: { url: png(), alt: 'Minha captura' }, linkExterno: { url: 'https://example.com', texto: 'Referência' } }], videoUrl: 'https://youtu.be/t1qdmK12qZ0' };
    const resposta = await request('/api/tutoriais', cookieAutor, 'POST', entrada);
    assert.equal(resposta.status, 201);
    tutorialCriado = (await resposta.json()).tutorial;
    const html = await (await request('/tutoriais/' + tutorialCriado.slug, cookieAutor)).text();
    assert.match(html, /tutorial-published-step/);
    assert.match(html, /Minha captura/);
    assert.match(html, /target="_blank" rel="noopener noreferrer">Referência/);
    assert.match(html, /Editar post/); assert.match(html, /id="modalExcluirTutorial"/);
    assert.ok(html.includes('Colaborador ' + tutorialCriado.autor.nivel));
    assert.match(html, /data-youtube-id="t1qdmK12qZ0"/); assert.doesNotMatch(html, /<iframe/);
    const editor = await (await request('/tutoriais/' + tutorialCriado.slug + '/editar', cookieAutor)).text();
    assert.match(editor, /data-modo="editar"/); assert.match(editor, /value="sistemas-acessibilidade" required checked/);
    assert.match(editor, /Minha captura/); assert.match(editor, /Referência/);
    const atualizacao = await request('/api/tutoriais/' + tutorialCriado.id, cookieAutor, 'PUT', { titulo: 'Título alterado sem trocar endereço' });
    assert.equal(atualizacao.status, 200);
    const atualizado = (await atualizacao.json()).tutorial;
    assert.equal(atualizado.slug, tutorialCriado.slug);
    assert.deepEqual(atualizado.passos, tutorialCriado.passos);
    assert.deepEqual(atualizado.tags, tutorialCriado.tags);
    assert.ok(atualizado.atualizadoEm);
    assert.ok((await (await request('/api/tutoriais/buscar?q=inclusão')).json()).resultados.some(t => t.id === tutorialCriado.id));
    const paginaLeitor = await (await request('/tutoriais/' + tutorialCriado.slug, cookieLeitor)).text();
    assert.doesNotMatch(paginaLeitor, /id="excluirTutorial"|id="modalExcluirTutorial"|Editar post/);
    assert.equal((await request('/tutoriais/' + tutorialCriado.slug + '/editar', cookieLeitor)).status, 403);
    assert.equal((await request('/api/tutoriais/' + tutorialCriado.id, cookieLeitor, 'PUT', entrada)).status, 403);
});
test('avaliações, comentários e exclusão em cascata continuam funcionando pela API', async () => {
    const caminho = '/api/tutoriais/' + tutorialCriado.id;
    assert.equal((await request(caminho + '/avaliacoes', cookieAutor, 'POST', { nota: 5 })).status, 403);
    let resposta = await request(caminho + '/avaliacoes', cookieLeitor, 'POST', { nota: 4 });
    assert.equal(resposta.status, 201);
    const avaliacao = (await resposta.json()).avaliacao;
    assert.equal((await request('/api/avaliacoes/' + avaliacao.id, cookieLeitor, 'PUT', { nota: 5 })).status, 200);
    assert.equal((await request('/api/avaliacoes/' + avaliacao.id, cookieLeitor, 'DELETE')).status, 200);
    assert.equal((await request(caminho + '/avaliacoes', cookieLeitor, 'POST', { nota: 5 })).status, 201);
    resposta = await request(caminho + '/comentarios', cookieLeitor, 'POST', { texto: 'O tutorial me ajudou bastante!' });
    assert.equal(resposta.status, 201);
    const comentario = (await resposta.json()).comentario;
    assert.equal((await request('/api/comentarios/' + comentario.id, cookieLeitor, 'PUT', { texto: 'Consegui acompanhar todas as etapas.' })).status, 200);
    assert.equal((await request('/api/comentarios/' + comentario.id, cookieLeitor, 'DELETE')).status, 200);
    assert.equal((await request(caminho + '/comentarios', cookieLeitor, 'POST', { texto: 'Outro comentário para testar a cascata.' })).status, 201);
    assert.equal((await request(caminho, cookieLeitor, 'DELETE')).status, 403);
    assert.equal((await request(caminho, cookieAutor, 'DELETE')).status, 200);
    assert.equal((await request(caminho)).status, 404);
    assert.equal(require('../src/models/comentarioModel').findByTutorialId(tutorialCriado.id).length, 0);
    assert.equal(require('../src/models/avaliacaoModel').resumoDoTutorial(tutorialCriado.id).quantidade, 0);
});
test('API mantém limite de 1 MB e informa erro JSON 413', async () => {
    const resposta = await request('/api/tutoriais', cookieAutor, 'POST', { ...dados(), extra: 'x'.repeat(limites.payloadBytes) });
    assert.equal(resposta.status, 413);
    assert.match((await resposta.json()).erro, /1 MB/);
});
test('contrato compartilhado é servido como JavaScript', async () => {
    const resposta = await request('/js/tutorial/contrato.js');
    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get('content-type'), /javascript/);
});
