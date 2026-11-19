(() => {
    const { requisicao } = window.MExplicaApi;
    const excluirTutorial = document.getElementById('excluirTutorial');
    const modal = document.getElementById('modalExcluirTutorial');
    if (excluirTutorial && modal) {
        const confirmar = document.getElementById('confirmarExclusao');
        const cancelar = document.getElementById('cancelarExclusao');
        const mensagem = document.getElementById('excluirMensagem');
        excluirTutorial.addEventListener('click', () => {
            mensagem.textContent = '';
            modal.showModal();
            cancelar.focus();
        });
        cancelar.addEventListener('click', () => modal.close());
        modal.addEventListener('close', () => excluirTutorial.focus());
        modal.addEventListener('cancel', event => { if (confirmar.disabled) event.preventDefault(); });
        modal.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const botoes = [confirmar, cancelar].filter(botao => !botao.disabled);
            const destino = event.shiftKey && document.activeElement === botoes[0]
                ? botoes.at(-1) : !event.shiftKey && document.activeElement === botoes.at(-1) ? botoes[0] : null;
            if (destino) { event.preventDefault(); destino.focus(); }
        });
        confirmar.addEventListener('click', async () => {
            if (confirmar.disabled) return;
            confirmar.disabled = cancelar.disabled = true;
            mensagem.textContent = 'Excluindo post...';
            try {
                await requisicao('/api/tutoriais/' + excluirTutorial.dataset.id, { method: 'DELETE' });
                window.location.href = '/comunidade';
            } catch (erro) {
                mensagem.textContent = erro.message;
                confirmar.disabled = cancelar.disabled = false;
            }
        });
    }

    const modos = document.getElementById('modoVisualizacao');
    const passos = document.getElementById('passosPublicados');
    if (modos && passos) {
        modos.querySelectorAll('[data-modo]').forEach(botao => {
            botao.addEventListener('click', () => {
                passos.dataset.modo = botao.dataset.modo;
                modos.querySelectorAll('[data-modo]').forEach(opcao => {
                    const selecionado = opcao === botao;
                    opcao.setAttribute('aria-pressed', String(selecionado));
                    opcao.textContent = (selecionado ? '✓ ' : '') + (opcao.dataset.modo === 'quadros' ? 'Visualização por quadros' : 'Visualização simples');
                });
                document.getElementById('modoVisualizacaoTexto').textContent = botao.dataset.modo === 'quadros' ? 'Visualização por quadros' : 'Visualização simples';
                modos.open = false;
                modos.querySelector('summary').focus();
            });
        });
        modos.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                modos.open = false;
                modos.querySelector('summary').focus();
            }
        });
        document.addEventListener('click', event => { if (!modos.contains(event.target)) modos.open = false; });
    }
    const video = document.querySelector('[data-youtube-id]');
    if (video) video.addEventListener('click', () => {
        const id = video.dataset.youtubeId;
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
        iframe.title = 'Vídeo do tutorial';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.className = 'tutorial-video-player';
        video.replaceWith(iframe);
        iframe.focus();
    });
    // =============================
    // AVALIAÇAO
    // =============================
    const ratingBox =
        document.getElementById(
            'tutorialRating'
        );


    if (ratingBox) {

        const tutorialId =
            ratingBox
                .dataset
                .tutorialId;


        ratingBox

            .querySelectorAll(
                '.mexp-star'
            )

            .forEach(
                estrela => {

                    estrela.addEventListener(
                        'click',
                        async () => {

                            const nota =
                                Number(
                                    estrela
                                        .dataset
                                        .nota
                                );


                            const avaliacaoId =
                                ratingBox
                                    .dataset
                                    .avaliacaoId;


                            try {

                                const dados =
                                    avaliacaoId

                                        ? await requisicao(

                                            `/api/avaliacoes/${avaliacaoId}`,

                                            {

                                                method:
                                                    'PUT',

                                                body:
                                                    JSON.stringify({
                                                        nota
                                                    })

                                            }

                                        )

                                        : await requisicao(

                                            `/api/tutoriais/${tutorialId}/avaliacoes`,

                                            {

                                                method:
                                                    'POST',

                                                body:
                                                    JSON.stringify({
                                                        nota
                                                    })

                                            }

                                        );


                                if (
                                    dados.mudouNivel

                                    &&

                                    dados.nivelAnterior
                                    !== dados.nivelAtual
                                ) {

                                    alert(

                                        `Avaliação registrada! O colaborador passou de ${dados.nivelAnterior} para ${dados.nivelAtual}.`

                                    );

                                }


                                window.location.reload();

                            }

                            catch (erro) {

                                alert(
                                    erro.message
                                );

                            }

                        }
                    );

                }
            );


        const removerAvaliacao =
            document.getElementById(
                'removerAvaliacao'
            );


        if (removerAvaliacao) {

            removerAvaliacao
                .addEventListener(
                    'click',
                    async () => {

                        const avaliacaoId =
                            ratingBox
                                .dataset
                                .avaliacaoId;


                        if (!avaliacaoId) {

                            return;

                        }


                        try {

                            await requisicao(

                                `/api/avaliacoes/${avaliacaoId}`,

                                {
                                    method:
                                        'DELETE'
                                }

                            );


                            window.location.reload();

                        }

                        catch (erro) {

                            alert(
                                erro.message
                            );

                        }

                    }
                );

        }

    }


    // =============================
    // CRIAR COMENTARIO
    // =============================
    const formComentario =
        document.getElementById(
            'formComentario'
        );


    if (formComentario) {

        formComentario
            .addEventListener(
                'submit',
                async event => {

                    event.preventDefault();


                    const texto =
                        document
                            .getElementById(
                                'comentarioTexto'
                            )
                            .value;


                    const mensagem =
                        document
                            .getElementById(
                                'comentarioMensagem'
                            );


                    try {

                        mensagem.textContent =
                            'Publicando comentário...';


                        await requisicao(

                            `/api/tutoriais/${formComentario.dataset.tutorialId}/comentarios`,

                            {

                                method:
                                    'POST',

                                body:
                                    JSON.stringify({
                                        texto
                                    })

                            }

                        );


                        window.location.reload();

                    }

                    catch (erro) {

                        mensagem.textContent =
                            erro.message;

                    }

                }
            );

    }


    // =============================
    // MODAIS DE EDIÇÃO E EXCLUSÃO DE COMENTÁRIOS
    // Mesmo padrão de <dialog> do tutorial, com foco e estado de envio compartilhados.
    function prepararModalComentario(id, seletor, metodo) {
        const dialog = document.getElementById(id);
        if (!dialog) return;

        const form = dialog.querySelector('form');
        const campo = dialog.querySelector('textarea');
        const mensagem = dialog.querySelector('.tutorial-feedback');
        const confirmar = form.querySelector('[type="submit"]');
        const cancelar = form.querySelector('.mexp-secondary-button');
        const controles = [...form.elements];
        const rotulo = confirmar.textContent;
        let origem;
        let enviando = false;

        document.querySelectorAll(seletor).forEach(botao => {
            botao.addEventListener('click', () => {
                origem = botao;
                mensagem.textContent = '';
                if (campo) {
                    campo.value = botao.closest('.mexp-comment-card').querySelector('.mexp-comment-text').textContent.trim();
                    campo.removeAttribute('aria-invalid');
                }
                dialog.showModal();
                (campo || cancelar).focus({ preventScroll: true });
                if (campo) campo.setSelectionRange(campo.value.length, campo.value.length);
            });
        });

        dialog.querySelectorAll('[data-fechar-comentario]').forEach(botao => {
            botao.addEventListener('click', () => { if (!enviando) dialog.close(); });
        });
        dialog.addEventListener('close', () => { if (origem?.isConnected) origem.focus({ preventScroll: true }); });
        dialog.addEventListener('cancel', event => { if (enviando) event.preventDefault(); });
        dialog.addEventListener('keydown', event => {
            if (enviando && event.key === 'Escape') { event.preventDefault(); return; }
            if (event.key !== 'Tab') return;
            const ativos = controles.filter(controle => !controle.disabled);
            const primeiro = ativos[0];
            const ultimo = ativos.at(-1);
            if (!ativos.length) { event.preventDefault(); return; }
            if ((!event.shiftKey && document.activeElement === ultimo)
                || (event.shiftKey && (document.activeElement === primeiro || !ativos.includes(document.activeElement)))) {
                event.preventDefault();
                (event.shiftKey ? ultimo : primeiro).focus();
            }
        });
        campo?.addEventListener('input', () => {
            if (campo.hasAttribute('aria-invalid')) {
                campo.removeAttribute('aria-invalid');
                mensagem.textContent = '';
            }
        });

        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (enviando || !origem) return;
            const texto = campo?.value.trim();
            if (campo && (texto.length < campo.minLength || texto.length > campo.maxLength)) {
                mensagem.textContent = 'O comentário deve ter entre 2 e 1000 caracteres.';
                campo.setAttribute('aria-invalid', 'true');
                campo.focus();
                return;
            }

            enviando = true;
            dialog.setAttribute('aria-busy', 'true');
            controles.forEach(controle => { controle.disabled = true; });
            confirmar.textContent = campo ? 'Salvando...' : 'Excluindo...';
            mensagem.textContent = campo ? 'Salvando alterações...' : 'Excluindo comentário...';
            dialog.focus({ preventScroll: true });
            try {
                await requisicao(`/api/comentarios/${origem.dataset.id}`, {
                    method: metodo,
                    ...(campo ? { body: JSON.stringify({ texto }) } : {})
                });
                dialog.close();
                window.location.reload();
            } catch (erro) {
                mensagem.textContent = erro instanceof TypeError
                    ? 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.'
                    : erro.message;
            } finally {
                enviando = false;
                dialog.removeAttribute('aria-busy');
                controles.forEach(controle => { controle.disabled = false; });
                confirmar.textContent = rotulo;
                if (dialog.open) (campo || cancelar).focus({ preventScroll: true });
            }
        });
    }

    prepararModalComentario('modalEditarComentario', '.editar-comentario', 'PUT');
    prepararModalComentario('modalExcluirComentario', '.excluir-comentario', 'DELETE');
})();
