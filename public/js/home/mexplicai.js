(() => {
    'use strict';

    const engine = window.MExplicAIEngine;
    const panel = document.getElementById('mexplicaiPanel');
    if (!panel || !engine || !window.MExplicaApi) return;

    const porId = id => document.getElementById(`mexplicai${id}`);
    const start = porId('Start');
    const bubble = porId('Bubble');
    const input = porId('Input');
    const send = porId('Send');
    const messages = porId('Messages');
    const status = porId('Status');
    const modal = porId('Help');
    const keys = { history: 'mexplicai:v1:history', state: 'mexplicai:v1:state' };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let history = [];
    let mode = 'closed';
    let ready = false;
    let openingTimer;
    let busy = false;
    let initials = 'V';
    let sessionLoaded = false;
    let opener = start;
    let helpOpener;
    let savedScroll = 0;
    let unread = false;

    // Armazenamento indisponível, cheio ou corrompido não impede o uso do chat.
    function read(key) {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw === null) return null;
            if (raw.length > engine.limites.armazenamento) throw new Error('Limite local');
            return JSON.parse(raw);
        } catch {
            try { window.localStorage.removeItem(key); } catch { /* Navegação privada/restrita. */ }
            return null;
        }
    }

    function write(key, value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); }
        catch { /* A conversa continua em memória nesta página. */ }
    }

    function saveHistory() {
        history = engine.limitarHistorico(history);
        write(keys.history, history);
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function logo(complete = false) {
        const img = element('img', 'mexplicai-message-logo');
        img.src = `/icons/mexplicai-logo${complete ? '-completa' : ''}.png`;
        img.alt = 'MEXPLICAI';
        return img;
    }

    function renderMessage(message) {
        const article = element('article', `mexplicai-message mexplicai-from-${message.role}`);
        if (message.role === 'user') {
            const meta = element('div', 'mexplicai-user-meta');
            const avatar = element('span', 'mexplicai-avatar', initials);
            avatar.setAttribute('aria-hidden', 'true');
            meta.append(element('span', '', 'Você'), avatar);
            article.append(meta);
        } else {
            article.append(logo(true));
        }
        article.append(element('p', 'mexplicai-message-text', message.text));
        if (message.tutorial) {
            const card = element('div', 'mexplicai-tutorial');
            card.append(element('strong', '', message.tutorial.titulo));
            const link = element('a', 'mexplicai-tutorial-link', 'Acessar tutorial');
            link.href = `/tutoriais/${message.tutorial.slug}`;
            card.append(link);
            article.append(card);
        }
        messages.append(article);
    }

    function scrollToLatest() {
        // Altera apenas o scroll do log, sem deslocar o body.
        messages.scrollTop = messages.scrollHeight;
    }

    function addMessage(message) {
        history.push(message);
        saveHistory();
        renderMessage(history[history.length - 1]);
        while (messages.children.length > engine.limites.historico) messages.firstElementChild.remove();
        if (mode === 'open') scrollToLatest();
        else unread = true;
    }

    async function loadSession() {
        if (sessionLoaded) return;
        sessionLoaded = true;
        try {
            const session = await window.MExplicaApi.requisicao('/api/auth/sessao');
            const user = session.autenticado && session.usuario;
            const name = user && (user.nomeCompleto || `${user.nome || ''} ${user.sobrenome || ''}`);
            const parts = name ? name.trim().split(/\s+/).filter(Boolean) : [];
            initials = parts.length ? [parts[0], ...(parts.length > 1 ? [parts[parts.length - 1]] : [])]
                .map(part => Array.from(part)[0].toUpperCase()).join('') : 'V';
        } catch { initials = 'V'; }
        messages.querySelectorAll('.mexplicai-avatar').forEach(avatar => { avatar.textContent = initials; });
    }

    function setMode(next) {
        if (mode === 'open' && next !== 'open') savedScroll = messages.scrollTop;
        mode = next;
        panel.hidden = next !== 'open';
        bubble.hidden = next !== 'minimized';
        start.setAttribute('aria-expanded', String(next === 'open'));
        write(keys.state, { mode: next });
    }

    function finishOpening() {
        ready = true;
        panel.dataset.loading = 'false';
        porId('Chat').inert = false;
        porId('ComposerWrap').inert = false;
        scrollToLatest();
        // Não rouba o foco de Ajuda/minimizar enquanto a transição termina.
        if (mode === 'open' && document.activeElement === porId('Minimize') && !modal.open) {
            input.focus({ preventScroll: true });
        }
    }

    function open(trigger, automatic = false) {
        if (trigger !== bubble) opener = trigger || start;
        setMode('open');
        loadSession();
        if (!automatic) (ready ? input : porId('Minimize')).focus({ preventScroll: true });
        if (!ready) {
            clearTimeout(openingTimer);
            openingTimer = setTimeout(finishOpening, reducedMotion.matches ? 0 : 550);
        } else if (unread) {
            scrollToLatest();
            unread = false;
        } else messages.scrollTop = savedScroll;
    }

    function returnFocus() {
        const target = opener?.getClientRects().length ? opener : document.getElementById('searchInput');
        target?.focus({ preventScroll: true });
    }

    start.addEventListener('click', () => open(start));
    bubble.addEventListener('click', () => open(bubble));
    porId('Minimize').addEventListener('click', () => {
        setMode('minimized');
        bubble.focus({ preventScroll: true });
    });
    porId('Close').addEventListener('click', () => { setMode('closed'); returnFocus(); });
    panel.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.open) {
            event.preventDefault();
            event.stopPropagation();
            setMode('closed');
            returnFocus();
        }
    });

    document.querySelectorAll('[data-mexplicai-help]').forEach(button => {
        button.addEventListener('click', () => {
            helpOpener = button;
            modal.showModal();
            porId('HelpTitle').focus({ preventScroll: true });
        });
    });
    modal.addEventListener('cancel', event => { event.preventDefault(); modal.close(); });
    modal.addEventListener('close', () => { helpOpener?.focus({ preventScroll: true }); });
    modal.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key !== 'Tab') return;
        const controls = [...modal.querySelectorAll('button, a[href], input, textarea, [tabindex="0"]')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if ((!event.shiftKey && document.activeElement === last)
            || (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement)))) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
        }
    });

    porId('Attach').addEventListener('click', () => {
        const note = porId('AttachmentNote');
        note.hidden = !note.hidden;
        porId('Attach').setAttribute('aria-expanded', String(!note.hidden));
    });

    function updateComposer() {
        send.disabled = busy || !input.value.trim();
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }
    input.addEventListener('input', updateComposer);

    async function findReply(text) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const query = new URLSearchParams({ q: engine.criarConsulta(text) });
            const data = await window.MExplicaApi.requisicao(`/api/tutoriais/buscar?${query}`, { signal: controller.signal });
            if (!Array.isArray(data.resultados)) throw new Error('Resposta inválida');
            return engine.resolverResposta(text, data.resultados);
        } catch {
            const local = engine.gerarRespostaLocal(text);
            return { ...local, texto: `Não consegui consultar os tutoriais agora.\n\n${local.texto}` };
        } finally { clearTimeout(timeout); }
    }

    async function submit() {
        const text = input.value.trim().slice(0, engine.limites.mensagem);
        if (!text || busy || !ready) return;
        busy = true;
        addMessage({ role: 'user', text, timestamp: Date.now() });
        input.value = '';
        updateComposer();
        status.textContent = 'MEXPLICAI está buscando uma orientação...';
        const [reply] = await Promise.all([
            findReply(text), new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : 350))
        ]);
        addMessage({ role: 'assistant', text: reply.texto, tutorial: reply.tutorial, timestamp: Date.now() });
        status.textContent = '';
        busy = false;
        updateComposer();
    }

    porId('Form').addEventListener('submit', event => { event.preventDefault(); submit(); });
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            submit();
        }
    });

    // A viewport visual acompanha o teclado móvel, inclusive em navegadores
    // que não redimensionam a viewport de layout ao abrir o teclado.
    function updateViewport() {
        const viewport = window.visualViewport;
        if (!viewport) return;
        panel.style.setProperty('--mexplicai-viewport-height', `${viewport.height}px`);
        panel.style.setProperty('--mexplicai-viewport-top', `${viewport.offsetTop}px`);
    }
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    updateViewport();

    history = engine.limitarHistorico(read(keys.history));
    if (!history.length) history.push({ role: 'assistant', text: engine.mensagemInicial, timestamp: Date.now() });
    history.forEach(renderMessage);
    saveHistory();
    const savedMode = read(keys.state)?.mode;
    if (savedMode === 'minimized') setMode('minimized');
    else if (savedMode === 'open') open(start, true);
})();
