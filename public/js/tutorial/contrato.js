/* Contrato compartilhado pelo editor e pelo TutorialService (CommonJS). */
(function (root, factory) {
    const contrato = factory();
    if (typeof module === 'object' && module.exports) module.exports = contrato;
    else root.MExplicaTutorial = contrato;
})(typeof window === 'undefined' ? globalThis : window, function () {
    const limites = Object.freeze({
        passos: 9, tituloPasso: 120, descricaoPasso: 1000, textoLink: 120,
        url: 2048, payloadBytes: 1024 * 1024,
        imagem: Object.freeze({
            tipos: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
            arquivoBytes: 8 * 1024 * 1024, minimo: 120,
            entradaMaxima: 8192, pixelsMaximos: 24000000,
            saidaMaxima: 1600, saidaBytes: 72 * 1024
        })
    });

    function urlHttp(valor) {
        if (typeof valor !== 'string' || valor.length > limites.url || /[\s<>\\]/.test(valor)) return null;
        try {
            const url = new URL(valor);
            return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
                ? url.href : null;
        } catch { return null; }
    }

    function urlImagem(valor) {
        if (typeof valor !== 'string') return null;
        // Caminhos estáticos locais do legado; nunca aceitar //host ou barras invertidas.
        if (/^\/(?!\/)[^\s<>\\]*$/.test(valor)) return valor;
        return urlHttp(valor);
    }

    function youtubeId(valor) {
        const segura = urlHttp(valor);
        if (!segura) return null;
        const url = new URL(segura);
        let id;
        if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
        else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
            if (url.pathname === '/watch') id = url.searchParams.get('v');
            else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
        }
        return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
    }

    return Object.freeze({ limites, urlHttp, urlImagem, youtubeId });
});
