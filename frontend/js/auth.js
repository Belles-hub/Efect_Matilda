/* =========================================
   ENTRAR COM GOOGLE (usado por login.html e cadastro.html)

   Usa redirect (não popup): navega pro Google e volta pra cá. O popup
   depende de o navegador não bloquear a checagem "a janela fechou", e o
   Chrome recente bloqueia exatamente isso — o login travava sem aviso.
========================================= */

const GOOGLE_PENDENTE_KEY = 'efectmatilda_google_pendente';


// Erros de popup em que vale cair pro redirect (o navegador não deixou abrir
// a janela). Fechar a janela de propósito NÃO entra aqui: é só desistir.
const ERROS_POPUP_COM_FALLBACK = [
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment'
];

const ERROS_POPUP_DESISTIU = [
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request'
];


async function entrarComGoogle(botao, areaAviso) {
    EM.carregando(botao, true, 'Abrindo o Google...');

    try {
        const auth = await carregarFirebase();
        const provedor = new firebase.auth.GoogleAuthProvider();

        // Popup primeiro: o redirect depende de armazenamento entre domínios
        // (site x firebaseapp.com), que navegadores atuais bloqueiam — a pessoa
        // escolhia a conta no Google e voltava sem entrar.
        try {
            const resultado = await auth.signInWithPopup(provedor);

            await concluirLoginGoogle(resultado.user, areaAviso);
            return;

        } catch (erroPopup) {
            if (ERROS_POPUP_DESISTIU.includes(erroPopup.code)) {
                EM.carregando(botao, false);
                return;
            }

            if (!ERROS_POPUP_COM_FALLBACK.includes(erroPopup.code)) {
                throw erroPopup;
            }
        }

        sessionStorage.setItem(GOOGLE_PENDENTE_KEY, '1');
        await auth.signInWithRedirect(provedor);

    } catch (erro) {
        console.error(erro);
        sessionStorage.removeItem(GOOGLE_PENDENTE_KEY);
        mostrarNotificacao(areaAviso, 'Não foi possível entrar com o Google: ' + (erro.message || erro));
        EM.carregando(botao, false);
    }
}


// Termina o login com um usuário do Firebase: cria o perfil na primeira vez
// e segue pro app. Usado pelo popup e pelo retorno do redirect.
async function concluirLoginGoogle(user, areaAviso) {
    const token = await user.getIdToken();
    const uid = user.uid;

    localStorage.setItem(SESSAO_GOOGLE_KEY, '1');

    // Sobra de outra conta (e-mail/senha) no mesmo navegador: com ela, o
    // app usaria o token antigo em vez do do Google.
    localStorage.removeItem(SESSAO_TOKEN_KEY);
    localStorage.removeItem(SESSAO_UID_KEY);

    let novo = false;

    try {
        await api('/usuarios/' + encodeURIComponent(uid));
    } catch (erro) {
        if (erro.status !== 404) throw erro;

        // Primeira vez com esta conta Google: cria o perfil.
        novo = true;

        const email = user.email || '';
        const nome = user.displayName || email.split('@')[0] || 'Estudante';

        const resposta = await fetch(API_BASE_URL + '/usuarios/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ nome: nome, email: email })
        });

        if (!resposta.ok && resposta.status !== 409) {
            throw new Error('Não foi possível criar seu perfil (' + resposta.status + ').');
        }
    }

    window.location.href = novo ? 'descobrir.html' : 'inicio.html';
}


// Espera o Firebase dizer se há alguém logada (ou desiste depois de um tempo).
function usuarioAtualDoFirebase(auth, ms) {
    return new Promise(function (resolve) {
        const limite = setTimeout(function () { cancelar(); resolve(null); }, ms);
        const cancelar = auth.onAuthStateChanged(function (u) {
            clearTimeout(limite);
            cancelar();
            resolve(u);
        });
    });
}


// Roda ao carregar a página: se estamos voltando do Google (fallback por
// redirect), termina o login.
async function processarRetornoDoGoogle(areaAviso) {
    if (!sessionStorage.getItem(GOOGLE_PENDENTE_KEY)) {
        return;
    }

    try {
        const auth = await carregarFirebase();

        // getRedirectResult() pode nunca resolver em navegadores que bloqueiam
        // armazenamento entre domínios — sem este limite a pessoa ficava
        // esperando pra sempre, sem nenhuma mensagem.
        const resultado = await Promise.race([
            auth.getRedirectResult(),
            new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error('Tempo esgotado ao voltar do Google. Tente de novo — se continuar, verifique se cookies de terceiros estão bloqueados.'));
                }, 10000);
            })
        ]);

        sessionStorage.removeItem(GOOGLE_PENDENTE_KEY);

        // Sem resultado do redirect, a sessão ainda pode ter sido salva.
        const user = (resultado && resultado.user) || await usuarioAtualDoFirebase(auth, 4000);

        if (!user) {
            throw new Error('O Google não devolveu a sua conta. Tente de novo; se repetir, verifique se o navegador bloqueia cookies de terceiros.');
        }

        await concluirLoginGoogle(user, areaAviso);

    } catch (erro) {
        console.error(erro);
        sessionStorage.removeItem(GOOGLE_PENDENTE_KEY);
        localStorage.removeItem(SESSAO_GOOGLE_KEY);
        mostrarNotificacao(areaAviso, 'Não foi possível entrar com o Google: ' + erro.message);
    }
}
