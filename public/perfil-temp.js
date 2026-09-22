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
    // UPDATE PERFIL
    // =============================

    const formEditar =
        document.getElementById(
            'form-editar-perfil'
        );


    if (formEditar) {

        formEditar.addEventListener(
            'submit',
            async evento => {

                evento.preventDefault();


                const form =
                    new FormData(
                        formEditar
                    );


                try {

                    await requisicao(

                        `/api/usuarios/${formEditar.dataset.id}`,

                        {

                            method:
                                'PUT',

                            body:
                                JSON.stringify({

                                    bio:
                                        form.get(
                                            'bio'
                                        )

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
    // DELETE USUÁRIO
    // =============================

    const excluirConta =
        document.getElementById(
            'excluir-conta'
        );


    if (excluirConta) {

        excluirConta.addEventListener(
            'click',
            async () => {

                if (
                    !confirm(
                        'Tem certeza? Sua conta e suas publicações temporárias serão removidas.'
                    )
                ) {

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