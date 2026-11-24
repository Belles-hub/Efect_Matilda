/* =========================================
   PDF DO MATERIAL DE ESTUDO (plano, atividades, resumo e mapa mental)

   Gera um arquivo PDF de verdade no navegador, com a biblioteca jsPDF
   (carregada do cdnjs na página do chat). Nada é enviado a servidor.

   Entrada: { tipo, titulo, secoes: [{ titulo, pontos: [..] }] }
   Saída:   dispara o download de "<titulo>.pdf".
========================================= */

const PdfEstudo = (function () {
    'use strict';

    const ROXO = [63, 19, 99];
    const ROXO_CLARO = [222, 185, 220];
    const TEXTO = [43, 15, 32];
    const CINZA = [106, 74, 98];
    const CORES = [
        [140, 47, 120], [47, 127, 121], [181, 101, 29], [59, 111, 168], [93, 138, 58], [169, 70, 63]
    ];

    const NOMES = { plano: 'Plano de estudos', atividades: 'Atividades', mapa: 'Mapa mental', resumo: 'Resumo' };

    // Fonte padrão do PDF só tem Latin-1 + algumas pontuações: o resto (emojis etc.) é removido.
    const EXTRAS_OK = [0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x20AC, 0x2122].map(function (n) { return String.fromCharCode(n); }).join('');

    function limpar(texto) {
        return Array.from(String(texto == null ? '' : texto)).filter(function (c) {
            return c.charCodeAt(0) < 256 || EXTRAS_OK.indexOf(c) !== -1;
        }).join('').replace(/\s+/g, ' ').trim();
    }

    function nomeArquivo(titulo) {
        const acentos = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
        const base = limpar(titulo).normalize('NFD').replace(acentos, '')
            .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
        return (base || 'material-de-estudo') + '.pdf';
    }

    function biblioteca() {
        const lib = (typeof window !== 'undefined' && window.jspdf) || null;
        return lib && lib.jsPDF ? lib.jsPDF : null;
    }

    /* ---------- documento em texto (plano, atividades, resumo) ---------- */

    function pdfTexto(JsPDF, dados) {
        const doc = new JsPDF({ unit: 'pt', format: 'a4' });
        const L = doc.internal.pageSize.getWidth();
        const A = doc.internal.pageSize.getHeight();
        const M = 48;
        const larguraUtil = L - M * 2;
        let y = 0;
        let pagina = 1;

        function rodape() {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, CINZA);
            doc.text('Efect Matilda · feito com a Matilda. Confira o conteúdo com seu livro ou sua professora.', M, A - 24);
            doc.text(String(pagina), L - M, A - 24, { align: 'right' });
        }

        function cabecalho() {
            doc.setFillColor.apply(doc, ROXO); doc.rect(0, 0, L, 96, 'F');
            doc.setFillColor.apply(doc, ROXO_CLARO); doc.circle(L - 40, 20, 62, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            doc.text((NOMES[dados.tipo] || 'Material de estudo').toUpperCase() + '  ·  EFECT MATILDA', M, 36);
            doc.setFontSize(22);
            const linhas = doc.splitTextToSize(limpar(dados.titulo), larguraUtil - 40).slice(0, 2);
            doc.text(linhas, M, 62);
            y = 96 + 30;
        }

        function novaPagina() {
            rodape();
            doc.addPage(); pagina += 1; y = M;
        }

        function garantir(altura) {
            if (y + altura > A - 52) novaPagina();
        }

        cabecalho();

        dados.secoes.forEach(function (secao, i) {
            const cor = CORES[i % CORES.length];
            const titulo = limpar(secao.titulo);

            doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
            const linhasTitulo = doc.splitTextToSize(titulo, larguraUtil - 18);
            garantir(linhasTitulo.length * 18 + 26);

            doc.setFillColor.apply(doc, cor); doc.roundedRect(M, y - 13, 6, linhasTitulo.length * 18 + 2, 3, 3, 'F');
            doc.setTextColor.apply(doc, cor);
            doc.text(linhasTitulo, M + 16, y);
            y += linhasTitulo.length * 18 + 4;

            doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); doc.setTextColor.apply(doc, TEXTO);

            secao.pontos.forEach(function (ponto, n) {
                const marcador = dados.tipo === 'plano' || dados.tipo === 'atividades' ? (n + 1) + '.' : '•';
                const linhas = doc.splitTextToSize(limpar(ponto), larguraUtil - 34);
                garantir(linhas.length * 15 + 6);

                doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, cor);
                doc.text(marcador, M + 16, y);
                doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, TEXTO);
                doc.text(linhas, M + 34, y);
                y += linhas.length * 15 + 5;
            });

            y += 16;
        });

        rodape();
        return doc;
    }

    /* ---------- mapa mental (página A4 deitada) ---------- */

    function pdfMapa(JsPDF, dados) {
        const doc = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
        const L = doc.internal.pageSize.getWidth();
        const A = doc.internal.pageSize.getHeight();
        const M = 28;

        // fundo e título
        doc.setFillColor(251, 245, 240); doc.rect(0, 0, L, A, 'F');
        doc.setTextColor.apply(doc, ROXO); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text('MAPA MENTAL  ·  EFECT MATILDA', M, 22);

        const secoes = dados.secoes.slice(0, 12);
        const metade = Math.ceil(secoes.length / 2);
        const colunas = [secoes.slice(0, metade), secoes.slice(metade)];

        const larguraCaixa = 230;
        const centroLargura = L - 2 * (M + larguraCaixa) - 40;
        const topo = 38;
        const alturaUtil = A - topo - M;

        // escolhe o maior tamanho de fonte em que as duas colunas cabem
        let fonte = 13;
        let layout = null;

        function medir(tam) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(tam);
            const lh = tam * 1.28;

            return colunas.map(function (col) {
                const caixas = col.map(function (s) {
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(tam + 1);
                    const t = doc.splitTextToSize(limpar(s.titulo), larguraCaixa - 20);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(tam);
                    const pts = s.pontos.map(function (p) { return doc.splitTextToSize('•  ' + limpar(p), larguraCaixa - 20); });
                    const nLinhas = pts.reduce(function (a, b) { return a + b.length; }, 0);
                    const h = 12 + t.length * (tam + 1) * 1.28 + 6 + nLinhas * lh + pts.length * 2 + 10;
                    return { titulo: t, pontos: pts, h: h, lh: lh };
                });
                const total = caixas.reduce(function (a, c) { return a + c.h; }, 0) + Math.max(0, caixas.length - 1) * 10;
                return { caixas: caixas, total: total };
            });
        }

        for (; fonte >= 6; fonte -= 0.5) {
            layout = medir(fonte);
            if (Math.max(layout[0].total, layout[1].total) <= alturaUtil) break;
        }
        if (!layout) layout = medir(6);

        const cx = L / 2;
        const cy = topo + alturaUtil / 2;

        // desenha colunas e conectores
        const posicoes = [];

        layout.forEach(function (colLayout, ci) {
            let yy = topo + (alturaUtil - colLayout.total) / 2;
            const x = ci === 0 ? M : L - M - larguraCaixa;

            colLayout.caixas.forEach(function (c, i) {
                const idx = ci === 0 ? i : metade + i;
                const cor = CORES[idx % CORES.length];

                // conector (curva) do centro até a borda interna da caixa
                const px = ci === 0 ? x + larguraCaixa : x;
                const py = yy + c.h / 2;
                const sx = ci === 0 ? cx - centroLargura / 2 : cx + centroLargura / 2;
                const sy = cy;
                doc.setDrawColor.apply(doc, cor); doc.setLineWidth(2.2);
                const mx = (sx + px) / 2;
                doc.lines([[mx - sx, 0, mx - sx, py - sy, px - sx, py - sy]], sx, sy, [1, 1], 'S');

                // caixa
                doc.setFillColor(255, 255, 255); doc.setDrawColor.apply(doc, cor); doc.setLineWidth(1.6);
                doc.roundedRect(x, yy, larguraCaixa, c.h, 9, 9, 'FD');
                doc.setFillColor.apply(doc, cor); doc.roundedRect(x, yy, larguraCaixa, 12 + c.titulo.length * (fonte + 1) * 1.28 + 4, 9, 9, 'F');
                doc.rect(x, yy + 14, larguraCaixa, 4, 'F');

                doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(fonte + 1);
                doc.text(c.titulo, x + 10, yy + 12 + (fonte + 1) * 0.9);

                let ty = yy + 12 + c.titulo.length * (fonte + 1) * 1.28 + 6 + fonte;
                doc.setTextColor.apply(doc, TEXTO); doc.setFont('helvetica', 'normal'); doc.setFontSize(fonte);
                c.pontos.forEach(function (linhas) {
                    doc.text(linhas, x + 10, ty);
                    ty += linhas.length * c.lh + 2;
                });

                posicoes.push(yy);
                yy += c.h + 10;
            });
        });

        // centro (por cima dos conectores)
        doc.setFillColor.apply(doc, ROXO);
        const hCentro = 70;
        doc.roundedRect(cx - centroLargura / 2, cy - hCentro / 2, centroLargura, hCentro, hCentro / 2, hCentro / 2, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
        const tituloCentro = doc.splitTextToSize(limpar(dados.titulo), centroLargura - 36).slice(0, 3);
        doc.text(tituloCentro, cx, cy - (tituloCentro.length - 1) * 8 + 5, { align: 'center' });

        doc.setTextColor.apply(doc, CINZA); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text('Feito com a Matilda. Confira o conteúdo com seu livro ou sua professora.', L / 2, A - 12, { align: 'center' });

        doc.fonteMapa = fonte;
        return doc;
    }

    /* ---------- API ---------- */

    function gerar(dados, JsPDF) {
        const Lib = JsPDF || biblioteca();
        if (!Lib) throw new Error('A biblioteca de PDF não carregou. Confira sua internet e tente de novo.');

        const doc = dados.tipo === 'mapa' ? pdfMapa(Lib, dados) : pdfTexto(Lib, dados);
        return doc;
    }

    function baixar(dados) {
        const doc = gerar(dados);
        doc.save(nomeArquivo(dados.titulo));
    }

    return { gerar: gerar, baixar: baixar, nomeArquivo: nomeArquivo, disponivel: function () { return !!biblioteca(); } };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PdfEstudo;
