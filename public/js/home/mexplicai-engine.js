(function (root, factory) {
    const engine = factory();
    if (typeof module === 'object' && module.exports) module.exports = engine;
    else root.MExplicAIEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const limites = Object.freeze({ mensagem: 800, resposta: 2000, historico: 40, armazenamento: 128000 });
    const mensagemInicial = 'Olá, eu sou o MEXPLICAI, seu ajudante IA que auxilia você no que precisa.\n\nPara que eu possa te ajudar da melhor maneira possível, descreva seu problema da maneira mais detalhada que conseguir. A partir daí podemos começar a solucionar seu problema.';
    const fallback = 'Não consegui entender exatamente o que você precisa. Tente explicar novamente usando o nome do aparelho, aplicativo ou recurso que está causando dificuldade.';

    function normalizarTexto(valor = '') {
        return String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // As frases são comparadas entre limites de palavras, nunca por substrings.
    function contemFrase(texto, frase) {
        return (` ${texto} `).includes(` ${normalizarTexto(frase)} `);
    }

    const intencoes = [
        {
            id: 'carplay-conectar', palavrasChave: ['carplay', 'apple carplay'], secundarias: ['iphone', 'carro', 'conectar'],
            exemplos: ['como conectar o carplay', 'meu iphone não conecta no carplay'],
            resposta: 'Com o carro estacionado, confirme se a central é compatível com Apple CarPlay. Por cabo, conecte o iPhone à porta USB indicada para CarPlay. Se a central aceitar conexão sem fio, ative Wi-Fi e Bluetooth no iPhone e siga o pareamento indicado pela central. Os menus variam conforme o veículo.'
        },
        {
            id: 'android-auto', palavrasChave: ['android auto'], secundarias: ['carro', 'conectar', 'usb'],
            exemplos: ['como conectar o android auto'],
            resposta: 'Com o carro estacionado, confira se o celular e a central são compatíveis com Android Auto. Conecte o celular à porta USB indicada, usando um cabo de dados, e siga as instruções nas duas telas. A conexão sem fio depende de compatibilidade da central e do aparelho.'
        },
        {
            id: 'impressora-wifi', palavrasChave: ['impressora'], secundarias: ['wi fi', 'wifi', 'conectar', 'rede'],
            exemplos: ['como conectar uma impressora no wifi'],
            resposta: 'No painel ou aplicativo oficial da impressora, procure a configuração de Wi-Fi e conecte-a à mesma rede do computador ou celular. Depois, adicione a impressora nas configurações de impressão do aparelho. Consulte o manual do modelo se ela não aparecer; não é necessário restaurá-la.'
        },
        {
            id: 'espelhar-tv', palavrasChave: ['espelhar', 'espelhamento', 'smart view', 'transmitir tela'], secundarias: ['tv', 'televisao', 'celular'],
            exemplos: ['como espelhar o celular na smart tv'],
            resposta: 'Confira se a TV e o celular oferecem um recurso de espelhamento compatível. Conecte ambos à mesma rede Wi-Fi e procure Espelhar tela, Transmitir ou Smart View no celular. Escolha sua TV e confirme nela a conexão. Os nomes e a compatibilidade variam conforme os aparelhos.'
        },
        {
            id: 'cache-navegador', palavrasChave: ['cache'], secundarias: ['navegador', 'limpar', 'chrome', 'edge', 'firefox'],
            exemplos: ['como limpar o cache do navegador'],
            resposta: 'Nas configurações do navegador, procure Privacidade e a opção de limpar dados de navegação. Selecione apenas imagens e arquivos em cache. Confira as opções antes de confirmar: cookies, senhas e histórico são dados diferentes e não precisam ser apagados para limpar o cache.'
        },
        {
            id: 'compartilhar-internet', palavrasChave: ['hotspot', 'roteador wifi', 'roteador wi fi', 'rotear internet', 'compartilhar internet', 'acesso pessoal'], secundarias: ['celular', 'internet', 'notebook'],
            exemplos: ['como compartilhar internet do celular'],
            resposta: 'Nas configurações do celular, procure Roteador Wi-Fi, Compartilhamento de internet ou Acesso Pessoal. Defina uma senha e ative o recurso. No outro aparelho, escolha essa rede Wi-Fi. Isso pode consumir sua franquia de dados móveis; desative o compartilhamento ao terminar.'
        },
        {
            id: 'teclado-bluetooth', palavrasChave: ['teclado'], secundarias: ['bluetooth', 'parear', 'conectar'],
            exemplos: ['como parear um teclado bluetooth'],
            resposta: 'Se o teclado for Bluetooth, ligue-o e ative seu modo de pareamento conforme o manual. Nas configurações de Bluetooth do computador ou celular, adicione um dispositivo e selecione o teclado. Se aparecer um código, digite-o no teclado e pressione Enter. Modelos com receptor USB usam o próprio receptor.'
        },
        {
            id: 'pendrive', palavrasChave: ['pendrive', 'pen drive'], secundarias: ['usb', 'computador', 'arquivos'],
            exemplos: ['como usar pendrive no computador'],
            resposta: 'Conecte o pendrive a uma porta USB compatível e abra o Explorador de Arquivos ou Finder. Ele deve aparecer como uma unidade. Copie os arquivos desejados e aguarde a conclusão. Ejete a unidade antes de retirar. Se o computador pedir para formatar, cancele para preservar os arquivos existentes.'
        },
        {
            id: 'navegador-padrao', palavrasChave: ['navegador padrao', 'browser padrao'], secundarias: ['alterar', 'trocar', 'configurar'],
            exemplos: ['como alterar o navegador padrão'],
            resposta: 'Nas configurações do aparelho, procure Aplicativos padrão ou Apps padrão e escolha a opção de navegador. Selecione um navegador já instalado. O caminho pode variar conforme o sistema; o próprio navegador também costuma oferecer a opção de defini-lo como padrão.'
        },
        {
            id: 'fone-bluetooth', palavrasChave: ['fone', 'fones'], secundarias: ['bluetooth', 'notebook', 'computador', 'parear'],
            exemplos: ['como conectar fone bluetooth ao notebook'],
            resposta: 'Coloque o fone Bluetooth no modo de pareamento indicado pelo fabricante. No notebook, abra as configurações de Bluetooth, adicione um dispositivo e selecione o fone. Depois, confira se ele está escolhido como saída de áudio. Se não aparecer, verifique se está conectado a outro aparelho.'
        }
    ];

    function calcularScore(texto, intencao) {
        const normalizado = normalizarTexto(texto);
        const principais = intencao.palavrasChave.filter(palavra => contemFrase(normalizado, palavra));
        if (!principais.length) return 0;
        const peso = principais.reduce((total, palavra) => total + (normalizarTexto(palavra).includes(' ') ? 8 : 6), 0);
        const secundarios = intencao.secundarias.filter(palavra => contemFrase(normalizado, palavra)).length;
        const exemplo = intencao.exemplos.some(frase => normalizarTexto(frase) === normalizado) ? 4 : 0;
        return peso + secundarios + exemplo;
    }

    function encontrarIntencao(texto) {
        return intencoes.map(intencao => ({ intencao, score: calcularScore(texto, intencao) }))
            .filter(item => item.score >= 6).sort((a, b) => b.score - a.score)[0]?.intencao || null;
    }

    function gerarRespostaLocal(texto) {
        const intencao = encontrarIntencao(texto);
        if (intencao) return { tipo: 'local', texto: intencao.resposta };
        const normalizado = normalizarTexto(texto);
        if (['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite'].includes(normalizado)) {
            return { tipo: 'social', texto: 'Olá! Qual é sua dúvida com tecnologia? Conte o nome do aparelho ou aplicativo e o que você está tentando fazer.' };
        }
        if (['obrigado', 'obrigada', 'muito obrigado', 'muito obrigada', 'valeu'].includes(normalizado)) {
            return { tipo: 'social', texto: 'Por nada! Se precisar de mais ajuda com tecnologia, é só escrever.' };
        }
        return { tipo: 'fallback', texto: fallback };
    }

    const palavrasComuns = new Set(('a o as os um uma uns umas de da do das dos em no na nos nas e ou para por com sem ao aos que qual quais como meu minha meus minhas seu sua se eu voce ele ela isso esse essa nao mais muito esta estou tem tenho pode posso preciso quero gostaria ajuda ajudar saber usar fazer funciona funcionar conectar parear configurar favor passo passos bom dia ola oi obrigado obrigada').split(' '));
    const equivalencias = { letras: 'letra', textos: 'texto', fotos: 'foto', aplicativos: 'apps', aplicativo: 'apps', chamadas: 'chamada', videos: 'video', grupos: 'grupo', contatos: 'contato', celulares: 'celular' };

    function termosRelevantes(texto) {
        return [...new Set(normalizarTexto(texto).split(' ').filter(p => p.length > 1 && !palavrasComuns.has(p))
            .map(p => equivalencias[p] || p))];
    }

    function criarConsulta(texto) {
        return termosRelevantes(texto).join(' ') || normalizarTexto(texto);
    }

    function tutorialSeguro(tutorial) {
        return tutorial && typeof tutorial.titulo === 'string' && tutorial.titulo.trim()
            && typeof tutorial.slug === 'string' && tutorial.slug.length <= 200
            && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tutorial.slug);
    }

    // Apenas confere os candidatos da API existente. Não mantém um catálogo ou busca paralela.
    function selecionarTutorial(texto, candidatos) {
        const termos = termosRelevantes(texto);
        if (!termos.length || !Array.isArray(candidatos)) return null;
        const intencao = encontrarIntencao(texto);
        const assunto = intencao?.palavrasChave.filter(p => contemFrase(normalizarTexto(texto), p));
        const classificados = candidatos.filter(tutorialSeguro).map(tutorial => {
            const metadados = `${tutorial.titulo} ${(Array.isArray(tutorial.tags) ? tutorial.tags : []).join(' ')} ${tutorial.resumo || ''}`;
            const mesmoAssunto = !assunto || assunto.some(p => contemFrase(normalizarTexto(metadados), p));
            const tituloTags = termosRelevantes(`${tutorial.titulo} ${(Array.isArray(tutorial.tags) ? tutorial.tags : []).join(' ')}`);
            const resumo = termosRelevantes(tutorial.resumo || '');
            const fortes = termos.filter(t => tituloTags.includes(t)).length;
            const correspondencias = termos.filter(t => tituloTags.includes(t) || resumo.includes(t)).length;
            const cobertura = correspondencias / termos.length;
            return { tutorial, mesmoAssunto, fortes, cobertura, score: fortes * 2 + correspondencias };
        }).filter(item => item.mesmoAssunto && item.fortes > 0 && item.cobertura >= 0.6);
        classificados.sort((a, b) => b.score - a.score || b.cobertura - a.cobertura);
        return classificados[0]?.tutorial || null;
    }

    function resolverResposta(texto, candidatos) {
        const tutorial = selecionarTutorial(texto, candidatos);
        if (tutorial) return {
            tipo: 'tutorial', texto: 'Encontrei um tutorial criado por um colaborador do MExplica que pode ajudar você:',
            tutorial: { titulo: tutorial.titulo.slice(0, 160), slug: tutorial.slug }
        };
        return gerarRespostaLocal(texto);
    }

    // Contrato puro compartilhado pelo histórico e pela renderização; descarta campos extras.
    function limitarHistorico(mensagens) {
        if (!Array.isArray(mensagens)) return [];
        return mensagens.slice(-limites.historico).filter(m => m && ['user', 'assistant'].includes(m.role)
            && typeof m.text === 'string' && m.text.trim()).map(m => {
            const mensagem = {
                role: m.role, text: m.text.slice(0, m.role === 'user' ? limites.mensagem : limites.resposta),
                timestamp: Number.isFinite(m.timestamp) && m.timestamp >= 0 ? m.timestamp : 0
            };
            if (m.role === 'assistant' && tutorialSeguro(m.tutorial)) {
                mensagem.tutorial = { titulo: m.tutorial.titulo.slice(0, 160), slug: m.tutorial.slug.slice(0, 200) };
            }
            return mensagem;
        });
    }

    return { limites, mensagemInicial, intencoes, normalizarTexto, calcularScore, encontrarIntencao,
        gerarRespostaLocal, criarConsulta, selecionarTutorial, resolverResposta, limitarHistorico };
});
