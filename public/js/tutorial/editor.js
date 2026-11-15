(() => {
    const form = document.getElementById('formTutorial');
    if (!form) return;
    const { requisicao } = window.MExplicaApi;
    const { limites, urlHttp, youtubeId } = window.MExplicaTutorial;
    const grid = document.getElementById('editorPassos');
    const adicionar = document.getElementById('adicionarPasso');
    const slot = adicionar.parentElement;
    const mensagem = document.getElementById('tutorialMensagem');
    const avisoPassos = document.getElementById('passosMensagem');
    const estados = new WeakMap();
    let sequencia = 0;
    let processando = 0;
    let enviando = false;
    const cards = () => [...grid.querySelectorAll('.tutorial-editor-step')];

    function expandir(campo) {
        campo.style.height = 'auto';
        campo.style.height = campo.scrollHeight + 'px';
    }
    function reindexar() {
        const todos = cards();
        grid.dataset.quantidade = todos.length;
        todos.forEach((card, index) => {
            card.querySelector('.tutorial-step-label').textContent = 'Bloco ' + (index + 1);
            card.querySelector('.tutorial-remove-step').setAttribute('aria-label', 'Remover bloco ' + (index + 1));
        });
        slot.hidden = todos.length >= limites.passos;
        avisoPassos.textContent = todos.length ? todos.length + ' de 9 blocos.' : '';
    }
    function atualizarImagem(card) {
        const imagem = estados.get(card).imagem;
        const preview = card.querySelector('.tutorial-image-preview');
        preview.hidden = !imagem;
        if (imagem) { preview.src = imagem.url; preview.alt = imagem.alt || 'Imagem do bloco'; }
        else preview.removeAttribute('src');
        card.querySelector('.tutorial-upload-hint').hidden = !!imagem;
        card.querySelector('.tutorial-remove-image').hidden = !imagem;
        card.querySelector('.tutorial-file').setAttribute('aria-label', imagem ? 'Substituir imagem do bloco' : 'Anexar imagem ao bloco');
    }
    function painelLink(card, aberto) {
        const painel = card.querySelector('.tutorial-link-panel');
        painel.hidden = !aberto;
        card.querySelector('.tutorial-add-link').setAttribute('aria-expanded', String(aberto));
        painel.querySelectorAll('input').forEach(input => { input.disabled = !aberto; });
        if (aberto) {
            const link = estados.get(card).linkExterno;
            card.querySelector('.tutorial-link-url').value = link?.url || '';
            card.querySelector('.tutorial-link-text').value = link?.texto || '';
            card.querySelector('.tutorial-link-url').focus();
        }
    }
    function atualizarLink(card) {
        const link = estados.get(card).linkExterno;
        card.querySelector('.tutorial-link-summary').hidden = !link;
        card.querySelector('.tutorial-link-summary span').textContent = link?.texto || '';
        card.querySelector('.tutorial-add-link').textContent = link ? '↗ Editar link externo' : '↗ Adicionar link externo';
    }
    function criarCard(passo = {}, foco = true) {
        if (cards().length >= limites.passos) return;
        const card = document.getElementById('modeloPasso').content.firstElementChild.cloneNode(true);
        const id = ++sequencia;
        estados.set(card, { imagem: passo.imagem || null, linkExterno: passo.linkExterno || null, versaoImagem: 0 });
        const titulo = card.querySelector('.tutorial-step-title');
        const descricao = card.querySelector('.tutorial-step-description');
        titulo.id = 'blocoTitulo' + id;
        descricao.id = 'blocoDescricao' + id;
        card.querySelector('.tutorial-title-label').htmlFor = titulo.id;
        card.querySelector('.tutorial-description-label').htmlFor = descricao.id;
        titulo.value = passo.titulo || '';
        descricao.value = passo.descricao || '';
        titulo.maxLength = limites.tituloPasso;
        descricao.maxLength = limites.descricaoPasso;
        card.querySelector('.tutorial-link-panel').id = 'blocoLink' + id;
        card.querySelector('.tutorial-add-link').setAttribute('aria-controls', 'blocoLink' + id);
        grid.insertBefore(card, slot);
        atualizarImagem(card);
        atualizarLink(card);
        painelLink(card, false);
        reindexar();
        expandir(descricao);
        if (foco) titulo.focus();
    }
    adicionar.addEventListener('click', () => criarCard());
    grid.addEventListener('input', event => {
        if (event.target.matches('textarea')) expandir(event.target);
    });
    grid.addEventListener('click', event => {
        const card = event.target.closest('.tutorial-editor-step');
        if (!card || enviando) return;
        const estado = estados.get(card);
        const feedback = card.querySelector('.tutorial-step-feedback');
        if (event.target.closest('.tutorial-remove-step')) {
            const proximo = card.nextElementSibling;
            card.remove();
            reindexar();
            (proximo?.querySelector('input') || adicionar).focus();
            return;
        }
        if (event.target.closest('.tutorial-remove-image')) {
            estado.versaoImagem++;
            estado.imagem = null;
            card.querySelector('.tutorial-file').value = '';
            atualizarImagem(card);
        }
        if (event.target.closest('.tutorial-add-link')) painelLink(card, true);
        if (event.target.closest('.tutorial-cancel-link')) {
            painelLink(card, false);
            feedback.textContent = '';
            card.querySelector('.tutorial-add-link').focus();
        }
        if (event.target.closest('.tutorial-remove-link')) {
            estado.linkExterno = null;
            painelLink(card, false);
            atualizarLink(card);
            card.querySelector('.tutorial-add-link').focus();
        }
        if (event.target.closest('.tutorial-confirm-link')) {
            const url = urlHttp(card.querySelector('.tutorial-link-url').value.trim());
            const texto = card.querySelector('.tutorial-link-text').value.trim();
            if (!url || !texto || texto.length > limites.textoLink) {
                feedback.textContent = 'Informe uma URL http:// ou https:// e um texto de até 120 caracteres.';
                return;
            }
            estado.linkExterno = { url, texto };
            painelLink(card, false);
            atualizarLink(card);
            feedback.textContent = '';
            card.querySelector('.tutorial-add-link').focus();
        }
    });
    grid.addEventListener('keydown', event => {
        const painel = event.target.closest('.tutorial-link-panel');
        if (painel && event.key === 'Escape') {
            painelLink(painel.closest('article'), false);
            painel.closest('article').querySelector('.tutorial-add-link').focus();
        }
        if (painel && event.key === 'Enter') {
            event.preventDefault();
            painel.querySelector('.tutorial-confirm-link').click();
        }
    });

    async function processarImagem(arquivo) {
        const regra = limites.imagem;
        if (!regra.tipos.includes(arquivo.type)) throw new Error('Formato não aceito. Escolha uma imagem JPEG, PNG ou WebP.');
        if (arquivo.size > regra.arquivoBytes) throw new Error('Imagem grande demais. O arquivo deve ter até 8 MB.');
        const origem = URL.createObjectURL(arquivo);
        const imagem = new Image();
        try {
            imagem.src = origem;
            await imagem.decode();
            const largura = imagem.naturalWidth;
            const altura = imagem.naturalHeight;
            if (Math.min(largura, altura) < regra.minimo) throw new Error('Imagem pequena demais. Use pelo menos 120 × 120 pixels.');
            if (Math.max(largura, altura) > regra.entradaMaxima || largura * altura > regra.pixelsMaximos) {
                throw new Error('Imagem grande demais. Use até 8192 pixels por lado e 24 milhões de pixels.');
            }
            if (Math.max(largura, altura) <= regra.saidaMaxima && arquivo.size <= regra.saidaBytes) {
                return await new Promise((resolve, reject) => {
                    const leitor = new FileReader();
                    leitor.onload = () => resolve(leitor.result);
                    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem. Escolha outro arquivo.'));
                    leitor.readAsDataURL(arquivo);
                });
            }
            let escala = Math.min(1, regra.saidaMaxima / Math.max(largura, altura));
            const canvas = document.createElement('canvas');
            for (let tentativa = 0; tentativa < 7; tentativa++, escala *= 0.85) {
                canvas.width = Math.round(largura * escala);
                canvas.height = Math.round(altura * escala);
                if (Math.min(canvas.width, canvas.height) < regra.minimo) break;
                const contexto = canvas.getContext('2d');
                if (!contexto) throw new Error('Não foi possível processar a imagem neste navegador.');
                contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
                for (const qualidade of [0.92, 0.82, 0.72, 0.62]) {
                    const url = canvas.toDataURL('image/webp', qualidade);
                    const tamanho = Math.floor((url.length - url.indexOf(',') - 1) * 3 / 4);
                    if (tamanho <= regra.saidaBytes) return url;
                }
            }
            throw new Error('A imagem continua grande demais após redução (limite de 72 KB). Escolha uma captura menor.');
        } catch (erro) {
            if (erro.name === 'EncodingError') throw new Error('Não foi possível processar a imagem. Escolha outro arquivo JPEG, PNG ou WebP.');
            throw erro;
        } finally { URL.revokeObjectURL(origem); }
    }

    grid.addEventListener('change', async event => {
        if (!event.target.matches('.tutorial-file')) return;
        const arquivo = event.target.files[0];
        if (!arquivo) return;
        const card = event.target.closest('article');
        const estado = estados.get(card);
        const versao = ++estado.versaoImagem;
        const feedback = card.querySelector('.tutorial-step-feedback');
        processando++;
        feedback.textContent = 'Preparando imagem...';
        try {
            const url = await processarImagem(arquivo);
            if (card.isConnected && versao === estado.versaoImagem) {
                estado.imagem = { url, alt: '' };
                atualizarImagem(card);
                feedback.textContent = 'Imagem pronta. Clique na imagem para substituí-la.';
            }
        } catch (erro) {
            if (card.isConnected && versao === estado.versaoImagem) feedback.textContent = erro.message;
        } finally {
            processando--;
            event.target.value = '';
        }
    });
    document.querySelectorAll('.tutorial-editor-heading textarea, #tutorialConteudo').forEach(campo => {
        campo.addEventListener('input', () => expandir(campo));
        expandir(campo);
    });
    window.addEventListener('resize', () => form.querySelectorAll('textarea').forEach(expandir));
    const iniciais = JSON.parse(document.getElementById('passosIniciais').textContent);
    iniciais.forEach(passo => criarCard(passo, false));
    reindexar();

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (enviando) return;
        mensagem.textContent = '';
        if (processando) { mensagem.textContent = 'Aguarde o processamento das imagens antes de publicar.'; return; }
        if (!cards().length) { mensagem.textContent = 'Adicione pelo menos um bloco ao tutorial.'; adicionar.focus(); return; }
        const painelAberto = cards().find(card => !card.querySelector('.tutorial-link-panel').hidden);
        if (painelAberto) {
            mensagem.textContent = 'Confirme ou cancele o link externo antes de publicar.';
            painelAberto.querySelector('.tutorial-confirm-link').focus();
            return;
        }
        const videoUrl = document.getElementById('tutorialVideo').value.trim();
        const videoOriginal = document.getElementById('tutorialVideo').defaultValue;
        if (videoUrl && !youtubeId(videoUrl) && !(form.dataset.modo === 'editar' && videoUrl === videoOriginal)) {
            mensagem.textContent = 'Informe um link válido do YouTube (youtube.com ou youtu.be).';
            document.getElementById('tutorialVideo').focus();
            return;
        }
        const payload = {
            titulo: document.getElementById('tutorialTitulo').value,
            resumo: document.getElementById('tutorialResumo').value,
            conteudo: document.getElementById('tutorialConteudo').value,
            categoriaId: form.querySelector('[name="categoriaId"]:checked')?.value || '',
            passos: cards().map((card, index) => {
                const estado = estados.get(card);
                const titulo = card.querySelector('.tutorial-step-title').value;
                return {
                    ordem: index + 1, titulo,
                    descricao: card.querySelector('.tutorial-step-description').value,
                    imagem: estado.imagem ? { ...estado.imagem, alt: estado.imagem.alt || 'Passo ' + (index + 1) + ': ' + titulo } : null,
                    linkExterno: estado.linkExterno
                };
            }),
            videoUrl,
            tags: document.getElementById('tutorialTags').value.split(',').map(tag => tag.trim()).filter(Boolean)
        };
        const body = JSON.stringify(payload);
        if (new Blob([body]).size > limites.payloadBytes) {
            mensagem.textContent = 'O tutorial excede o limite total de 1 MB. Reduza as imagens.'; return;
        }
        const criar = form.dataset.modo === 'criar';
        const botao = form.querySelector('[type="submit"]');
        const textoBotao = botao.textContent;
        const controles = [...form.querySelectorAll('input, textarea, button')].map(controle => ({ controle, disabled: controle.disabled }));
        enviando = true;
        controles.forEach(({ controle }) => { controle.disabled = true; });
        botao.setAttribute('aria-busy', 'true');
        botao.textContent = criar ? 'Publicando...' : 'Salvando...';
        mensagem.textContent = criar ? 'Publicando tutorial...' : 'Salvando alterações...';
        try {
            const dados = await requisicao(criar ? '/api/tutoriais' : '/api/tutoriais/' + form.dataset.id,
                { method: criar ? 'POST' : 'PUT', body });
            mensagem.textContent = 'Tutorial salvo. Abrindo publicação...';
            window.location.href = '/tutoriais/' + dados.tutorial.slug;
        } catch (erro) {
            mensagem.textContent = erro.message;
        } finally {
            enviando = false;
            controles.forEach(({ controle, disabled }) => { controle.disabled = disabled; });
            botao.removeAttribute('aria-busy');
            botao.textContent = textoBotao;
        }
    });
})();
