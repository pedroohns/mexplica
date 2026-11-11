(() => {
    function criarRenderer({
        searchResults,
        obterFiltroAtual
    }) {
        function criarTexto(tag, classe, texto) {
            const elemento = document.createElement(tag);

            if (classe) {
                elemento.className = classe;
            }

            elemento.textContent = texto;
            return elemento;
        }

        function obterIniciais(autor) {
            const nomeCompleto =
                `${autor?.nome || ''} ${autor?.sobrenome || ''}`.trim();

            return nomeCompleto
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(parte => parte[0]?.toUpperCase() || '')
                .join('') || 'MX';
        }

        function criarEstrelas(media) {
            const estrelas = document.createElement('div');
            estrelas.className = 'mexp-search-card-stars';

            const nota = Number(media) || 0;
            const preenchidas = Math.round(nota);

            for (let i = 1; i <= 5; i += 1) {
                const estrela = document.createElement('span');
                estrela.textContent = '★';

                if (i <= preenchidas) {
                    estrela.classList.add('is-filled');
                }

                estrelas.appendChild(estrela);
            }

            return estrelas;
        }

        function criarLinhaCategoria(categoria) {
            const linha = document.createElement('span');
            linha.className = 'mexp-search-category-line';

            const icone = document.createElement('img');
            icone.src = categoria.icone;
            icone.alt = '';
            icone.setAttribute('aria-hidden', 'true');

            const texto = document.createElement('strong');
            texto.textContent = categoria.nome.toLowerCase();

            linha.append(icone, texto);
            return linha;
        }

        function criarCategoriaPill(tutorial) {
            const pill = document.createElement('div');
            pill.className =
                `mexp-search-card-category mexp-theme-${tutorial.categoria.classe}`;

            const icone = document.createElement('img');
            icone.src = tutorial.categoria.icone;
            icone.alt = '';
            icone.setAttribute('aria-hidden', 'true');

            const texto = criarTexto(
                'span',
                '',
                tutorial.categoria.nome.toUpperCase()
            );

            pill.append(icone, texto);
            return pill;
        }

        function criarAcaoContador(icone, valor) {
            const item = document.createElement('div');
            item.className = 'mexp-search-card-action';

            const simbolo = document.createElement('span');
            simbolo.className = 'mexp-search-card-action-icon';
            simbolo.textContent = icone;

            const texto = document.createElement('span');
            texto.textContent = String(valor);

            item.append(simbolo, texto);
            return item;
        }

        function criarBotaoCompartilhar(tutorial) {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'mexp-search-card-share';
            botao.setAttribute(
                'aria-label',
                `Compartilhar tutorial ${tutorial.titulo}`
            );
            botao.innerHTML = '<span aria-hidden="true">⤴</span>';

            botao.addEventListener('click', async event => {
                event.stopPropagation();

                const link =
                    `${window.location.origin}/tutoriais/${tutorial.slug}`;

                try {
                    if (navigator.share) {
                        await navigator.share({
                            title: tutorial.titulo,
                            text: tutorial.resumo,
                            url: link
                        });

                        return;
                    }

                    await navigator.clipboard.writeText(link);

                    botao.classList.add('is-copied');
                    botao.setAttribute(
                        'aria-label',
                        'Link copiado com sucesso'
                    );

                    setTimeout(() => {
                        botao.classList.remove('is-copied');
                        botao.setAttribute(
                            'aria-label',
                            `Compartilhar tutorial ${tutorial.titulo}`
                        );
                    }, 1500);
                }
                catch {
                    window.open(
                        link,
                        '_blank',
                        'noopener'
                    );
                }
            });

            return botao;
        }

        function criarCardResultado(tutorial) {
            const card = document.createElement('article');
            card.className =
                `mexp-search-card mexp-theme-${tutorial.categoria.classe}`;

            card.addEventListener('click', event => {
                if (event.target.closest('button')) {
                    return;
                }

                window.location.href =
                    `/tutoriais/${tutorial.slug}`;
            });

            card.appendChild(
                criarCategoriaPill(tutorial)
            );

            card.appendChild(
                criarTexto(
                    'h3',
                    'mexp-search-card-title',
                    tutorial.titulo
                )
            );

            card.appendChild(
                criarTexto(
                    'p',
                    'mexp-search-card-summary',
                    tutorial.resumo
                )
            );

            const rodape = document.createElement('div');
            rodape.className = 'mexp-search-card-footer';

            const autorInfo = document.createElement('div');
            autorInfo.className = 'mexp-search-card-author';

            const avatar = criarTexto(
                'div',
                'mexp-search-card-avatar',
                obterIniciais(tutorial.autor)
            );

            const autorMeta = document.createElement('div');
            autorMeta.className = 'mexp-search-card-author-meta';

            autorMeta.appendChild(
                criarTexto(
                    'strong',
                    '',
                    tutorial.autor.nomeCompleto
                    || `${tutorial.autor.nome} ${tutorial.autor.sobrenome}`.trim()
                )
            );

            autorMeta.appendChild(
                criarEstrelas(tutorial.avaliacao.media)
            );

            autorInfo.append(
                avatar,
                autorMeta
            );

            const acoes = document.createElement('div');
            acoes.className = 'mexp-search-card-actions';

            acoes.appendChild(
                criarAcaoContador(
                    '♡',
                    tutorial.avaliacao.quantidade || 0
                )
            );

            acoes.appendChild(
                criarAcaoContador(
                    '💬',
                    tutorial.quantidadeComentarios || 0
                )
            );

            acoes.appendChild(
                criarBotaoCompartilhar(tutorial)
            );

            rodape.append(
                autorInfo,
                acoes
            );

            card.appendChild(rodape);
            return card;
        }

        function criarCabecalhoResultados(dados) {
            const cabecalho = document.createElement('div');
            cabecalho.className = 'mexp-search-results-head';

            const filtroAtual = obterFiltroAtual();

            searchResults.dataset.theme =
                filtroAtual
                    ? filtroAtual.classe
                    : 'mixed';

            const titulo = document.createElement('h2');
            titulo.className = 'mexp-search-results-title';

            if (dados.quantidade > 0) {
                const quantidade = document.createElement('span');
                quantidade.className = 'mexp-results-count';
                quantidade.textContent =
                    `${dados.quantidade} resultado${dados.quantidade === 1 ? '' : 's'}`;

                titulo.append(
                    quantidade,
                    document.createTextNode(
                        ' encontrados para sua busca'
                    )
                );
            }
            else {
                titulo.textContent =
                    'Nenhum resultado encontrado para sua busca';
            }

            cabecalho.appendChild(titulo);

            if (filtroAtual) {
                const subtitulo = document.createElement('p');
                subtitulo.className = 'mexp-search-results-subtitle';

                subtitulo.append(
                    'Seus resultados estão identificados como: '
                );

                subtitulo.appendChild(
                    criarLinhaCategoria(filtroAtual)
                );

                subtitulo.append('.');
                cabecalho.appendChild(subtitulo);
            }
            else if (dados.quantidade > 0) {
                cabecalho.appendChild(
                    criarTexto(
                        'p',
                        'mexp-search-results-subtitle',
                        'Encontramos tutoriais em diferentes categorias para ajudar na sua pesquisa.'
                    )
                );
            }
            else {
                cabecalho.appendChild(
                    criarTexto(
                        'p',
                        'mexp-search-results-subtitle',
                        'Tente pesquisar com palavras mais curtas, mais simples ou com outro termo relacionado.'
                    )
                );
            }

            return cabecalho;
        }

        function renderizarResultados(dados) {
            searchResults.replaceChildren();
            searchResults.classList.remove('hidden');

            searchResults.appendChild(
                criarCabecalhoResultados(dados)
            );

            if (dados.quantidade === 0) {
                const vazio = document.createElement('div');
                vazio.className = 'mexp-search-empty';
                vazio.innerHTML = `
                    <strong>
                        Ainda não encontramos um tutorial para esse termo.
                    </strong>

                    <p>
                        Tente pesquisar com outras palavras enquanto novos tutoriais são publicados pelos colaboradores.
                    </p>
                `;

                searchResults.appendChild(vazio);
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'mexp-search-results-grid';

            dados.resultados.forEach(tutorial => {
                grid.appendChild(
                    criarCardResultado(tutorial)
                );
            });

            searchResults.appendChild(grid);
        }

        return {
            criarTexto,
            renderizarResultados
        };
    }

    window.MExplicaSearchRender = {
        criarRenderer
    };
})();
