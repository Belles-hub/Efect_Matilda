/* =========================================================
   ACESSIBILIDADE — motor único, carregado no <head> de todas as telas

   Cada ajuste vira um atributo no <html> (data-fonte, data-contraste...)
   e o matilda.css cuida do visual de cada um. Carrega no <head>, antes da
   página aparecer, pra a tela já abrir do jeito que a pessoa configurou
   (sem "piscar" no tamanho errado).

   O estado fica no localStorage (vale mesmo sem login) e, quando há sessão,
   também é guardado na conta (PUT /perfil/{id}/acessibilidade) pra valer em
   qualquer aparelho.
========================================================= */

const ACESS_CHAVE = 'efectmatilda_acess';

const ACESS_PADRAO = {
    fonte: 'media',          // 'pequena' | 'media' | 'grande'
    contraste: null,         // true = alto contraste (null = segue o sistema)
    escuro: null,            // true = tema escuro (null = segue o sistema)
    reduzir: false,          // diminuir animações e interações
    foco: false,             // modo foco: só o essencial na tela
    leituraFacil: false,     // fonte de leitura fácil (Atkinson Hyperlegible)
    espacamento: 0,          // 0 a 2
    guia: false,             // guia de leitura que segue o mouse/foco
    audio: false,            // mostra o botão "Ouvir a tela"
    libras: false            // tradutor VLibras
};

const Acess = {
    estado: { ...ACESS_PADRAO },
    _ouvintes: [],
    _timerRemoto: null
};

Acess.validar = function (bruto) {
    // Aceita só chaves e valores conhecidos — o estado também pode vir da
    // conta (API), e nunca deve virar atributo no <html> sem passar por aqui.
    const limpo = { ...ACESS_PADRAO };

    if (!bruto || typeof bruto !== 'object') return limpo;

    if (['pequena', 'media', 'grande'].includes(bruto.fonte)) limpo.fonte = bruto.fonte;
    if (typeof bruto.contraste === 'boolean') limpo.contraste = bruto.contraste;
    if (typeof bruto.escuro === 'boolean') limpo.escuro = bruto.escuro;
    ['reduzir', 'foco', 'leituraFacil', 'guia', 'audio', 'libras'].forEach(function (k) {
        if (typeof bruto[k] === 'boolean') limpo[k] = bruto[k];
    });
    if ([0, 1, 2].includes(bruto.espacamento)) limpo.espacamento = bruto.espacamento;

    return limpo;
};

Acess.carregar = function () {
    try {
        Acess.estado = Acess.validar(JSON.parse(localStorage.getItem(ACESS_CHAVE)));
    } catch (erro) {
        Acess.estado = { ...ACESS_PADRAO };
    }
};

Acess.salvarLocal = function () {
    try {
        localStorage.setItem(ACESS_CHAVE, JSON.stringify(Acess.estado));
    } catch (erro) {
        // Armazenamento bloqueado (aba anônima etc.): o ajuste vale só nesta tela.
    }
};

Acess.aplicar = function () {
    const e = Acess.estado;
    const raiz = document.documentElement;

    const sistemaEscuro = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    const sistemaContraste = window.matchMedia && matchMedia('(prefers-contrast: more)').matches;

    const escuro = e.escuro === null ? sistemaEscuro : e.escuro;
    const contraste = e.contraste === null ? sistemaContraste : e.contraste;

    raiz.dataset.fonte = e.fonte;
    raiz.dataset.tema = escuro ? 'escuro' : 'claro';
    raiz.dataset.contraste = contraste ? 'alto' : 'normal';
    raiz.dataset.reduzir = e.reduzir ? '1' : '0';
    raiz.dataset.foco = e.foco ? '1' : '0';
    raiz.dataset.fonteLeitura = e.leituraFacil ? '1' : '0';
    raiz.dataset.espacamento = String(e.espacamento);
    raiz.dataset.guia = e.guia ? '1' : '0';
    raiz.dataset.audio = e.audio ? '1' : '0';

    Acess._ouvintes.forEach(function (fn) { fn(e); });
};

Acess.aoMudar = function (fn) {
    Acess._ouvintes.push(fn);
};

Acess.definir = function (chave, valor) {
    if (!(chave in ACESS_PADRAO)) return;

    Acess.estado = Acess.validar({ ...Acess.estado, [chave]: valor });
    Acess.salvarLocal();
    Acess.aplicar();
    Acess.agendarEnvio();
};

Acess.redefinir = function () {
    // Volta ao padrão de fábrica (inclusive "seguir o sistema" no tema).
    Acess.estado = { ...ACESS_PADRAO };
    Acess.salvarLocal();
    Acess.aplicar();
    Acess.agendarEnvio();
};

/* ---------- conta (sincroniza entre aparelhos) ---------- */

Acess.agendarEnvio = function () {
    if (typeof obterSessaoAtual !== 'function' || typeof API_BASE_URL === 'undefined') return;

    clearTimeout(Acess._timerRemoto);

    // Espera a pessoa parar de clicar antes de enviar — clicar em vários
    // ajustes seguidos vira uma requisição só.
    Acess._timerRemoto = setTimeout(async function () {
        try {
            const { token, uid } = await obterSessaoAtual();

            await fetch(`${API_BASE_URL}/perfil/${encodeURIComponent(uid)}/acessibilidade`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ efectmatilda: Acess.estado })
            });
        } catch (erro) {
            // Sem sessão ou sem internet: já está salvo neste aparelho.
        }
    }, 700);
};

Acess.sincronizarComConta = async function () {
    try {
        const { token, uid } = await obterSessaoAtual();

        const resposta = await fetch(`${API_BASE_URL}/perfil/${encodeURIComponent(uid)}/acessibilidade`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resposta.ok) return;

        const dados = await resposta.json();

        // Conta que nunca salvou nada: vale o que já está neste aparelho.
        if (!dados || !dados.efectmatilda) {
            Acess.agendarEnvio();
            return;
        }

        Acess.estado = Acess.validar(dados.efectmatilda);
        Acess.salvarLocal();
        Acess.aplicar();

    } catch (erro) {
        // Sem sessão: segue só com o que tem neste aparelho.
    }
};

/* ---------- ouvir a tela (Web Speech API) ---------- */

Acess.falando = false;

Acess.escolherVoz = function () {
    if (!('speechSynthesis' in window)) return null;

    const vozes = speechSynthesis.getVoices();

    // O navegador não informa o gênero da voz, então a preferência por voz
    // feminina é feita pelo nome (Windows, Edge, Chrome, macOS e Android).
    const femininas = /francisca|maria|google portugu|luciana|fernanda|vit[oó]ria|thalita|female|feminina/i;
    const masculinas = /antonio|antônio|daniel|felipe|ricardo|male\b|masculin/i;

    const ptBR = vozes.filter(v => v.lang && v.lang.replace('_', '-') === 'pt-BR');
    const pt = ptBR.length ? ptBR : vozes.filter(v => v.lang && v.lang.startsWith('pt'));

    return pt.find(v => femininas.test(v.name))
        || pt.find(v => !masculinas.test(v.name))
        || pt[0]
        || null;
};

Acess.parar = function () {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    Acess.falando = false;
    document.dispatchEvent(new CustomEvent('efectmatilda:fala', { detail: false }));
};

Acess.falar = function (texto) {
    if (!('speechSynthesis' in window)) {
        return false;
    }

    speechSynthesis.cancel();

    // Quebra em frases: vozes do navegador costumam engasgar (ou cortar)
    // em textos muito longos falados de uma vez só.
    const pedacos = texto.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [texto];
    const voz = Acess.escolherVoz();

    pedacos.forEach(function (pedaco, i) {
        const fala = new SpeechSynthesisUtterance(pedaco.trim());
        fala.lang = 'pt-BR';
        fala.rate = 0.95;
        if (voz) fala.voice = voz;

        if (i === pedacos.length - 1) {
            fala.onend = fala.onerror = function () {
                Acess.falando = false;
                document.dispatchEvent(new CustomEvent('efectmatilda:fala', { detail: false }));
            };
        }

        speechSynthesis.speak(fala);
    });

    Acess.falando = true;
    document.dispatchEvent(new CustomEvent('efectmatilda:fala', { detail: true }));

    return true;
};

Acess.ouvirTela = function () {
    if (Acess.falando) {
        Acess.parar();
        return;
    }

    const selecao = window.getSelection && String(window.getSelection()).trim();
    const principal = document.getElementById('conteudo') || document.body;
    const texto = selecao || principal.innerText;

    if (!Acess.falar(texto.slice(0, 6000))) {
        alert('Seu navegador não tem leitura em voz alta.');
    }
};

/* ---------- VLibras ---------- */

Acess.atualizarLibras = function () {
    let caixa = document.querySelector('[vw]');

    if (!Acess.estado.libras) {
        if (caixa) caixa.style.display = 'none';
        return;
    }

    if (caixa) {
        caixa.style.display = '';
        return;
    }

    caixa = document.createElement('div');
    caixa.setAttribute('vw', '');
    caixa.className = 'enabled';
    caixa.innerHTML =
        '<div vw-access-button class="active"></div>' +
        '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(caixa);

    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = function () {
        try {
            new window.VLibras.Widget('https://vlibras.gov.br/app');
        } catch (erro) {
            console.error('VLibras não carregou:', erro);
        }
    };
    document.head.appendChild(script);
};

/* ---------- guia de leitura ---------- */

Acess.prepararGuia = function () {
    const guia = document.createElement('div');
    guia.className = 'guia-leitura';
    guia.setAttribute('aria-hidden', 'true');
    document.body.appendChild(guia);

    function mover(y) {
        guia.style.top = Math.max(0, y - 23) + 'px';
    }

    document.addEventListener('mousemove', function (e) { if (Acess.estado.guia) mover(e.clientY); });
    document.addEventListener('touchmove', function (e) {
        if (Acess.estado.guia && e.touches[0]) mover(e.touches[0].clientY);
    }, { passive: true });
    // Quem navega por teclado: o guia acompanha o elemento em foco.
    document.addEventListener('focusin', function (e) {
        if (Acess.estado.guia) {
            const r = e.target.getBoundingClientRect();
            mover(r.top + r.height / 2);
        }
    });
};

/* ---------- botão "Ouvir a tela" ---------- */

Acess.prepararBotaoOuvir = function () {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'ouvir-flutuante';
    botao.hidden = true;
    botao.innerHTML = '<i class="fa-solid fa-volume-high" aria-hidden="true"></i><span>Ouvir a tela</span>';
    botao.addEventListener('click', Acess.ouvirTela);
    document.body.appendChild(botao);

    document.addEventListener('efectmatilda:fala', function (e) {
        botao.querySelector('span').textContent = e.detail ? 'Parar leitura' : 'Ouvir a tela';
        botao.querySelector('i').className = e.detail ? 'fa-solid fa-stop' : 'fa-solid fa-volume-high';
    });

    Acess.aoMudar(function (estado) {
        botao.hidden = !estado.audio;
        if (!estado.audio) Acess.parar();
    });

    botao.hidden = !Acess.estado.audio;
};

/* ---------- partida ---------- */

Acess.carregar();
Acess.aplicar();

document.addEventListener('DOMContentLoaded', function () {
    Acess.prepararGuia();
    Acess.prepararBotaoOuvir();
    Acess.aoMudar(Acess.atualizarLibras);
    Acess.atualizarLibras();

    if (typeof obterSessaoAtual === 'function' && localStorage.getItem('efectmatilda_token')) {
        Acess.sincronizarComConta();
    }
});

// Some com a fala quando a pessoa sai da página.
window.addEventListener('pagehide', function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); });
