/* =========================================================
   EXPERIMENTAR — catálogo de desafios "mão na massa"

   Filtra por área (chips) e lista os desafios públicos. A área pode vir
   pré-selecionada por ?categoria=X (a Home linka pra cá assim).
========================================================= */

const NIVEL_ROTULO = {
    iniciante: 'Iniciante',
    intermediario: 'Intermediário',
    avancado: 'Avançado'
};

EM.iniciar('experimentar', async function (usuario) {
    const params = new URLSearchParams(window.location.search);
    const categoriaUrl = params.get('categoria');
    const categoriaInicial = categoriaUrl && EM.areaPorId(categoriaUrl) ? categoriaUrl : '';

    montarFiltros(categoriaInicial);
    await carregarDesafios(categoriaInicial);
});

function montarFiltros(categoriaSelecionada) {
    const filtros = document.getElementById('filtros');
    if (!filtros) return;

    const chips = [{ id: '', rotulo: 'Todas', icone: 'fa-layer-group' }].concat(EM.AREAS);

    filtros.innerHTML = chips.map(function (a) {
        const ativo = (a.id || '') === (categoriaSelecionada || '');
        return `<button type="button" class="chip" data-id="${a.id}" aria-pressed="${ativo ? 'true' : 'false'}">` +
            `<i class="fa-solid ${a.icone}" aria-hidden="true"></i> ${EM.esc(a.rotulo)}</button>`;
    }).join('');

    filtros.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            filtros.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
            chip.setAttribute('aria-pressed', 'true');
            carregarDesafios(chip.dataset.id);
        });
    });
}

async function carregarDesafios(categoria) {
    const resultados = document.getElementById('resultados');
    if (!resultados) return;

    EM.esqueleto(resultados, 6, 150);

    try {
        const lista = await apiPublica('/desafios/' + (categoria ? '?categoria=' + encodeURIComponent(categoria) : ''));
        resultados.removeAttribute('aria-busy');

        if (!lista.length) {
            resultados.innerHTML = `
                <div class="vazio">
                    <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-flask" aria-hidden="true"></i></span>
                    <p>Nenhum desafio por aqui ainda. Volte em breve ou explore outra área.</p>
                </div>`;
            return;
        }

        resultados.innerHTML = lista.map(cartaoDesafio).join('');
    } catch (erro) {
        resultados.removeAttribute('aria-busy');
        resultados.innerHTML = `
            <div class="vazio">
                <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i></span>
                <p>${EM.esc(erro.message || 'Não foi possível carregar os desafios agora.')}</p>
            </div>`;
    }
}

function cartaoDesafio(d) {
    const area = EM.areaPorId(d.categoria);

    return `
        <a class="desafio-card" href="desafio.html?id=${encodeURIComponent(d.id)}">
            <h3>${EM.esc(d.titulo)}</h3>
            <p>${EM.esc(d.descricao)}</p>
            <div class="desafio-card__meta">
                <span class="selo"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${Number(d.tempo_estimado_min)} min</span>
                <span class="selo">${EM.esc(NIVEL_ROTULO[d.nivel] || d.nivel)}</span>
                <span class="selo">${area ? EM.esc(area.rotulo) : EM.esc(d.categoria)}</span>
            </div>
        </a>`;
}
