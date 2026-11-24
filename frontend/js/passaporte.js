/* =========================================================
   PASSAPORTE MATILDA — conquistas, jornada e trajetória (seção 8 do spec)

   Não é ranking, não é competição: é um registro do que a estudante já
   viveu no app. 4 das 8 conquistas são manuais (a pessoa marca quando
   acontece algo fora do app, tipo participar de uma feira de ciências) —
   as outras 4 são automáticas e só a API decide quando valem.
========================================================= */

const ETAPAS_JORNADA = [
    { id: 'descobrir', rotulo: 'Descobrir', icone: 'fa-compass' },
    { id: 'experimentar', rotulo: 'Experimentar', icone: 'fa-flask' },
    { id: 'criar', rotulo: 'Criar', icone: 'fa-lightbulb' },
    { id: 'participar', rotulo: 'Participar', icone: 'fa-rocket' }
];

const ICONES_CONQUISTA = {
    primeiro_desafio: 'fa-flask',
    primeiro_experimento: 'fa-vial',
    primeira_hipotese: 'fa-lightbulb',
    primeiro_projeto: 'fa-diagram-project',
    primeira_feira_cientifica: 'fa-people-group',
    primeira_competicao: 'fa-trophy',
    primeiro_projeto_ia: 'fa-robot',
    primeira_participacao_cientifica: 'fa-rocket'
};

const ICONE_TIMELINE = { desafio: 'fa-flask', projeto: 'fa-lightbulb', conquista: 'fa-star' };
const SELO_TIMELINE = { desafio: 'Desafio', projeto: 'Projeto', conquista: 'Conquista' };

document.addEventListener('DOMContentLoaded', function () {

    EM.iniciar('passaporte', async function () {

        try {
            const dados = await api('/passaporte/');

            desenharJornada(dados.jornada_etapa);
            desenharConquistas(dados.conquistas);
            desenharTrajetoria(dados);
        } catch (erro) {
            document.getElementById('areaJornada').innerHTML = '';

            const conquistas = document.getElementById('areaConquistas');
            conquistas.removeAttribute('aria-busy');
            conquistas.innerHTML = `
                <div class="vazio" style="grid-column:1/-1">
                    <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i></span>
                    <p>${EM.esc(erro.message || 'Não foi possível carregar seu passaporte agora.')}</p>
                </div>`;

            document.getElementById('areaTrajetoria').innerHTML = '';
        }
    });
});

/* ---------- indicador de jornada ---------- */

function desenharJornada(etapaAtual) {
    const alvo = document.getElementById('areaJornada');
    const indiceAtual = ETAPAS_JORNADA.findIndex(function (e) { return e.id === etapaAtual; });

    let html = '<div class="jornada" role="list" aria-label="Sua jornada: Descobrir, Experimentar, Criar e Participar">';

    ETAPAS_JORNADA.forEach(function (etapa, i) {
        const feito = indiceAtual >= 0 && i < indiceAtual;
        const atual = i === indiceAtual;

        html += `<div class="jornada__passo${feito ? ' feito' : ''}${atual ? ' atual' : ''}" role="listitem" aria-current="${atual ? 'step' : 'false'}">
            <span class="jornada__bolha"><i class="fa-solid ${feito ? 'fa-check' : etapa.icone}" aria-hidden="true"></i></span>
            <span class="jornada__rotulo">${EM.esc(etapa.rotulo)}</span>
        </div>`;

        if (i < ETAPAS_JORNADA.length - 1) {
            html += `<span class="jornada__linha${feito ? ' feito' : ''}"></span>`;
        }
    });

    html += '</div>';
    alvo.innerHTML = html;
}

/* ---------- conquistas ---------- */

function desenharConquistas(lista) {
    const alvo = document.getElementById('areaConquistas');
    alvo.removeAttribute('aria-busy');

    alvo.innerHTML = (lista || []).map(function (c) {
        const icone = ICONES_CONQUISTA[c.id] || 'fa-star';

        if (!c.automatica) {
            return `<button type="button" class="conquista${c.conquistada ? ' ganha' : ''}" data-id="${EM.esc(c.id)}" aria-pressed="${c.conquistada ? 'true' : 'false'}">
                <i class="fa-solid ${icone}" aria-hidden="true"></i>
                <strong>${EM.esc(c.titulo)}</strong>
                <small>${EM.esc(c.descricao)}</small>
                <span class="conquista__manual" data-rotulo-manual>${c.conquistada ? '✓ Marcada por você' : 'Marque quando acontecer'}</span>
            </button>`;
        }

        return `<div class="conquista${c.conquistada ? ' ganha' : ''}">
            <i class="fa-solid ${icone}" aria-hidden="true"></i>
            <strong>${EM.esc(c.titulo)}</strong>
            <small>${EM.esc(c.descricao)}</small>
        </div>`;
    }).join('');

    alvo.querySelectorAll('.conquista[data-id]').forEach(function (botao) {
        botao.addEventListener('click', function () { alternarConquista(botao); });
    });
}

async function alternarConquista(botao) {
    const id = botao.dataset.id;
    const estadoAtual = botao.getAttribute('aria-pressed') === 'true';
    const novoEstado = !estadoAtual;

    botao.disabled = true;

    try {
        await api('/passaporte/conquistas/' + encodeURIComponent(id), { metodo: 'POST', corpo: { conquistada: novoEstado } });

        botao.setAttribute('aria-pressed', String(novoEstado));
        botao.classList.toggle('ganha', novoEstado);

        const rotulo = botao.querySelector('[data-rotulo-manual]');
        if (rotulo) rotulo.textContent = novoEstado ? '✓ Marcada por você' : 'Marque quando acontecer';

        EM.toast(novoEstado ? 'Conquista marcada!' : 'Conquista desmarcada', 'sucesso');
    } catch (erro) {
        EM.toast('Não foi possível atualizar agora: ' + erro.message, 'erro');
    } finally {
        botao.disabled = false;
    }
}

/* ---------- trajetória (linha do tempo, agrupada por mês) ---------- */

function desenharTrajetoria(dados) {
    const alvo = document.getElementById('areaTrajetoria');
    const linha = dados.linha_do_tempo || [];

    if ((dados.desafios_concluidos || 0) === 0 && (dados.projetos_criados || 0) === 0) {
        alvo.innerHTML = `
            <div class="vazio">
                <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-compass" aria-hidden="true"></i></span>
                <p>Sua trajetória começa com um primeiro passo. Que tal experimentar um desafio ou começar um projeto?</p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
                    <a class="btn btn--primario" href="experimentar.html">Experimentar um desafio</a>
                    <a class="btn btn--suave" href="projetos.html">Começar um projeto</a>
                </div>
            </div>`;
        return;
    }

    if (!linha.length) {
        alvo.innerHTML = '<p class="subtitulo">Ainda sem registros na sua trajetória.</p>';
        return;
    }

    let html = '';
    let mesAtual = null;
    let listaAberta = false;

    // Já chega ordenada da mais nova pra mais antiga — só agrupa quem cai
    // no mesmo rótulo de mês seguido.
    linha.forEach(function (item) {
        const rotuloMes = EM.mesAnoRotulo(item.data);

        if (rotuloMes !== mesAtual) {
            if (listaAberta) html += '</ul>';
            html += `<h3 class="dia-titulo">${EM.esc(rotuloMes)}</h3><ul class="linha-tempo">`;
            mesAtual = rotuloMes;
            listaAberta = true;
        }

        const icone = ICONE_TIMELINE[item.tipo] || 'fa-star';
        const seloTipo = SELO_TIMELINE[item.tipo] || item.tipo;
        const dataFormatada = item.data ? EM.formatarData(item.data) : '';

        html += `<li class="tarefa">
            <span class="icone-circulo icone-circulo--lilas" style="width:42px;height:42px;font-size:1rem" aria-hidden="true"><i class="fa-solid ${icone}"></i></span>
            <div>
                <div class="tarefa__titulo">${EM.esc(item.titulo)}</div>
                <div class="tarefa__meta">
                    <span class="selo">${EM.esc(seloTipo)}</span>
                    ${dataFormatada ? `<span class="selo">${EM.esc(dataFormatada)}</span>` : ''}
                </div>
            </div>
        </li>`;
    });

    if (listaAberta) html += '</ul>';

    alvo.innerHTML = html;
}
