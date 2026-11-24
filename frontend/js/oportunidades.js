/* =========================================
   OPORTUNIDADES — olimpíadas, feiras, hackathons, bolsas...

   Painel público (dado curado pela equipe, ver app/data/oportunidades.py)
   com duas fileiras de filtro independentes: categoria e modalidade.
========================================= */

(function () {
    'use strict';

    const CATEGORIAS = [
        { id: 'olimpiada', rotulo: 'Olimpíadas', icone: 'fa-medal' },
        { id: 'feira_cientifica', rotulo: 'Feiras científicas', icone: 'fa-flask' },
        { id: 'competicao_tecnologia', rotulo: 'Competições de tecnologia', icone: 'fa-laptop-code' },
        { id: 'hackathon', rotulo: 'Hackathons', icone: 'fa-code' },
        { id: 'programa_estudantil', rotulo: 'Programas para estudantes', icone: 'fa-graduation-cap' },
        { id: 'iniciacao_cientifica', rotulo: 'Iniciação científica', icone: 'fa-microscope' },
        { id: 'bolsa', rotulo: 'Bolsas', icone: 'fa-hand-holding-dollar' },
        { id: 'projeto_evento', rotulo: 'Projetos e eventos', icone: 'fa-calendar-days' }
    ];

    const MODALIDADES = [
        { id: 'presencial', rotulo: 'Presencial', icone: 'fa-location-dot' },
        { id: 'online', rotulo: 'Online', icone: 'fa-wifi' },
        { id: 'hibrido', rotulo: 'Híbrido', icone: 'fa-shuffle' }
    ];

    let filtroCategoria = '';
    let filtroModalidade = '';

    let els = {};

    // Lista inteira já ordenada pro perfil (vem do backend); os filtros de
    // categoria e modalidade são aplicados aqui, sem nova chamada.
    let todas = null;

    function categoriaPorId(id) {
        return CATEGORIAS.find(function (c) { return c.id === id; }) || null;
    }

    function modalidadePorId(id) {
        return MODALIDADES.find(function (m) { return m.id === id; }) || null;
    }

    function renderFiltros(container, lista, valorAtual, aoEscolher) {
        container.innerHTML = lista.map(function (item) {
            return `<button type="button" class="chip" data-id="${item.id}" aria-pressed="${item.id === valorAtual}">` +
                `<i class="fa-solid ${item.icone}" aria-hidden="true"></i> ${EM.esc(item.rotulo)}</button>`;
        }).join('');

        container.querySelectorAll('.chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                const id = chip.dataset.id;
                const novoValor = id === valorAtual ? '' : id;
                aoEscolher(novoValor);
            });
        });
    }

    function montarFiltros() {
        renderFiltros(els.filtrosCategoria, CATEGORIAS, filtroCategoria, function (valor) {
            filtroCategoria = valor;
            montarFiltros();
            carregarOportunidades();
        });

        renderFiltros(els.filtrosModalidade, MODALIDADES, filtroModalidade, function (valor) {
            filtroModalidade = valor;
            montarFiltros();
            carregarOportunidades();
        });
    }

    function cartaoOportunidade(op) {
        const categoria = categoriaPorId(op.categoria);
        const modalidade = modalidadePorId(op.modalidade);
        const prazo = op.prazo && op.prazo.trim() ? op.prazo : 'Consulte o site oficial';

        const rotuloModalidade = modalidade ? EM.esc(modalidade.rotulo) : EM.esc(op.modalidade || '');
        const iconeModalidade = modalidade ? modalidade.icone : 'fa-circle-question';

        function item(icone, rotulo, valor) {
            return `<div class="oportunidade-card__item"><span class="oportunidade-card__ico"><i class="fa-solid ${icone}" aria-hidden="true"></i></span>` +
                `<span class="oportunidade-card__txt"><small>${rotulo}</small><strong>${valor}</strong></span></div>`;
        }

        return `
            <article class="oportunidade-card entrar">
                <header class="oportunidade-card__cab">
                    <span class="selo">${categoria ? `<i class="fa-solid ${categoria.icone}" aria-hidden="true"></i> ${EM.esc(categoria.rotulo)}` : ''}</span>
                    <h3>${EM.esc(op.nome)}</h3>
                </header>
                ${op.motivo ? `<p><span class="selo"><i class="fa-solid fa-star" aria-hidden="true"></i> ${EM.esc(op.motivo)}</span></p>` : ''}
                <p class="oportunidade-card__desc">${EM.esc(op.descricao)}</p>
                <div class="oportunidade-card__grade">
                    ${item('fa-user-group', 'Quem pode', EM.esc(op.quem_pode_participar))}
                    ${item('fa-calendar', 'Prazo', EM.esc(prazo))}
                    ${item('fa-location-dot', 'Local', EM.esc(op.local))}
                    ${item(iconeModalidade, 'Modalidade', rotuloModalidade)}
                </div>
                <a class="btn btn--primario btn--bloco" href="${EM.esc(op.link_oficial)}" target="_blank" rel="noopener noreferrer">
                    Ver no site oficial <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                </a>
            </article>`;
    }

    function estadoVazio() {
        return `
            <div class="vazio" style="grid-column:1/-1">
                <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
                <p>Nenhuma oportunidade encontrada com esses filtros.</p>
                <button type="button" class="btn btn--suave" id="btnLimparFiltros">Limpar filtros</button>
            </div>`;
    }

    async function carregarOportunidades() {
        EM.esqueleto(els.lista, 3, 180);

        try {
            if (!todas) {
                try {
                    todas = await api('/oportunidades/recomendadas');
                } catch (e) {
                    // Sem recomendação (ex.: sessão expirada), a lista pública continua servindo.
                    todas = await apiPublica('/oportunidades/');
                }
            }

            const oportunidades = todas.filter(function (o) {
                return (!filtroCategoria || o.categoria === filtroCategoria) &&
                    (!filtroModalidade || o.modalidade === filtroModalidade);
            });

            els.lista.removeAttribute('aria-busy');

            if (!oportunidades || oportunidades.length === 0) {
                els.lista.innerHTML = estadoVazio();
                const botao = document.getElementById('btnLimparFiltros');
                if (botao) botao.addEventListener('click', function () {
                    filtroCategoria = '';
                    filtroModalidade = '';
                    montarFiltros();
                    carregarOportunidades();
                });
                return;
            }

            els.lista.innerHTML = oportunidades.map(cartaoOportunidade).join('');

        } catch (erro) {
            console.error(erro);
            els.lista.removeAttribute('aria-busy');
            els.lista.innerHTML = `
                <div class="vazio" style="grid-column:1/-1">
                    <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i></span>
                    <p>${EM.esc(erro.message || 'Não consegui carregar as oportunidades agora.')}</p>
                    <button type="button" class="btn btn--suave" onclick="location.reload()">Tentar de novo</button>
                </div>`;
        }
    }

    EM.iniciar('oportunidades', async function () {
        els = {
            filtrosCategoria: document.getElementById('filtrosCategoria'),
            filtrosModalidade: document.getElementById('filtrosModalidade'),
            lista: document.getElementById('listaOportunidades')
        };

        montarFiltros();
        await carregarOportunidades();
    });

})();
