/* =========================================================
   MULHERES NA CIÊNCIA — galeria de referências reais

   Filtra por área (chips), igual Experimentar. A área pode vir
   pré-selecionada por ?area=X (o cartão de conclusão do desafio linka
   pra cá assim).
========================================================= */

EM.iniciar('mulheres', async function (usuario) {
    const params = new URLSearchParams(window.location.search);
    const areaUrl = params.get('area');
    const areaInicial = areaUrl && EM.areaPorId(areaUrl) ? areaUrl : '';

    montarFiltros(areaInicial);
    await carregarMulheres(areaInicial);
});

function montarFiltros(areaSelecionada) {
    const filtros = document.getElementById('filtros');
    if (!filtros) return;

    const chips = [{ id: '', rotulo: 'Todas', icone: 'fa-layer-group' }].concat(EM.AREAS);

    filtros.innerHTML = chips.map(function (a) {
        const ativo = (a.id || '') === (areaSelecionada || '');
        return `<button type="button" class="chip" data-id="${a.id}" aria-pressed="${ativo ? 'true' : 'false'}">` +
            `<i class="fa-solid ${a.icone}" aria-hidden="true"></i> ${EM.esc(a.rotulo)}</button>`;
    }).join('');

    filtros.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            filtros.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
            chip.setAttribute('aria-pressed', 'true');
            carregarMulheres(chip.dataset.id);
        });
    });
}

// Lista inteira já ordenada pro perfil (vem do backend); o filtro de área é
// aplicado aqui, sem nova chamada.
let todasMulheres = null;

async function carregarMulheres(area) {
    const resultados = document.getElementById('resultados');
    if (!resultados) return;

    EM.esqueleto(resultados, 6, 170);

    try {
        if (!todasMulheres) {
            try {
                todasMulheres = await api('/mulheres/recomendadas');
            } catch (e) {
                todasMulheres = await apiPublica('/mulheres/');
            }
        }

        const lista = todasMulheres.filter(function (m) { return !area || m.area === area; });
        resultados.removeAttribute('aria-busy');

        if (!lista.length) {
            resultados.innerHTML = `
                <div class="vazio">
                    <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
                    <p>Nenhuma referência por aqui ainda para essa área. Explore outra ou volte em breve.</p>
                </div>`;
            return;
        }

        resultados.innerHTML = lista.map(cartaoMulher).join('');
    } catch (erro) {
        resultados.removeAttribute('aria-busy');
        resultados.innerHTML = `
            <div class="vazio">
                <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i></span>
                <p>${EM.esc(erro.message || 'Não foi possível carregar agora.')}</p>
            </div>`;
    }
}

function cartaoMulher(m) {
    const area = EM.areaPorId(m.area);

    const botaoDesafio = m.desafio_relacionado_id
        ? `<a class="btn btn--suave" href="desafio.html?id=${encodeURIComponent(m.desafio_relacionado_id)}">Experimentar desafio</a>`
        : '';

    return `
        <article class="mulher-card">
            <div class="mulher-card__cab">
                <span class="icone-circulo icone-circulo--${area ? area.cor : 'rosa'}" aria-hidden="true">
                    <i class="fa-solid ${area ? area.icone : 'fa-venus'}"></i>
                </span>
                <div>
                    <h3>${EM.esc(m.nome)}</h3>
                    <p class="mulher-card__atuacao">${EM.esc(m.atuacao)}</p>
                </div>
            </div>
            ${m.motivo ? `<p><span class="selo"><i class="fa-solid fa-star" aria-hidden="true"></i> ${EM.esc(m.motivo)}</span></p>` : ''}
            <p>${EM.esc(m.bio)}</p>
            <p class="mulher-card__conquista"><i class="fa-solid fa-star" aria-hidden="true"></i> ${EM.esc(m.conquista)}</p>
            ${botaoDesafio}
        </article>`;
}
