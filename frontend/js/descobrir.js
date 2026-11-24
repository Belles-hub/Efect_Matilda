/* =========================================
   DESCOBRIR INTERESSES (onboarding)

   3 passos curtos: o que ela gosta de fazer (nunca framed como escolha de
   profissão — só serve pra sugerir experiências), série + localização, e
   uma prévia de áreas sugeridas. Ao final grava as preferências e libera
   o resto do app (EM.iniciar só libera as outras telas com
   onboarding_concluido = true).
========================================= */

const GOSTOS_DESCOBRIR = [
    { id: 'resolver', rotulo: 'Resolver problemas', icone: 'fa-puzzle-piece', cor: 'rosa' },
    { id: 'criar', rotulo: 'Criar coisas', icone: 'fa-hammer', cor: 'amarelo' },
    { id: 'investigar', rotulo: 'Investigar', icone: 'fa-magnifying-glass', cor: 'ciano' },
    { id: 'programar', rotulo: 'Programar', icone: 'fa-code', cor: 'lilas' },
    { id: 'tecnologia', rotulo: 'Trabalhar com tecnologia', icone: 'fa-microchip', cor: 'azul' },
    { id: 'ambiente', rotulo: 'Cuidar do meio ambiente', icone: 'fa-leaf', cor: 'verde' },
    { id: 'entender', rotulo: 'Entender como as coisas funcionam', icone: 'fa-gears', cor: 'laranja' },
    { id: 'pessoas', rotulo: 'Trabalhar com pessoas', icone: 'fa-people-group', cor: 'coral' }
];

// Cada "gosto" aponta pra uma ou mais áreas reais (EM.AREAS). Não é uma
// conta exata — é só um jeito de começar com sugestões que fazem sentido.
const MAPA_GOSTO_AREA = {
    resolver: ['ciberseguranca'],
    criar: ['inteligencia_artificial', 'experimentos'],
    investigar: ['ciencia', 'ciencia_de_dados'],
    programar: ['programacao'],
    tecnologia: ['tecnologia'],
    ambiente: ['meio_ambiente'],
    entender: ['ciencia'],
    pessoas: []
};

document.addEventListener('DOMContentLoaded', function () {

    // semOnboarding: esta É a tela de onboarding — sem essa opção, EM.iniciar
    // ia redirecionar pra cá de novo e entrar em loop.
    EM.iniciar('descobrir', async function (usuario) {

        const pref = usuario.preferencias || {};

        let passo = 1;
        let areasSugeridas = [];

        const escolhas = {
            gostos: [],
            serie: pref.serie || '',
            localizacao: pref.localizacao || ''
        };

        const painel = document.getElementById('conteudoPasso');
        const listaPassos = document.getElementById('passos');
        const rotuloPasso = document.getElementById('passoRotulo');
        const btnVoltar = document.getElementById('btnVoltar');

        function atualizarIndicador() {
            rotuloPasso.textContent = 'Passo ' + passo + ' de 3';
            listaPassos.querySelectorAll('li').forEach(function (li, i) {
                li.classList.toggle('feito', i < passo);
            });
            btnVoltar.hidden = passo === 1;
        }

        function inferirAreas() {
            const set = new Set();
            escolhas.gostos.forEach(function (g) {
                (MAPA_GOSTO_AREA[g] || []).forEach(function (a) { set.add(a); });
            });

            let lista = Array.from(set);
            if (!lista.length) lista = ['ciencia', 'experimentos'];
            return lista.slice(0, 3);
        }

        function desenharPasso1() {
            painel.innerHTML = `
                <h2 id="tPasso">O que você gosta de fazer?</h2>
                <p class="subtitulo" style="margin-bottom:16px">Escolha quantas quiser. Não define uma profissão — só sugere por onde começar.</p>
                <div class="opcoes-grade" id="grupoGostos" role="group" aria-labelledby="tPasso">
                    ${GOSTOS_DESCOBRIR.map(function (o) {
                        return `<button type="button" class="opcao-cartao card--cor card--${o.cor}" data-id="${o.id}" aria-pressed="${escolhas.gostos.includes(o.id)}">
                            <i class="fa-solid ${o.icone}" aria-hidden="true"></i><span>${EM.esc(o.rotulo)}</span>
                        </button>`;
                    }).join('')}
                </div>
                <button type="button" class="btn btn--primario btn--bloco" id="btnProximo1" style="margin-top:20px">Continuar</button>`;

            document.getElementById('grupoGostos').addEventListener('click', function (e) {
                const botao = e.target.closest('.opcao-cartao');
                if (!botao) return;

                const ligado = botao.getAttribute('aria-pressed') !== 'true';
                botao.setAttribute('aria-pressed', String(ligado));

                escolhas.gostos = ligado
                    ? escolhas.gostos.concat(botao.dataset.id)
                    : escolhas.gostos.filter(function (g) { return g !== botao.dataset.id; });
            });

            document.getElementById('btnProximo1').addEventListener('click', function () {
                if (!escolhas.gostos.length) {
                    EM.toast('Escolha ao menos uma opção pra continuar.', 'erro');
                    return;
                }

                passo = 2;
                atualizarIndicador();
                desenharPasso2();
            });
        }

        function desenharPasso2() {
            painel.innerHTML = `
                <h2 id="tPasso">Só mais duas coisas</h2>
                <p class="subtitulo" style="margin-bottom:16px">Usamos isso pra mostrar desafios no seu nível e oportunidades perto de você. Tudo opcional.</p>
                <div class="campo">
                    <label for="campoSerie">Série</label>
                    <select id="campoSerie"><option value="">Prefiro não dizer</option></select>
                </div>
                <div class="campo">
                    <label for="campoLocal">Cidade/Estado</label>
                    <input type="text" id="campoLocal" maxlength="120" placeholder="Ex.: Recife, PE" autocomplete="address-level2">
                </div>
                <button type="button" class="btn btn--primario btn--bloco" id="btnProximo2">Continuar</button>`;

            const campoSerie = document.getElementById('campoSerie');

            EM.SERIES.forEach(function (s) {
                const op = document.createElement('option');
                op.value = op.textContent = s;
                campoSerie.appendChild(op);
            });

            campoSerie.value = escolhas.serie;
            document.getElementById('campoLocal').value = escolhas.localizacao;

            document.getElementById('btnProximo2').addEventListener('click', async function () {
                escolhas.serie = campoSerie.value;
                escolhas.localizacao = document.getElementById('campoLocal').value.trim();
                areasSugeridas = inferirAreas();

                const botao = this;
                EM.carregando(botao, true, 'Só um instante...');

                try {
                    await api('/perfil/' + encodeURIComponent(EM.uid) + '/preferencias', {
                        metodo: 'PUT',
                        corpo: {
                            interesses: areasSugeridas,
                            serie: escolhas.serie,
                            localizacao: escolhas.localizacao,
                            onboarding_concluido: true
                        }
                    });
                } catch (erro) {
                    EM.toast('Não foi possível salvar agora: ' + erro.message, 'erro');
                } finally {
                    EM.carregando(botao, false);
                }

                passo = 3;
                atualizarIndicador();
                desenharPasso3();
            });
        }

        function desenharPasso3() {
            const cards = areasSugeridas.map(EM.areaPorId).filter(Boolean);

            painel.innerHTML = `
                <h2 id="tPasso">Talvez você goste de experimentar...</h2>
                <p class="subtitulo" style="margin-bottom:16px">Um ponto de partida — você pode explorar todas as áreas quando quiser, a qualquer momento.</p>
                <div class="opcoes-grade" role="list" aria-label="Áreas sugeridas">
                    ${cards.map(function (a) {
                        return `<div class="card card--cor card--${a.cor}" role="listitem" style="display:grid;gap:10px;min-height:auto">
                            <span class="icone-circulo icone-circulo--${a.cor}"><i class="fa-solid ${a.icone}" aria-hidden="true"></i></span>
                            <h3 style="margin:0">${EM.esc(a.rotulo)}</h3>
                            <a class="btn btn--escuro" href="experimentar.html?categoria=${encodeURIComponent(a.id)}">Ver desafios</a>
                        </div>`;
                    }).join('')}
                </div>
                <button type="button" class="btn btn--primario btn--bloco" id="btnIrInicio" style="margin-top:20px">Ir para o início</button>`;

            document.getElementById('btnIrInicio').addEventListener('click', function () {
                window.location.href = 'inicio.html';
            });
        }

        btnVoltar.addEventListener('click', function () {
            if (passo === 2) { passo = 1; atualizarIndicador(); desenharPasso1(); }
            else if (passo === 3) { passo = 2; atualizarIndicador(); desenharPasso2(); }
        });

        atualizarIndicador();
        desenharPasso1();

    }, { semOnboarding: true });
});
