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
    // ATUALIZAR COMENTARIO
    // =============================
    document

        .querySelectorAll(
            '.editar-comentario'
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async () => {

                        const card =
                            botao.closest(
                                '.mexp-comment-card'
                            );


                        const textoAtual =
                            card
                                .querySelector(
                                    '.mexp-comment-text'
                                )
                                .textContent
                                .trim();


                        const texto =
                            prompt(

                                'Edite seu comentário:',

                                textoAtual

                            );


                        if (
                            texto === null
                        ) {

                            return;

                        }


                        try {

                            await requisicao(

                                `/api/comentarios/${botao.dataset.id}`,

                                {

                                    method:
                                        'PUT',

                                    body:
                                        JSON.stringify({
                                            texto
                                        })

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
        );


    // =============================
    // DELETAR COMENTARIO
    // =============================
    document

        .querySelectorAll(
            '.excluir-comentario'
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async () => {

                        if (
                            !confirm(
                                'Excluir este comentário?'
                            )
                        ) {

                            return;

                        }


                        try {

                            await requisicao(

                                `/api/comentarios/${botao.dataset.id}`,

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
        );

})();
