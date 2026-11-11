document.addEventListener(
    'DOMContentLoaded',
    () => {

    // STEPS
    const step1 = document.getElementById('step-1');
    const stepLogin = document.getElementById('step-login');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');

    let identificadorAtual = '';

    function obterRedirectSeguro() {
    const destino =
        new URLSearchParams(
            window.location.search
        )
        .get(
            'redirect'
        );


    if (!destino) {
        return '/';

    }

    // Somente URLs internas do proprio MExplica
    if (
        !destino.startsWith('/')
        ||
        destino.startsWith('//')
    ) {
        return '/';
    }
    return destino;

}

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
    const {
        requisicao:
            authRequest
    } =
        window.MExplicaApi;


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
                obterRedirectSeguro();
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
            const sucessContinueLink = document.getElementById('sucessContinueLink');

            if (sucessContinueLink) {
                sucessContinueLink.href = obterRedirectSeguro();
            }

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

    }
);
