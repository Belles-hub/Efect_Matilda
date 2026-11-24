/* =========================================
   MATILDA — mentora de IA (chat socrático)

   Tela principal do app: conversa com a Matilda em dois modos
   ("conversar" livre, ou "meu projeto" quando chega vinda de um projeto
   pelo link ?projeto=ID) e permite anexar foto ou documento pra ela ler.

   O histórico da conversa fica em sessionStorage (some ao fechar a aba ou
   sair da conta — ver limparSessaoLocal em sessao.js), pra recarregar a
   página não apagar o que já foi dito.
========================================= */

(function () {
    'use strict';

    const CHAVE_SESSAO_CHAT = 'efectmatilda_chat';
    const MAX_CARACTERES = 500;
    const MAX_ANEXOS = 4;

    const SUGESTOES = [
        'Quero investigar um problema que vejo na minha escola',
        'Me ajuda a pensar numa hipótese',
        'O que é preciso pra testar uma ideia?',
        'Explica uma dúvida de ciência ou tecnologia pra mim'
    ];

    /* ---------- estado da conversa ---------- */

    let historico = [];        // [{ role: 'user'|'assistant', content }]
    let modo = 'conversar';    // 'conversar' | 'projeto'
    let area = '';             // id de EM.AREAS, opcional
    let projetoId = null;
    let projetoTitulo = '';
    let material = [];         // anexos prontos pra próxima mensagem
    let proximoIdAnexo = 1;
    let enviando = false;
    let usuarioAtual = null;

    let els = {};

    /* ---------- sessionStorage ---------- */

    function salvarSessaoChat() {
        try {
            sessionStorage.setItem(CHAVE_SESSAO_CHAT, JSON.stringify({
                historico: historico, modo: modo, area: area,
                projetoId: projetoId, projetoTitulo: projetoTitulo
            }));
        } catch (erro) {
            // Sem espaço ou bloqueado: a conversa simplesmente não sobrevive a um recarregamento.
        }
    }

    function carregarSessaoChat() {
        try {
            const bruto = sessionStorage.getItem(CHAVE_SESSAO_CHAT);
            return bruto ? JSON.parse(bruto) : null;
        } catch (erro) {
            return null;
        }
    }

    /* ---------- avatares ---------- */

    function iconeEstudante() {
        const avatar = usuarioAtual && usuarioAtual.preferencias && usuarioAtual.preferencias.avatar;
        return avatar || 'fa-user';
    }

    /* ---------- render da conversa ---------- */

    function linhaMensagem(role, texto, opcoes) {
        opcoes = opcoes || {};
        const ehEu = role === 'user';

        const av = ehEu
            ? `<span class="icone-circulo"><i class="fa-solid ${EM.esc(iconeEstudante())}" aria-hidden="true"></i></span>`
            : `<span class="icone-circulo icone-circulo--matilda"><i class="fa-solid fa-book-open" aria-hidden="true"></i></span>`;

        let corpoBolha;

        if (ehEu) {
            corpoBolha = `<div class="bolha bolha--eu">${EM.esc(texto)}</div>`;
        } else {
            const classeErro = opcoes.erro ? ' erro' : '';
            const botaoOuvir = opcoes.erro ? '' :
                `<button type="button" class="bolha__ouvir" data-ouvir aria-label="Ouvir esta mensagem"><i class="fa-solid fa-volume-high" aria-hidden="true"></i></button>`;
            const htmlTexto = opcoes.erro ? EM.esc(texto) : formatarRespostaIA(texto);
            corpoBolha = `<div class="bolha bolha--matilda${classeErro}">${botaoOuvir}${htmlTexto}</div>`;
        }

        const div = document.createElement('div');
        div.className = 'msg' + (ehEu ? ' msg--eu' : '');
        div.innerHTML =
            `<span class="msg__av">${av}</span>` +
            `<div class="msg__corpo">` +
            `<p class="bolha-quem${ehEu ? ' bolha-quem--eu' : ''}">${ehEu ? 'Você' : 'Matilda'}</p>` +
            corpoBolha +
            `</div>`;

        if (!ehEu) {
            const botao = div.querySelector('[data-ouvir]');
            if (botao) {
                botao.addEventListener('click', function () {
                    if (Acess.falando) { Acess.parar(); return; }
                    if (!Acess.falar(paraLeituraEmVoz(texto))) {
                        EM.toast('Seu navegador não tem leitura em voz alta.', 'aviso');
                    }
                });
            }
        }

        return div;
    }

    function scrollParaFinal() {
        els.mensagens.scrollTop = els.mensagens.scrollHeight;
    }

    function renderHistorico() {
        els.mensagens.innerHTML = '';
        historico.forEach(function (m) {
            els.mensagens.appendChild(linhaMensagem(m.role, m.content));
        });
        els.sugestoes.hidden = historico.length > 0;
        scrollParaFinal();
    }

    function adicionarMensagemDOM(role, texto, opcoes) {
        els.sugestoes.hidden = true;
        els.mensagens.appendChild(linhaMensagem(role, texto, opcoes));
        scrollParaFinal();
    }

    function mostrarDigitando(mostrar) {
        let linha = document.getElementById('digitandoLinha');

        if (mostrar) {
            if (linha) return;
            linha = document.createElement('div');
            linha.className = 'msg';
            linha.id = 'digitandoLinha';
            linha.innerHTML =
                `<span class="msg__av"><span class="icone-circulo icone-circulo--matilda"><i class="fa-solid fa-book-open" aria-hidden="true"></i></span></span>` +
                `<div class="msg__corpo"><p class="bolha-quem">Matilda</p>` +
                `<div class="bolha bolha--matilda"><span class="forma digitando-forma" aria-hidden="true">${Formas.svg('flor', 'rosa', 'calmo')}</span><span class="sr-only">Matilda está pensando...</span></div></div>`;
            els.mensagens.appendChild(linha);
            scrollParaFinal();
        } else if (linha) {
            linha.remove();
        }
    }

    /* ---------- modos ---------- */

    function definirModo(novoModo) {
        modo = novoModo;

        els.modos.querySelectorAll('.chip').forEach(function (chip) {
            chip.setAttribute('aria-pressed', String(chip.dataset.modo === modo));
        });

        if (modo === 'projeto') {
            els.areaWrap.hidden = true;
            els.modoDesc.textContent = projetoTitulo
                ? `Mentorando: "${projetoTitulo}"`
                : 'Converse sobre o seu projeto de investigação.';
        } else {
            els.areaWrap.hidden = false;
            els.modoDesc.textContent = 'Pergunte, pense alto ou comece a investigar algo novo — sem pressa.';
        }

        salvarSessaoChat();
    }

    /* ---------- material anexado ---------- */

    function iconeParaNome(nome) {
        if (/\.pdf$/i.test(nome)) return 'fa-file-pdf';
        if (/\.docx?$/i.test(nome)) return 'fa-file-word';
        if (/\.csv$/i.test(nome)) return 'fa-file-csv';
        return 'fa-file-lines';
    }

    function renderMaterial() {
        els.material.innerHTML = material.map(function (item) {
            if (item.status === 'carregando') {
                return `<span class="mat-chip" data-id="${item.id}">` +
                    `<span class="mat-chip__visual"><i class="fa-solid fa-circle-notch girando" aria-hidden="true"></i></span>` +
                    `<span class="mat-chip__nome">${EM.esc(item.nome)}<br><small>Lendo...</small></span>` +
                    `<button type="button" class="mat-chip__x" data-remover="${item.id}" aria-label="Cancelar ${EM.esc(item.nome)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` +
                    `</span>`;
            }

            if (item.status === 'erro') {
                return `<span class="mat-chip mat-chip--erro" data-id="${item.id}">` +
                    `<span class="mat-chip__visual"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>` +
                    `<span class="mat-chip__nome">${EM.esc(item.nome)} — ${EM.esc(item.erro)}</span>` +
                    `<button type="button" class="mat-chip__x" data-remover="${item.id}" aria-label="Remover ${EM.esc(item.nome)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` +
                    `</span>`;
            }

            const visual = item.thumb
                ? `<img src="${item.thumb}" alt="">`
                : `<i class="fa-solid ${iconeParaNome(item.nome)}" aria-hidden="true"></i>`;

            return `<span class="mat-chip" data-id="${item.id}">` +
                `<span class="mat-chip__visual">${visual}</span>` +
                `<span class="mat-chip__nome">${EM.esc(item.nome)}</span>` +
                `<button type="button" class="mat-chip__x" data-remover="${item.id}" aria-label="Remover ${EM.esc(item.nome)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>` +
                `</span>`;
        }).join('');

        els.material.querySelectorAll('[data-remover]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                const id = Number(botao.dataset.remover);
                material = material.filter(function (m) { return m.id !== id; });
                renderMaterial();
            });
        });
    }

    async function processarAnexo(arquivo) {
        if (material.length >= MAX_ANEXOS) {
            EM.toast('Você já anexou o máximo de ' + MAX_ANEXOS + ' arquivos nesta mensagem.', 'aviso');
            return;
        }

        const id = proximoIdAnexo++;
        const item = { id: id, nome: arquivo.name || 'arquivo', status: 'carregando', thumb: null, texto: null, erro: null };
        material.push(item);
        renderMaterial();

        try {
            let preparado;
            let dados;

            if (Anexos.ehImagem(arquivo)) {
                preparado = await Anexos.prepararImagem(arquivo);
                dados = preparado.dados;
                item.thumb = preparado.thumb;
            } else if (Anexos.ehDocumento(arquivo)) {
                preparado = await Anexos.prepararDocumento(arquivo);
                dados = preparado.dados;
            } else {
                throw new Error('Esse tipo de arquivo não é aceito. Envie uma foto, PDF, DOCX, TXT, MD ou CSV.');
            }

            item.nome = preparado.nome;

            const resposta = await api('/chat/material', { metodo: 'POST', corpo: { nome: preparado.nome, dados: dados } });

            item.status = 'ok';
            item.nome = resposta.nome;
            item.texto = resposta.texto;

            if (resposta.aviso) EM.toast(resposta.aviso, 'aviso');

        } catch (erro) {
            console.error(erro);
            item.status = 'erro';
            item.erro = erro.message || 'Não consegui ler esse arquivo.';
        } finally {
            renderMaterial();
        }
    }

    function abrirMenuAnexo(abrir) {
        els.anexoMenu.hidden = !abrir;
        els.btnAnexo.setAttribute('aria-expanded', String(abrir));
        if (abrir) {
            const primeiro = els.anexoMenu.querySelector('.anexo-menu__item:not([hidden])');
            if (primeiro) primeiro.focus();
        }
    }

    /* ---------- câmera ---------- */

    async function abrirCamera() {
        abrirMenuAnexo(false);

        if (typeof els.dlgCamera.showModal === 'function') {
            els.dlgCamera.showModal();
        } else {
            els.dlgCamera.setAttribute('open', '');
        }

        try {
            await Anexos.iniciarCamera(els.videoCamera);
        } catch (erro) {
            console.error(erro);
            EM.toast(Anexos.mensagemDeErroDaCamera(erro), 'erro');
            fecharCamera();
        }
    }

    function fecharCamera() {
        Anexos.pararCamera(els.videoCamera);
        if (els.dlgCamera.open) els.dlgCamera.close();
    }

    async function capturarFoto() {
        try {
            const arquivo = await Anexos.capturarQuadro(els.videoCamera);
            fecharCamera();
            await processarAnexo(arquivo);
        } catch (erro) {
            console.error(erro);
            EM.toast(erro.message || 'Não consegui capturar a foto. Tente de novo.', 'erro');
        }
    }

    /* ---------- contador e textarea ---------- */

    function atualizarContador() {
        const restantes = MAX_CARACTERES - els.campoMensagem.value.length;
        els.contador.textContent = restantes + ' caracteres restantes';
        els.contador.classList.toggle('perto', restantes <= 50);
    }

    function ajustarAlturaTextarea() {
        els.campoMensagem.style.height = 'auto';
        els.campoMensagem.style.height = Math.min(els.campoMensagem.scrollHeight, 140) + 'px';
    }

    function definirEnviando(ligado) {
        enviando = ligado;
        els.btnEnviar.disabled = ligado;
        els.btnEnviar.setAttribute('aria-busy', String(ligado));
    }

    /* ---------- envio ---------- */

    async function enviarMensagem(e) {
        if (e) e.preventDefault();
        if (enviando) return;

        const texto = els.campoMensagem.value.trim();
        if (!texto) return;

        if (material.some(function (m) { return m.status === 'carregando'; })) {
            EM.toast('Espere os anexos terminarem de carregar.', 'aviso');
            return;
        }

        const materialErrado = material.some(function (m) { return m.status === 'erro'; });
        if (materialErrado) {
            EM.toast('Remova o anexo com erro antes de enviar, ou tire ele da conversa.', 'aviso');
            return;
        }

        // Contexto ANTES desta nova mensagem — é o que a API espera em "historico".
        const historicoParaEnviar = historico.slice(-40).map(function (m) {
            return { role: m.role, content: m.content };
        });

        const materialParaEnviar = material.filter(function (m) { return m.status === 'ok'; })
            .map(function (m) { return { nome: m.nome, texto: m.texto }; });

        historico.push({ role: 'user', content: texto });
        salvarSessaoChat();
        adicionarMensagemDOM('user', texto);

        els.campoMensagem.value = '';
        atualizarContador();
        ajustarAlturaTextarea();
        material = [];
        renderMaterial();
        fecharMenuSeAberto();

        definirEnviando(true);
        mostrarDigitando(true);

        try {
            const corpo = {
                mensagem: texto,
                historico: historicoParaEnviar,
                material: materialParaEnviar,
                modo: modo
            };

            const fonteAtual = document.documentElement.dataset.fonte;
            if (fonteAtual) corpo.tamanho_fonte_atual = fonteAtual;

            if (modo === 'projeto' && projetoId) corpo.projeto_id = projetoId;
            if (modo === 'conversar' && area) corpo.area = area;

            const resposta = await api('/chat/', { metodo: 'POST', corpo: corpo });

            historico.push({ role: 'assistant', content: resposta.resposta });
            salvarSessaoChat();
            adicionarMensagemDOM('assistant', resposta.resposta);

        } catch (erro) {
            console.error(erro);

            const mensagemErro = erro.status === 429
                ? (erro.message || 'Você chegou ao limite de mensagens por hoje. Volte amanhã para continuar conversando com a Matilda.')
                : (erro.message || 'Não consegui responder agora. Tente de novo em instantes.');

            adicionarMensagemDOM('assistant', mensagemErro, { erro: true });

        } finally {
            mostrarDigitando(false);
            definirEnviando(false);
            els.campoMensagem.focus();
        }
    }

    function fecharMenuSeAberto() {
        if (!els.anexoMenu.hidden) abrirMenuAnexo(false);
    }

    /* ---------- elementos e eventos ---------- */

    function cacheEls() {
        els = {
            chatTela: document.getElementById('chatTela'),
            modos: document.getElementById('modos'),
            modoDesc: document.getElementById('modoDesc'),
            mensagens: document.getElementById('mensagens'),
            sugestoes: document.getElementById('sugestoes'),
            material: document.getElementById('material'),
            areaWrap: document.getElementById('areaWrap'),
            selectArea: document.getElementById('selectArea'),
            formChat: document.getElementById('formChat'),
            btnAnexo: document.getElementById('btnAnexo'),
            anexoMenu: document.getElementById('anexoMenu'),
            itemCamera: document.getElementById('itemCamera'),
            itemFotos: document.getElementById('itemFotos'),
            itemArquivos: document.getElementById('itemArquivos'),
            inputFotos: document.getElementById('inputFotos'),
            inputArquivos: document.getElementById('inputArquivos'),
            campoMensagem: document.getElementById('campoMensagem'),
            btnEnviar: document.getElementById('btnEnviar'),
            contador: document.getElementById('contadorMsg'),
            btnNovaConversa: document.getElementById('btnNovaConversa'),
            dlgCamera: document.getElementById('dlgCamera'),
            videoCamera: document.getElementById('videoCamera'),
            btnCapturar: document.getElementById('btnCapturar'),
            btnCancelarCamera: document.getElementById('btnCancelarCamera')
        };
    }

    function ligarEventos() {
        els.formChat.addEventListener('submit', enviarMensagem);

        els.campoMensagem.addEventListener('input', function () {
            atualizarContador();
            ajustarAlturaTextarea();
        });

        els.campoMensagem.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                els.formChat.requestSubmit();
            }
        });

        els.modos.addEventListener('click', function (e) {
            const chip = e.target.closest('.chip');
            if (!chip) return;

            const novoModo = chip.dataset.modo;
            if (novoModo === modo) return;

            if (novoModo === 'projeto' && !projetoId) {
                EM.toast('Abra a Matilda a partir de um projeto em "Meus Projetos" para conversar sobre ele aqui.', 'info');
                return;
            }

            definirModo(novoModo);
        });

        els.selectArea.addEventListener('change', function () {
            area = els.selectArea.value;
            salvarSessaoChat();
        });

        els.btnNovaConversa.addEventListener('click', async function () {
            if (historico.length === 0) return;

            const ok = await EM.confirmar('Nova conversa', 'A conversa atual será apagada e não poderá ser recuperada. Quer começar uma nova?', 'Começar de novo');
            if (!ok) return;

            historico = [];
            material = [];
            salvarSessaoChat();
            renderHistorico();
            renderMaterial();
            EM.toast('Nova conversa iniciada.', 'sucesso');
        });

        els.btnAnexo.addEventListener('click', function () {
            abrirMenuAnexo(els.anexoMenu.hidden);
        });

        document.addEventListener('click', function (e) {
            if (els.anexoMenu.hidden) return;
            if (e.target === els.btnAnexo || els.btnAnexo.contains(e.target)) return;
            if (els.anexoMenu.contains(e.target)) return;
            abrirMenuAnexo(false);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !els.anexoMenu.hidden) abrirMenuAnexo(false);
        });

        els.itemFotos.addEventListener('click', function () {
            abrirMenuAnexo(false);
            els.inputFotos.click();
        });

        els.itemArquivos.addEventListener('click', function () {
            abrirMenuAnexo(false);
            els.inputArquivos.click();
        });

        els.itemCamera.addEventListener('click', abrirCamera);

        els.inputFotos.addEventListener('change', async function () {
            const arquivos = Array.from(els.inputFotos.files || []);
            els.inputFotos.value = '';
            for (const arquivo of arquivos) await processarAnexo(arquivo);
        });

        els.inputArquivos.addEventListener('change', async function () {
            const arquivos = Array.from(els.inputArquivos.files || []);
            els.inputArquivos.value = '';
            for (const arquivo of arquivos) await processarAnexo(arquivo);
        });

        els.btnCapturar.addEventListener('click', capturarFoto);
        els.btnCancelarCamera.addEventListener('click', fecharCamera);
        els.dlgCamera.addEventListener('close', function () { Anexos.pararCamera(els.videoCamera); });

        // Arrastar e soltar um arquivo direto na conversa.
        els.mensagens.addEventListener('dragover', function (e) {
            e.preventDefault();
            els.chatTela.classList.add('arrastando');
        });
        els.mensagens.addEventListener('dragleave', function () {
            els.chatTela.classList.remove('arrastando');
        });
        els.mensagens.addEventListener('drop', async function (e) {
            e.preventDefault();
            els.chatTela.classList.remove('arrastando');
            const arquivos = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
            for (const arquivo of arquivos) await processarAnexo(arquivo);
        });
    }

    function configurarUI() {
        els.itemCamera.hidden = !Anexos.cameraDisponivel();

        els.sugestoes.innerHTML = SUGESTOES.map(function (s, i) {
            return `<button type="button" class="chip" data-sugestao="${i}">${EM.esc(s)}</button>`;
        }).join('');

        els.sugestoes.querySelectorAll('.chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                els.campoMensagem.value = SUGESTOES[Number(chip.dataset.sugestao)];
                atualizarContador();
                ajustarAlturaTextarea();
                els.formChat.requestSubmit();
            });
        });

        els.selectArea.innerHTML = '<option value="">Sem área específica</option>' +
            EM.AREAS.map(function (a) { return `<option value="${a.id}">${EM.esc(a.rotulo)}</option>`; }).join('');
    }

    /* ---------- partida ---------- */

    EM.iniciar('matilda', async function (usuario) {
        usuarioAtual = usuario;

        cacheEls();
        configurarUI();

        const salvo = carregarSessaoChat();
        if (salvo) {
            historico = salvo.historico || [];
            area = salvo.area || '';
            modo = salvo.modo || 'conversar';
            projetoId = salvo.projetoId || null;
            projetoTitulo = salvo.projetoTitulo || '';
        }

        const params = new URLSearchParams(window.location.search);
        const projetoParam = params.get('projeto');

        if (projetoParam) {
            try {
                const projeto = await api('/projetos/' + encodeURIComponent(projetoParam));

                // Projeto diferente do que estava salvo: começa a conversa do zero.
                if (projetoId !== projeto.id) historico = [];

                projetoId = projeto.id;
                projetoTitulo = projeto.titulo;
                modo = 'projeto';
            } catch (erro) {
                console.error(erro);
                EM.toast('Não consegui abrir esse projeto agora. Vamos conversar por aqui mesmo.', 'aviso');
            }
        }

        els.selectArea.value = area || '';
        definirModo(modo);
        renderHistorico();
        atualizarContador();
        salvarSessaoChat();

        ligarEventos();

        Estudo.ligar({
            obterMaterial: function () {
                return material.filter(function (m) { return m.status === 'ok'; })
                    .map(function (m) { return { nome: m.nome, texto: m.texto }; });
            }
        });
    });

})();
