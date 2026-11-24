/* =========================================================
   MEUS PROJETOS — lista de projetos da estudante + criação

   Duas formas de começar um projeto (seção 9/10 do spec):
   - do zero, só com um título;
   - a partir de um Problema da Comunidade (tema já vem pronto, o título é
     sugerido a partir do problema escolhido, mas continua editável).

   A tela em si (projeto.html, singular) é quem cuida do método de 9 passos.
========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    EM.iniciar('projetos', async function () {

        await carregarProjetos();

        document.getElementById('btnNovoProjeto').addEventListener('click', abrirNovoProjeto);
    });
});

async function carregarProjetos() {
    const alvo = document.getElementById('listaProjetos');
    if (!alvo) return;

    EM.esqueleto(alvo, 4, 140);

    try {
        const lista = await api('/projetos/');
        alvo.removeAttribute('aria-busy');

        if (!lista.length) {
            alvo.innerHTML = `
                <div class="vazio" style="grid-column:1/-1">
                    <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i></span>
                    <h3 style="margin:0">Nenhum projeto ainda</h3>
                    <p>Comece do zero ou parta de um problema real da sua comunidade — a Matilda ajuda você a estruturar cada etapa.</p>
                    <button type="button" class="btn btn--primario" id="btnNovoProjetoVazio">
                        <i class="fa-solid fa-plus" aria-hidden="true"></i> Começar um projeto
                    </button>
                </div>`;

            const botaoVazio = document.getElementById('btnNovoProjetoVazio');
            if (botaoVazio) botaoVazio.addEventListener('click', abrirNovoProjeto);
            return;
        }

        alvo.innerHTML = lista.map(cartaoProjeto).join('');
    } catch (erro) {
        alvo.removeAttribute('aria-busy');
        alvo.innerHTML = `
            <div class="vazio" style="grid-column:1/-1">
                <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i></span>
                <p>${EM.esc(erro.message || 'Não foi possível carregar seus projetos agora.')}</p>
            </div>`;
    }
}

function cartaoProjeto(p) {
    const etapa = Math.min(Math.max(Number(p.etapa_atual) || 1, 1), 9);
    const porcentagem = Math.round((etapa / 9) * 100);

    return `
        <a class="projeto-card" href="projeto.html?id=${encodeURIComponent(p.id)}">
            <h3>${EM.esc(p.titulo)}</h3>
            <p>Etapa ${etapa} de 9</p>
            <div class="progresso progresso--claro" role="progressbar" aria-valuenow="${etapa}" aria-valuemin="1" aria-valuemax="9" aria-label="Progresso do projeto: etapa ${etapa} de 9">
                <span style="width:${porcentagem}%"></span>
            </div>
        </a>`;
}

/* ---------- criar projeto (janela) ---------- */

function telaEscolhaSheet() {
    return `
        <div>
            <h3 style="margin:0 0 8px">Começar do zero</h3>
            <div class="campo">
                <label for="campoTituloNovo">Título do projeto</label>
                <input type="text" id="campoTituloNovo" maxlength="140" placeholder="Ex.: Como reduzir o desperdício de água na escola">
            </div>
            <button type="button" class="btn btn--primario btn--bloco" id="btnCriarZero">Criar projeto</button>
        </div>

        <div style="margin-top:28px">
            <h3 style="margin:0 0 4px">Ou parta de um problema da comunidade</h3>
            <p class="subtitulo" style="margin-bottom:12px">Temas reais que outras pessoas também estão investigando — um bom ponto de partida se você ainda não sabe por onde começar.</p>
            <div id="listaProblemasSheet" class="grade" aria-busy="true">
                <div class="esqueleto" style="min-height:74px" aria-hidden="true"></div>
                <div class="esqueleto" style="min-height:74px" aria-hidden="true"></div>
            </div>
        </div>`;
}

function abrirNovoProjeto() {
    const sheet = EM.abrirSheet('Novo projeto', telaEscolhaSheet());
    ligarPassoZero(sheet);
    carregarProblemasSheet(sheet);
}

function ligarPassoZero(sheet) {
    const botao = sheet.corpo.querySelector('#btnCriarZero');
    const input = sheet.corpo.querySelector('#campoTituloNovo');

    botao.addEventListener('click', function () {
        const titulo = input.value.trim();

        if (!titulo) {
            EM.toast('Digite um título pro projeto.', 'erro');
            input.focus();
            return;
        }

        criarProjeto(sheet, botao, { titulo: titulo });
    });
}

async function carregarProblemasSheet(sheet) {
    const alvo = sheet.corpo.querySelector('#listaProblemasSheet');
    if (!alvo) return;

    try {
        const problemas = await apiPublica('/problemas/');

        // A janela pode ter mudado de conteúdo (ex.: já escolheu um problema)
        // enquanto isso carregava — nesse caso não faz sentido desenhar mais nada.
        if (!sheet.corpo.contains(alvo)) return;

        alvo.removeAttribute('aria-busy');

        if (!problemas.length) {
            alvo.innerHTML = '<p class="subtitulo">Nenhum problema da comunidade disponível agora.</p>';
            return;
        }

        alvo.innerHTML = problemas.map(function (pr) {
            return `<button type="button" class="problema-card" data-id="${EM.esc(pr.id)}">
                <h3>${EM.esc(pr.titulo)}</h3>
                <p>${EM.esc(pr.descricao)}</p>
            </button>`;
        }).join('');

        alvo.querySelectorAll('.problema-card').forEach(function (botaoProblema) {
            botaoProblema.addEventListener('click', function () {
                const problema = problemas.find(function (p) { return String(p.id) === botaoProblema.dataset.id; });
                if (problema) mostrarPassoProblema(sheet, problema);
            });
        });
    } catch (erro) {
        if (!sheet.corpo.contains(alvo)) return;
        alvo.removeAttribute('aria-busy');
        alvo.innerHTML = '<p class="subtitulo">Não foi possível carregar os problemas da comunidade agora.</p>';
    }
}

function mostrarPassoProblema(sheet, problema) {
    sheet.corpo.innerHTML = `
        <button type="button" class="btn btn--suave" id="btnVoltarNovo" style="margin-bottom:18px">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Voltar
        </button>
        <h3 style="margin:0 0 4px">${EM.esc(problema.titulo)}</h3>
        <p class="subtitulo" style="margin-bottom:16px">${EM.esc(problema.descricao)}</p>
        <div class="campo">
            <label for="campoTituloProblema">Título do seu projeto</label>
            <input type="text" id="campoTituloProblema" maxlength="140">
        </div>
        <button type="button" class="btn btn--primario btn--bloco" id="btnCriarProblema">Criar projeto</button>`;

    const input = sheet.corpo.querySelector('#campoTituloProblema');
    // Propriedade .value, não atributo — evita qualquer problema de escapar
    // aspas do título do problema dentro de um atributo HTML.
    input.value = 'Investigando: ' + problema.titulo;
    input.focus();
    input.select();

    sheet.corpo.querySelector('#btnVoltarNovo').addEventListener('click', function () {
        sheet.corpo.innerHTML = telaEscolhaSheet();
        ligarPassoZero(sheet);
        carregarProblemasSheet(sheet);
    });

    sheet.corpo.querySelector('#btnCriarProblema').addEventListener('click', function () {
        const titulo = input.value.trim();

        if (!titulo) {
            EM.toast('Digite um título pro projeto.', 'erro');
            input.focus();
            return;
        }

        criarProjeto(sheet, this, { titulo: titulo, tema_comunidade: problema.tema });
    });
}

async function criarProjeto(sheet, botao, corpo) {
    EM.carregando(botao, true, 'Criando...');

    try {
        const novo = await api('/projetos/', { metodo: 'POST', corpo: corpo });
        sheet.fechar();
        window.location.href = 'projeto.html?id=' + encodeURIComponent(novo.id);
    } catch (erro) {
        EM.carregando(botao, false);
        EM.toast('Não foi possível criar o projeto agora: ' + erro.message, 'erro');
    }
}
