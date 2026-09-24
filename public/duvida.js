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
    // EDITAR DÚVIDA
    // =============================

    const editarDuvida =
        document.getElementById(
            'editarDuvida'
        );


    if (editarDuvida) {

        editarDuvida.addEventListener(
            'click',
            async () => {

                const tituloAtual =
                    document
                        .getElementById(
                            'duvidaTitulo'
                        )
                        .textContent
                        .trim();


                const conteudoAtual =
                    document
                        .getElementById(
                            'duvidaConteudo'
                        )
                        .textContent
                        .trim();


                const categoriaAtual =
                    editarDuvida
                        .dataset
                        .categoria;


                const titulo =
                    prompt(
                        'Título da dúvida:',
                        tituloAtual
                    );


                if (
                    titulo === null
                ) {

                    return;

                }


                const categoria =
                    prompt(

                        'Categoria: Geral, Segurança, Comunicação, Acessibilidade, Sistemas ou Serviços digitais',

                        categoriaAtual

                    );


                if (
                    categoria === null
                ) {

                    return;

                }


                const conteudo =
                    prompt(
                        'Explique sua dúvida:',
                        conteudoAtual
                    );


                if (
                    conteudo === null
                ) {

                    return;

                }


                try {

                    await requisicao(

                        `/api/duvidas/${editarDuvida.dataset.id}`,

                        {

                            method:
                                'PUT',

                            body:
                                JSON.stringify({

                                    titulo,

                                    categoria,

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


    // =============================
    // EXCLUIR DÚVIDA
    // =============================

    const excluirDuvida =
        document.getElementById(
            'excluirDuvida'
        );


    if (excluirDuvida) {

        excluirDuvida.addEventListener(
            'click',
            async () => {

                if (
                    !confirm(
                        'Excluir esta dúvida e todas as respostas relacionadas?'
                    )
                ) {

                    return;

                }


                try {

                    await requisicao(

                        `/api/duvidas/${excluirDuvida.dataset.id}`,

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


    // =============================
    // CRIAR RESPOSTA
    // =============================

    const formResposta =
        document.getElementById(
            'formResposta'
        );


    if (formResposta) {

        formResposta.addEventListener(
            'submit',
            async event => {

                event.preventDefault();


                const mensagem =
                    document
                        .getElementById(
                            'respostaMensagem'
                        );


                const texto =
                    document
                        .getElementById(
                            'respostaTexto'
                        )
                        .value;


                const midiaTipo =
                    document
                        .getElementById(
                            'midiaTipo'
                        )
                        .value;


                const midiaUrl =
                    document
                        .getElementById(
                            'midiaUrl'
                        )
                        .value
                        .trim();


                const midias =
                    midiaTipo
                    &&
                    midiaUrl

                        ? [

                            {

                                tipo:
                                    midiaTipo,

                                url:
                                    midiaUrl

                            }

                        ]

                        : [];


                try {

                    mensagem.textContent =
                        'Enviando resposta...';


                    await requisicao(

                        `/api/duvidas/${formResposta.dataset.duvidaId}/respostas`,

                        {

                            method:
                                'POST',

                            body:
                                JSON.stringify({

                                    texto,

                                    midias

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
    // EDITAR RESPOSTA
    // =============================

    document
        .querySelectorAll(
            '.editar-resposta'
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async () => {

                        const card =
                            botao.closest(
                                '.mexp-answer-card'
                            );


                        const textoAtual =
                            card
                                .querySelector(
                                    '.mexp-answer-text'
                                )
                                .textContent
                                .trim();


                        const texto =
                            prompt(
                                'Edite sua resposta:',
                                textoAtual
                            );


                        if (
                            texto === null
                        ) {

                            return;

                        }


                        try {

                            await requisicao(

                                `/api/respostas/${botao.dataset.id}`,

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
    // EXCLUIR RESPOSTA
    // =============================

    document
        .querySelectorAll(
            '.excluir-resposta'
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    'click',
                    async () => {

                        if (
                            !confirm(
                                'Excluir esta resposta? As avaliações dela também serão removidas.'
                            )
                        ) {

                            return;

                        }


                        try {

                            await requisicao(

                                `/api/respostas/${botao.dataset.id}`,

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
    // AVALIAÇÕES
    // =============================

    document
        .querySelectorAll(
            '.mexp-rating-box'
        )
        .forEach(
            box => {

                const respostaId =
                    box
                        .dataset
                        .respostaId;


                box
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
                                        box
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

                                                    `/api/respostas/${respostaId}/avaliacoes`,

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


                const remover =
                    box.querySelector(
                        '.remover-avaliacao'
                    );


                if (remover) {

                    remover.addEventListener(
                        'click',
                        async () => {

                            const avaliacaoId =
                                box
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
        );

})();