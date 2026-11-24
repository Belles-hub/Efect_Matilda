# Efect Matilda

**Da curiosidade à participação científica.**

Plataforma web que incentiva meninas do ensino básico a explorar ciência e tecnologia na prática. Em vez de começar por um curso ou por uma escolha de carreira, a estudante **experimenta primeiro**: faz desafios de mão na massa, conversa com a Matilda (uma mentora de IA que pergunta antes de responder), conhece mulheres da ciência, monta projetos de investigação e descobre olimpíadas e programas reais.

## Sumário

- [O que a plataforma oferece](#o-que-a-plataforma-oferece)
- [Como a personalização funciona](#como-a-personalização-funciona)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Configurando o Firebase](#configurando-o-firebase)
- [Testes](#testes)
- [Principais rotas da API](#principais-rotas-da-api)
- [Deploy](#deploy)
- [Acessibilidade](#acessibilidade)
- [Privacidade e segurança](#privacidade-e-segurança)

## O que a plataforma oferece

| Recurso | Descrição |
|---|---|
| **Descobrir interesses** | Onboarding em 3 passos que sugere por onde começar. Não define profissão. |
| **Experimente** | Desafios práticos curtos, com materiais, passo a passo, o que observar, dicas e cuidados, seguidos de uma reflexão escrita. |
| **Matilda, a mentora de IA** | Chat socrático que ajuda a transformar curiosidade em pergunta investigável. Tem modos de conversa, projeto e estudo, e lê material enviado (PDF ou imagem). |
| **Criador de projetos** | Roteiro de 9 etapas do método científico: problema, pergunta, hipótese, objetivo, metodologia, experimento, coleta de dados, análise e conclusão. |
| **Mulheres na ciência** | Referências reais, cada uma ligada a um desafio para experimentar. |
| **Oportunidades** | Olimpíadas, feiras, hackathons, iniciação científica e bolsas, com link oficial. |
| **Passaporte Matilda** | Conquistas, linha do tempo e etapa da jornada (descobrir, experimentar, criar, participar). Cada conquista compara a estudante só com ela mesma, sem ranking. |
| **Perfil científico** | Interesses, áreas que quer experimentar, objetivo, série e localização, tudo editável. |
| **Acessibilidade** | Tamanho de letra, alto contraste, leitura em voz alta, Libras (VLibras) e modo "diminuir interações". |

## Como a personalização funciona

Tudo é regra explícita, sem machine learning, recalculada a cada requisição a partir do perfil. Por isso reflete sempre o estado atual da estudante.

- **Recomendações** (`/desafios/recomendados`, `/oportunidades/recomendadas`, `/mulheres/recomendadas`):
  - área que ela quer experimentar: +3
  - área de interesse: +2
  - desafios acima do nível da série perdem pontos, e os já concluídos vão para o fim
  - oportunidades ganham bônus se forem na região dela ou online
  - cada item volta com um `motivo` em português
- **Matilda**: o prompt é montado a cada mensagem com modo, área em foco, interesses, série, objetivo, modo de uso (áudio, Libras), projeto aberto e sinais do histórico recente (por exemplo, dizer "não entendi" mais de uma vez faz a Matilda simplificar).
- **Passaporte**: calculado na hora a partir dos desafios concluídos e dos projetos.

O código da recomendação está em [`backend/app/services/recomendacao.py`](backend/app/services/recomendacao.py), e o do prompt em [`backend/app/services/adaptation.py`](backend/app/services/adaptation.py).

## Tecnologias

- **Backend**: Python 3.13, [FastAPI](https://fastapi.tiangolo.com/), Pydantic, Uvicorn
- **Banco e autenticação**: Firebase (Firestore e Firebase Auth), com JWT próprio para login por e-mail e senha (bcrypt)
- **IA**: [Groq](https://groq.com/) (modelo configurável por variável de ambiente)
- **Leitura de PDF**: pypdf
- **Monitoramento (opcional)**: Sentry
- **Frontend**: HTML, CSS e JavaScript puros, sem etapa de build
- **Testes**: pytest
- **Deploy**: Render (`render.yaml`) e GitHub Actions para a suíte de testes

## Estrutura do projeto

```
Efect_Matilda/
├── backend/
│   ├── app/
│   │   ├── main.py            # app FastAPI, CORS e registro das rotas
│   │   ├── auth.py            # tokens (próprio e Firebase) e checagem de dono
│   │   ├── schemas.py         # modelos Pydantic (contratos da API)
│   │   ├── crud_firebase.py   # todo o acesso ao Firestore
│   │   ├── firebase.py        # inicialização do Firebase Admin
│   │   ├── erros.py
│   │   ├── routers/           # uma rota por assunto (perfil, desafios, chat...)
│   │   ├── services/          # IA, adaptação do prompt, estudo, recomendação
│   │   └── data/              # catálogos curados: desafios, mulheres, oportunidades, problemas
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
├── frontend/
│   ├── *.html                 # uma página por tela
│   ├── css/
│   ├── js/                    # um script por página, mais sessão e API
│   └── img/
├── .github/workflows/tests.yml
├── render.yaml
└── README.md
```

Os catálogos em `backend/app/data/` são escritos à mão e versionados com o código. Para adicionar um desafio, basta incluir um novo dicionário com `id` único em `desafios.py`.

## Rodando localmente

Pré-requisitos: Python 3.13 e um projeto Firebase (veja [Configurando o Firebase](#configurando-o-firebase)).

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # Linux/macOS
pip install -r requirements.txt
cp .env.example .env             # preencha os valores
uvicorn app.main:app --reload
```

A API sobe em `http://127.0.0.1:8000`, e a documentação interativa fica em `/docs`.

**Frontend**

Em outro terminal:

```bash
cd frontend
python -m http.server 5500
```

Abra `http://localhost:5500`. Localmente o frontend usa a API em `http://127.0.0.1:8000`. O endereço é escolhido em [`frontend/js/config.js`](frontend/js/config.js).

> Abra o site por `localhost`, que já vem autorizado no Firebase. Se preferir `127.0.0.1`, adicione-o em Authentication, Configurações, Domínios autorizados. Abrir o arquivo direto (`file://`) não funciona com o login do Google.

## Variáveis de ambiente

Veja [`backend/.env.example`](backend/.env.example).

| Variável | Obrigatória | Para quê |
|---|---|---|
| `JWT_SECRET_KEY` | sim | Assina os tokens de login por e-mail e senha |
| `FIREBASE_CREDENTIALS_JSON` | em produção | Chave de serviço do Firebase (JSON inteiro). Em desenvolvimento é lida do arquivo em `backend/credentials/` |
| `GROQ_API_KEY` | para o chat | Sem ela, o chat responde 503 e o resto funciona |
| `GROQ_MODEL`, `GROQ_VISION_MODEL` | não | Trocam os modelos de IA sem mexer no código |
| `CORS_ORIGINS_EXTRA` | em produção | Endereços do frontend permitidos, separados por vírgula |
| `CONFIA_EM_PROXY_REVERSO` | em produção | Faz o limite de cadastro por IP usar o IP real atrás do proxy |
| `SENTRY_DSN` | não | Liga o relatório de erros |

## Configurando o Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. **Firestore Database**: crie o banco em modo de produção. As regras devem ficar fechadas, porque só o backend acessa o banco, com a chave de serviço.
3. **Authentication**: ative os provedores **E-mail/senha** e **Google**, e adicione seus domínios em Domínios autorizados.
4. **Chave de serviço**: em Configurações do projeto, Contas de serviço, gere uma chave privada e salve em `backend/credentials/firebase-service-account.json` (a pasta está no `.gitignore`).
5. **Frontend**: coloque `apiKey`, `authDomain` e `projectId` do seu app web em [`frontend/js/sessao.js`](frontend/js/sessao.js). A chave web do Firebase não é segredo.
6. **TTL (recomendado)**: no Firestore, aba TTL, crie políticas para `tentativas_login` e `tentativas_registro`, no campo `expira_em`. Elas limpam sozinhas os registros de bloqueio antigos.

### Como os dados são organizados

```
usuarios/{id}                      perfil, preferências, preferências visuais
 ├─ mensagens/                     conversa com a Matilda
 ├─ notificacoes/
 ├─ projetos/                      projetos e as 9 etapas
 └─ desafios_concluidos/           resultado e reflexão de cada desafio
tentativas_login/{email}           bloqueio por tentativas erradas
tentativas_registro/{ip}           limite de cadastros por IP
```

Tudo que pertence à pessoa fica dentro do documento dela. Excluir a conta apaga o documento e as subcoleções.

## Testes

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

A suíte tem 149 testes e se comporta de dois jeitos:

- **Com a chave do Firebase** (`FIREBASE_CREDENTIALS_JSON` ou o arquivo em `backend/credentials/`): roda tudo. A maioria dos testes usa o **Firestore real**, e cada um cria e remove o próprio usuário. Por isso, aponte-a para um projeto Firebase de **desenvolvimento**, nunca o de produção.
- **Sem a chave**: roda só os testes marcados como `offline` (43 testes: perfil científico, recomendações e adaptação do prompt, que usam um Firestore falso) e **pula** os demais com o motivo na tela. Nada quebra.

No GitHub Actions, a suíte roda a cada push. Para rodar tudo lá, cadastre em Settings, Secrets and variables, Actions: `FIREBASE_CREDENTIALS_JSON` (de um projeto de testes), `JWT_SECRET_KEY`, `GROQ_API_KEY` e `GROQ_MODEL`. Sem esses secrets, o CI roda só a parte offline e fica verde.

## Principais rotas da API

A documentação completa e interativa fica em `/docs`.

| Grupo | Rotas |
|---|---|
| Conta | `POST /auth/registrar`, `POST /auth/login`, `POST /auth/pergunta-seguranca`, `POST /auth/redefinir-senha`, `/usuarios/{id}` |
| Perfil | `GET` e `PUT /perfil/{id}/preferencias`, `POST /perfil/{id}/preferencias/redefinir`, `/perfil/{id}/acessibilidade` |
| Desafios | `GET /desafios/`, `/desafios/{id}`, `/desafios/recomendados`, `POST /desafios/{id}/reflexao`, `/desafios/concluidos` |
| Mulheres | `GET /mulheres/`, `/mulheres/{id}`, `/mulheres/recomendadas` |
| Oportunidades | `GET /oportunidades/`, `/oportunidades/{id}`, `/oportunidades/recomendadas` |
| Projetos | `/projetos/` (listar, criar, buscar, atualizar e excluir) |
| Problemas da comunidade | `GET /problemas/` |
| Passaporte | `GET /passaporte/`, `POST /passaporte/conquistas/{id}` |
| Chat | `POST /chat/`, `/chat/material`, `/chat/estudo`, `GET /chat/resumo` |
| Notificações | `GET /notificacoes/{id}`, `POST /notificacoes/{id}/marcar-lidas` |

Rotas de dados pessoais exigem `Authorization: Bearer <token>`, e cada pessoa só acessa o que é dela (`403` caso contrário). Catálogos públicos, como `/desafios/` e `/oportunidades/`, não exigem login.

## Deploy

O arquivo [`render.yaml`](render.yaml) descreve dois serviços no [Render](https://render.com):

- `efect-matilda-api`: o backend (Python), com as variáveis de ambiente acima
- `efect-matilda-frontend`: o site estático, publicado a partir da pasta `frontend/`

Depois de publicar:

1. Cole o JSON da chave de serviço em `FIREBASE_CREDENTIALS_JSON`.
2. Ajuste `CORS_ORIGINS_EXTRA` para o endereço real do frontend.
3. Confirme em [`frontend/js/config.js`](frontend/js/config.js) que a URL de produção da API é a do serviço criado.
4. Adicione o domínio do frontend em Domínios autorizados do Firebase Authentication.

## Acessibilidade

O site foi pensado para ser usado por quem tem necessidades diferentes:

- tamanho de letra ajustável e alto contraste
- leitura de telas em voz alta
- tradução em Libras com o VLibras
- modo "diminuir interações", que desliga animações, e respeito a `prefers-reduced-motion`
- link "Pular para o conteúdo" e rótulos para leitores de tela
- a Matilda adapta o jeito de responder ao modo de uso da estudante (áudio ou Libras)

## Privacidade e segurança

- Os dados pessoais de cada pessoa só voltam para ela mesma.
- Senhas e respostas de segurança são guardadas apenas como hash (bcrypt) e nunca saem da API.
- Há bloqueio de login por conta após tentativas erradas, limite de cadastros por IP e limite diário de uso do chat.
- Trocar a senha invalida todos os tokens emitidos antes.
- Segredos (`.env`, chaves de serviço) ficam fora do git.
- É possível excluir a conta, o que apaga também mensagens, projetos, notificações e desafios concluídos.
- As regras do Firestore devem permanecer fechadas: o acesso é feito só pelo backend.
