/* =========================================
   FORMAS — personagens coloridos com carinha (estrelas, flores, blobs...)

   Inspirado na coleção "Emotions": cada forma é um SVG com rosto. Elas
   enfeitam a plataforma e também reagem: os olhos seguem o cursor, tocar
   faz a forma quicar e mudar de humor, e dá pra soltar uma "chuva" delas
   em comemorações.

   Uso no HTML (vira SVG sozinho ao carregar a página):
     <span data-forma="estrela" data-cor="coral" data-emocao="feliz" data-tamanho="90"></span>
     (acrescente data-toque pra forma ser um botão que muda de humor)

   Tudo respeita o painel de acessibilidade: sem animação quando o
   movimento está reduzido; formas só de enfeite ficam fora do leitor de tela.
========================================= */

const Formas = (function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';

    /* cor do preenchimento + cor do rosto que contrasta com ela */
    const CORES = {
        coral:    { f: '#ee5a3c', t: '#2b1420', n: '#ffd9cf' },
        amarelo:  { f: '#f7b32b', t: '#2b1420', n: '#e85d3c' },
        lilas:    { f: '#b79be0', t: '#2b1420', n: '#6b3fb5' },
        azul:     { f: '#3b6fc2', t: '#f2f6ff', n: '#9fd0ff' },
        verde:    { f: '#8fd9b0', t: '#15322a', n: '#2f9f74' },
        rosa:     { f: '#ec8fb6', t: '#2b1420', n: '#b8295f' },
        laranja:  { f: '#f08a3c', t: '#2b1420', n: '#fff0d6' },
        roxo:     { f: '#9a6fd6', t: '#fbf5ff', n: '#ffe27a' },
        pessego:  { f: '#f4c09e', t: '#2b1420', n: '#e85d3c' },
        celeste:  { f: '#c7d6ee', t: '#22304f', n: '#3b6fc2' }
    };

    const ORDEM_CORES = Object.keys(CORES);

    /* humores: olhos, sobrancelhas (opcional), boca, bochechas, extra */
    const HUMORES = {
        feliz:      { olhos: 'arco-cima', boca: 'M38 60 Q50 72 62 60', bochecha: true },
        animado:    { olhos: 'pontos', boca: 'M40 59 Q50 75 60 59 Z', bocaCheia: true, bochecha: true },
        calmo:      { olhos: 'arco-baixo', boca: 'M42 61 Q50 67 58 61', bochecha: false },
        orgulhoso:  { olhos: 'arco-cima', boca: 'M40 60 Q50 69 60 60', bochecha: true },
        bravo:      { olhos: 'pontos', sobr: 'bravo', boca: 'M41 66 Q50 58 59 66', bochecha: false },
        triste:     { olhos: 'pontos', sobr: 'triste', boca: 'M41 66 Q50 59 59 66', lagrima: true },
        preocupado: { olhos: 'pontos', sobr: 'triste', boca: 'M40 64 q3 -4 5 0 t5 0 t5 0 t5 0', bochecha: false },
        surpreso:   { olhos: 'redondos', boca: 'O', bochecha: false },
        cansado:    { olhos: 'linhas', boca: 'M43 63 L57 63', bochecha: false },
        confuso:    { olhos: 'pontos', sobr: 'confuso', boca: 'M42 64 Q48 60 54 64 T62 62', bochecha: false }
    };

    const ORDEM_HUMORES = ['feliz', 'animado', 'calmo', 'orgulhoso', 'surpreso', 'cansado', 'confuso', 'preocupado'];

    /* ---------- formas (corpo do personagem) ---------- */

    function poligono(n, rExt, rInt) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) {
            const ang = (Math.PI * i) / n - Math.PI / 2;
            const r = i % 2 === 0 ? rExt : rInt;
            pts.push((50 + r * Math.cos(ang)).toFixed(1) + ',' + (50 + r * Math.sin(ang)).toFixed(1));
        }
        return '<polygon points="' + pts.join(' ') + '" stroke-linejoin="round" stroke-width="7"/>';
    }

    function petalas(n, distancia, raio, centro) {
        let s = '<circle cx="50" cy="50" r="' + centro + '"/>';
        for (let i = 0; i < n; i++) {
            const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
            s += '<circle cx="' + (50 + distancia * Math.cos(ang)).toFixed(1) + '" cy="' + (50 + distancia * Math.sin(ang)).toFixed(1) + '" r="' + raio + '"/>';
        }
        return s;
    }

    const CORPOS = {
        circulo:   '<circle cx="50" cy="50" r="46"/>',
        estrela:   poligono(8, 47, 27),
        estrela4:  poligono(4, 48, 20),
        sol:       petalas(12, 37, 11, 38),
        flor:      petalas(6, 27, 20, 27),
        florzinha: petalas(8, 31, 14, 30),
        trevo:     '<circle cx="30" cy="30" r="24"/><circle cx="70" cy="30" r="24"/><circle cx="30" cy="70" r="24"/><circle cx="70" cy="70" r="24"/><rect x="28" y="28" width="44" height="44"/>',
        pilula:    '<rect x="4" y="24" width="92" height="52" rx="26"/>',
        quadrado:  '<rect x="10" y="10" width="80" height="80" rx="6"/>',
        mole:      '<rect x="8" y="8" width="84" height="84" rx="28"/>',
        hexagono:  poligono(3, 47, 47).replace(/points="[^"]+"/, 'points="50,4 92,27 92,73 50,96 8,73 8,27"'),
        triangulo: '<polygon points="50,8 93,88 7,88" stroke-linejoin="round" stroke-width="8"/>',
        losango:   '<polygon points="50,4 97,50 50,96 3,50" stroke-linejoin="round" stroke-width="6"/>',
        castelo:   '<rect x="6" y="34" width="88" height="58" rx="6"/><circle cx="24" cy="34" r="18"/><circle cx="50" cy="30" r="18"/><circle cx="76" cy="34" r="18"/>',
        blob:      '<path d="M50 5 C76 3 97 25 93 52 C91 79 68 97 45 93 C21 90 5 70 8 45 C10 21 28 7 50 5Z"/>',
        nuvem:     '<circle cx="28" cy="56" r="22"/><circle cx="50" cy="40" r="26"/><circle cx="72" cy="56" r="22"/><rect x="28" y="52" width="44" height="26" rx="10"/>',
        boneco:    '<circle cx="50" cy="15" r="13"/><circle cx="50" cy="58" r="38"/>',
        pentagono: '<polygon points="50,6 94,38 77,92 23,92 6,38" stroke-linejoin="round" stroke-width="10"/>',
        mancha:    '<path d="M22 14 C44 -2 74 6 88 26 C100 46 96 70 80 86 C62 100 32 98 16 82 C-2 62 2 30 22 14Z"/>',
        mancha2:   '<path d="M30 8 C54 2 82 14 92 38 C100 60 88 86 62 94 C38 100 12 88 6 62 C0 36 10 14 30 8Z"/>',
        estrelalivros:
            '<g transform="translate(0,-8)">' + poligono(8, 43, 27) + '</g>' +
            '<ellipse cx="39" cy="97" rx="9" ry="4.5" fill="#2b1420" stroke="none"/><ellipse cx="61" cy="97" rx="9" ry="4.5" fill="#2b1420" stroke="none"/>' +
            '<rect x="25" y="80" width="50" height="12" rx="2.5" fill="#3b6fc2" stroke="none"/><rect x="29" y="84" width="42" height="1.8" fill="#ffffff" opacity=".7" stroke="none"/>' +
            '<rect x="29" y="69" width="44" height="12" rx="2.5" fill="#ffffff" stroke="none"/><rect x="33" y="73" width="36" height="1.8" fill="#f0a3b8" stroke="none"/>' +
            '<rect x="26" y="58" width="46" height="12" rx="2.5" fill="#ee82b3" stroke="none"/><rect x="30" y="62" width="38" height="1.8" fill="#ffffff" opacity=".8" stroke="none"/>' +
            '<circle cx="21" cy="68" r="5.5"/><circle cx="79" cy="68" r="5.5"/>' +
            '<polygon points="30,9 54,1 79,9 54,17" fill="#2b1420" stroke="#2b1420" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="M41 14 L41 22 Q54 28 67 22 L67 14 Z" fill="#2b1420" stroke="none"/>' +
            '<path d="M79 9 L83 22" stroke="#ee82b3" stroke-width="2" fill="none"/><circle cx="83" cy="24" r="2.6" fill="#ee82b3" stroke="none"/>'
    };

    /* formas que só servem de cenário (sem carinha): ficam fora do sorteio */
    const SO_FUNDO = ['mancha', 'mancha2', 'estrelalivros'];

    const ORDEM_FORMAS = Object.keys(CORPOS).filter(function (f) { return SO_FUNDO.indexOf(f) === -1; });

    /* ---------- rosto ---------- */

    function olhos(tipo) {
        const y = 47;
        if (tipo === 'arco-cima') {
            return '<path d="M31 ' + (y + 2) + ' Q37 ' + (y - 6) + ' 43 ' + (y + 2) + ' M57 ' + (y + 2) + ' Q63 ' + (y - 6) + ' 69 ' + (y + 2) + '" />';
        }
        if (tipo === 'arco-baixo') {
            return '<path d="M31 ' + (y - 1) + ' Q37 ' + (y + 6) + ' 43 ' + (y - 1) + ' M57 ' + (y - 1) + ' Q63 ' + (y + 6) + ' 69 ' + (y - 1) + '" />';
        }
        if (tipo === 'linhas') {
            return '<path d="M31 ' + y + ' L43 ' + y + ' M57 ' + y + ' L69 ' + y + '" />';
        }
        if (tipo === 'redondos') {
            return '<circle class="cheio" cx="37" cy="' + y + '" r="4.5"/><circle class="cheio" cx="63" cy="' + y + '" r="4.5"/>';
        }
        return '<circle class="cheio" cx="37" cy="' + y + '" r="3.6"/><circle class="cheio" cx="63" cy="' + y + '" r="3.6"/>';
    }

    function sobrancelhas(tipo) {
        if (tipo === 'bravo') return '<path d="M30 38 L44 43 M70 38 L56 43" />';
        if (tipo === 'triste') return '<path d="M30 42 L44 37 M70 42 L56 37" />';
        if (tipo === 'confuso') return '<path d="M30 39 L44 39 M56 42 L70 36" />';
        return '';
    }

    function rosto(humor, cor) {
        if (humor === 'nenhum') return '';
        const h = HUMORES[humor] || HUMORES.feliz;
        const c = CORES[cor] || CORES.coral;

        let s = '<g class="rosto" fill="none" stroke="' + c.t + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">';

        if (h.bochecha) {
            s += '<circle cx="28" cy="58" r="5.5" fill="#ff7aa8" stroke="none" opacity=".55"/><circle cx="72" cy="58" r="5.5" fill="#ff7aa8" stroke="none" opacity=".55"/>';
        }

        s += '<g class="olhos" style="--t:' + c.t + '">' + olhos(h.olhos).replace(/class="cheio"/g, 'class="cheio" fill="' + c.t + '" stroke="none"') + '</g>';
        s += sobrancelhas(h.sobr);

        s += '<circle cx="50" cy="54" r="2.6" fill="' + c.n + '" stroke="none"/>';

        if (h.boca === 'O') {
            s += '<ellipse cx="50" cy="65" rx="4" ry="5" fill="' + c.t + '" stroke="none"/>';
        } else {
            s += '<path d="' + h.boca + '"' + (h.bocaCheia ? ' fill="' + c.t + '"' : '') + '/>';
        }

        if (h.lagrima) {
            s += '<path d="M66 53 q-4 7 0 9 q4 -2 0 -9z" fill="#9fd8ff" stroke="none"/>';
        }

        return s + '</g>';
    }

    /* ---------- montagem ---------- */

    function svg(forma, cor, humor, opcoes) {
        opcoes = opcoes || {};
        const c = CORES[cor] || CORES.coral;
        const corpo = CORPOS[forma] || CORPOS.circulo;

        // stroke da mesma cor arredonda as pontas das estrelas e dos polígonos
        return '<svg class="forma__svg" viewBox="0 0 100 100" focusable="false" aria-hidden="true">' +
            '<g class="corpo" fill="' + c.f + '" stroke="' + c.f + '" stroke-linejoin="round">' + corpo + '</g>' +
            (forma === 'estrelalivros' ? '<g transform="translate(0,-9)">' + rosto(humor, cor) + '</g>' : rosto(humor, cor)) +
            '</svg>';
    }

    function aleatorio(lista) {
        return lista[Math.floor(Math.random() * lista.length)];
    }

    function movimentoReduzido() {
        const raiz = document.documentElement;
        return raiz.dataset.reduzir === '1' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function rotuloHumor(humor) {
        return { feliz: 'feliz', animado: 'animada', calmo: 'calma', orgulhoso: 'orgulhosa', bravo: 'brava', triste: 'triste', preocupado: 'preocupada', surpreso: 'surpresa', cansado: 'cansada', confuso: 'confusa' }[humor] || humor;
    }

    /* Cria o elemento de uma forma. opcoes: forma, cor, humor, tamanho, toque, flutua, atraso */
    function criar(opcoes) {
        const forma = opcoes.forma || aleatorio(ORDEM_FORMAS);
        const cor = opcoes.cor || aleatorio(ORDEM_CORES);
        const humor = opcoes.humor || aleatorio(ORDEM_HUMORES);

        const el = document.createElement(opcoes.toque ? 'button' : 'span');
        el.className = 'forma' + (opcoes.flutua ? ' forma--flutua' : '') + (opcoes.toque ? ' forma--toque' : '');
        el.dataset.forma = forma;
        el.dataset.cor = cor;
        el.dataset.humor = humor;

        if (opcoes.tamanho) el.style.setProperty('--tam', opcoes.tamanho + 'px');
        if (opcoes.atraso != null) el.style.setProperty('--atraso', opcoes.atraso + 's');
        if (opcoes.rotacao != null) el.style.setProperty('--rot', opcoes.rotacao + 'deg');

        el.innerHTML = svg(forma, cor, humor);

        if (opcoes.toque) {
            el.type = 'button';
            el.setAttribute('aria-label', 'Forminha ' + rotuloHumor(humor) + '. Toque para mudar o humor.');
            el.addEventListener('click', function () { aoTocar(el); });
        } else {
            el.setAttribute('aria-hidden', 'true');
        }

        return el;
    }

    function trocarHumor(el, humor) {
        el.dataset.humor = humor;
        el.innerHTML = svg(el.dataset.forma, el.dataset.cor, humor);

        if (el.classList.contains('forma--toque')) {
            el.setAttribute('aria-label', 'Forminha ' + rotuloHumor(humor) + '. Toque para mudar o humor.');
        }
    }

    function quicar(el) {
        el.classList.remove('forma--quica');
        // força o navegador a reiniciar a animação
        void el.offsetWidth;
        el.classList.add('forma--quica');
    }

    function aoTocar(el) {
        const atual = ORDEM_HUMORES.indexOf(el.dataset.humor);
        trocarHumor(el, ORDEM_HUMORES[(atual + 1) % ORDEM_HUMORES.length]);
        quicar(el);
        festa(el, 6);
    }

    /* Chuva de forminhas saindo do elemento (comemoração). */
    function festa(origem, quantidade) {
        if (movimentoReduzido() || !origem || !origem.getBoundingClientRect || !document.body.animate) return;

        const r = origem.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const total = quantidade || 10;

        for (let i = 0; i < total; i++) {
            const mini = criar({ tamanho: 22 + Math.random() * 18 });
            mini.classList.add('forma--confete');
            mini.style.left = cx + 'px';
            mini.style.top = cy + 'px';
            document.body.appendChild(mini);

            const ang = (Math.PI * 2 * i) / total + Math.random() * 0.6;
            const dist = 70 + Math.random() * 90;

            const anim = mini.animate([
                { transform: 'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity: 1 },
                { transform: 'translate(calc(-50% + ' + Math.cos(ang) * dist + 'px), calc(-50% + ' + (Math.sin(ang) * dist - 30) + 'px)) scale(1) rotate(' + (Math.random() * 240 - 120) + 'deg)', opacity: 1, offset: 0.6 },
                { transform: 'translate(calc(-50% + ' + Math.cos(ang) * dist * 1.1 + 'px), calc(-50% + ' + (Math.sin(ang) * dist + 70) + 'px)) scale(.8) rotate(' + (Math.random() * 360 - 180) + 'deg)', opacity: 0 }
            ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' });

            anim.onfinish = function () { mini.remove(); };
        }
    }

    /* ---------- olhos que seguem o cursor ---------- */

    let ponteiro = null;
    let agendado = false;

    function moverOlhos() {
        agendado = false;
        if (!ponteiro || movimentoReduzido()) return;

        document.querySelectorAll('.forma .rosto').forEach(function (rostoEl) {
            const caixa = rostoEl.ownerSVGElement.getBoundingClientRect();
            if (caixa.bottom < 0 || caixa.top > window.innerHeight) return;

            const dx = ponteiro.x - (caixa.left + caixa.width / 2);
            const dy = ponteiro.y - (caixa.top + caixa.height / 2);
            const dist = Math.hypot(dx, dy) || 1;
            const forca = Math.min(1, dist / 250) * 3.2;

            rostoEl.style.transform = 'translate(' + (dx / dist * forca).toFixed(2) + 'px,' + (dy / dist * forca).toFixed(2) + 'px)';
        });
    }

    function seguirPonteiro(e) {
        ponteiro = { x: e.clientX, y: e.clientY };
        if (!agendado) {
            agendado = true;
            requestAnimationFrame(moverOlhos);
        }
    }

    /* ---------- enfeites ---------- */

    /* Troca os <span data-forma="..."> do HTML por SVG. */
    function ativarMarcacoes(raiz) {
        (raiz || document).querySelectorAll('[data-forma]:not(.forma)').forEach(function (marca) {
            const el = criar({
                forma: marca.dataset.forma,
                cor: marca.dataset.cor,
                humor: marca.dataset.emocao,
                tamanho: marca.dataset.tamanho,
                toque: marca.hasAttribute('data-toque'),
                flutua: marca.hasAttribute('data-flutua'),
                atraso: marca.dataset.atraso
            });

            if (marca.className) el.className += ' ' + marca.className;
            if (marca.id) el.id = marca.id;
            if (marca.getAttribute('style')) el.setAttribute('style', el.getAttribute('style') + ';' + marca.getAttribute('style'));

            marca.replaceWith(el);
        });
    }

    function iniciar() {
        ativarMarcacoes();
        document.addEventListener('pointermove', seguirPonteiro, { passive: true });

        // Ilustrações que comemoram ao toque (ex.: a menina estudando).
        document.addEventListener('click', function (e) {
            const alvo = e.target.closest('[data-festa]');
            if (!alvo) return;
            quicar(alvo);
            festa(alvo, 10);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();

    return {
        svg: svg, criar: criar, festa: festa, ativar: ativarMarcacoes, trocarHumor: trocarHumor,
        quicar: quicar, formas: ORDEM_FORMAS, cores: ORDEM_CORES, humores: ORDEM_HUMORES, rotuloHumor: rotuloHumor
    };
})();
