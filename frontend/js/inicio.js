/* =========================================
   TELA INICIAL (Home)

   Abre com a pergunta "o que você gostaria de descobrir hoje" (as 8 áreas),
   uma vitrine pra experimentar um desafio real sem compromisso, o indicador
   de jornada (Descobrir → Experimentar → Criar → Participar) vindo do
   Passaporte, e atalhos pro resto do app.
========================================= */

const ETAPAS_JORNADA = [
    { id: 'descobrir', rotulo: 'Descobrir', icone: 'fa-compass' },
    { id: 'experimentar', rotulo: 'Experimentar', icone: 'fa-flask' },
    { id: 'criar', rotulo: 'Criar', icone: 'fa-lightbulb' },
    { id: 'participar', rotulo: 'Participar', icone: 'fa-rocket' }
];

function desenharCategorias(usuario) {
    const alvo = document.getElementById('categorias');

    alvo.innerHTML = EM.AREAS.map(function (a) {
        return `<a class="categoria" href="experimentar.html?categoria=${encodeURIComponent(a.id)}">
            <span class="icone-circulo icone-circulo--${a.cor}"><i class="fa-solid ${a.icone}" aria-hidden="true"></i></span>
            <span>${EM.esc(a.rotulo)}</span>
        </a>`;
    }).join('');
}

// "Como você está hoje?": só escolhe e recebe um incentivo — não avalia
// nem diagnostica nada, e fica salvo apenas neste aparelho.
const HUMORES_DIA = [
    { id: 'feliz', rotulo: 'Feliz', forma: 'sol', cor: 'amarelo', tile: 'amarelo', msg: 'Que bom! Aproveita essa energia pra começar um desafio novo.' },
    { id: 'animado', rotulo: 'Animada', forma: 'flor', cor: 'laranja', tile: 'laranja', msg: 'Bora! Essa empolgação rende um ótimo experimento hoje.' },
    { id: 'calmo', rotulo: 'Calma', forma: 'mole', cor: 'verde', tile: 'verde', msg: 'Dia bom pra explorar sem pressa. Escolhe uma área e vai no seu ritmo.' },
    { id: 'cansado', rotulo: 'Cansada', forma: 'pilula', cor: 'azul', tile: 'azul', msg: 'Tudo bem. Que tal algo curtinho, de poucos minutos? Descansar também faz parte.' },
    { id: 'confuso', rotulo: 'Confusa', forma: 'estrela4', cor: 'celeste', tile: 'ciano', msg: 'Sem problema. A Matilda pode te ajudar a separar as ideias, uma pergunta de cada vez.' },
    { id: 'preocupado', rotulo: 'Preocupada', forma: 'quadrado', cor: 'lilas', tile: 'lilas', msg: 'Obrigada por contar. Se quiser, fala com a Matilda, e se algo estiver pesado, conversa com alguém de confiança.' }
];

const CHAVE_HUMOR = 'efectmatilda_humor';

function lerHumorDoDia() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_HUMOR) || 'null');
        return salvo && salvo.dia === new Date().toDateString() ? salvo.id : null;
    } catch (erro) {
        return null;
    }
}

function guardarHumorDoDia(id) {
    try {
        localStorage.setItem(CHAVE_HUMOR, JSON.stringify({ dia: new Date().toDateString(), id: id }));
    } catch (erro) {
        // Sem armazenamento: o humor só vale até recarregar a página.
    }
}

function mostrarRespostaHumor(humor) {
    document.getElementById('humorResposta').innerHTML = `
        <div class="humor__resposta">
            <span data-forma="${humor.forma}" data-cor="${humor.cor}" data-emocao="${humor.id}" aria-hidden="true"></span>
            <div>
                <p>${EM.esc(humor.msg)}</p>
                <a href="matilda.html" style="font-weight:700">Conversar com a Matilda</a>
            </div>
        </div>`;

    Formas.ativar(document.getElementById('humorResposta'));
}

function desenharHumor() {
    const alvo = document.getElementById('humorOpcoes');
    const atual = lerHumorDoDia();

    alvo.innerHTML = HUMORES_DIA.map(function (h) {
        return `<button type="button" class="humor__op" data-humor="${h.id}" aria-pressed="${h.id === atual}">
            <span data-forma="${h.forma}" data-cor="${h.cor}" data-emocao="${h.id}" aria-hidden="true"></span>
            <span>${EM.esc(h.rotulo)}</span>
        </button>`;
    }).join('');

    Formas.ativar(alvo);

    alvo.querySelectorAll('.humor__op').forEach(function (botao) {
        botao.addEventListener('click', function () {
            const humor = HUMORES_DIA.find(function (h) { return h.id === botao.dataset.humor; });

            alvo.querySelectorAll('.humor__op').forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });

            guardarHumorDoDia(humor.id);
            mostrarRespostaHumor(humor);

            const forma = botao.querySelector('.forma');
            Formas.quicar(forma);
            Formas.festa(forma, 8);
        });
    });

    if (atual) mostrarRespostaHumor(HUMORES_DIA.find(function (h) { return h.id === atual; }));
}

function desenharPalcoDesafio(desafios) {
    const alvo = document.getElementById('palcoDesafio');

    if (!desafios || !desafios.length) {
        alvo.innerHTML = `
            <div class="card"><p class="subtitulo">Ainda sem desafios disponíveis agora. Volte em breve!</p></div>`;
        return;
    }

    const escolhido = desafios[0];

    alvo.innerHTML = `
        <div class="palco">
            <span class="rotulo-mini">✨ Experimente antes de escolher</span>
            <h2>Descubra seus interesses colocando a mão na massa.</h2>
            <p>${EM.esc(escolhido.titulo)}</p>
            ${escolhido.motivo ? `<span class="selo"><i class="fa-solid fa-star" aria-hidden="true"></i> ${EM.esc(escolhido.motivo)}</span>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                <span class="selo"><i class="fa-regular fa-clock" aria-hidden="true"></i> Tempo: ${escolhido.tempo_estimado_min} min</span>
                <span class="selo"><i class="fa-solid fa-signal" aria-hidden="true"></i> Nível: ${EM.esc(escolhido.nivel)}</span>
            </div>
            <a class="btn btn--primario" href="desafio.html?id=${encodeURIComponent(escolhido.id)}">Começar desafio</a>
        </div>`;

    Formas.ativar(alvo);
}

function desenharJornada(etapaAtual) {
    const alvo = document.getElementById('jornada');
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

document.addEventListener('DOMContentLoaded', function () {

    EM.iniciar('inicio', async function (usuario) {

        document.getElementById('ola').textContent = 'Olá, ' + EM.primeiroNome(usuario.nome) + ' 👋';

        // Uma frase por dia — a mesma o dia todo, pra tela não "mudar sozinha".
        const diaDoAno = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        document.getElementById('frase').textContent = EM.escolher(EM.FRASES, diaDoAno);

        desenharHumor();
        desenharCategorias(usuario);

        // A ordem vem do backend, já pro perfil (áreas que quer experimentar,
        // interesses, nível da série, sem repetir os concluídos).
        const [desafiosRes, passaporteRes] = await Promise.allSettled([
            api('/desafios/recomendados?limite=1'),
            api('/passaporte/')
        ]);

        if (desafiosRes.status === 'fulfilled') {
            desenharPalcoDesafio(desafiosRes.value);
        } else {
            document.getElementById('palcoDesafio').innerHTML =
                '<div class="card"><p class="subtitulo">Não foi possível carregar um desafio agora. Tente de novo mais tarde.</p></div>';
        }

        if (passaporteRes.status === 'fulfilled') {
            desenharJornada(passaporteRes.value.jornada_etapa);
        } else {
            desenharJornada('descobrir');
        }
    });
});
