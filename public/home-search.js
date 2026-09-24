(() => {

    const searchInput =
        document.getElementById(
            'searchInput'
        );


    const searchButton =
        document.getElementById(
            'searchSubmitBtn'
        );


    const resultsBox =
        document.getElementById(
            'searchResults'
        );


    const questionBox =
        document.getElementById(
            'questionFormBox'
        );


    const questionForm =
        document.getElementById(
            'questionForm'
        );


    const questionTitle =
        document.getElementById(
            'questionTitle'
        );


    const questionCategory =
        document.getElementById(
            'questionCategory'
        );


    const questionContent =
        document.getElementById(
            'questionContent'
        );


    const questionMessage =
        document.getElementById(
            'questionMessage'
        );


    const closeQuestionForm =
        document.getElementById(
            'closeQuestionForm'
        );


    const accountButton =
        document.querySelector(
            '.btn-acessar'
        );


    if (
        !searchInput
        ||
        !resultsBox
    ) {

        return;

    }


    let sessao =
        null;


    let timerBusca =
        null;


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


    async function carregarSessao() {

        if (sessao) {

            return sessao;

        }


        try {

            sessao =
                await requisicao(
                    '/api/auth/sessao'
                );

        }

        catch {

            sessao = {

                autenticado:
                    false,

                usuario:
                    null

            };

        }


        // Troca "acessar conta"
        // pelo nome do usuário.
        if (
            accountButton
            &&
            sessao.autenticado
            &&
            sessao.usuario
        ) {

            accountButton.textContent =
                sessao.usuario.nome;


            accountButton.href =
                `/perfil/${sessao.usuario.slug}`;


            accountButton.setAttribute(

                'aria-label',

                `Abrir perfil de ${sessao.usuario.nome}`

            );

        }


        return sessao;

    }


    function limparResultados() {

        resultsBox
            .replaceChildren();


        resultsBox
            .classList
            .add(
                'hidden'
            );

    }


    function criarTexto(
        tag,
        classe,
        texto
    ) {

        const elemento =
            document.createElement(
                tag
            );


        if (classe) {

            elemento.className =
                classe;

        }


        elemento.textContent =
            texto;


        return elemento;

    }


    function criarBotaoPerguntar() {

        const bloco =
            document.createElement(
                'div'
            );


        bloco.className =
            'mexp-search-ask';


        const textos =
            document.createElement(
                'div'
            );


        textos.appendChild(

            criarTexto(

                'strong',

                '',

                'Não encontrou a resposta que precisava?'

            )

        );


        textos.appendChild(

            criarTexto(

                'p',

                '',

                'Envie sua dúvida para que um colaborador da plataforma possa responder.'

            )

        );


        const botao =
            document.createElement(
                'button'
            );


        botao.type =
            'button';


        botao.className =
            'mexp-primary-button';


        botao.textContent =
            'Deixar minha dúvida';


        botao.addEventListener(
            'click',
            abrirFormularioPergunta
        );


        bloco.append(
            textos,
            botao
        );


        return bloco;

    }


    function renderizarResultados(
        dados
    ) {

        resultsBox
            .replaceChildren();


        resultsBox
            .classList
            .remove(
                'hidden'
            );


        const cabecalho =
            document.createElement(
                'div'
            );


        cabecalho.className =
            'mexp-search-results-head';


        if (
            dados.quantidade > 0
        ) {

            cabecalho.appendChild(

                criarTexto(

                    'strong',

                    '',

                    `${dados.quantidade} resultado${dados.quantidade === 1 ? '' : 's'} encontrado${dados.quantidade === 1 ? '' : 's'}`

                )

            );


            cabecalho.appendChild(

                criarTexto(

                    'span',

                    '',

                    'Clique em uma dúvida para ver as respostas.'

                )

            );

        }

        else {

            cabecalho.appendChild(

                criarTexto(

                    'strong',

                    '',

                    'Ainda não encontramos uma resposta para essa pesquisa.'

                )

            );


            cabecalho.appendChild(

                criarTexto(

                    'span',

                    '',

                    'Você pode enviar sua dúvida para os colaboradores.'

                )

            );

        }


        resultsBox.appendChild(
            cabecalho
        );


        dados.resultados.forEach(
            duvida => {

                const link =
                    document.createElement(
                        'a'
                    );


                link.href =
                    `/duvidas/${duvida.slug}`;


                link.className =
                    'mexp-search-result';


                const topo =
                    document.createElement(
                        'div'
                    );


                topo.className =
                    'mexp-search-result-top';


                topo.appendChild(

                    criarTexto(

                        'span',

                        'mexp-category',

                        duvida.categoria

                    )

                );


                topo.appendChild(

                    criarTexto(

                        'span',

                        'mexp-search-result-count',

                        `${duvida.quantidadeRespostas} resposta${duvida.quantidadeRespostas === 1 ? '' : 's'}`

                    )

                );


                link.appendChild(
                    topo
                );


                link.appendChild(

                    criarTexto(
                        'h3',
                        '',
                        duvida.titulo
                    )

                );


                link.appendChild(

                    criarTexto(

                        'p',

                        '',

                        duvida.conteudo.length > 170

                            ? `${duvida.conteudo.slice(0, 167)}...`

                            : duvida.conteudo

                    )

                );


                resultsBox.appendChild(
                    link
                );

            }
        );


        resultsBox.appendChild(
            criarBotaoPerguntar()
        );

    }


    async function buscar() {

        const termo =
            searchInput.value
                .trim();


        if (
            termo.length < 2
        ) {

            limparResultados();

            return;

        }


        resultsBox
            .classList
            .remove(
                'hidden'
            );


        resultsBox
            .replaceChildren(

                criarTexto(

                    'p',

                    'mexp-search-loading',

                    'Buscando respostas...'

                )

            );


        try {

            const dados =
                await requisicao(

                    `/api/duvidas/buscar?q=${encodeURIComponent(termo)}`

                );


            renderizarResultados(
                dados
            );

        }

        catch (erro) {

            resultsBox
                .replaceChildren(

                    criarTexto(

                        'p',

                        'mexp-form-message',

                        erro.message

                    )

                );

        }

    }


    async function abrirFormularioPergunta() {

        const estado =
            await carregarSessao();


        // DESLOGADO
        if (
            !estado.autenticado
        ) {

            const retorno =
                encodeURIComponent(
                    '/?perguntar=1'
                );


            window.location.href =
                `/cadastro.html?redirect=${retorno}`;


            return;

        }


        if (
            questionTitle
            &&
            !questionTitle.value
                .trim()
        ) {

            questionTitle.value =
                searchInput.value
                    .trim();

        }


        questionBox
            .classList
            .remove(
                'hidden'
            );


        questionBox
            .scrollIntoView({

                behavior:
                    'smooth',

                block:
                    'center'

            });


        questionTitle
            ?.focus();

    }


    // BOTÃO BUSCAR
    if (searchButton) {

        searchButton.addEventListener(
            'click',
            buscar
        );

    }


    // ENTER
    searchInput.addEventListener(
        'keydown',
        event => {

            if (
                event.key
                === 'Enter'
            ) {

                event.preventDefault();

                buscar();

            }

        }
    );


    // BUSCA AUTOMÁTICA
    searchInput.addEventListener(
        'input',
        () => {

            clearTimeout(
                timerBusca
            );


            if (
                searchInput.value
                    .trim()
                    .length < 3
            ) {

                limparResultados();

                return;

            }


            timerBusca =
                setTimeout(
                    buscar,
                    450
                );

        }
    );


    // FECHAR FORM
    if (closeQuestionForm) {

        closeQuestionForm
            .addEventListener(
                'click',
                () => {

                    questionBox
                        .classList
                        .add(
                            'hidden'
                        );

                }
            );

    }


    // ENVIAR DÚVIDA
    if (questionForm) {

        questionForm
            .addEventListener(
                'submit',
                async event => {

                    event.preventDefault();


                    try {

                        questionMessage
                            .textContent =
                            'Enviando sua dúvida...';


                        const dados =
                            await requisicao(

                                '/api/duvidas',

                                {

                                    method:
                                        'POST',

                                    body:
                                        JSON.stringify({

                                            titulo:
                                                questionTitle.value,

                                            categoria:
                                                questionCategory.value,

                                            conteudo:
                                                questionContent.value

                                        })

                                }

                            );


                        window.location.href =
                            `/duvidas/${dados.duvida.slug}`;

                    }

                    catch (erro) {

                        questionMessage
                            .textContent =
                            erro.message;

                    }

                }
            );

    }


    // =============================
    // INICIALIZAÇÃO
    // =============================

    carregarSessao()
        .then(
            () => {

                const parametros =
                    new URLSearchParams(
                        window.location.search
                    );


                // Veio do login depois
                // de tentar fazer pergunta.
                if (
                    parametros.get(
                        'perguntar'
                    )
                    === '1'
                ) {

                    abrirFormularioPergunta();


                    parametros.delete(
                        'perguntar'
                    );


                    const novaQuery =
                        parametros.toString();


                    const novaUrl =
                        `${window.location.pathname}${novaQuery ? `?${novaQuery}` : ''}`;


                    window.history
                        .replaceState(
                            {},
                            '',
                            novaUrl
                        );

                }

            }
        );

})();