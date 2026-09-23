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

            const rect = fontBtn.getBoundingClientRect();
            menuFonte.style.position = 'fixed';
            menuFonte.style.top = (rect.bottom + 8) + 'px';
            menuFonte.style.left = rect.left + 'px';
            menuFonte.style.width = rect.width + 'px';

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
        fontBtn.innerHTML = iconeAa + ' AUMENTAR TEXTO ' + setaAbaixo;
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

            // posiciona o menu relativo ao botao, anexado ao body
            // isso evita o problema de z-index no mobile
            const rect = accBtn.getBoundingClientRect();
            menuAcc.style.position = 'fixed';
            menuAcc.style.top = (rect.bottom + 8) + 'px';
            menuAcc.style.left = rect.left + 'px';
            menuAcc.style.width = rect.width + 'px';

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

    // STEPS
    const step1 = document.getElementById('step-1');
    const stepLogin = document.getElementById('step-login');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    let identificadorAtual = '';

    function showStep(stepEl) {

        [
            step1,
            stepLogin,
            step2,
            step3,
            step4
        ].forEach(step => {

            if (step) {
                step.classList.add('hidden');
            }

        });

        if (stepEl) {

            stepEl.classList.remove('hidden');

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        }

    }


    // FUNÇÃO PARA COMUNICAÇÃO COM A API
    async function authRequest(
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


    // STEP 1 - MÉTODO DE CONTATO
    const btnEmail =
        document.getElementById(
            'btnEmail'
        );

    const btnPhone =
        document.getElementById(
            'btnPhone'
        );

    const mainInput =
        document.getElementById(
            'mainInput'
        );

    if (
        btnEmail
        &&
        btnPhone
        &&
        mainInput
    ) {

        btnEmail.addEventListener(
            'click',
            () => {
                btnEmail
                    .classList
                    .add(
                        'method-active'
                    );

                btnPhone
                    .classList
                    .remove(
                        'method-active'
                    );

                mainInput.placeholder =
                    'Insira seu email';
                mainInput.type =
                    'text';
                mainInput.autocomplete =
                    'email';

            }
        );


        btnPhone.addEventListener(
            'click',
            () => {
                btnPhone
                    .classList
                    .add(
                        'method-active'
                    );
                btnEmail
                    .classList
                    .remove(
                        'method-active'
                    );


                mainInput.placeholder =
                    'Insira seu número de telefone';
                mainInput.type =
                    'tel';
                mainInput.autocomplete =
                    'tel';
            }
        );
    }


    // STEP 1 - VERIFICAR EMAIL / TELEFONE
    const continueBtn =
        document.getElementById(
            'continueBtn'
        );
    const inputError =
        document.getElementById(
            'inputError'
        );

    if (continueBtn) {
        continueBtn.addEventListener(
            'click',
            async () => {
                const val =
                    mainInput
                        ? mainInput.value.trim()
                        : '';

                const isPhone =
                    btnPhone
                    &&
                    btnPhone
                        .classList
                        .contains(
                            'method-active'
                        );

                // CAMPO VAZIO
                if (!val) {
                    if (inputError) {
                        inputError.textContent =
                            isPhone
                                ? 'Por favor, insira seu número de telefone.'
                                : 'Por favor, insira seu email.';
                    }

                    if (mainInput) {
                        mainInput.focus();
                    }

                    return;

                }


                // VALIDAÇAO DE EMAIL
                if (!isPhone) {
                    const emailOK =
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                            .test(val);

                    if (!emailOK) {
                        if (inputError) {
                            inputError.textContent =
                                'Email inválido. Verifique e tente novamente.';

                        }

                        mainInput.focus();
                        return;

                    }
                }

                // VALIDAÇAO DE TELEFONE
                else {
                    const phoneOK =
                        /^[\d\s()+\-]{8,}$/
                            .test(val);

                    if (!phoneOK) {
                        if (inputError) {
                            inputError.textContent =
                                'Número inválido. Verifique e tente novamente.';
                        }

                        mainInput.focus();
                        return;
                    }
                }

                if (inputError) {
                    inputError.textContent =
                        'Verificando...';
                }

                continueBtn.disabled =
                    true;


                try {
                    const dados =
                        await authRequest(
                            '/api/auth/verificar',
                            {
                                method:
                                    'POST',
                                body:
                                    JSON.stringify({
                                        identificador:
                                            val
                                    })
                            }
                        );

                    // GUARDA O EMAIL OU TELEFONE
                    // PARA LOGIN OU CADASTRO
                    identificadorAtual =
                        val;

                    if (inputError) {
                        inputError.textContent = '';
                    }

                    // USUARIO JAA EXISTE
                    if (
                        dados.cadastrado
                    ) {

                        const loginTitle =
                            document
                                .getElementById(
                                    'loginTitle'
                                );

                        const loginPassword =
                            document
                                .getElementById(
                                    'loginPassword'
                                );

                        if (loginTitle) {

                            loginTitle.textContent =
                                `Bem-vindo de volta, ${dados.usuario.nome}!`;

                        }

                        if (loginPassword) {

                            loginPassword.value =
                                '';

                        }

                        showStep(
                            stepLogin
                        );

                        if (loginPassword) {

                            loginPassword.focus();

                        }
                    }


                    // USUÁRIO NOVO
                    else {
                        showStep(
                            step2
                        );
                    }
                }
                catch (erro) {
                    if (inputError) {
                        inputError.textContent =
                            erro.message;
                    }
                }
                finally {
                    continueBtn.disabled =
                        false;
                }
            }
        );


        // ENTER TAMBEM CONTINUA
        if (mainInput) {
            mainInput.addEventListener(
                'keydown',
                event => {
                    if (
                        event.key === 'Enter'
                    ) {

                        continueBtn.click();

                    }

                }
            );

        }

    }


    // LOGIN - VOLTAR
    const backLoginToStep1 =
        document.getElementById(
            'backLoginToStep1'
        );

    if (backLoginToStep1) {

        backLoginToStep1.addEventListener(
            'click',
            () => {

                showStep(
                    step1
                );

            }
        );

    }


    // LOGIN
    const loginBtn =
        document.getElementById(
            'loginBtn'
        );
    const loginPassword =
        document.getElementById(
            'loginPassword'
        );
    const loginError =
        document.getElementById(
            'loginError'
        );

    async function realizarLogin() {
        const senha =
            loginPassword
                ? loginPassword.value
                : '';

        if (!senha) {
            if (loginError) {
                loginError.textContent =
                    'Digite sua senha.';
            }

            if (loginPassword) {

                loginPassword.focus();
            }
            return;

        }

        if (loginError) {
            loginError.textContent =
                'Entrando...';
        }

        if (loginBtn) {
            loginBtn.disabled =
                true;
        }

        try {
            await authRequest(
                '/api/auth/login',
                {
                    method:
                        'POST',
                    body:
                        JSON.stringify({
                            identificador:
                                identificadorAtual,
                            senha:
                                senha
                        })
                }
            );

            // LOGIN REALIZADO
            window.location.href =
                '/comunidade';
        }

        catch (erro) {
            if (loginError) {
                loginError.textContent =
                    erro.message;
            }
        }

        finally {
            if (loginBtn) {
                loginBtn.disabled =
                    false;
            }
        }
    }


    if (loginBtn) {
        loginBtn.addEventListener(
            'click',
            realizarLogin
        );
    }


    if (loginPassword) {

        loginPassword.addEventListener(
            'keydown',
            event => {
                if (
                    event.key === 'Enter'
                ) {
                    realizarLogin();

                }
            }
        );
    }


    // STEP 2 - VOLTAR
    const backToStep1 =
        document.getElementById(
            'backToStep1'
        );


    if (backToStep1) {
        backToStep1.addEventListener(
            'click',
            () => {
                showStep(
                    step1
                );
            }
        );
    }


    // STEP 2 - VALIDAR DADOS DO CADASTRO
    const registerBtn =
        document.getElementById(
            'registerBtn'
        );
    const registerError =
        document.getElementById(
            'registerError'
        );


    if (registerBtn) {
        registerBtn.addEventListener(
            'click',
            () => {

                const firstName =
                    document.getElementById(
                        'firstName'
                    );

                const lastName =
                    document.getElementById(
                        'lastName'
                    );

                const age =
                    document.getElementById(
                        'age'
                    );

                const gender =
                    document.getElementById(
                        'gender'
                    );

                const password =
                    document.getElementById(
                        'password'
                    );


                const fields = [

                    firstName,
                    lastName,
                    age,
                    gender,
                    password

                ];


                const empty =
                    fields.some(
                        field =>

                            !field
                            ||
                            !String(
                                field.value
                            ).trim()

                    );


                if (empty) {

                    if (registerError) {

                        registerError.textContent =
                            'Por favor, preencha todos os campos.';

                    }


                    return;

                }


                const ageVal =
                    parseInt(
                        age.value,
                        10
                    );


                if (
                    isNaN(ageVal)
                    ||
                    ageVal < 10
                    ||
                    ageVal > 120
                ) {

                    if (registerError) {

                        registerError.textContent =
                            'Insira uma idade válida.';

                    }


                    age.focus();

                    return;

                }


                if (
                    password.value.length < 6
                ) {

                    if (registerError) {

                        registerError.textContent =
                            'A senha deve ter pelo menos 6 caracteres.';

                    }


                    password.focus();

                    return;

                }


                if (registerError) {

                    registerError.textContent =
                        '';

                }


                // AGORA ESCOLHE SE QUER SER
                // COLABORADOR
                showStep(
                    step3
                );

            }
        );

    }


    // STEP 3 - CADASTRO REAL
    const yesCollab =
        document.getElementById(
            'yesCollab'
        );

    const noCollab =
        document.getElementById(
            'noCollab'
        );

    const collabError =
        document.getElementById(
            'collabError'
        );


    async function concluirCadastro(
        colaborador
    ) {

        const firstName =
            document.getElementById(
                'firstName'
            );

        const lastName =
            document.getElementById(
                'lastName'
            );

        const age =
            document.getElementById(
                'age'
            );

        const gender =
            document.getElementById(
                'gender'
            );

        const password =
            document.getElementById(
                'password'
            );


        if (collabError) {

            collabError.textContent =
                'Criando sua conta...';

        }


        if (yesCollab) {

            yesCollab.disabled =
                true;

        }


        if (noCollab) {

            noCollab.disabled =
                true;

        }


        try {

            await authRequest(
                '/api/auth/cadastro',
                {

                    method:
                        'POST',

                    body:
                        JSON.stringify({

                            identificador:
                                identificadorAtual,

                            nome:
                                firstName.value.trim(),

                            sobrenome:
                                lastName.value.trim(),

                            idade:
                                age.value,

                            genero:
                                gender.value,

                            senha:
                                password.value,

                            colaborador:
                                colaborador

                        })

                }
            );


            if (collabError) {

                collabError.textContent =
                    '';

            }


            // CADASTRO CONCLUÍDO
            // E USUÁRIO JÁ ESTÁ LOGADO
            showStep(
                step4
            );

        }

        catch (erro) {

            if (collabError) {

                collabError.textContent =
                    erro.message;

            }

        }

        finally {

            if (yesCollab) {

                yesCollab.disabled =
                    false;

            }


            if (noCollab) {

                noCollab.disabled =
                    false;

            }

        }

    }


    if (yesCollab) {

        yesCollab.addEventListener(
            'click',
            () => {

                concluirCadastro(
                    true
                );

            }
        );

    }


    if (noCollab) {

        noCollab.addEventListener(
            'click',
            () => {

                concluirCadastro(
                    false
                );

            }
        );

    }

    // STEP 3 - INFO COLABORADOR
    const collabInfoLink = document.querySelector('.collab-info-link');
    if (collabInfoLink) {
        collabInfoLink.addEventListener('click', (e) => {
            e.preventDefault();
            abrirModalColaborador();
        });
    }

    function abrirModalColaborador() {
        const overlay = document.createElement('div');
        const modal = document.createElement('div');
        const isBlack = document.body.classList.contains('dark-black');
        const isDark = document.body.classList.contains('dark-blue');

        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            opacity: 0;
            transition: opacity 0.25s ease;
        `;

        modal.style.cssText = `
            background: ${isDark ? '#1a2535' : '#ffffff'};
            border: 1.5px solid ${isDark ? '#2a3f52' : '#e8e8e8'};
            border-radius: 20px;
            padding: 36px 32px 28px;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 16px 48px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            transform: translateY(18px) scale(0.97);
            transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
            opacity: 0;
        `;

        const logo = document.createElement('img');
        logo.src = 'icons/logo-mexplica.png';
        logo.alt = 'MEXPLICA';
        logo.style.cssText = `width: 64px; height: 64px; object-fit: contain;`;

        const titulo = document.createElement('h2');
        titulo.textContent = 'O que é ser um colaborador?';
        titulo.style.cssText = `
            font-family: 'Nimbus Sans', sans-serif;
            font-size: 25px;
            font-weight: 500;
            color: ${isDark ? '#e8e8e8' : '#111111'};
            text-align: center;
            line-height: 1.3;
        `;

        const texto = document.createElement('p');
        texto.textContent = 'Colaboradores são voluntários que ajudam usuários com dúvidas tecnológicas. Você pode responder perguntas, enviar vídeos explicativos, fazer chamadas e subir de nível conforme contribui com a comunidade!';
        texto.style.cssText = `
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            color: ${isDark ? '#aaaaaa' : '#555555'};
            text-align: center;
            line-height: 1.65;
        `;

        const btnFechar = document.createElement('button');
        btnFechar.textContent = 'Entendi!';
        btnFechar.style.cssText = `
            margin-top: 4px;
            padding: 12px 32px;
            background: #7B6EF6;
            color: #ffffff;
            border: none;
            border-radius: 999px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.18s, transform 0.18s;
        `;

        btnFechar.addEventListener('mouseenter', () => {
            btnFechar.style.background = '#5A50C8';
            btnFechar.style.transform = 'translateY(-1px)';
        });
        btnFechar.addEventListener('mouseleave', () => {
            btnFechar.style.background = '#7B6EF6';
            btnFechar.style.transform = 'translateY(0)';
        });

        function fecharModal() {
            overlay.style.opacity = '0';
            modal.style.opacity = '0';
            modal.style.transform = 'translateY(18px) scale(0.97)';
            setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 280);
        }

        btnFechar.addEventListener('click', fecharModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });

        function onEsc(e) {
            if (e.key === 'Escape') { fecharModal(); document.removeEventListener('keydown', onEsc); }
        }
        document.addEventListener('keydown', onEsc);

        modal.appendChild(logo);
        modal.appendChild(titulo);
        modal.appendChild(texto);
        modal.appendChild(btnFechar);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.opacity = '1';
                modal.style.transform = 'translateY(0) scale(1)';
            });
        });
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