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


    // =============================
    // EDITAR PERFIL
    // =============================

    const formEditar =
        document.getElementById(
            'formEditarPerfil'
        );


    if (formEditar) {

        formEditar.addEventListener(
            'submit',
            async event => {

                event.preventDefault();


                try {

                    const bio =
                        document
                            .getElementById(
                                'perfilBio'
                            )
                            .value;


                    await requisicao(

                        `/api/usuarios/${formEditar.dataset.id}`,

                        {

                            method:
                                'PUT',

                            body:
                                JSON.stringify({
                                    bio
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


    // =============================
    // PLATINA DISPONÍVEL
    // =============================

    const toggleDisponibilidade =
        document.getElementById(
            'toggleDisponibilidade'
        );


    if (toggleDisponibilidade) {

        toggleDisponibilidade
            .addEventListener(
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


    // =============================
    // LOGOUT
    // =============================

    const logoutButton =
        document.getElementById(
            'logoutButton'
        );


    if (logoutButton) {

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


    // =============================
    // EXCLUIR CONTA
    // =============================

    const excluirConta =
        document.getElementById(
            'excluirConta'
        );


    if (excluirConta) {

        excluirConta.addEventListener(
            'click',
            async () => {

                const confirmou =
                    confirm(

                        'Tem certeza de que deseja excluir sua conta? Seus tutoriais, comentários e avaliações relacionadas também poderão ser removidos.'

                    );


                if (!confirmou) {
                    return;
                }


                try {

                    await requisicao(

                        `/api/usuarios/${excluirConta.dataset.id}`,

                        {
                            method:
                                'DELETE'
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

})();