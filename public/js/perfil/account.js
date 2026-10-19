(() => {

    const {
        requisicao
    } =
        window.MExplicaApi;


    const {
        abrirModal,
        fecharMenus
    } =
        window.MExplicaPerfilUI;


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

})();
