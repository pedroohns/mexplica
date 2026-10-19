(() => {
    const heroSection =
        document.querySelector('.hero-section');

    const searchInput =
        document.getElementById('searchInput');

    const searchInputWrap =
        document.getElementById('searchInputWrap');

    const searchResults =
        document.getElementById('searchResults');

    const searchToolsLeft =
        document.getElementById('searchToolsLeft');

    const searchToolsRight =
        document.getElementById('searchToolsRight');

    const accessibilityBar =
        document.getElementById('accessibilityBar');

    const searchOptions =
        document.getElementById('searchOptions');

    const contactCards =
        document.getElementById('contactCards');

    const heroLogo =
        document.getElementById('heroLogo');

    const accountButton =
        document.querySelector('.btn-acessar');

    const filterSearchBtn =
        document.getElementById('filterSearchBtn');

    const filterSearchMenu =
        document.getElementById('filterSearchMenu');

    if (
        !heroSection
        || !searchInput
        || !searchResults
    ) {
        return;
    }

    let sessao = null;
    let timerBusca = null;
    let modoBuscaAtivo = false;
    let filtroCategoriaAtual = '';

    const categoriasFiltro = {
        'seguranca-usabilidade': {
            id: 'seguranca-usabilidade',
            nome: 'Segurança e Usabilidade',
            nomeCurto: 'Segurança',
            icone: '/icons/vermelho.png',
            classe: 'red'
        },

        'comunicacao-interacao': {
            id: 'comunicacao-interacao',
            nome: 'Comunicação e Interação',
            nomeCurto: 'Comunicação',
            icone: '/icons/verde.png',
            classe: 'green'
        },

        'sistemas-acessibilidade': {
            id: 'sistemas-acessibilidade',
            nome: 'Sistemas e Acessibilidade',
            nomeCurto: 'Sistemas',
            icone: '/icons/azul.png',
            classe: 'blue'
        }
    };

    const accessibilityAnchor =
        document.createComment(
            'mexplica-accessibility-anchor'
        );

    const contactAnchor =
        document.createComment(
            'mexplica-contact-anchor'
        );

    const heroLogoAnchor =
        document.createComment(
            'mexplica-hero-logo-anchor'
        );

    accessibilityBar?.before(
        accessibilityAnchor
    );

    contactCards?.before(
        contactAnchor
    );

    heroLogo?.before(
        heroLogoAnchor
    );

    const {
        requisicao
    } =
        window.MExplicaApi;


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
                autenticado: false,
                usuario: null
            };
        }

        if (
            accountButton
            && sessao.autenticado
            && sessao.usuario
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

    function ativarModoBusca() {
        if (modoBuscaAtivo) {
            return;
        }

        modoBuscaAtivo = true;

        heroSection
            .classList
            .add('search-mode');

        if (
            heroLogo
            && searchInputWrap
        ) {
            searchInputWrap.insertBefore(
                heroLogo,
                searchInputWrap.firstChild
            );
        }

        if (
            searchOptions
            && searchToolsLeft
        ) {
            searchToolsLeft.appendChild(
                searchOptions
            );
        }

        if (
            contactCards
            && searchToolsRight
        ) {
            searchToolsRight.appendChild(
                contactCards
            );
        }

        if (
            accessibilityBar
            && searchToolsRight
        ) {
            searchToolsRight.appendChild(
                accessibilityBar
            );
        }
    }

    function desativarModoBusca() {
        if (!modoBuscaAtivo) {
            return;
        }

        modoBuscaAtivo = false;

        heroSection
            .classList
            .remove('search-mode');

        if (
            heroLogo
            && heroLogoAnchor.parentNode
        ) {
            heroLogoAnchor.after(
                heroLogo
            );
        }

        if (
            accessibilityBar
            && accessibilityAnchor.parentNode
        ) {
            accessibilityAnchor.after(
                accessibilityBar
            );
        }

        if (
            contactCards
            && contactAnchor.parentNode
        ) {
            contactAnchor.after(
                contactCards
            );
        }
    }

    function obterFiltroAtual() {
        if (!filtroCategoriaAtual) {
            return null;
        }

        return (
            categoriasFiltro[
                filtroCategoriaAtual
            ]
            || null
        );
    }

    function abrirMenuFiltro() {
        if (
            !filterSearchMenu
            || !filterSearchBtn
        ) {
            return;
        }

        filterSearchMenu
            .classList
            .add('is-open');

        filterSearchBtn
            .setAttribute(
                'aria-expanded',
                'true'
            );
    }

    function fecharMenuFiltro() {
        if (
            !filterSearchMenu
            || !filterSearchBtn
        ) {
            return;
        }

        filterSearchMenu
            .classList
            .remove('is-open');

        filterSearchBtn
            .setAttribute(
                'aria-expanded',
                'false'
            );
    }

    function alternarMenuFiltro() {
        if (!filterSearchMenu) {
            return;
        }

        if (
            filterSearchMenu
                .classList
                .contains('is-open')
        ) {
            fecharMenuFiltro();
        }
        else {
            abrirMenuFiltro();
        }
    }

    function atualizarVisualFiltro() {
        if (
            !filterSearchBtn
            || !filterSearchMenu
        ) {
            return;
        }

        filterSearchBtn
            .classList
            .toggle(
                'is-filtered',
                Boolean(
                    filtroCategoriaAtual
                )
            );

        filterSearchMenu
            .querySelectorAll(
                '.search-filter-option'
            )
            .forEach(opcao => {
                opcao
                    .classList
                    .toggle(
                        'is-selected',
                        opcao.dataset.category
                            === filtroCategoriaAtual
                    );
            });
    }

    function selecionarFiltro(
        categoriaId
    ) {
        filtroCategoriaAtual =
            categoriaId || '';

        atualizarVisualFiltro();
        fecharMenuFiltro();

        if (
            searchInput
                .value
                .trim()
                .length >= 2
        ) {
            buscar();
        }
    }

    function limparResultados() {
        searchResults
            .replaceChildren();

        searchResults
            .classList
            .add('hidden');

        delete searchResults
            .dataset
            .theme;
    }

    const renderer =
        window
            .MExplicaSearchRender
            .criarRenderer({
                searchResults,
                obterFiltroAtual
            });

    async function buscar() {
        const termo =
            searchInput
                .value
                .trim();

        ativarModoBusca();

        if (termo.length < 2) {
            limparResultados();
            return;
        }

        searchResults
            .classList
            .remove('hidden');

        searchResults
            .replaceChildren(
                renderer
                    .criarTexto(
                        'p',
                        'mexp-search-loading',
                        'Buscando tutoriais...'
                    )
            );

        try {
            const parametros =
                new URLSearchParams();

            parametros.set(
                'q',
                termo
            );

            if (filtroCategoriaAtual) {
                parametros.set(
                    'categoria',
                    filtroCategoriaAtual
                );
            }

            const dados =
                await requisicao(
                    `/api/tutoriais/buscar?${parametros.toString()}`
                );

            renderer
                .renderizarResultados(
                    dados
                );
        }
        catch (erro) {
            searchResults
                .replaceChildren(
                    renderer
                        .criarTexto(
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
            if (event.key === 'Enter') {
                event.preventDefault();
                buscar();
            }

            if (event.key === 'Escape') {
                searchInput.value = '';

                clearTimeout(
                    timerBusca
                );

                limparResultados();
                desativarModoBusca();
                fecharMenuFiltro();
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
                    350
                );
        }
    );

    if (
        filterSearchBtn
        && filterSearchMenu
    ) {
        filterSearchBtn.addEventListener(
            'click',
            event => {
                event.stopPropagation();
                alternarMenuFiltro();
            }
        );

        filterSearchMenu
            .querySelectorAll(
                '.search-filter-option'
            )
            .forEach(opcao => {
                opcao.addEventListener(
                    'click',
                    event => {
                        event.stopPropagation();

                        selecionarFiltro(
                            opcao.dataset.category
                        );
                    }
                );
            });
    }

    document.addEventListener(
        'click',
        event => {
            if (
                !event.target.closest(
                    '.search-filter-wrap'
                )
            ) {
                fecharMenuFiltro();
            }

            if (
                event.target.closest?.(
                    '#menu-acc, #menu-fonte'
                )
            ) {
                return;
            }

            if (
                !heroSection.contains(
                    event.target
                )
                && !searchInput.value.trim()
            ) {
                limparResultados();
                desativarModoBusca();
            }
        }
    );

    carregarSessao();
})();
