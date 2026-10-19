document.addEventListener('DOMContentLoaded', () => {

    // GREETING
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        const hour = new Date().getHours();
        let greeting = 'Boa noite! Qual seria sua dúvida de hoje?';
        if (hour >= 5 && hour < 12) greeting = 'Bom dia! Qual seria sua dúvida de hoje?';
        else if (hour >= 12 && hour < 18) greeting = 'Boa tarde! Qual seria sua dúvida de hoje?';
        greetingEl.textContent = greeting;
    }

    // TOGGLE DA NAV MOBILE
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('open');
            }
        });
    }

    // referencias dos dois menus para fechar um quando o outro abre (coloquei isso apenas para evitar um bug que tava acontecendo quando vc deixava os dois menus abertos e trocava entre modo claro/escuro, DA PRA RESOLVER ESSE PROBLEMA, mas como é uma parada basica, entao optei pela soluçao mais preguiçosa)
    let menuFonteEl = null;
    let menuAccEl = null;

    function fecharTodosMenus() {
        if (menuFonteEl) menuFonteEl.style.display = 'none';
        if (menuAccEl) menuAccEl.style.display = 'none';
    }

    // ================================================
    // TROCA DE IMAGENS DE PRINT - claro/escuro
    // mapa fixo com os nomes exatos de cada par claro/escuro
    // ================================================
    const mapaImagensPrint = {
        'icons/print-1-novo.png': 'icons/print-1-dark-novo.png',
        'icons/print-2.png': 'icons/print-2-dark.png',
        'icons/print-3-novo.png': 'icons/print-3-dark-novo.png',
        'icons/print-4.png': 'icons/print-4-dark.png',
    };

    const mapaInverso = {};
    Object.entries(mapaImagensPrint).forEach(([claro, escuro]) => {
        mapaInverso[escuro] = claro;
    });

    function atualizarImagensPrint() {
        const isDark = document.body.classList.contains('dark-blue');

        document.querySelectorAll('.step-print img').forEach(img => {
            const src = img.getAttribute('src');
            if (!src) return;

            if (isDark) {
                const escuro = mapaImagensPrint[src];
                if (escuro) img.setAttribute('src', escuro);
            } else {
                const claro = mapaInverso[src];
                if (claro) img.setAttribute('src', claro);
            }
        });
    }

    // ================================================
    // MODO CONFORTO OCULAR - logica central (night-shift)
    // aplica/remove um filtro quente no <html> inteiro,
    // funcionando tanto no modo claro quanto no escuro
    // ================================================
    function aplicarConfortoOcular(ativo) {
        if (ativo) {
            document.documentElement.style.filter =
                'sepia(0.25) saturate(0.9) brightness(0.97)';
        } else {
            document.documentElement.style.filter = '';
        }
    }

    // ================================================
    // BOTAO AUMENTAR TEXTO - dropdown com slider arrastavel
    // ================================================
    const fontBtn = document.getElementById('toggleFontSize');
    if (fontBtn) {

        // tamanhos de cada nivel
        const niveis = [
            { label: 'PEQUENO', fontSize: '11px', lineHeight: '1.45', letterSpacing: '-0.1em', wordSpacing: '-0.1em' },
            { label: 'MÉDIO', fontSize: '16px', lineHeight: '1.6', letterSpacing: '', wordSpacing: '' },
            { label: 'GRANDE', fontSize: '22px', lineHeight: '1.95', letterSpacing: '0.02em', wordSpacing: '0.1em' }
        ];

        let nivelAtual = 1;

        const iconeAa = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><text x="1" y="18" font-size="16" fill="#ffffff" font-family="sans-serif" font-weight="900">Aa</text></svg>`;
        const setaAbaixo = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        // container do menu
        const menuFonte = document.createElement('div');
        menuFonte.id = 'menu-fonte';
        menuFonteEl = menuFonte;
        menuFonte.style.cssText = `
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 280px;
            border-radius: 14px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.13);
            z-index: 200;
            padding: 20px 20px 16px;
            background: #ffffff;
            border: 1.5px solid #e8e8e8;
            box-sizing: border-box;
        `;

        // linha Aa com tamanhos crescentes
        const linhaAa = document.createElement('div');
        linhaAa.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 14px;
            padding: 0 2px;
        `;

        const tamanhoAa = ['13px', '19px', '26px'];
        niveis.forEach((_, i) => {
            const aa = document.createElement('span');
            aa.dataset.aa = i;
            aa.textContent = 'Aa';
            aa.style.cssText = `
                font-family: 'Inter', sans-serif;
                font-size: ${tamanhoAa[i]};
                font-weight: 700;
                color: ${i === nivelAtual ? '#7B6EF6' : '#bbbbbb'};
                line-height: 1;
                cursor: pointer;
                transition: color 0.18s;
                user-select: none;
            `;
            aa.addEventListener('click', () => aplicarNivel(i));
            linhaAa.appendChild(aa);
        });

        // slider nativo - arrastavel por padrao, estilizado via CSS inline + pseudo-elements no style.css
        const sliderWrap = document.createElement('div');
        sliderWrap.style.cssText = `
            position: relative;
            margin-bottom: 8px;
        `;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '2';
        slider.step = '1';
        slider.value = nivelAtual;
        slider.id = 'fonte-slider';
        slider.style.cssText = `
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 999px;
            background: linear-gradient(to right, #7B6EF6 50%, #e0e0e0 50%);
            outline: none;
            cursor: pointer;
            margin: 0;
            display: block;
        `;

        // thumb do slider via style injetado (nao da pra fazer só com inline, tentei antes de criar o style e nao rolou, provavelmente por serem pseudo-elementos)
        const sliderStyle = document.createElement('style');
        sliderStyle.textContent = `
            #fonte-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #7B6EF6;
                cursor: grab;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(123,110,246,0.4);
                transition: transform 0.15s;
            }
            #fonte-slider::-webkit-slider-thumb:active {
                cursor: grabbing;
                transform: scale(1.2);
            }
            #fonte-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #7B6EF6;
                cursor: grab;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(123,110,246,0.4);
            }
        `;
        document.head.appendChild(sliderStyle);

        slider.addEventListener('input', () => {
            aplicarNivel(parseInt(slider.value));
        });

        sliderWrap.appendChild(slider);

        // labels PEQUENO / MEDIO / GRANDE
        const labelsWrap = document.createElement('div');
        labelsWrap.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 0 2px;
        `;

        niveis.forEach((nivel, i) => {
            const lbl = document.createElement('span');
            lbl.dataset.label = i;
            lbl.textContent = nivel.label;
            lbl.style.cssText = `
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.05em;
                color: ${i === nivelAtual ? '#7B6EF6' : '#bbbbbb'};
                cursor: pointer;
                transition: color 0.18s;
                user-select: none;
            `;
            lbl.addEventListener('click', () => aplicarNivel(i));
            labelsWrap.appendChild(lbl);
        });

        menuFonte.appendChild(linhaAa);
        menuFonte.appendChild(sliderWrap);
        menuFonte.appendChild(labelsWrap);

        fontBtn.style.position = 'relative';
        fontBtn.appendChild(menuFonte);

        function atualizarGradienteSlider(n) {
            const pct = ['0%', '50%', '100%'];
            slider.style.background = `linear-gradient(to right, #7B6EF6 ${pct[n]}, #e0e0e0 ${pct[n]})`;
        }

        function atualizarCoresMenu() {
            const isBlack = document.body.classList.contains('dark-black');
            const isDark = document.body.classList.contains('dark-blue');
            const inativo = (isBlack || isDark) ? '#555555' : '#bbbbbb';

            menuFonte.style.background = isBlack ? '#111111' : isDark ? '#1a2535' : '#ffffff';
            menuFonte.style.borderColor = isBlack ? '#333333' : isDark ? '#2a3f52' : '#e8e8e8';

            // trilho do slider
            const trilhoCor = (isBlack || isDark) ? '#3a3a4a' : '#e0e0e0';
            const pct = ['0%', '50%', '100%'];
            slider.style.background = `linear-gradient(to right, #7B6EF6 ${pct[nivelAtual]}, ${trilhoCor} ${pct[nivelAtual]})`;

            linhaAa.querySelectorAll('[data-aa]').forEach(el => {
                el.style.color = parseInt(el.dataset.aa) === nivelAtual ? '#7B6EF6' : inativo;
            });
            labelsWrap.querySelectorAll('[data-label]').forEach(el => {
                el.style.color = parseInt(el.dataset.label) === nivelAtual ? '#7B6EF6' : inativo;
            });
        }

        function aplicarNivel(n) {
            nivelAtual = n;
            slider.value = n;

            const escalas = [0.85, 1, 1.25];

            document.documentElement.style.setProperty(
                '--font-scale',
                escalas[n]
            );

            document.querySelectorAll('*').forEach(el => {

                if (!el.dataset.originalFontSize) {
                    const size = parseFloat(
                        window.getComputedStyle(el).fontSize
                    );

                    if (!isNaN(size)) {
                        el.dataset.originalFontSize = size;
                    }
                }

                const original = parseFloat(
                    el.dataset.originalFontSize
                );

                if (!isNaN(original)) {
                    el.style.fontSize =
                        (original * escalas[n]) + 'px';
                }
            });

            atualizarGradienteSlider(n);
            atualizarCoresMenu();
        }

        function abrirMenuFonte() {
            atualizarCoresMenu();

            const rect =
    fontBtn
        .getBoundingClientRect();


const larguraMenu =
    Math.max(
        rect.width,
        280
    );


const esquerda =
    Math.min(

        Math.max(
            8,
            rect.left
        ),

        Math.max(
            8,
            window.innerWidth
            -
            larguraMenu
            -
            8
        )

    );


menuFonte.style.position =
    'fixed';


menuFonte.style.top =
    (rect.bottom + 8)
    + 'px';


menuFonte.style.left =
    esquerda
    + 'px';


menuFonte.style.width =
    larguraMenu
    + 'px';

            document.body.appendChild(menuFonte);
            menuFonte.style.display = 'block';
        }

        function fecharMenuFonte() {
            menuFonte.style.display = 'none';
            if (menuFonte.parentNode !== fontBtn) {
                fontBtn.appendChild(menuFonte);
            }
        }

        fontBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const aberto = menuFonte.style.display === 'block';
            fecharTodosMenus();
            if (!aberto) abrirMenuFonte();
        });

        document.addEventListener('click', () => fecharMenuFonte());

        // estado inicial
        aplicarNivel(1);
        // reescreve o innerHTML do botao e reanexa o menu (que foi removido pelo innerHTML)
        fontBtn.innerHTML = iconeAa + '<span class="acc-label">AUMENTAR TEXTO</span>' + '<span class="acc-caret">' + setaAbaixo + '</span>';
        fontBtn.appendChild(menuFonte);
    }

    // ================================================
    // BOTAO ACESSIBILIDADE - dropdown modo claro/escuro (removido modo mais escuro coloquei os icones bonitinhos e descriçoes elaboradas)
    // ================================================
    const accBtn = document.getElementById('toggleAccessibility');
    if (accBtn) {

        const temas = [
            {
                label: 'Modo Claro',
                sub: 'Telas claras para melhor visibilidade em locais iluminados',
                classe: '',
                icone: 'icons/solzinho.png'
            },
            {
                label: 'Modo Escuro',
                sub: 'Telas escuras para melhor visibilidade em ambientes com pouca luz',
                classe: 'dark-blue',
                icone: 'icons/luazinha.png'
            }
        ];

        const temaSalvo = localStorage.getItem('mexplica-tema');
        let temaAtivo = temaSalvo !== null ? parseInt(temaSalvo) : 0;
        if (temaAtivo > 1) temaAtivo = 0;

        const menuAcc = document.createElement('div');
        menuAcc.id = 'menu-acc';
        menuAccEl = menuAcc;
        menuAcc.style.cssText = `
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            width: 300px;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 8px 28px rgba(0,0,0,0.13);
            z-index: 200;
            background: #ffffff;
            border: 1.5px solid #e8e8e8;
        `;

        accBtn.style.position = 'relative';

        temas.forEach((tema, i) => {
            const item = document.createElement('button');
            item.style.cssText = `
                display: flex;
                align-items: center;
                width: 100%;
                padding: 14px 16px;
                background: none;
                border: none;
                cursor: pointer;
                text-align: left;
                gap: 12px;
                transition: background 0.15s;
                border-bottom: 1px solid #f0f0f0;
            `;

            const textos = document.createElement('div');
            textos.style.cssText = `flex: 1; display: flex; flex-direction: column; gap: 3px;`;

            const lbl = document.createElement('span');
            lbl.textContent = tema.label;
            lbl.style.cssText = `
                font-family: 'Inter', sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: #111111;
            `;

            const sub = document.createElement('span');
            sub.textContent = tema.sub;
            sub.style.cssText = `
                font-family: 'Inter', sans-serif;
                font-size: 11px;
                font-weight: 400;
                color: #888888;
                line-height: 1.4;
            `;

            textos.appendChild(lbl);
            textos.appendChild(sub);

            const icone = document.createElement('img');
            icone.src = tema.icone;
            icone.alt = '';
            icone.style.cssText = `width: 26px; height: 26px; object-fit: contain; flex-shrink: 0;`;

            item.appendChild(textos);
            item.appendChild(icone);

            item.addEventListener('mouseenter', () => {
                const isDark = document.body.classList.contains('dark-blue');
                item.style.background = isDark ? '#223344' : '#f7f7f9';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'none';
            });

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                aplicarTema(i);
                fecharMenuAcc();
            });

            menuAcc.appendChild(item);
        });

        // ================================================
        // MODO CONFORTO OCULAR - item com toggle switch
        // ================================================
        const confortoSalvo = localStorage.getItem('mexplica-conforto-ocular');
        let confortoAtivo = confortoSalvo === 'true';

        // aplica o estado salvo imediatamente ao carregar a pagina
        aplicarConfortoOcular(confortoAtivo);

        const itemConforto = document.createElement('div');
        itemConforto.style.cssText = `
            display: flex;
            align-items: center;
            width: 100%;
            padding: 14px 16px;
            gap: 12px;
            border-bottom: none;
        `;

        const textosConforto = document.createElement('div');
        textosConforto.style.cssText = `flex: 1; display: flex; flex-direction: column; gap: 3px;`;

        const lblConforto = document.createElement('span');
        lblConforto.textContent = 'Modo Conforto Ocular';
        lblConforto.style.cssText = `
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            font-weight: 600;
            color: #111111;
        `;

        const subConforto = document.createElement('span');
        subConforto.textContent = 'Previne a fadiga visual, ressecamento ocular';
        subConforto.style.cssText = `
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            font-weight: 400;
            color: #888888;
            line-height: 1.4;
        `;

        textosConforto.appendChild(lblConforto);
        textosConforto.appendChild(subConforto);

        // toggle switch (trilho + bolinha)
        const switchWrap = document.createElement('button');
        switchWrap.setAttribute('aria-label', 'Ativar modo conforto ocular');
        switchWrap.setAttribute('role', 'switch');
        switchWrap.style.cssText = `
            position: relative;
            width: 40px;
            height: 22px;
            border-radius: 999px;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
            background: ${confortoAtivo ? '#7B6EF6' : '#cccccc'};
            transition: background 0.2s;
            padding: 0;
        `;

        const switchBolinha = document.createElement('span');
        switchBolinha.style.cssText = `
            position: absolute;
            top: 2px;
            left: ${confortoAtivo ? '20px' : '2px'};
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            transition: left 0.2s;
        `;
        switchWrap.appendChild(switchBolinha);

        // icone do olho ao lado do switch
        const iconeOlho = document.createElement('img');
        iconeOlho.src = 'icons/olho.png';
        iconeOlho.alt = '';
        iconeOlho.style.cssText = `width: 26px; height: 26px; object-fit: contain; flex-shrink: 0;`;

        function atualizarSwitchConforto() {
            switchWrap.style.background = confortoAtivo ? '#7B6EF6' : '#cccccc';
            switchBolinha.style.left = confortoAtivo ? '20px' : '2px';
            switchWrap.setAttribute('aria-checked', confortoAtivo ? 'true' : 'false');
        }

        switchWrap.addEventListener('click', (e) => {
            e.stopPropagation();
            confortoAtivo = !confortoAtivo;
            localStorage.setItem('mexplica-conforto-ocular', confortoAtivo);
            atualizarSwitchConforto();
            // aplica ou remove o filtro night-shift
            aplicarConfortoOcular(confortoAtivo);
        });

        atualizarSwitchConforto();

        itemConforto.appendChild(textosConforto);
        itemConforto.appendChild(switchWrap);
        itemConforto.appendChild(iconeOlho);

        menuAcc.appendChild(itemConforto);

        accBtn.appendChild(menuAcc);

        function aplicarTema(index) {
            temaAtivo = index;
            document.body.classList.remove('dark-blue', 'dark-black');
            if (temas[index].classe) {
                document.body.classList.add(temas[index].classe);
            }
            localStorage.setItem('mexplica-tema', index);

            // troca as imagens de print para a versao correta do tema
            atualizarImagensPrint();

            atualizarEstiloMenuAcc();

            // atualiza tambem o menu de fonte para refletir o novo tema
            if (menuFonteEl) {
                atualizarCoresMenu();
            }
        }

        function atualizarEstiloMenuAcc() {
            const isDark = document.body.classList.contains('dark-blue');

            menuAcc.style.background = isDark ? '#1a2535' : '#ffffff';
            menuAcc.style.borderColor = isDark ? '#2a3f52' : '#e8e8e8';

            menuAcc.querySelectorAll('button').forEach((btn, i) => {
                // ignora o switch de conforto ocular, que tem seu proprio estilo de cor de fundo
                if (btn === switchWrap) return;
                btn.style.background = 'none';
                const spans = btn.querySelectorAll('span');
                btn.style.borderBottomColor = isDark ? '#2a3f52' : '#f0f0f0';
                if (spans[0]) spans[0].style.color = isDark ? '#e8e8e8' : '#111111';
                if (spans[1]) spans[1].style.color = isDark ? '#666666' : '#888888';
            });

            // estiliza o item de conforto ocular separadamente
            itemConforto.style.borderBottomColor = isDark ? '#2a3f52' : '#f0f0f0';
            lblConforto.style.color = isDark ? '#e8e8e8' : '#111111';
            subConforto.style.color = isDark ? '#666666' : '#888888';
        }

        function abrirMenuAcc() {
            atualizarEstiloMenuAcc();

const rect =
    accBtn
        .getBoundingClientRect();


const larguraMenu =
    Math.max(
        rect.width,
        300
    );


const esquerda =
    Math.min(

        Math.max(
            8,
            rect.left
        ),

        Math.max(
            8,
            window.innerWidth
            -
            larguraMenu
            -
            8
        )

    );


menuAcc.style.position =
    'fixed';


menuAcc.style.top =
    (rect.bottom + 8)
    + 'px';


menuAcc.style.left =
    esquerda
    + 'px';


menuAcc.style.width =
    larguraMenu
    + 'px';

            document.body.appendChild(menuAcc);
            menuAcc.style.display = 'block';
        }

        function fecharMenuAcc() {
            menuAcc.style.display = 'none';
            // devolve o menu pro botao pai para nao perder a referencia
            if (menuAcc.parentNode !== accBtn) {
                accBtn.appendChild(menuAcc);
            }
        }

        accBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const aberto = menuAcc.style.display === 'block';
            fecharTodosMenus();
            if (!aberto) abrirMenuAcc();
        });

        document.addEventListener('click', () => fecharMenuAcc());

        // aplica o tema salvo ao carregar (incluindo troca de imagens)
        aplicarTema(temaAtivo);
    }

  // ANIMAÇAO DE ENTRADA
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.topic-card, .step-card, .legend-item, .contact-card').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s`;
        observer.observe(el);
    });

});