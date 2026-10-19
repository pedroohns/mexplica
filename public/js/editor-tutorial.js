(() => {

    const form =
        document.getElementById(
            'formTutorial'
        );


    if (!form) {

        return;

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


    function linhas(
        valor
    ) {

        return String(
            valor || ''
        )

            .split(
                /\r?\n/
            )

            .map(
                item =>
                    item.trim()
            )

            .filter(
                Boolean
            );

    }


    form.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            const mensagem =
                document.getElementById(
                    'tutorialMensagem'
                );


            const modo =
                form.dataset.modo;


            const id =
                form.dataset.id;


            const passos =
                linhas(

                    document
                        .getElementById(
                            'tutorialPassos'
                        )
                        .value

                )

                .map(
                    (
                        descricao,
                        index
                    ) => ({

                        titulo:
                            `Passo ${index + 1}`,

                        descricao

                    })
                );


            const imagens =
                linhas(

                    document
                        .getElementById(
                            'tutorialImagens'
                        )
                        .value

                )

                .map(
                    (
                        url,
                        index
                    ) => ({

                        url,

                        alt:
                            `Imagem de apoio ${index + 1}`,

                        legenda:
                            `Passo visual ${index + 1}`

                    })
                );


            const tags =
                String(

                    document
                        .getElementById(
                            'tutorialTags'
                        )
                        .value

                    || ''

                )

                .split(',')

                .map(
                    tag =>
                        tag.trim()
                )

                .filter(
                    Boolean
                );


            const payload = {

                titulo:
                    document
                        .getElementById(
                            'tutorialTitulo'
                        )
                        .value,

                categoriaId:
                    document
                        .getElementById(
                            'tutorialCategoria'
                        )
                        .value,

                resumo:
                    document
                        .getElementById(
                            'tutorialResumo'
                        )
                        .value,

                conteudo:
                    document
                        .getElementById(
                            'tutorialConteudo'
                        )
                        .value,

                passos,

                imagens,

                videoUrl:
                    document
                        .getElementById(
                            'tutorialVideo'
                        )
                        .value,

                tags

            };


            try {

                mensagem.textContent =
                    modo === 'criar'

                        ? 'Publicando tutorial...'

                        : 'Salvando alterações...';


                const dados =
                    await requisicao(

                        modo === 'criar'

                            ? '/api/tutoriais'

                            : `/api/tutoriais/${id}`,

                        {

                            method:
                                modo === 'criar'
                                    ? 'POST'
                                    : 'PUT',

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }

                    );


                window.location.href =
                    `/tutoriais/${dados.tutorial.slug}`;

            }

            catch (erro) {

                mensagem.textContent =
                    erro.message;

            }

        }
    );

})();