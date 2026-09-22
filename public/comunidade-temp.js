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
    // LOGOUT
    // =============================

    const logout =
        document.getElementById(
            'logout'
        );


    if (logout) {

        logout.addEventListener(
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
    // CREATE POST
    // =============================

    const formNovoPost =
        document.getElementById(
            'form-novo-post'
        );


    if (formNovoPost) {

        formNovoPost.addEventListener(
            'submit',
            async evento => {

                evento.preventDefault();


                const form =
                    new FormData(
                        formNovoPost
                    );


                try {

                    await requisicao(
                        '/api/posts',
                        {

                            method:
                                'POST',

                            body:
                                JSON.stringify({

                                    titulo:
                                        form.get(
                                            'titulo'
                                        ),

                                    conteudo:
                                        form.get(
                                            'conteudo'
                                        ),

                                    categoria:
                                        form.get(
                                            'categoria'
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
    // UPDATE POST
    // =============================

    document
        .querySelectorAll(
            '.editar-post'
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async () => {

                        const titulo =
                            prompt(

                                'Novo título:',

                                botao.dataset.titulo

                            );


                        if (
                            titulo === null
                        ) {
                            return;
                        }


                        const conteudo =
                            prompt(

                                'Novo conteúdo:',

                                botao.dataset.conteudo

                            );


                        if (
                            conteudo === null
                        ) {
                            return;
                        }


                        try {

                            await requisicao(

                                `/api/posts/${botao.dataset.id}`,

                                {

                                    method:
                                        'PUT',

                                    body:
                                        JSON.stringify({

                                            titulo,

                                            conteudo

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
    // DELETE POST
    // =============================

    document
        .querySelectorAll(
            '.excluir-post'
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async () => {

                        if (
                            !confirm(
                                'Tem certeza de que deseja excluir esta publicação?'
                            )
                        ) {

                            return;

                        }


                        try {

                            await requisicao(

                                `/api/posts/${botao.dataset.id}`,

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


    // =============================
    // CREATE COMENTÁRIO
    // =============================

    document
        .querySelectorAll(
            '.form-comentario'
        )
        .forEach(
            formulario => {

                formulario.addEventListener(
                    'submit',
                    async evento => {

                        evento.preventDefault();


                        const form =
                            new FormData(
                                formulario
                            );


                        try {

                            await requisicao(

                                `/api/posts/${formulario.dataset.postId}/comentarios`,

                                {

                                    method:
                                        'POST',

                                    body:
                                        JSON.stringify({

                                            texto:
                                                form.get(
                                                    'texto'
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
        );


    // =============================
    // UPDATE COMENTÁRIO
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

                        const texto =
                            prompt(

                                'Edite o comentário:',

                                botao.dataset.texto

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
    // DELETE COMENTÁRIO
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