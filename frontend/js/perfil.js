/* =========================================
   PERFIL

   Ícone e dados da conta, interesses, áreas que quer experimentar, objetivo, série/localização, atalhos de
   acessibilidade, notificações e controle da própria conta (sair e
   excluir). Cada mudança salva na hora — sem formulário pra "enviar".
========================================= */

const NOMES_FONTE_PERFIL = { pequena: 'Pequena', media: 'Média', grande: 'Grande' };
const PROXIMA_FONTE_PERFIL = { pequena: 'media', media: 'grande', grande: 'pequena' };

document.addEventListener('DOMContentLoaded', function () {

    EM.iniciar('perfil', async function (usuario) {

        const pref = usuario.preferencias || {};

        const estado = {
            avatar: pref.avatar || EM.AVATARES[0],
            interesses: (pref.interesses || []).slice(),
            experimentar: (pref.areas_que_quero_experimentar || []).slice(),
            objetivo: pref.objetivo || '',
            serie: pref.serie || '',
            localizacao: pref.localizacao || ''
        };

        /* ---- topo ---- */

        function desenharTopo() {
            document.getElementById('avatarTopo').innerHTML = `<i class="fa-solid ${estado.avatar}" aria-hidden="true"></i>`;
            document.getElementById('nomePerfil').textContent = usuario.nome;
            EM.atualizarBolinhaPerfil(estado.avatar);
            desenharResumo();
        }

        function desenharResumo() {
            document.getElementById('resEmail').textContent = usuario.email || 'não informado';
            document.getElementById('resSerie').textContent = estado.serie || 'não informada';
            document.getElementById('resLocal').textContent = estado.localizacao || 'não informada';
            document.getElementById('resInteresses').textContent = estado.interesses.length
                ? estado.interesses.length + (estado.interesses.length === 1 ? ' área' : ' áreas')
                : 'nenhum ainda';
        }

        document.getElementById('emailPerfil').textContent = usuario.email || '';

        const seloSerie = document.getElementById('seloSerie');

        function atualizarSelo() {
            seloSerie.hidden = !estado.serie;
            seloSerie.textContent = estado.serie || '';
        }

        atualizarSelo();
        desenharTopo();

        // Salva um pedaço das preferências e avisa se algo der errado.
        async function salvarPreferencias(parcial) {
            try {
                const atualizado = await api('/perfil/' + encodeURIComponent(EM.uid) + '/preferencias', { metodo: 'PUT', corpo: parcial });
                mostrarNotificacao('avisoPerfil', 'Preferências salvas!', 'sucesso');
                return atualizado;
            } catch (erro) {
                mostrarNotificacao('avisoPerfil', 'Não foi possível salvar: ' + erro.message);
                return null;
            }
        }

        /* ---- avatar ---- */

        const avatares = document.getElementById('avatares');

        avatares.innerHTML = EM.AVATARES.map(function (icone) {
            return `<button type="button" class="avatar-op" data-avatar="${icone}" aria-pressed="${estado.avatar === icone}" aria-label="Ícone ${icone.replace('fa-', '')}"><i class="fa-solid ${icone}" aria-hidden="true"></i></button>`;
        }).join('');

        avatares.addEventListener('click', async function (e) {
            const botao = e.target.closest('.avatar-op');
            if (!botao || botao.dataset.avatar === estado.avatar) return;

            estado.avatar = botao.dataset.avatar;
            avatares.querySelectorAll('.avatar-op').forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });
            desenharTopo();

            await salvarPreferencias({ avatar: estado.avatar });
        });

        /* ---- interesses ---- */

        const listaInteresses = document.getElementById('interesses');

        function desenharInteresses() {
            listaInteresses.innerHTML = EM.AREAS.map(function (a) {
                return `<button type="button" class="chip" data-id="${a.id}" aria-pressed="${estado.interesses.includes(a.id)}">
                    <i class="fa-solid ${a.icone}" aria-hidden="true"></i> ${EM.esc(a.rotulo)}
                </button>`;
            }).join('');
        }

        desenharInteresses();

        listaInteresses.addEventListener('click', async function (e) {
            const chip = e.target.closest('.chip');
            if (!chip) return;

            const id = chip.dataset.id;
            const ligado = chip.getAttribute('aria-pressed') !== 'true';

            chip.setAttribute('aria-pressed', String(ligado));
            estado.interesses = ligado ? estado.interesses.concat(id) : estado.interesses.filter(function (i) { return i !== id; });
            desenharResumo();

            await salvarPreferencias({ interesses: estado.interesses });
        });

        /* ---- quero experimentar ---- */

        const listaExperimentar = document.getElementById('experimentar');

        listaExperimentar.innerHTML = EM.AREAS.map(function (a) {
            return `<button type="button" class="chip" data-id="${a.id}" aria-pressed="${estado.experimentar.includes(a.id)}">
                <i class="fa-solid ${a.icone}" aria-hidden="true"></i> ${EM.esc(a.rotulo)}
            </button>`;
        }).join('');

        listaExperimentar.addEventListener('click', async function (e) {
            const chip = e.target.closest('.chip');
            if (!chip) return;

            const id = chip.dataset.id;
            const ligado = chip.getAttribute('aria-pressed') !== 'true';

            chip.setAttribute('aria-pressed', String(ligado));
            estado.experimentar = ligado ? estado.experimentar.concat(id) : estado.experimentar.filter(function (i) { return i !== id; });

            await salvarPreferencias({ areas_que_quero_experimentar: estado.experimentar });
        });

        /* ---- objetivo ---- */

        const campoObjetivo = document.getElementById('campoObjetivo');
        const contObjetivo = document.getElementById('contObjetivo');

        function atualizarContador() {
            contObjetivo.textContent = campoObjetivo.value.length + '/' + campoObjetivo.maxLength;
        }

        campoObjetivo.value = estado.objetivo;
        atualizarContador();
        campoObjetivo.addEventListener('input', atualizarContador);

        campoObjetivo.addEventListener('change', async function () {
            const novo = campoObjetivo.value.trim();
            if (novo === estado.objetivo) return;

            estado.objetivo = novo;
            await salvarPreferencias({ objetivo: estado.objetivo });
        });

        /* ---- série e localização ---- */

        const campoSerie = document.getElementById('campoSerie');

        EM.SERIES.forEach(function (s) {
            const op = document.createElement('option');
            op.value = op.textContent = s;
            campoSerie.appendChild(op);
        });

        campoSerie.value = estado.serie;

        campoSerie.addEventListener('change', async function () {
            estado.serie = campoSerie.value;
            atualizarSelo();
            desenharResumo();
            await salvarPreferencias({ serie: estado.serie });
        });

        const campoLocal = document.getElementById('campoLocal');
        campoLocal.value = estado.localizacao;

        campoLocal.addEventListener('change', async function () {
            const novo = campoLocal.value.trim();
            if (novo === estado.localizacao) return;

            estado.localizacao = novo;
            desenharResumo();
            await salvarPreferencias({ localizacao: estado.localizacao });
        });

        /* ---- acessibilidade rápida ---- */

        function atualizarQuick() {
            const e = Acess.estado;
            const marcar = function (id, ligado) { document.getElementById(id).setAttribute('aria-pressed', String(ligado)); };

            document.getElementById('qFonteVal').textContent = NOMES_FONTE_PERFIL[e.fonte];
            marcar('qFonte', e.fonte !== 'media');
            marcar('qAudio', e.audio);
            marcar('qLibras', e.libras);
            marcar('qContraste', document.documentElement.dataset.contraste === 'alto');
        }

        document.getElementById('qFonte').addEventListener('click', function () { Acess.definir('fonte', PROXIMA_FONTE_PERFIL[Acess.estado.fonte]); });
        document.getElementById('qAudio').addEventListener('click', function () { Acess.definir('audio', !Acess.estado.audio); });
        document.getElementById('qLibras').addEventListener('click', function () { Acess.definir('libras', !Acess.estado.libras); });
        document.getElementById('qContraste').addEventListener('click', function () {
            Acess.definir('contraste', document.documentElement.dataset.contraste !== 'alto');
        });

        Acess.aoMudar(atualizarQuick);
        atualizarQuick();

        /* ---- notificações ---- */

        (async function () {
            const alvo = document.getElementById('listaNotif');

            try {
                const lista = await api('/notificacoes/' + encodeURIComponent(EM.uid));

                alvo.innerHTML = lista.length
                    ? lista.map(function (n) {
                        return `<div class="notif${n.lida ? '' : ' nova'}"><span>${EM.esc(n.mensagem)}</span><small>${n.lida ? '' : 'Nova · '}${EM.esc(EM.formatarDataHora(n.criado_em))}</small></div>`;
                    }).join('')
                    : '<div class="card vazio"><p>Nenhuma notificação por enquanto.</p></div>';

            } catch (erro) {
                alvo.innerHTML = '<div class="card"><p>Não foi possível carregar as notificações agora.</p></div>';
            }
        })();

        /* ---- sair e excluir conta ---- */

        document.getElementById('btnSair').addEventListener('click', EM.sair);

        document.getElementById('btnExcluir').addEventListener('click', async function () {
            const ok = await EM.confirmar(
                'Excluir conta',
                'Isso apaga permanentemente sua conta e tudo o que você registrou. Essa ação não pode ser desfeita.',
                'Excluir'
            );

            if (!ok) return;

            try {
                await api('/usuarios/' + encodeURIComponent(EM.uid), { metodo: 'DELETE' });
                limparSessaoLocal();
                window.location.href = 'index.html';
            } catch (erro) {
                EM.toast('Não foi possível excluir agora: ' + erro.message, 'erro');
            }
        });
    });
});
