(() => {
    const painel = document.querySelector('.admin-workspace');
    const dialog = document.getElementById('adminExcluirDialog');
    if (!painel || !dialog || !window.MExplicaApi) return;
    const { requisicao } = window.MExplicaApi;
    const $ = id => document.getElementById(id);
    const registros = $('adminRegistros'), termo = $('adminTermo');
    const feedback = $('adminFeedback'), erroDialog = $('adminExcluirErro');
    const confirmar = $('adminConfirmar');
    const tipos = {
        usuarios: { titulo: 'Usuários', singular: 'usuário', vazio: 'Nenhum usuário encontrado.', busca: 'Nome, @handle ou email',
            aviso: 'Essa ação também removerá os conteúdos vinculados à conta e não poderá ser desfeita.' },
        tutoriais: { titulo: 'Tutoriais', singular: 'tutorial', vazio: 'Nenhum tutorial encontrado.', busca: 'Título, autor ou slug',
            aviso: 'Seus passos, tags, comentários e avaliações serão removidos. A pontuação correspondente será ajustada automaticamente. Essa ação não poderá ser desfeita.' },
        comentarios: { titulo: 'Comentários', singular: 'comentário', vazio: 'Nenhum comentário encontrado.', busca: 'Texto, autor ou tutorial',
            aviso: 'O comentário será removido da conversa. Essa ação não poderá ser desfeita.' },
        avaliacoes: { titulo: 'Avaliações', singular: 'avaliação', vazio: 'Nenhuma avaliação encontrada.', busca: 'Avaliador, tutorial ou autor',
            aviso: 'A pontuação correspondente será ajustada automaticamente. Essa ação não poderá ser desfeita.' }
    };
    let area = 'geral', pagina = 1, busca = '', versao = 0;
    let itens = new Map(), pendente = null, enviando = false;
    let origem = null;

    function elemento(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }
    function mensagem(texto, erro = false) {
        feedback.textContent = texto;
        feedback.dataset.erro = String(erro);
    }
    function data(valor) {
        const dia = new Date(valor);
        return Number.isNaN(dia.getTime()) ? 'Data indisponível' : dia.toLocaleDateString('pt-BR');
    }
    function link(texto, destino) {
        const el = elemento('a', 'mexp-secondary-button', texto);
        el.href = destino;
        return el;
    }
    function atualizarTotais(resumo) {
        document.querySelectorAll('[data-count]').forEach(el => {
            el.textContent = Number(resumo[el.dataset.count]).toLocaleString('pt-BR');
        });
    }
    function construirRegistro(item) {
        const artigo = elemento('article', 'admin-record');
        const principal = elemento('div', 'admin-record-main');
        const cabecalho = elemento('div', 'admin-record-heading');
        const pessoa = area === 'usuarios' ? item : item.autor;
        cabecalho.append(elemento('span', 'admin-avatar', pessoa.iniciais));
        cabecalho.firstChild.setAttribute('aria-hidden', 'true');
        const nomes = elemento('div');
        nomes.append(elemento('h3', '', area === 'tutoriais' ? item.titulo : pessoa.nomeCompleto));
        nomes.append(elemento('p', 'admin-record-handle', area === 'tutoriais' ? `por ${pessoa.nomeCompleto}` : pessoa.handle));
        cabecalho.append(nomes);
        principal.append(cabecalho);
        const meta = elemento('div', 'admin-record-meta');
        meta.append(elemento('span', '', `${area === 'usuarios' ? 'Desde' : 'Publicado em'} ${data(item.criadoEm)}`));
        if (area === 'usuarios') {
            if (item.administrador) meta.append(elemento('span', 'admin-badge', 'Administrador'));
            meta.append(elemento('span', '', item.colaborador ? `Colaborador · ${item.nivel}` : 'Usuário'));
            meta.append(elemento('span', '', `${item.pontos} pontos`));
            if (item.email) principal.append(elemento('p', 'admin-record-email', item.email));
        } else if (area === 'tutoriais') {
            meta.append(elemento('span', 'admin-badge', item.categoria));
            meta.append(elemento('span', '', `${item.visualizacoes} visualizações`));
            meta.append(elemento('span', '', `${item.comentarios} comentários · ${item.avaliacoes} avaliações`));
        } else {
            if (area === 'comentarios') principal.append(elemento('p', 'admin-record-text', item.texto));
            else principal.append(elemento('p', 'admin-record-text', `${item.nota} de 5 estrelas`));
            principal.append(elemento('p', 'admin-record-context', item.tutorial
                ? `${item.tutorial.titulo} · por ${item.tutorial.autor.nomeCompleto}` : 'Tutorial indisponível'));
        }
        principal.append(meta);
        const acoes = elemento('div', 'admin-record-actions');
        if (area === 'usuarios') acoes.append(link('Ver perfil', '/perfil/' + encodeURIComponent(item.slug)));
        else {
            const tutorial = area === 'tutoriais' ? item : item.tutorial;
            if (tutorial) acoes.append(link('Ver tutorial', '/tutoriais/' + encodeURIComponent(tutorial.slug)));
        }
        const protegido = area === 'usuarios' && (item.administrador || item.id === Number(painel.dataset.usuarioId));
        const excluir = elemento('button', 'mexp-danger-button', protegido ? 'Conta protegida' : area === 'avaliacoes' ? 'Remover' : 'Excluir');
        excluir.type = 'button';
        excluir.disabled = protegido;
        excluir.dataset.adminExcluir = String(item.id);
        excluir.setAttribute('aria-label', protegido ? 'Conta administrativa protegida'
            : `${area === 'avaliacoes' ? 'Remover avaliação' : 'Excluir ' + tipos[area].singular} — ${area === 'tutoriais' ? item.titulo : pessoa.nomeCompleto}`);
        acoes.append(excluir);
        artigo.append(principal, acoes);
        return artigo;
    }

    async function carregarLista() {
        if (area === 'geral') return;
        const atual = ++versao;
        const recurso = area;
        $('adminCarregamento').textContent = 'Carregando registros...';
        registros.setAttribute('aria-busy', 'true');
        $('adminAnterior').disabled = true;
        $('adminProxima').disabled = true;
        try {
            const resultado = await requisicao(`/api/admin/${recurso}?q=${encodeURIComponent(busca)}&pagina=${pagina}`);
            if (atual !== versao) return;
            pagina = resultado.pagina;
            itens = new Map(resultado.itens.map(item => [String(item.id), item]));
            const cards = resultado.itens.map(construirRegistro);
            if (!cards.length) {
                const vazio = elemento('div', 'admin-empty');
                vazio.append(elemento('h3', '', tipos[area].vazio), elemento('p', '', 'Tente outro termo ou limpe a busca para ver os registros disponíveis.'));
                cards.push(vazio);
            }
            registros.replaceChildren(...cards);
            $('adminTotal').textContent = `${resultado.total} ${resultado.total === 1 ? 'registro' : 'registros'}`;
            $('adminPagina').textContent = `Página ${resultado.pagina} de ${resultado.paginas}`;
            $('adminAnterior').disabled = resultado.pagina <= 1;
            $('adminProxima').disabled = resultado.pagina >= resultado.paginas;
            $('adminCarregamento').textContent = '';
            return true;
        } catch (erro) {
            if (atual !== versao) return;
            $('adminCarregamento').textContent = 'Não foi possível carregar os registros. Use Buscar para tentar novamente.';
            mensagem(erro.message || 'Não foi possível carregar os registros.', true);
            return false;
        } finally {
            if (atual === versao) registros.removeAttribute('aria-busy');
        }
    }

    async function selecionarArea(destino) {
        if (destino !== 'geral' && !Object.hasOwn(tipos, destino)) return;
        area = destino; pagina = 1; busca = ''; termo.value = ''; ++versao;
        itens.clear(); registros.replaceChildren(); mensagem('');
        document.querySelectorAll('.admin-tabs [data-admin-area]').forEach(botao => {
            botao.setAttribute('aria-pressed', String(botao.dataset.adminArea === area));
        });
        $('adminVisaoGeral').hidden = area !== 'geral';
        $('adminListagem').hidden = area === 'geral';
        if (area === 'geral') return;
        $('adminListaTitulo').textContent = tipos[area].titulo;
        $('adminBuscaLabel').textContent = 'Buscar ' + tipos[area].titulo.toLowerCase();
        $('adminTotal').textContent = '';
        $('adminPagina').textContent = '';
        termo.placeholder = tipos[area].busca;
        $('adminListaTitulo').focus({ preventScroll: true });
        await carregarLista();
    }

    painel.addEventListener('click', event => {
        const aba = event.target.closest('[data-admin-area]');
        if (aba) { selecionarArea(aba.dataset.adminArea); return; }
        const botao = event.target.closest('[data-admin-excluir]');
        if (!botao || botao.disabled || enviando) return;
        const item = itens.get(botao.dataset.adminExcluir);
        if (!item) return;
        origem = botao;
        pendente = { area, item };
        erroDialog.textContent = '';
        const acao = area === 'avaliacoes' ? 'Remover avaliação' : 'Excluir ' + tipos[area].singular;
        $('adminExcluirTitulo').textContent = acao + '?';
        confirmar.textContent = acao;
        $('adminExcluirDescricao').textContent = tipos[area].aviso;
        $('adminExcluirPrevia').textContent = area === 'usuarios' ? `${item.nomeCompleto}\n${item.handle}`
            : area === 'tutoriais' ? `“${item.titulo}”\npor ${item.autor.nomeCompleto}`
            : area === 'comentarios' ? `${item.autor.nomeCompleto}:\n“${item.texto.slice(0, 350)}${item.texto.length > 350 ? '…' : ''}”`
            : `${item.autor.nomeCompleto} avaliou “${item.tutorial?.titulo || 'Tutorial indisponível'}” com ${item.nota} estrelas.`;
        dialog.showModal();
        dialog.querySelector('[autofocus]').focus({ preventScroll: true });
    });
    $('adminBusca').addEventListener('submit', event => {
        event.preventDefault(); busca = termo.value.trim(); pagina = 1; mensagem(''); carregarLista();
    });
    termo.addEventListener('search', () => { if (!termo.value) { busca = ''; pagina = 1; carregarLista(); } });
    $('adminAnterior').addEventListener('click', () => { if (pagina > 1) { pagina--; carregarLista(); } });
    $('adminProxima').addEventListener('click', () => { pagina++; carregarLista(); });

    dialog.querySelectorAll('[data-admin-cancelar]').forEach(botao => botao.addEventListener('click', () => { if (!enviando) dialog.close(); }));
    dialog.addEventListener('cancel', event => { if (enviando) event.preventDefault(); });
    dialog.addEventListener('close', () => {
        pendente = null;
        if (origem?.isConnected) origem.focus({ preventScroll: true });
        else $('adminListaTitulo').focus({ preventScroll: true });
    });
    dialog.addEventListener('keydown', event => {
        if (enviando && event.key === 'Escape') { event.preventDefault(); return; }
        if (event.key !== 'Tab') return;
        const controles = [...dialog.querySelectorAll('button:not(:disabled)')];
        if (!controles.length) { event.preventDefault(); return; }
        const primeiro = controles[0], ultimo = controles.at(-1);
        if (!controles.includes(document.activeElement) || (!event.shiftKey && document.activeElement === ultimo)
            || (event.shiftKey && document.activeElement === primeiro)) {
            event.preventDefault(); (event.shiftKey ? ultimo : primeiro).focus();
        }
    });
    $('adminExcluirForm').addEventListener('submit', async event => {
        event.preventDefault();
        if (enviando || !pendente) return;
        const alvo = pendente;
        enviando = true;
        dialog.setAttribute('aria-busy', 'true');
        dialog.querySelectorAll('button').forEach(botao => { botao.disabled = true; });
        confirmar.textContent = alvo.area === 'avaliacoes' ? 'Removendo...' : 'Excluindo...';
        erroDialog.textContent = '';
        dialog.focus({ preventScroll: true });
        let resultado;
        try {
            resultado = await requisicao(`/api/admin/${alvo.area}/${alvo.item.id}`, { method: 'DELETE' });
        } catch (erro) {
            erroDialog.textContent = erro instanceof TypeError
                ? 'Não foi possível concluir. Verifique sua conexão e tente novamente.' : erro.message;
        } finally {
            enviando = false;
            dialog.removeAttribute('aria-busy');
            dialog.querySelectorAll('button').forEach(botao => { botao.disabled = false; });
            confirmar.textContent = alvo.area === 'avaliacoes' ? 'Remover avaliação' : 'Excluir ' + tipos[alvo.area].singular;
        }
        if (!resultado) { dialog.querySelector('[autofocus]').focus({ preventScroll: true }); return; }
        // O item só sai da tela depois de o servidor confirmar a exclusão.
        origem?.closest('.admin-record')?.remove();
        dialog.close();
        mensagem(resultado.mensagem);
        const [totais, lista] = await Promise.allSettled([requisicao('/api/admin/resumo'), carregarLista()]);
        if (totais.status === 'fulfilled') atualizarTotais(totais.value);
        if (totais.status !== 'fulfilled' || lista.status !== 'fulfilled' || lista.value === false) {
            mensagem(resultado.mensagem + ' Não foi possível atualizar todos os dados. Use Buscar ou recarregue o painel.', true);
        }
    });
})();
