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
    // DELETAR TUTORIAL
    // =============================
    const excluirTutorial =
        document.getElementById(
            'excluirTutorial'
        );


    if (excluirTutorial) {

        excluirTutorial
            .addEventListener(
                'click',
                async () => {

                    const confirmou =
                        confirm(

                            'Excluir este tutorial? Os comentários e avaliações relacionados também serão removidos.'

                        );


                    if (!confirmou) {

                        return;

                    }


                    try {

                        await requisicao(

                            `/api/tutoriais/${excluirTutorial.dataset.id}`,

                            {
                                method:
                                    'DELETE'
                            }

                        );


                        window.location.href =
                            '/comunidade';

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