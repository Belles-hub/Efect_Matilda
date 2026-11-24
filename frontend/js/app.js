/* =========================================================
   CASCA DO APP — navegação, topo, avisos, janelas e dados comuns

   Toda tela logada faz o mesmo começo: confere a sessão, monta a barra de
   navegação, carrega o perfil e chama a função da própria tela. Isso fica
   aqui, em EM.iniciar(), pra nenhuma tela repetir.

   Precisa carregar DEPOIS de config.js e sessao.js.
========================================================= */

const EM = {
    usuario: null,
    uid: null
};

/* ---------- dados que várias telas usam ---------- */

// As 8 áreas de interesse (Home, Descobrir, filtros de Experimente/Mulheres
// na Ciência/Oportunidades) — id bate com AreaInteresse no backend.
EM.AREAS = [
    { id: 'ciencia', rotulo: 'Ciência', icone: 'fa-flask', cor: 'rosa' },
    { id: 'tecnologia', rotulo: 'Tecnologia', icone: 'fa-microchip', cor: 'azul' },
    { id: 'programacao', rotulo: 'Programação', icone: 'fa-code', cor: 'ciano' },
    { id: 'ciberseguranca', rotulo: 'Cibersegurança', icone: 'fa-shield-halved', cor: 'lilas' },
    { id: 'inteligencia_artificial', rotulo: 'Inteligência Artificial', icone: 'fa-brain', cor: 'coral' },
    { id: 'meio_ambiente', rotulo: 'Meio Ambiente', icone: 'fa-leaf', cor: 'verde' },
    { id: 'ciencia_de_dados', rotulo: 'Ciência de Dados', icone: 'fa-chart-line', cor: 'amarelo' },
    { id: 'experimentos', rotulo: 'Experimentos', icone: 'fa-vial', cor: 'laranja' }
];

EM.areaPorId = function (id) {
    return EM.AREAS.find(function (a) { return a.id === id; }) || null;
};

EM.SERIES = [
    '6º ano', '7º ano', '8º ano', '9º ano',
    '1º ano do Ensino Médio', '2º ano do Ensino Médio', '3º ano do Ensino Médio', 'Outra'
];

// Ícones simples pro seletor de avatar do perfil — nada de mascote, só um
// símbolo científico à escolha.
EM.AVATARES = ['fa-flask', 'fa-rocket', 'fa-dna', 'fa-atom', 'fa-microscope', 'fa-satellite', 'fa-leaf', 'fa-brain'];

// Frases de ação (seção 17 do spec) — nunca "você pode ser o que quiser".
EM.FRASES = [
    'Que tal experimentar algo novo hoje?',
    'Cada pergunta sua é o começo de uma investigação.',
    'Curiosidade + prática = raciocínio científico.',
    'Errar uma hipótese também é dado científico.',
    'Um desafio de 10 minutos pode abrir um caminho novo.',
    'Descubra. Investigue. Crie. Participe.'
];

/* ---------- utilidades ---------- */

EM.esc = escaparHtml;

EM.primeiroNome = function (nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
};

EM.escolher = function (lista, i) {
    return lista[i % lista.length];
};

EM.formatarData = function (iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
};

EM.MES_ROTULO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

EM.mesAnoRotulo = function (iso) {
    if (!iso) return 'Sem data';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return 'Sem data';
    return EM.MES_ROTULO[d.getMonth()].toUpperCase() + ' ' + d.getFullYear();
};

/* ---------- avisos rápidos ---------- */

EM.toast = function (mensagem, tipo) {
    tipo = tipo || 'info';

    let area = document.getElementById('emToasts');

    if (!area) {
        area = document.createElement('div');
        area.id = 'emToasts';
        area.setAttribute('aria-live', 'polite');
        area.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:300;display:grid;gap:8px;max-width:520px;margin:0 auto;pointer-events:none';
        document.body.appendChild(area);
    }

    const aviso = document.createElement('div');
    aviso.className = 'cu-notificacao cu-notificacao--' + tipo;
    aviso.style.pointerEvents = 'auto';
    aviso.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    aviso.innerHTML = `<span class="cu-notificacao-texto">${EM.esc(mensagem)}</span>`;
    area.appendChild(aviso);

    setTimeout(function () { aviso.remove(); }, tipo === 'erro' ? 8000 : 4500);
};

/* ---------- janela (sheet) acessível ---------- */

EM.abrirSheet = function (titulo, html) {
    const anterior = document.activeElement;

    const fundo = document.createElement('div');
    fundo.className = 'sheet-fundo';
    fundo.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitulo">
            <div class="sheet__cab">
                <h2 id="sheetTitulo">${EM.esc(titulo)}</h2>
                <button type="button" class="btn btn--icone" data-fechar aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>
            <div data-corpo>${html}</div>
        </div>`;

    document.body.appendChild(fundo);
    document.body.style.overflow = 'hidden';

    const sheet = fundo.querySelector('.sheet');

    function fechar() {
        document.removeEventListener('keydown', aoTeclar);
        fundo.remove();
        document.body.style.overflow = '';
        if (anterior && anterior.focus) anterior.focus();
    }

    function aoTeclar(e) {
        if (e.key === 'Escape') { fechar(); return; }

        if (e.key !== 'Tab') return;

        // Mantém o Tab dentro da janela enquanto ela está aberta.
        const focaveis = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focaveis.length) return;

        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }

    document.addEventListener('keydown', aoTeclar);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    sheet.querySelector('[data-fechar]').addEventListener('click', fechar);

    (sheet.querySelector('input, select, textarea, [data-corpo] button') || sheet.querySelector('[data-fechar]')).focus();

    return { el: sheet, corpo: sheet.querySelector('[data-corpo]'), fechar: fechar };
};

EM.confirmar = function (titulo, texto, rotuloOk) {
    return new Promise(function (resolve) {
        const s = EM.abrirSheet(titulo, `
            <p class="subtitulo" style="margin-bottom:20px">${EM.esc(texto)}</p>
            <div class="grade">
                <button type="button" class="btn btn--perigo btn--bloco" data-ok>${EM.esc(rotuloOk || 'Confirmar')}</button>
                <button type="button" class="btn btn--suave btn--bloco" data-nao>Cancelar</button>
            </div>`);

        let resposta = false;

        s.el.querySelector('[data-ok]').addEventListener('click', function () { resposta = true; s.fechar(); });
        s.el.querySelector('[data-nao]').addEventListener('click', function () { s.fechar(); });

        // Resolve quando a janela sai da tela, seja por qual caminho for.
        const obs = new MutationObserver(function () {
            if (!document.body.contains(s.el)) { obs.disconnect(); resolve(resposta); }
        });
        obs.observe(document.body, { childList: true });
    });
};

/* ---------- navegação ---------- */

// principal: aparece direto na barra inferior do celular (as 5 telas do
// MVP — seção 15). As demais ficam atrás do botão "Mais" no celular, e
// aparecem todas juntas na barra lateral do desktop (tem espaço de sobra).
EM.NAV = [
    { id: 'inicio', href: 'inicio.html', icone: 'fa-house', rotulo: 'Início', principal: true },
    { id: 'descobrir', href: 'descobrir.html', icone: 'fa-compass', rotulo: 'Descobrir', principal: false },
    { id: 'experimentar', href: 'experimentar.html', icone: 'fa-flask', rotulo: 'Experimentar', principal: true },
    { id: 'matilda', href: 'matilda.html', icone: 'fa-comment-dots', rotulo: 'Chat', principal: true },
    { id: 'mulheres', href: 'mulheres.html', icone: 'fa-venus', rotulo: 'Mulheres na Ciência', principal: false },
    { id: 'oportunidades', href: 'oportunidades.html', icone: 'fa-trophy', rotulo: 'Oportunidades', principal: true },
    { id: 'projetos', href: 'projetos.html', icone: 'fa-lightbulb', rotulo: 'Meus Projetos', principal: false },
    { id: 'passaporte', href: 'passaporte.html', icone: 'fa-passport', rotulo: 'Passaporte', principal: true }
];

EM.montarNav = function (pagina) {
    const nav = document.getElementById('nav');

    if (!nav) return;

    nav.className = 'nav';
    nav.setAttribute('aria-label', 'Navegação principal');

    const itensPrincipais = EM.NAV.filter(function (i) { return i.principal; });
    const itensExtra = EM.NAV.filter(function (i) { return !i.principal; });

    function itemHtml(item) {
        const atual = item.id === pagina ? ' aria-current="page"' : '';
        const icone = `<i class="fa-solid ${item.icone}" aria-hidden="true"></i>`;

        return `<a class="nav__item${item.principal ? '' : ' nav__item--extra'}" href="${item.href}"${atual}>` +
            `${icone}<span>${item.rotulo}</span></a>`;
    }

    const algumExtraAtual = itensExtra.some(function (i) { return i.id === pagina; });

    nav.innerHTML =
        '<a class="nav__logo marca" href="inicio.html"><img class="logo-clara" src="img/logo-efect-matilda.png" alt="Efect Matilda"><img class="logo-escura" src="img/logo-efect-matilda-ameixa.png" alt="" aria-hidden="true"></a>' +
        itensPrincipais.map(itemHtml).join('') +
        `<button type="button" class="nav__item nav__mais"${algumExtraAtual ? ' aria-current="page"' : ''}>` +
        `<i class="fa-solid fa-ellipsis" aria-hidden="true"></i><span>Mais</span></button>` +
        itensExtra.map(itemHtml).join('') +
        '<button type="button" class="nav__sair" id="navSair"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Sair</span></button>';

    nav.querySelector('#navSair').addEventListener('click', EM.sair);

    // Botão flutuante: o chat com a Matilda fica sempre à mão (menos na própria tela do chat).
    if (pagina !== 'matilda' && !document.getElementById('fabChat')) {
        const fab = document.createElement('a');
        fab.id = 'fabChat';
        fab.className = 'fab-chat';
        fab.href = 'matilda.html';
        fab.setAttribute('aria-label', 'Abrir o chat com a Matilda');
        fab.innerHTML = '<i class="fa-solid fa-comment-dots" aria-hidden="true"></i><span>Chat com a Matilda</span>';
        document.body.appendChild(fab);
    }

    nav.querySelector('.nav__mais').addEventListener('click', function () {
        const html = '<div class="atalhos-lista">' + itensExtra.map(function (item) {
            return `<a class="atalho-linha" href="${item.href}"><i class="fa-solid ${item.icone}" aria-hidden="true"></i><span>${item.rotulo}</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>`;
        }).join('') + '</div>';

        EM.abrirSheet('Mais opções', html);
    });
};

EM.sair = async function () {
    await encerrarSessao();
    window.location.href = 'index.html';
};

// Topo das telas internas: logo (só no celular — no desktop ela fica na
// lateral), acessibilidade e notificações.
EM.montarTopo = function () {
    const topo = document.getElementById('topo');

    if (!topo) return;

    topo.className = 'topo';
    topo.innerHTML = `
        <a class="topo__logo marca" href="inicio.html" aria-label="Efect Matilda, ir para o início"><img class="logo-clara" src="img/logo-efect-matilda.png" alt=""><img class="logo-escura" src="img/logo-efect-matilda-ameixa.png" alt="" aria-hidden="true"></a>
        <span class="topo__logo" style="flex:1"></span>
        <div class="topo__acoes">
            <a class="topo__perfil" id="btnPerfil" href="perfil.html" aria-label="Meu perfil"><i class="fa-solid fa-user" aria-hidden="true"></i></a>
            <a class="btn btn--icone" href="acessibilidade.html" aria-label="Acessibilidade"><i class="fa-solid fa-universal-access" aria-hidden="true"></i></a>
            <button type="button" class="btn btn--icone" id="btnNotif" aria-label="Notificações" style="position:relative">
                <i class="fa-regular fa-bell" aria-hidden="true"></i>
                <span id="notifBadge" hidden style="position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;border-radius:10px;background:var(--erro);color:#fff;font:800 .7rem/20px var(--fonte-corpo);text-align:center;padding:0 5px"></span>
            </button>
        </div>`;

    topo.querySelector('#btnNotif').addEventListener('click', EM.abrirNotificacoes);
};

// Preenche a bolinha do canto com o ícone escolhido pela pessoa.
EM.atualizarBolinhaPerfil = function (avatar) {
    const bolinha = document.getElementById('btnPerfil');
    if (!bolinha) return;

    const icone = avatar || (EM.usuario && EM.usuario.preferencias && EM.usuario.preferencias.avatar) || 'fa-user';
    const nome = (EM.usuario && EM.usuario.nome) ? EM.usuario.nome : '';

    bolinha.innerHTML = `<i class="fa-solid ${EM.esc(icone)}" aria-hidden="true"></i>`;
    bolinha.setAttribute('aria-label', nome ? 'Meu perfil, ' + nome : 'Meu perfil');
    bolinha.title = nome ? 'Perfil de ' + nome : 'Meu perfil';
};

EM.carregarNotificacoes = async function () {
    try {
        EM.notificacoes = await api('/notificacoes/' + encodeURIComponent(EM.uid));

        const naoLidas = EM.notificacoes.filter(function (n) { return !n.lida; }).length;
        const selo = document.getElementById('notifBadge');
        const botao = document.getElementById('btnNotif');

        if (selo) {
            selo.hidden = naoLidas === 0;
            selo.textContent = String(naoLidas);
        }

        if (botao) {
            botao.setAttribute('aria-label', naoLidas ? `Notificações, ${naoLidas} nova(s)` : 'Notificações');
        }
    } catch (erro) {
        EM.notificacoes = [];
    }
};

EM.formatarDataHora = function (valor) {
    if (!valor) return '';

    const d = new Date(valor);

    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' +
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

EM.abrirNotificacoes = async function () {
    const lista = EM.notificacoes || [];

    const html = lista.length
        ? `<div class="grade">${lista.map(function (n) {
            return `<div class="notif${n.lida ? '' : ' nova'}"><span>${EM.esc(n.mensagem)}</span><small>${n.lida ? '' : 'Nova · '}${EM.esc(EM.formatarDataHora(n.criado_em))}</small></div>`;
        }).join('')}</div>`
        : '<div class="vazio"><span class="icone-circulo icone-circulo--grande"><i class="fa-regular fa-bell" aria-hidden="true"></i></span><p>Nenhuma notificação por enquanto. Tudo tranquilo por aqui!</p></div>';

    EM.abrirSheet('Notificações', html);

    if (lista.some(function (n) { return !n.lida; })) {
        try {
            await api('/notificacoes/' + encodeURIComponent(EM.uid) + '/marcar-lidas', { metodo: 'POST' });
            const selo = document.getElementById('notifBadge');
            if (selo) selo.hidden = true;
        } catch (erro) { /* só não marcou como lida desta vez */ }
    }
};

/* ---------- partida de toda tela logada ---------- */

const TAMANHO_FONTE_PARA_ACESS = { pequena: 'pequena', media: 'media', grande: 'grande' };

// pagina: id do item de navegação. aoCarregar(usuario): função da tela.
EM.iniciar = async function (pagina, aoCarregar, opcoes) {
    opcoes = opcoes || {};

    if (!opcoes.semNav) {
        EM.montarNav(pagina);
        EM.montarTopo();
    }

    const principal = document.getElementById('conteudo');

    try {
        const sessao = await obterSessaoAtual();
        EM.uid = sessao.uid;

        EM.usuario = await api('/usuarios/' + encodeURIComponent(sessao.uid));

        // Primeira vez: o tamanho de letra que a pessoa escolheu vale como
        // ponto de partida — depois disso quem manda é o painel de acessibilidade.
        if (!localStorage.getItem(ACESS_CHAVE) && TAMANHO_FONTE_PARA_ACESS[EM.usuario.preferencias.tamanho_fonte]) {
            Acess.definir('fonte', TAMANHO_FONTE_PARA_ACESS[EM.usuario.preferencias.tamanho_fonte]);
        }

        if (!EM.usuario.preferencias.onboarding_concluido && !opcoes.semOnboarding) {
            window.location.replace('descobrir.html');
            return;
        }

        if (!opcoes.semNav) {
            EM.atualizarBolinhaPerfil();
            EM.carregarNotificacoes();
        }

        await aoCarregar(EM.usuario);

    } catch (erro) {
        console.error(erro);

        // Sessão inválida ou conta que não existe mais: volta pro login.
        if (erro.status === 401 || erro.status === 403 || erro.status === 404 || erro.message === 'Sem sessão ativa.') {
            limparSessaoLocal();
            window.location.replace('login.html');
            return;
        }

        // Qualquer outra falha (servidor fora do ar, sem internet): NÃO desloga
        // — a pessoa continua com a conta, só precisa tentar de novo.
        if (principal) {
            principal.innerHTML = `
                <div class="vazio">
                    <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i></span>
                    <h2>Não conseguimos carregar agora</h2>
                    <p>${EM.esc(erro.message || 'Verifique sua internet e tente de novo.')}</p>
                    <button type="button" class="btn btn--primario" onclick="location.reload()">Tentar de novo</button>
                </div>`;
        }
    }
};

/* ---------- formulários ---------- */

EM.mostrarErroCampo = function (input, mensagem) {
    const campo = input.closest('.campo');
    const erro = campo && campo.querySelector('.campo__erro');

    if (campo) campo.classList.add('campo--erro');
    if (erro) { erro.textContent = mensagem; input.setAttribute('aria-describedby', erro.id); }
    input.setAttribute('aria-invalid', 'true');
};

EM.limparErros = function (form) {
    form.querySelectorAll('.campo--erro').forEach(function (c) { c.classList.remove('campo--erro'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
};

// Botão de mostrar/ocultar senha (.senha-wrap > input + button).
EM.ligarSenhas = function () {
    document.querySelectorAll('.senha-wrap').forEach(function (wrap) {
        const input = wrap.querySelector('input');
        const botao = wrap.querySelector('button');

        botao.addEventListener('click', function () {
            const mostrando = input.type === 'text';

            input.type = mostrando ? 'password' : 'text';
            botao.innerHTML = `<i class="fa-solid ${mostrando ? 'fa-eye' : 'fa-eye-slash'}" aria-hidden="true"></i>`;
            botao.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
            botao.setAttribute('aria-pressed', String(!mostrando));
        });
    });
};

EM.carregando = function (botao, ligado, textoOriginal) {
    if (ligado) {
        botao.dataset.original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = `<i class="fa-solid fa-circle-notch girando" aria-hidden="true"></i> ${EM.esc(textoOriginal || 'Aguarde...')}`;
    } else {
        botao.disabled = false;
        botao.innerHTML = botao.dataset.original || botao.innerHTML;
    }
};

// Esqueleto de carregamento (N blocos) dentro de um container.
EM.esqueleto = function (container, quantos, altura) {
    container.innerHTML = Array.from({ length: quantos || 3 }, function () {
        return `<div class="esqueleto" style="min-height:${altura || 90}px" aria-hidden="true"></div>`;
    }).join('');
    container.setAttribute('aria-busy', 'true');
};
