(() => {

    const etapaIdentificador =
        document.getElementById(
            'etapa-identificador'
        );


    const etapaLogin =
        document.getElementById(
            'etapa-login'
        );


    const etapaCadastro =
        document.getElementById(
            'etapa-cadastro'
        );


    const identificadorInput =
        document.getElementById(
            'identificador'
        );


    const mensagem =
        document.getElementById(
            'mensagem'
        );


    function mostrar(etapa) {

        [
            etapaIdentificador,
            etapaLogin,
            etapaCadastro
        ].forEach(

            el =>
                el.classList.add(
                    'temp-hidden'
                )

        );


        etapa.classList.remove(
            'temp-hidden'
        );


        mensagem.textContent = '';

    }


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


    document
        .getElementById(
            'verificar'
        )
        .addEventListener(
            'click',
            async () => {

                try {

                    mensagem.textContent =
                        'Verificando...';


                    const dados =
                        await requisicao(
                            '/api/auth/verificar',
                            {

                                method:
                                    'POST',

                                body:
                                    JSON.stringify({

                                        identificador:
                                            identificadorInput.value

                                    })

                            }
                        );


                    mostrar(

                        dados.cadastrado

                            ? etapaLogin

                            : etapaCadastro

                    );

                }

                catch (erro) {

                    mensagem.textContent =
                        erro.message;

                }

            }
        );


    document
        .getElementById(
            'entrar'
        )
        .addEventListener(
            'click',
            async () => {

                try {

                    mensagem.textContent =
                        'Entrando...';


                    await requisicao(
                        '/api/auth/login',
                        {

                            method:
                                'POST',

                            body:
                                JSON.stringify({

                                    identificador:
                                        identificadorInput.value,

                                    senha:
                                        document
                                            .getElementById(
                                                'senha-login'
                                            )
                                            .value

                                })

                        }
                    );


                    window.location.href =
                        '/comunidade';

                }

                catch (erro) {

                    mensagem.textContent =
                        erro.message;

                }

            }
        );


    document
        .getElementById(
            'cadastrar'
        )
        .addEventListener(
            'click',
            async () => {

                try {

                    mensagem.textContent =
                        'Criando conta...';


                    await requisicao(
                        '/api/auth/cadastro',
                        {

                            method:
                                'POST',

                            body:
                                JSON.stringify({

                                    identificador:
                                        identificadorInput.value,

                                    nome:
                                        document
                                            .getElementById(
                                                'nome'
                                            )
                                            .value,

                                    sobrenome:
                                        document
                                            .getElementById(
                                                'sobrenome'
                                            )
                                            .value,

                                    idade:
                                        document
                                            .getElementById(
                                                'idade'
                                            )
                                            .value,

                                    genero:
                                        document
                                            .getElementById(
                                                'genero'
                                            )
                                            .value,

                                    senha:
                                        document
                                            .getElementById(
                                                'senha-cadastro'
                                            )
                                            .value,

                                    colaborador:
                                        document
                                            .getElementById(
                                                'colaborador'
                                            )
                                            .checked

                                })

                        }
                    );


                    window.location.href =
                        '/comunidade';

                }

                catch (erro) {

                    mensagem.textContent =
                        erro.message;

                }

            }
        );


    document
        .querySelectorAll(
            '.voltar'
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    () => {

                        mostrar(
                            etapaIdentificador
                        );

                    }
                );

            }
        );

})();