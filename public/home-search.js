(() => {

    const heroSection =
        document.querySelector(
            '.hero-section'
        );


    const searchInput =
        document.getElementById(
            'searchInput'
        );




    const searchBox =
        document.getElementById(
            'searchBox'
        );


    const resultsBox =
        document.getElementById(
            'searchResults'
        );


    const searchToolsRow =
        document.getElementById(
            'searchToolsRow'
        );


    const accessibilityBar =
        document.getElementById(
            'accessibilityBar'
        );


    const searchOptions =
        document.getElementById(
            'searchOptions'
        );


    const contactCards =
        document.getElementById(
            'contactCards'
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


    let modoBuscaAtivo =
        false;


    /*
        guardamos a posiçao original
        dos elementos que serao
        temporariamente movidos para
        dentro da search bar.
    */

    const accessibilityAnchor =
        document.createComment(
            'mexplica-accessibility-anchor'
        );


    const contactAnchor =
        document.createComment(
            'mexplica-contact-anchor'
        );


    if (accessibilityBar) {

        accessibilityBar.before(
            accessibilityAnchor
        );

    }


    if (contactCards) {

        contactCards.before(
            contactAnchor
        );

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


    // =============================
    // ANIMAÇAO DO FIGMA
    // =============================
    function ativarModoBusca() {

        if (
            modoBuscaAtivo
        ) {

            return;

        }


        modoBuscaAtivo =
            true;


        heroSection
            ?.classList
            .add(
                'search-mode'
            );


        if (searchToolsRow) {


            if (accessibilityBar) {

                searchToolsRow
                    .appendChild(
                        accessibilityBar
                    );

            }


            if (searchOptions) {

                searchToolsRow
                    .appendChild(
                        searchOptions
                    );

            }


            if (contactCards) {

                searchToolsRow
                    .appendChild(
                        contactCards
                    );

            }


        }

    }


    function desativarModoBusca() {

        if (
            !modoBuscaAtivo
        ) {

            return;

        }


        modoBuscaAtivo =
            false;


        heroSection
            ?.classList
            .remove(
                'search-mode'
            );


        if (
            accessibilityBar
            &&
            accessibilityAnchor
                .parentNode
        ) {

            accessibilityAnchor.after(
                accessibilityBar
            );

        }


        if (
            contactCards
            &&
            contactAnchor
                .parentNode
        ) {

            contactAnchor.after(
                contactCards
            );

        }

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


    function criarCategoria(
        tutorial
    ) {

        const categoria =
            document.createElement(
                'div'
            );


        categoria.className =
            'mexp-search-category';


        const icone =
            document.createElement(
                'img'
            );


        icone.src =
            tutorial
                .categoria
                .icone;


        icone.alt =
            '';


        icone.setAttribute(
            'aria-hidden',
            'true'
        );


        const nome =
            criarTexto(

                'span',

                'mexp-category',

                tutorial
                    .categoria
                    .nome

            );


        categoria.append(
            icone,
            nome
        );


        return categoria;

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

                    `${dados.quantidade} ${dados.quantidade === 1 ? 'tutorial' : 'tutoriais'} encontrado${dados.quantidade === 1 ? '' : 's'}`

                )

            );


            cabecalho.appendChild(

                criarTexto(

                    'span',

                    '',

                    'Clique em um resultado para abrir o tutorial completo.'

                )

            );

        }

        else {

            cabecalho.appendChild(

                criarTexto(

                    'strong',

                    '',

                    'Ainda não encontramos um tutorial para essa pesquisa.'

                )

            );


            cabecalho.appendChild(

                criarTexto(

                    'span',

                    '',

                    'Tente usar palavras diferentes ou mais curtas. Novos tutoriais são publicados voluntariamente pelos colaboradores.'

                )

            );

        }


        resultsBox.appendChild(
            cabecalho
        );


        dados.resultados.forEach(
            tutorial => {


                const link =
                    document.createElement(
                        'a'
                    );


                link.href =
                    `/tutoriais/${tutorial.slug}`;


                link.className =
                    `mexp-search-result mexp-theme-${tutorial.categoria.classe}`;


                const topo =
                    document.createElement(
                        'div'
                    );


                topo.className =
                    'mexp-search-result-top';


                topo.appendChild(
                    criarCategoria(
                        tutorial
                    )
                );


                const avaliacao =
                    tutorial
                        .avaliacao
                        .quantidade

                        ? `${tutorial.avaliacao.media} ★`

                        : 'sem avaliações';


                topo.appendChild(

                    criarTexto(

                        'span',

                        'mexp-search-result-count',

                        `${avaliacao} · ${tutorial.quantidadeComentarios} comentário${tutorial.quantidadeComentarios === 1 ? '' : 's'}`

                    )

                );


                link.appendChild(
                    topo
                );


                link.appendChild(

                    criarTexto(

                        'h3',

                        '',

                        tutorial.titulo

                    )

                );


                link.appendChild(

                    criarTexto(

                        'p',

                        '',

                        tutorial.resumo

                    )

                );


                resultsBox.appendChild(
                    link
                );

            }
        );

    }


    async function buscar() {

        const termo =
            searchInput
                .value
                .trim();


        ativarModoBusca();


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

                    'Buscando tutoriais...'

                )

            );


        try {

            const dados =
                await requisicao(

                    `/api/tutoriais/buscar?q=${encodeURIComponent(termo)}`

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


    searchInput.addEventListener(
        'focus',
        ativarModoBusca
    );


    searchInput.addEventListener(
        'click',
        ativarModoBusca
    );

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


            if (
                event.key
                === 'Escape'
            ) {

                searchInput.value =
                    '';


                limparResultados();


                desativarModoBusca();


                searchInput.blur();

            }


        }
    );


    searchInput.addEventListener(
        'input',
        () => {


            ativarModoBusca();


            clearTimeout(
                timerBusca
            );


            if (
                searchInput
                    .value
                    .trim()
                    .length < 3
            ) {

                limparResultados();

                return;

            }


            timerBusca =
                setTimeout(
                    buscar,
                    400
                );


        }
    );


    document.addEventListener(
        'click',
        event => {


            if (!heroSection) {

                return;

            }


            /*
                os menus de acessibilidade
                sao anexados temporariamente
                ao body pelo script.js.
            */

            if (
                event.target
                    .closest?.(
                        '#menu-acc, #menu-fonte'
                    )
            ) {

                return;

            }


            if (
                !heroSection
                    .contains(
                        event.target
                    )

                &&

                !searchInput
                    .value
                    .trim()
            ) {

                limparResultados();

                desativarModoBusca();

            }


        }
    );


    carregarSessao();

})();