(() => {

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


    window.MExplicaPerfilUI = {

        abrirModal,

        fecharModal,

        fecharMenus,

        alternarMenu,

        compartilhar

    };

})();
