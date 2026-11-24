/* =========================================================
   PROJETO (singular) — editor de um projeto, o método de 9 passos

   Cada um dos 9 campos do método científico salva sozinho, ao perder o
   foco (blur), só quando o texto realmente mudou. O servidor recalcula
   etapa_atual sozinho (conta quantos campos têm conteúdo) — aqui só
   redesenha a barra de progresso a partir do que ele devolve.

   A Matilda (chat) NUNCA escreve direto nesses campos — o botão "Pedir
   ajuda" só leva pra uma conversa guiada; quem escreve é sempre a
   estudante.
========================================================= */

const CAMPOS_METODO = [
    { n: 1, campo: 'problema', rotulo: 'Problema', ajuda: 'O que você observou ou percebeu?' },
    { n: 2, campo: 'pergunta_pesquisa', rotulo: 'Pergunta de pesquisa', ajuda: 'Como transformar isso em algo que dá pra investigar?' },
    { n: 3, campo: 'hipotese', rotulo: 'Hipótese', ajuda: 'O que você acha que vai acontecer, e por quê?' },
    { n: 4, campo: 'objetivo', rotulo: 'Objetivo', ajuda: 'O que você quer descobrir ou alcançar com esse projeto?' },
    { n: 5, campo: 'metodologia', rotulo: 'Metodologia', ajuda: 'Como você vai investigar isso, passo a passo?' },
    { n: 6, campo: 'experimento', rotulo: 'Experimento', ajuda: 'Que atividade prática ou teste você vai fazer?' },
    { n: 7, campo: 'coleta_dados', rotulo: 'Coleta de dados', ajuda: 'O que você vai observar ou medir, e como vai registrar isso?' },
    { n: 8, campo: 'analise', rotulo: 'Análise', ajuda: 'O que os dados mostraram? O que chamou sua atenção?' },
    { n: 9, campo: 'conclusao', rotulo: 'Conclusão', ajuda: 'O que você aprendeu? O que ainda fica em aberto?' }
];

let projetoAtual = null;

document.addEventListener('DOMContentLoaded', function () {

    EM.iniciar('projetos', async function () {

        const id = new URLSearchParams(window.location.search).get('id');
        const areaProjeto = document.getElementById('areaProjeto');

        if (!id) {
            mostrarNaoEncontrado(areaProjeto);
            return;
        }

        try {
            // Erro tratado aqui mesmo (não deixa "vazar" pro EM.iniciar): um 404
            // de projeto não existente não é sessão inválida, é só "não achamos".
            projetoAtual = await api('/projetos/' + encodeURIComponent(id));
        } catch (erro) {
            mostrarNaoEncontrado(areaProjeto);
            return;
        }

        desenharProjeto();
    });
});

function mostrarNaoEncontrado(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="vazio">
            <span class="icone-circulo icone-circulo--grande"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
            <h1 style="margin:0">Projeto não encontrado</h1>
            <p>Esse projeto não existe ou não é seu. Volte pra sua lista de projetos.</p>
            <a class="btn btn--primario" href="projetos.html">Ver meus projetos</a>
        </div>`;
}

function desenharProjeto() {
    const areaProjeto = document.getElementById('areaProjeto');
    const p = projetoAtual;

    areaProjeto.innerHTML = `
        <div id="blocoTitulo" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px"></div>
        <div id="areaSelo" style="margin-bottom:16px"></div>

        <div class="passo-topo">
            <span id="passoRotulo" aria-live="polite"></span>
        </div>
        <ul class="passos" id="listaPassos" aria-hidden="true">${'<li></li>'.repeat(9)}</ul>

        <div style="margin:22px 0">
            <a class="btn btn--suave" href="matilda.html?projeto=${encodeURIComponent(p.id)}">
                <i class="fa-solid fa-book-open" aria-hidden="true"></i> Pedir ajuda pra Matilda
            </a>
        </div>

        <div id="camposMetodo"></div>

        <div class="secao" style="margin-top:24px">
            <button type="button" class="btn btn--perigo" id="btnExcluirProjeto">
                <i class="fa-solid fa-trash" aria-hidden="true"></i> Excluir projeto
            </button>
        </div>`;

    renderizarTitulo();
    renderizarSelo();
    atualizarProgresso(p.etapa_atual);

    const camposAlvo = document.getElementById('camposMetodo');
    camposAlvo.innerHTML = CAMPOS_METODO.map(function (def) { return blocoCampo(def, p[def.campo]); }).join('');
    CAMPOS_METODO.forEach(function (def) { ligarCampoMetodo(def); });

    document.getElementById('btnExcluirProjeto').addEventListener('click', excluirProjeto);
}

/* ---------- título (editável) ---------- */

function renderizarTitulo() {
    const bloco = document.getElementById('blocoTitulo');

    bloco.innerHTML = `
        <h1 class="titulo-pagina" id="tituloProjeto" style="margin:0">${EM.esc(projetoAtual.titulo)}</h1>
        <button type="button" class="btn btn--icone" id="btnEditarTitulo" aria-label="Editar título do projeto">
            <i class="fa-solid fa-pen" aria-hidden="true"></i>
        </button>`;

    document.getElementById('btnEditarTitulo').addEventListener('click', ativarEdicaoTitulo);
}

function ativarEdicaoTitulo() {
    const bloco = document.getElementById('blocoTitulo');

    bloco.innerHTML = `
        <div class="campo" style="flex:1;min-width:220px;margin:0">
            <label for="campoTituloEdit" class="sr-only">Título do projeto</label>
            <input type="text" id="campoTituloEdit" maxlength="140" style="font:700 1.6rem var(--fonte-titulo);color:inherit;border:2px solid var(--borda);border-radius:12px;padding:6px 12px;width:100%">
        </div>
        <button type="button" class="btn btn--primario btn--icone" id="btnSalvarTitulo" aria-label="Salvar título">
            <i class="fa-solid fa-check" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn btn--suave btn--icone" id="btnCancelarTitulo" aria-label="Cancelar edição do título">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>`;

    const input = document.getElementById('campoTituloEdit');
    input.value = projetoAtual.titulo;
    input.focus();
    input.select();

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); salvarTitulo(input); }
        else if (e.key === 'Escape') { e.preventDefault(); renderizarTitulo(); }
    });

    document.getElementById('btnSalvarTitulo').addEventListener('click', function () { salvarTitulo(input); });
    document.getElementById('btnCancelarTitulo').addEventListener('click', renderizarTitulo);
}

async function salvarTitulo(input) {
    const novoTitulo = input.value.trim();

    if (!novoTitulo) {
        EM.toast('O título não pode ficar em branco.', 'erro');
        input.focus();
        return;
    }

    if (novoTitulo === projetoAtual.titulo) { renderizarTitulo(); return; }

    try {
        // PUT só com o título: os 9 campos do método não são enviados, então
        // ficam intocados no servidor.
        projetoAtual = await api('/projetos/' + encodeURIComponent(projetoAtual.id), { metodo: 'PUT', corpo: { titulo: novoTitulo } });
        renderizarTitulo();
        EM.toast('Título atualizado', 'sucesso');
    } catch (erro) {
        EM.toast('Não foi possível salvar o título: ' + erro.message, 'erro');
    }
}

function renderizarSelo() {
    const alvo = document.getElementById('areaSelo');

    alvo.innerHTML = projetoAtual.tema_comunidade
        ? `<span class="selo"><i class="fa-solid fa-people-group" aria-hidden="true"></i> A partir de: ${EM.esc(projetoAtual.tema_comunidade)}</span>`
        : '';
}

/* ---------- barra de progresso (9 passos) ---------- */

function atualizarProgresso(etapaAtual) {
    const etapa = Math.min(Math.max(Number(etapaAtual) || 1, 1), 9);

    document.getElementById('passoRotulo').textContent = 'Etapa ' + etapa + ' de 9';

    // etapa_atual é "o próximo passo incompleto": passos 1..etapa-1 contam
    // como feitos. Como o servidor trava o valor em 9 mesmo com os 9 campos
    // preenchidos, o 9º passo nunca acende sozinho por aqui — mas nesse
    // ponto o card já mostra "preenchido" (borda verde) de qualquer forma.
    document.querySelectorAll('#listaPassos li').forEach(function (li, i) {
        li.classList.toggle('feito', i < etapa - 1);
    });
}

/* ---------- os 9 campos do método ---------- */

function blocoCampo(def, valor) {
    const preenchido = !!(valor && String(valor).trim());

    return `
        <div class="campo-metodo${preenchido ? ' preenchido' : ''}" data-campo="${def.campo}">
            <label class="campo-metodo__rotulo" for="campo-${def.campo}"><span class="n">${def.n}</span> ${EM.esc(def.rotulo)}</label>
            <p class="campo-metodo__ajuda">${EM.esc(def.ajuda)}</p>
            <textarea id="campo-${def.campo}" rows="3"></textarea>
        </div>`;
}

function ligarCampoMetodo(def) {
    const textarea = document.getElementById('campo-' + def.campo);
    if (!textarea) return;

    // O valor entra por aqui (propriedade, não atributo/innerHTML) — assim
    // nenhum caractere do que a estudante escreveu precisa ser escapado.
    textarea.value = projetoAtual[def.campo] || '';

    let valorAoFocar = textarea.value;

    textarea.addEventListener('focus', function () {
        valorAoFocar = textarea.value;
    });

    textarea.addEventListener('blur', async function () {
        const novoValor = textarea.value;

        if (novoValor === valorAoFocar) return;

        const corpo = { titulo: projetoAtual.titulo };
        corpo[def.campo] = novoValor;

        textarea.disabled = true;

        try {
            projetoAtual = await api('/projetos/' + encodeURIComponent(projetoAtual.id), { metodo: 'PUT', corpo: corpo });

            const bloco = textarea.closest('.campo-metodo');
            if (bloco) bloco.classList.toggle('preenchido', !!(novoValor && novoValor.trim()));

            atualizarProgresso(projetoAtual.etapa_atual);
            EM.toast('Salvo', 'sucesso');
        } catch (erro) {
            EM.toast('Não foi possível salvar "' + def.rotulo + '": ' + erro.message, 'erro');
            textarea.value = valorAoFocar; // volta pro que estava sincronizado com o servidor
        } finally {
            textarea.disabled = false;
        }
    });
}

/* ---------- excluir ---------- */

async function excluirProjeto() {
    const confirmou = await EM.confirmar(
        'Excluir projeto',
        'Isso apaga o projeto e tudo o que você escreveu nele. Essa ação não pode ser desfeita.',
        'Excluir'
    );

    if (!confirmou) return;

    try {
        await api('/projetos/' + encodeURIComponent(projetoAtual.id), { metodo: 'DELETE' });
        EM.toast('Projeto excluído', 'sucesso');
        window.location.href = 'projetos.html';
    } catch (erro) {
        EM.toast('Não foi possível excluir agora: ' + erro.message, 'erro');
    }
}
