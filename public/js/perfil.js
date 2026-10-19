(() => {


    async function requisicao(
        url,
        options = {}
    ) {

        const resposta =
            await fetch(
                url,
                {

                    headers: {

                        'Content-Type':
                            'application/json',

                        ...(
                            options.headers
                            || {}
                        )

                    },

                    ...options

                }
            );


        const dados =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(

                dados.erro

                ||

                'Não foi possível concluir a operação.'

            );

        }


        return dados;

    }


    // =========================================================
    // MODAIS
    // =========================================================

    function abrirModal(
        id
    ) {

        const modal =
            document.getElementById(
                id
            );


        if (!modal) {
            return;
        }


        modal.hidden =
            false;


        requestAnimationFrame(
            () => {

                modal.classList.add(
                    'is-open'
                );

            }
        );


        document.body.classList.add(
            'profile-modal-open'
        );

    }


    function fecharModal(
        id
    ) {

        const modal =
            document.getElementById(
                id
            );


        if (!modal) {
            return;
        }


        modal.classList.remove(
            'is-open'
        );


        setTimeout(
            () => {

                modal.hidden =
                    true;

            },
            180
        );


        document.body.classList.remove(
            'profile-modal-open'
        );

    }


    // =========================================================
    // MENUS
    // =========================================================

    function fecharMenus() {

        document
            .querySelectorAll(
                '.profile-action-dropdown'
            )
            .forEach(
                menu => {

                    menu.hidden =
                        true;

                }
            );


        document
            .querySelectorAll(
                '[aria-expanded="true"]'
            )
            .forEach(
                botao => {

                    if (
                        botao.classList.contains(
                            'profile-action-circle'
                        )
                    ) {

                        botao.setAttribute(
                            'aria-expanded',
                            'false'
                        );

                    }

                }
            );

    }


    function alternarMenu(
        botao,
        menu
    ) {

        if (
            !botao
            ||
            !menu
        ) {
            return;
        }


        const abrir =
            menu.hidden;


        fecharMenus();


        menu.hidden =
            !abrir;


        botao.setAttribute(
            'aria-expanded',
            String(abrir)
        );

    }


    // =========================================================
    // COMPARTILHAMENTO
    // =========================================================

    async function compartilhar(
        dados
    ) {

        try {

            if (
                navigator.share
            ) {

                await navigator.share(
                    dados
                );


                return true;

            }


            await navigator
                .clipboard
                .writeText(
                    dados.url
                );


            return true;

        }

        catch (erro) {

            if (
                erro?.name
                === 'AbortError'
            ) {

                return false;

            }


            window.open(
                dados.url,
                '_blank',
                'noopener'
            );


            return false;

        }

    }


    // =========================================================
    // FILTRO DOS POSTS
    // =========================================================

    const filtros =
        document.querySelectorAll(
            '.profile-filter-btn'
        );


    const cards =
        document.querySelectorAll(
            '.profile-post-card'
        );


    filtros.forEach(
        botao => {

            botao.addEventListener(
                'click',
                () => {

                    const filtro =
                        botao
                            .dataset
                            .filter;


                    filtros.forEach(
                        item => {

                            const ativo =
                                item === botao;


                            item.classList.toggle(
                                'is-active',
                                ativo
                            );


                            item.setAttribute(
                                'aria-pressed',
                                String(ativo)
                            );

                        }
                    );


                    cards.forEach(
                        card => {

                            const mostrar =
                                filtro === 'all'

                                ||

                                card.dataset.category
                                === filtro;


                            card.hidden =
                                !mostrar;

                        }
                    );

                }
            );

        }
    );


    // =========================================================
    // ABRIR CARD
    // =========================================================

    cards.forEach(
        card => {


            function abrirCard() {

                const destino =
                    card.dataset.href;


                if (destino) {

                    window.location.href =
                        destino;

                }

            }


            card.addEventListener(
                'click',
                event => {

                    if (
                        event.target.closest(
                            'button'
                        )
                    ) {

                        return;

                    }


                    abrirCard();

                }
            );


            card.addEventListener(
                'keydown',
                event => {

                    if (
                        event.key === 'Enter'

                        ||

                        event.key === ' '
                    ) {

                        event.preventDefault();

                        abrirCard();

                    }

                }
            );


        }
    );


    // =========================================================
    // COMPARTILHAR POST
    // =========================================================

    document

        .querySelectorAll(
            '.profile-post-share'
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async event => {

                        event.stopPropagation();


                        const url =
                            new URL(

                                botao.dataset.url,

                                window.location.origin

                            )
                                .href;


                        await compartilhar({

                            title:
                                botao.dataset.title

                                ||

                                'Tutorial MExplica',

                            text:
                                botao.dataset.summary
                                || '',

                            url

                        });

                    }
                );

            }
        );


    // =========================================================
    // MENU "..."
    // =========================================================

    const moreButton =
        document.getElementById(
            'profileMoreButton'
        );


    const moreMenu =
        document.getElementById(
            'profileMoreMenu'
        );


    const settingsButton =
        document.getElementById(
            'profileSettingsButton'
        );


    const settingsMenu =
        document.getElementById(
            'profileSettingsMenu'
        );


    moreButton?.addEventListener(
        'click',
        event => {

            event.stopPropagation();


            alternarMenu(
                moreButton,
                moreMenu
            );

        }
    );


    settingsButton?.addEventListener(
        'click',
        event => {

            event.stopPropagation();


            alternarMenu(
                settingsButton,
                settingsMenu
            );

        }
    );


    document.addEventListener(
        'click',
        event => {

            if (
                !event.target.closest(
                    '.profile-action-menu-wrap'
                )
            ) {

                fecharMenus();

            }

        }
    );


    // =========================================================
    // COMPARTILHAR PERFIL
    // =========================================================

    const shareProfileButton =
        document.getElementById(
            'shareProfileButton'
        );


    if (
        shareProfileButton
    ) {

        shareProfileButton.addEventListener(
            'click',
            async () => {

                const label =
                    shareProfileButton
                        .querySelector(
                            '.profile-share-label'
                        );


                const sucesso =
                    await compartilhar({

                        title:
                            document.title,

                        text:
                            'Veja este perfil no MExplica.',

                        url:
                            window.location.href

                    });


                if (
                    sucesso
                    &&
                    label
                    &&
                    !navigator.share
                ) {

                    const original =
                        label.textContent;


                    label.textContent =
                        'Link copiado!';


                    setTimeout(
                        () => {

                            label.textContent =
                                original;

                        },
                        1500
                    );

                }

            }
        );

    }


    // =========================================================
    // EDITAR PERFIL
    // =========================================================

    const openEditProfileModal =
        document.getElementById(
            'openEditProfileModal'
        );


    openEditProfileModal?.addEventListener(
        'click',
        () => {

            abrirModal(
                'editProfileModal'
            );

        }
    );


    const formEditar =
        document.getElementById(
            'formEditarPerfil'
        );


    if (formEditar) {

        formEditar.addEventListener(
            'submit',
            async event => {

                event.preventDefault();


                const mensagem =
                    document.getElementById(
                        'editProfileMessage'
                    );


                try {

                    if (mensagem) {

                        mensagem.textContent =
                            'Salvando alterações...';

                    }


                    const bio =
                        document
                            .getElementById(
                                'perfilBio'
                            )
                            .value;


                    const localizacao =
                        document
                            .getElementById(
                                'perfilLocalizacao'
                            )
                            .value;


                    await requisicao(

                        `/api/usuarios/${formEditar.dataset.id}`,

                        {

                            method:
                                'PUT',

                            body:
                                JSON.stringify({

                                    bio,

                                    localizacao

                                })

                        }

                    );


                    window.location.reload();

                }

                catch (erro) {

                    if (mensagem) {

                        mensagem.textContent =
                            erro.message;

                    }

                }

            }
        );

    }


    // =========================================================
    // PLATINA - DISPONIBILIDADE
    // =========================================================

    const toggleDisponibilidade =
        document.getElementById(
            'toggleDisponibilidade'
        );


    if (
        toggleDisponibilidade
    ) {

        toggleDisponibilidade.addEventListener(
            'click',
            async () => {

                const atual =
                    toggleDisponibilidade
                        .dataset
                        .disponivel
                    === 'true';


                try {

                    await requisicao(

                        '/api/usuarios/me/disponibilidade',

                        {

                            method:
                                'PUT',

                            body:
                                JSON.stringify({

                                    disponivel:
                                        !atual

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


    // =========================================================
    // LOGOUT
    // =========================================================

    const logoutButton =
        document.getElementById(
            'logoutButton'
        );


    if (
        logoutButton
    ) {

        logoutButton.addEventListener(
            'click',
            async () => {

                try {

                    await requisicao(

                        '/api/auth/logout',

                        {
                            method:
                                'POST'
                        }

                    );


                    window.location.href =
                        '/';

                }

                catch (erro) {

                    alert(
                        erro.message
                    );

                }

            }
        );

    }


    // =========================================================
    // MODAL EXCLUIR CONTA
    // =========================================================

    const openDeleteModal =
        document.getElementById(
            'openDeleteModal'
        );


    openDeleteModal?.addEventListener(
        'click',
        () => {

            fecharMenus();


            abrirModal(
                'deleteAccountModal'
            );

        }
    );


    const confirmDeleteAccount =
        document.getElementById(
            'confirmDeleteAccount'
        );


    if (
        confirmDeleteAccount
    ) {

        confirmDeleteAccount.addEventListener(
            'click',
            async () => {

                const mensagem =
                    document.getElementById(
                        'deleteAccountMessage'
                    );


                confirmDeleteAccount.disabled =
                    true;


                if (mensagem) {

                    mensagem.textContent =
                        'Excluindo sua conta...';

                }


                try {

                    await requisicao(

                        `/api/usuarios/${confirmDeleteAccount.dataset.id}`,

                        {
                            method:
                                'DELETE'
                        }

                    );


                    window.location.href =
                        '/';

                }

                catch (erro) {

                    confirmDeleteAccount.disabled =
                        false;


                    if (mensagem) {

                        mensagem.textContent =
                            erro.message;

                    }

                }

            }
        );

    }


    // =========================================================
    // FECHAR MODAIS
    // =========================================================

    document

        .querySelectorAll(
            '[data-close-modal]'
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    () => {

                        fecharModal(
                            botao.dataset.closeModal
                        );

                    }
                );

            }
        );


    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key
                !== 'Escape'
            ) {

                return;

            }


            fecharMenus();


            document
                .querySelectorAll(
                    '.profile-modal.is-open'
                )
                .forEach(
                    modal => {

                        fecharModal(
                            modal.id
                        );

                    }
                );

        }
    );


})();