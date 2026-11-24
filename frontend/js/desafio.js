/* =========================================================
   DESAFIO — detalhe de um desafio "Experimente" + reflexão

   Lê ?id= da URL, mostra as instruções e, depois de tentar, recolhe o
   resultado (funcionou / parcial / não funcionou) e uma reflexão escrita.
   Ao concluir, sugere uma mulher da área para conhecer.
========================================================= */

const DESAFIO_NIVEL_ROTULO = {
    iniciante: 'Iniciante',
    intermediario: 'Intermediário',
    avancado: 'Avançado'
};

EM.iniciar('experimentar', async function (usuario) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const miolo = document.getElementById('miolo');

    if (!id) {
        mostrarNaoEncontrado(miolo);
        return;
    }

    let desafio;

    try {
        desafio = await apiPublica('/desafios/' + encodeURIComponent(id));
    } catch (erro) {
        if (erro.status === 404) {
            mostrarNaoEncontrado(miolo);
            return;
        }
        mostrarNotificacao('avisoDesafio', erro.message || 'Não foi possível carregar este desafio agora.', 'erro');
        return;
    }

    document.title = desafio.titulo + ' — Efect Matilda';
    renderDesafio(miolo, desafio);
});

function mostrarNaoEncontrado(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="vazio">
            <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
            <h1>Desafio não encontrado</h1>
            <p>Esse desafio não existe ou foi removido. Volte para o catálogo e escolha outro.</p>
            <a class="btn btn--primario" href="experimentar.html">Ver todos os desafios</a>
        </div>`;
}

// Os campos de detalhe são opcionais: se o desafio não trouxer, o bloco some.
function blocoMateriais(materiais) {
    if (!materiais || !materiais.length) return '';

    return `
        <section class="secao" aria-labelledby="tMateriais">
            <h2 id="tMateriais">O que você vai precisar</h2>
            <ul class="lista-materiais">
                ${materiais.map(function (m) { return `<li><i class="fa-solid fa-check" aria-hidden="true"></i> ${EM.esc(m)}</li>`; }).join('')}
            </ul>
        </section>`;
}

function blocoCuidados(cuidados) {
    if (!cuidados || !cuidados.length) return '';

    return `
        <div class="missao missao--cuidado" role="note">
            <strong><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Cuidados</strong>
            ${cuidados.map(function (c) { return `<p>${EM.esc(c)}</p>`; }).join('')}
        </div>`;
}

function blocoLista(idTitulo, icone, titulo, itens) {
    if (!itens || !itens.length) return '';

    return `
        <section class="secao" aria-labelledby="${idTitulo}">
            <h2 id="${idTitulo}"><i class="fa-solid ${icone}" aria-hidden="true"></i> ${EM.esc(titulo)}</h2>
            <ul class="lista-dicas">
                ${itens.map(function (i) { return `<li>${EM.esc(i)}</li>`; }).join('')}
            </ul>
        </section>`;
}

function renderDesafio(container, d) {
    const area = EM.areaPorId(d.categoria);
    const nivelRotulo = DESAFIO_NIVEL_ROTULO[d.nivel] || d.nivel;

    container.innerHTML = `
        <header class="desafio-detalhe__cab">
            <span class="icone-circulo icone-circulo--${area ? area.cor : 'rosa'}" aria-hidden="true">
                <i class="fa-solid ${area ? area.icone : 'fa-flask'}"></i>
            </span>
            <h1>${EM.esc(d.titulo)}</h1>
            <p class="subtitulo">${EM.esc(d.descricao)}</p>
            <div class="desafio-card__meta">
                <span class="selo"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${Number(d.tempo_estimado_min)} min</span>
                <span class="selo">${EM.esc(nivelRotulo)}</span>
                <span class="selo">${EM.esc(d.area_cientifica)}</span>
            </div>
        </header>

        <div class="missao"><strong>Missão</strong><p>${EM.esc(d.atividade)}</p></div>

        <section class="secao" aria-labelledby="tObjetivo">
            <h2 id="tObjetivo">Objetivo</h2>
            <p>${EM.esc(d.objetivo)}</p>
        </section>

        ${blocoMateriais(d.materiais)}
        ${blocoCuidados(d.cuidados)}

        <section class="secao" aria-labelledby="tComo">
            <h2 id="tComo">Como fazer, passo a passo</h2>
            <ol class="lista-instrucoes">
                ${d.instrucoes.map(function (passo) { return `<li>${EM.esc(passo)}</li>`; }).join('')}
            </ol>
        </section>

        ${blocoLista('tObservar', 'fa-eye', 'O que observar', d.o_que_observar)}
        ${blocoLista('tDicas', 'fa-lightbulb', 'Dicas', d.dicas)}

        <section class="secao" aria-labelledby="tDepois">
            <h2 id="tDepois">Depois de tentar...</h2>

            <div id="areaReflexao" aria-live="polite">
                <p class="subtitulo">O que aconteceu?</p>

                <div class="reflexao-opcoes" id="opcoesResultado" role="group" aria-label="O que aconteceu com sua hipótese">
                    <button type="button" class="reflexao-opcao" data-valor="funcionou" aria-pressed="false">
                        <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Minha hipótese funcionou
                    </button>
                    <button type="button" class="reflexao-opcao" data-valor="parcial" aria-pressed="false">
                        <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i> Funcionou parcialmente
                    </button>
                    <button type="button" class="reflexao-opcao" data-valor="nao_funcionou" aria-pressed="false">
                        <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Minha hipótese não funcionou
                    </button>
                </div>

                <ul class="perguntas-reflexao">
                    ${d.perguntas_reflexao.map(function (p) { return `<li>${EM.esc(p)}</li>`; }).join('')}
                </ul>

                <form id="formReflexao" novalidate>
                    <div id="avisoReflexao" class="cu-notificacao-area"></div>

                    <div class="campo">
                        <label for="reflexao">Escreva sua reflexão</label>
                        <textarea id="reflexao" rows="5" maxlength="1000" required placeholder="O que você observou? Por que você acha que isso aconteceu?"></textarea>
                        <p class="campo__erro" id="reflexao-erro" role="alert"></p>
                    </div>

                    <button type="submit" class="btn btn--primario btn--bloco" id="btnEnviarReflexao" disabled>Concluir desafio</button>
                </form>
            </div>
        </section>`;

    ligarReflexao(container, d);
}

function ligarReflexao(container, d) {
    let resultadoEscolhido = null;

    const botoesResultado = container.querySelectorAll('.reflexao-opcao');
    const campoReflexao = container.querySelector('#reflexao');
    const btnEnviar = container.querySelector('#btnEnviarReflexao');
    const form = container.querySelector('#formReflexao');

    function atualizarBotaoEnviar() {
        btnEnviar.disabled = !(resultadoEscolhido && campoReflexao.value.trim().length > 0);
    }

    botoesResultado.forEach(function (btn) {
        btn.addEventListener('click', function () {
            botoesResultado.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
            btn.setAttribute('aria-pressed', 'true');
            resultadoEscolhido = btn.dataset.valor;
            atualizarBotaoEnviar();
        });
    });

    campoReflexao.addEventListener('input', atualizarBotaoEnviar);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!resultadoEscolhido || !campoReflexao.value.trim()) return;

        EM.carregando(btnEnviar, true, 'Enviando...');

        try {
            await api('/desafios/' + encodeURIComponent(d.id) + '/reflexao', {
                metodo: 'POST',
                corpo: { resultado: resultadoEscolhido, reflexao: campoReflexao.value.trim() }
            });

            EM.toast('Desafio concluído! Isso já está no seu Passaporte.', 'sucesso');
            await mostrarConclusao(container, d);
        } catch (erro) {
            EM.carregando(btnEnviar, false);
            mostrarNotificacao('avisoReflexao', erro.message || 'Não foi possível enviar sua reflexão agora. Tente de novo.', 'erro');
        }
    });
}

async function mostrarConclusao(container, desafio) {
    const area = container.querySelector('#areaReflexao');
    if (!area) return;

    let mulherHtml = '';

    try {
        const mulheres = await apiPublica('/mulheres/?area=' + encodeURIComponent(desafio.categoria));

        if (mulheres && mulheres.length) {
            // Prioriza a mulher ligada a este desafio específico; sem isso, mostra a primeira da área.
            const destaque = mulheres.find(function (m) { return m.desafio_relacionado_id === desafio.id; }) || mulheres[0];
            const areaDestaque = EM.areaPorId(destaque.area);

            mulherHtml = `
                <div class="card" style="margin-top:18px">
                    <p style="font-weight:700;margin-bottom:10px">Quer conhecer quem já trabalha nessa área?</p>
                    <div class="mulher-card__cab" style="margin-bottom:12px">
                        <span class="icone-circulo icone-circulo--${areaDestaque ? areaDestaque.cor : 'rosa'}" aria-hidden="true">
                            <i class="fa-solid ${areaDestaque ? areaDestaque.icone : 'fa-venus'}"></i>
                        </span>
                        <div>
                            <h3 style="font-size:1.05rem">${EM.esc(destaque.nome)}</h3>
                            <p class="mulher-card__atuacao">${EM.esc(destaque.atuacao)}</p>
                        </div>
                    </div>
                    <a class="btn btn--suave" href="mulheres.html?area=${encodeURIComponent(desafio.categoria)}">Conhecer</a>
                </div>`;
        }
    } catch (erro) {
        // Sem sugestão de mulher da área agora — a conclusão do desafio já valeu, segue sem quebrar a tela.
        mulherHtml = '';
    }

    area.innerHTML = `
        <div class="vazio">
            <span class="icone-circulo icone-circulo--grande icone-circulo--verde" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
            <h3>Desafio concluído!</h3>
            <p>Sua reflexão foi registrada no seu Passaporte Matilda.</p>
        </div>
        ${mulherHtml}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;justify-content:center">
            <a class="btn btn--contorno" href="experimentar.html">Ver outros desafios</a>
            <a class="btn btn--primario" href="passaporte.html">Ver meu Passaporte</a>
        </div>`;
}
