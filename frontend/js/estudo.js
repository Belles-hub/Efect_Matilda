/* =========================================
   MATILDA — material de estudo (plano, mapa mental, resumo)

   A API devolve sempre { tipo, titulo, secoes: [{ titulo, pontos }] }.
   Aqui isso vira tela e PDF: o plano é uma lista de dias, o mapa mental é
   o título no centro com as seções como ramos, o resumo é texto em seções.
   O PDF sai do diálogo de impressão do navegador ("Salvar como PDF"), então
   não precisa de biblioteca nem de servidor.
========================================= */

const Estudo = (function () {
    'use strict';

    const CORES = ['#5b2a86', '#2f7f79', '#b5651d', '#3f6fa8', '#5d8a3a', '#a9463f'];

    const NOMES = { plano: 'Plano de estudos', atividades: 'Atividades', mapa: 'Mapa mental', resumo: 'Resumo' };

    const CSS_DOCUMENTO = `
        * { box-sizing: border-box; }
        body { font-family: "DM Sans", Arial, sans-serif; color: #1e0a30; margin: 0; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .doc-selo { color: #3f1363; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; margin: 0 0 4px; }
        h1 { font-size: 24px; margin: 0 0 18px; color: #1d0733; }
        h3 { font-size: 16px; margin: 0 0 6px; color: #3f1363; }
        ul, ol { margin: 0; padding-left: 20px; }
        li { margin: 0 0 5px; line-height: 1.45; }
        .secao { margin: 0 0 16px; break-inside: avoid; }
        .mapa { display: grid; grid-template-columns: 1fr auto 1fr; gap: 28px; align-items: center; }
        .mapa__col { display: flex; flex-direction: column; gap: 14px; }
        .mapa__centro { background: #3f1363; color: #fff; font-weight: 800; font-size: 18px; text-align: center; padding: 22px 18px; border-radius: 999px; max-width: 200px; }
        .ramo { border: 2px solid var(--cor); border-radius: 14px; padding: 10px 12px; break-inside: avoid; }
        .ramo h4 { margin: 0 0 6px; font-size: 14px; color: var(--cor); }
        .ramo ul { font-size: 13px; }
        .rodape { margin-top: 24px; font-size: 11px; color: #7f6a9d; }
    `;

    let ultimo = null;   // último material gerado (pro PDF)
    let tipoAtual = 'plano';
    let obterMaterial = function () { return []; };
    let els = {};

    // O <dialog> aberto cobre os avisos (toast) da página, então os recados
    // de erro e de sucesso aparecem aqui dentro dele.
    function mensagem(texto, tipo) {
        const el = document.getElementById('estudoMsg');
        if (!el) { EM.toast(texto, tipo); return; }

        el.textContent = texto || '';
        el.hidden = !texto;
        el.className = 'estudo-msg' + (tipo ? ' estudo-msg--' + tipo : '');
    }

    /* ---------- HTML do material ---------- */

    function lista(pontos, ordenada) {
        const tag = ordenada ? 'ol' : 'ul';
        return `<${tag}>${pontos.map(function (p) { return `<li>${EM.esc(p)}</li>`; }).join('')}</${tag}>`;
    }

    function htmlMapa(dados) {
        const ramos = dados.secoes.map(function (s, i) {
            return `<div class="ramo" style="--cor:${CORES[i % CORES.length]}"><h4>${EM.esc(s.titulo)}</h4>${lista(s.pontos, false)}</div>`;
        });

        const metade = Math.ceil(ramos.length / 2);

        return `<div class="mapa">` +
            `<div class="mapa__col">${ramos.slice(0, metade).join('')}</div>` +
            `<div class="mapa__centro">${EM.esc(dados.titulo)}</div>` +
            `<div class="mapa__col">${ramos.slice(metade).join('')}</div>` +
            `</div>`;
    }

    function htmlSecoes(dados) {
        return dados.secoes.map(function (s) {
            return `<section class="secao"><h3>${EM.esc(s.titulo)}</h3>${lista(s.pontos, dados.tipo === 'plano' || dados.tipo === 'atividades')}</section>`;
        }).join('');
    }

    function htmlMaterial(dados) {
        return dados.tipo === 'mapa' ? htmlMapa(dados) : htmlSecoes(dados);
    }

    /* ---------- PDF ---------- */

    function baixarPdf() {
        if (!ultimo) return;

        if (typeof PdfEstudo !== 'undefined' && PdfEstudo.disponivel()) {
            try {
                PdfEstudo.baixar(ultimo);
                mensagem('PDF baixado: ' + PdfEstudo.nomeArquivo(ultimo.titulo) + ' (veja a pasta Downloads).', 'sucesso');
                return;
            } catch (erro) {
                console.error(erro);
            }
        }

        // Sem a biblioteca (ex.: sem internet): usa o "Salvar como PDF" do navegador.
        baixarPdfPelaImpressao();
    }

    function baixarPdfPelaImpressao() {

        // iframe escondido em vez de janela nova: popup bloqueado não quebra o PDF.
        const quadro = document.createElement('iframe');
        quadro.setAttribute('aria-hidden', 'true');
        quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:1000px;height:0;border:0;';
        document.body.appendChild(quadro);

        const doc = quadro.contentWindow.document;
        doc.open();
        doc.write(
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${EM.esc(ultimo.titulo)}</title>` +
            `<style>${CSS_DOCUMENTO}</style></head><body>` +
            `<p class="doc-selo">${EM.esc(NOMES[ultimo.tipo])} · Efect Matilda</p>` +
            `<h1>${EM.esc(ultimo.titulo)}</h1>` +
            htmlMaterial(ultimo) +
            `<p class="rodape">Feito com a Matilda. Confira o conteúdo com seu livro ou sua professora.</p>` +
            `</body></html>`
        );
        doc.close();

        // Dá um respiro pra estilo e fonte aplicarem antes do diálogo de impressão.
        setTimeout(function () {
            quadro.contentWindow.focus();
            quadro.contentWindow.print();
            setTimeout(function () { quadro.remove(); }, 60000);
        }, 300);

        mensagem('Na janela que abriu, escolha "Salvar como PDF".', 'info');
    }

    /* ---------- diálogo ---------- */

    function definirTipo(tipo) {
        tipoAtual = tipo;

        els.tipos.querySelectorAll('.chip').forEach(function (chip) {
            chip.setAttribute('aria-pressed', String(chip.dataset.tipo === tipo));
        });

        els.diasWrap.hidden = tipo !== 'plano';
    }

    function mostrarFormulario() {
        mensagem('');
        els.resultado.hidden = true;
        els.form.hidden = false;

        const usando = obterMaterial();
        els.nota.hidden = usando.length === 0;
        els.nota.textContent = usando.length
            ? 'A Matilda vai usar os ' + usando.length + ' arquivo(s) que você anexou como base.'
            : '';

        els.tema.focus();
    }

    function abrir() {
        if (typeof els.dlg.showModal === 'function') els.dlg.showModal();
        else els.dlg.setAttribute('open', '');

        mostrarFormulario();
    }

    function fechar() {
        if (els.dlg.open) els.dlg.close();
    }

    function textoDeErro(erro) {
        if (erro && erro.status === 404) return 'O servidor ainda não conhece este recurso. Reinicie o servidor da API (uvicorn) e tente de novo.';
        if (erro && erro.status === 422) return 'O servidor recusou o pedido. Reinicie a API para carregar a versão mais nova e tente de novo.';
        if (erro instanceof TypeError) return 'Não consegui falar com o servidor. Confira se a API está rodando e sua internet.';
        return (erro && erro.message) || 'Não consegui montar o material agora. Tente de novo.';
    }

    async function gerar(e) {
        e.preventDefault();
        mensagem('');

        const tema = els.tema.value.trim();
        if (tema.length < 2) return;

        const corpo = { tipo: tipoAtual, tema: tema, material: obterMaterial() };

        if (tipoAtual === 'plano') corpo.dias = Math.min(30, Math.max(1, Number(els.dias.value) || 7));

        els.btnGerar.disabled = true;
        els.btnGerar.setAttribute('aria-busy', 'true');
        els.btnGerar.textContent = 'Montando...';

        try {
            ultimo = await api('/chat/estudo', { metodo: 'POST', corpo: corpo });

            els.conteudo.innerHTML =
                `<p class="estudo-tipo">${EM.esc(NOMES[ultimo.tipo])}</p>` +
                `<h2>${EM.esc(ultimo.titulo)}</h2>` +
                `<div class="estudo-corpo">${htmlMaterial(ultimo)}</div>`;

            els.form.hidden = true;
            els.resultado.hidden = false;
        } catch (erro) {
            console.error(erro);
            mensagem(textoDeErro(erro), 'erro');
        } finally {
            els.btnGerar.disabled = false;
            els.btnGerar.removeAttribute('aria-busy');
            els.btnGerar.textContent = 'Gerar';
        }
    }

    function ligar(opcoes) {
        if (opcoes && opcoes.obterMaterial) obterMaterial = opcoes.obterMaterial;

        els = {
            dlg: document.getElementById('dlgEstudo'),
            form: document.getElementById('estudoForm'),
            resultado: document.getElementById('estudoResultado'),
            conteudo: document.getElementById('estudoConteudo'),
            tipos: document.getElementById('estudoTipos'),
            tema: document.getElementById('estudoTema'),
            dias: document.getElementById('estudoDias'),
            diasWrap: document.getElementById('estudoDiasWrap'),
            nota: document.getElementById('estudoNota'),
            btnGerar: document.getElementById('btnGerarEstudo')
        };

        document.getElementById('btnEstudo').addEventListener('click', abrir);
        document.getElementById('formEstudo').addEventListener('submit', gerar);
        document.getElementById('btnFecharEstudo').addEventListener('click', fechar);
        document.getElementById('btnFecharResultado').addEventListener('click', fechar);
        document.getElementById('btnOutroEstudo').addEventListener('click', mostrarFormulario);
        document.getElementById('btnBaixarPdf').addEventListener('click', baixarPdf);

        els.tipos.addEventListener('click', function (e) {
            const chip = e.target.closest('.chip');
            if (chip) definirTipo(chip.dataset.tipo);
        });

        definirTipo('plano');
    }

    return { ligar: ligar };
})();
