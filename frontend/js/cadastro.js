/* =========================================
   CADASTRO (e-mail + senha, ou Google)

   Só valida o básico aqui pra dar resposta rápida — quem decide de
   verdade é a API, e os erros dela aparecem no aviso do formulário.
========================================= */

document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById('formCadastro');
    const botao = document.getElementById('btnCriar');

    const campos = {
        nome: document.getElementById('nome'),
        email: document.getElementById('email'),
        senha: document.getElementById('senha'),
        senha2: document.getElementById('senha2'),
        resposta: document.getElementById('resposta'),
        termos: document.getElementById('termos')
    };

    EM.ligarSenhas();
    processarRetornoDoGoogle('avisoCadastro');

    document.getElementById('btnGoogle').addEventListener('click', function () {
        entrarComGoogle(this, 'avisoCadastro');
    });

    function validarPasso1() {
        const erros = [];

        if (campos.nome.value.trim().length < 2) {
            erros.push([campos.nome, 'Digite seu nome.']);
        }

        if (!/^\S+@\S+\.\S{2,}$/.test(campos.email.value.trim())) {
            erros.push([campos.email, 'Digite um e-mail válido, como nome@exemplo.com.']);
        }

        if (campos.senha.value.length < 6) {
            erros.push([campos.senha, 'A senha precisa ter pelo menos 6 caracteres.']);
        }

        if (campos.senha2.value !== campos.senha.value) {
            erros.push([campos.senha2, 'As senhas não são iguais.']);
        }

        return erros;
    }

    function validarPasso2() {
        const erros = [];

        if (campos.resposta.value.trim().length < 2) {
            erros.push([campos.resposta, 'Escreva uma resposta para a pergunta de segurança.']);
        }

        if (!campos.termos.checked) {
            erros.push([campos.termos, 'Marque a caixa para aceitar os Termos e criar a conta.']);
        }

        return erros;
    }

    /* ---------- dois passos ---------- */

    const passo1 = document.getElementById('cadPasso1');
    const passo2 = document.getElementById('cadPasso2');
    const google = document.getElementById('cadGoogle');
    const textoPasso = document.getElementById('cadPassoTexto');
    const barra = document.getElementById('cadBarra');
    const subtitulo = document.getElementById('cadSubtitulo');
    let passoAtual = 1;

    function irParaPasso(n, semFoco) {
        passoAtual = n;

        passo1.hidden = n !== 1;
        passo2.hidden = n !== 2;
        google.hidden = n !== 1;

        textoPasso.textContent = 'Passo ' + n + ' de 2';
        barra.style.width = (n * 50) + '%';
        subtitulo.textContent = n === 1
            ? 'Leva menos de um minuto.'
            : 'Quase lá! Uma pergunta para você recuperar a senha se precisar.';

        const primeiro = (n === 1 ? passo1 : passo2).querySelector('input, select');
        if (primeiro && !semFoco) primeiro.focus();
    }

    function continuar() {
        EM.limparErros(form);
        const erros = validarPasso1();

        if (erros.length) {
            erros.forEach(function (par) { EM.mostrarErroCampo(par[0], par[1]); });
            erros[0][0].focus();
            return;
        }

        irParaPasso(2);
    }

    document.getElementById('btnContinuar').addEventListener('click', continuar);
    document.getElementById('btnVoltar').addEventListener('click', function () { irParaPasso(1); });
    irParaPasso(1, true);

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (passoAtual === 1) {
            continuar();
            return;
        }

        EM.limparErros(form);
        esconderNotificacao('avisoCadastro');

        const erros = validarPasso1().concat(validarPasso2());

        // Se o erro está num campo do passo 1, volta pra lá pra mostrar onde é.
        if (erros.length && passo1.contains(erros[0][0])) irParaPasso(1);

        if (erros.length) {
            erros.forEach(function (par) { EM.mostrarErroCampo(par[0], par[1]); });
            erros[0][0].focus();
            return;
        }

        EM.carregando(botao, true, 'Criando sua conta...');

        try {
            const dados = await apiPublica('/auth/registrar', {
                nome: campos.nome.value.trim(),
                email: campos.email.value.trim(),
                senha: campos.senha.value,
                aceitou_termos: true,
                pergunta_seguranca: document.getElementById('pergunta').value,
                resposta_seguranca: campos.resposta.value.trim()
            });

            salvarSessaoLocal(dados.access_token, dados.uid);

            // Conta nova: comemora e segue pro app.
            mostrarBoasVindas(campos.nome.value.trim());

        } catch (erro) {
            EM.carregando(botao, false);

            if (erro.status === 409) {
                mostrarNotificacao('avisoCadastro', 'Este e-mail já tem uma conta. Que tal entrar?', 'info');
                return;
            }

            mostrarNotificacao(
                'avisoCadastro',
                erro instanceof TypeError
                    ? 'Não conseguimos falar com o servidor. Confira sua internet e tente de novo.'
                    : erro.message
            );
        }
    });
});


// Comemoração em tela cheia ao criar a conta. Segue sozinha pro app depois
// de um instante — o próprio EM.iniciar() decide se manda pro onboarding.
function mostrarBoasVindas(nome) {
    const el = document.createElement('div');

    el.className = 'boas-vindas';
    el.setAttribute('role', 'status');
    el.innerHTML = `
        <img class="mascote" style="width:min(160px,40vw);margin:0 auto" src="img/logo-bonequinho-ameixa.png" alt="">
        <h2>Bem-vinda à Efect Matilda, ${EM.esc(EM.primeiroNome(nome))}!</h2>
        <p>Sua conta está pronta. Agora é hora de descobrir seu primeiro desafio.</p>
        <a class="btn btn--claro" href="inicio.html">Vamos lá <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;

    document.body.appendChild(el);
    el.querySelector('a').focus();

    setTimeout(function () { window.location.href = 'inicio.html'; }, 1500);
}
