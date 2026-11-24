import json
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore

load_dotenv()

CAMINHO_CHAVE_LOCAL = "credentials/firebase-service-account.json"

MENSAGEM_SEM_FIREBASE = (
    "Firebase não configurado. Defina a variável de ambiente "
    "FIREBASE_CREDENTIALS_JSON (o JSON inteiro da chave de serviço) ou salve a "
    f"chave em backend/{CAMINHO_CHAVE_LOCAL}. Veja o README, seção "
    "'Configurando o Firebase'."
)


class _FirestoreIndisponivel:
    """Ocupa o lugar de `db` quando não há chave do Firebase.

    Deixa o app (e os testes que não usam o banco) importarem sem a chave:
    o erro só aparece, com instrução clara, quando alguma coisa tenta de
    fato falar com o Firestore."""

    def __getattr__(self, nome):
        raise RuntimeError(MENSAGEM_SEM_FIREBASE)


def _ler_credenciais() -> dict | None:
    credenciais_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")

    if credenciais_json:
        # Produção (ex: Render): a chave de serviço inteira vai numa variável
        # de ambiente, já que o .json não pode ser commitado no git.
        return json.loads(credenciais_json)

    # Desenvolvimento local: lê do arquivo (está no .gitignore).
    if os.path.exists(CAMINHO_CHAVE_LOCAL):
        with open(CAMINHO_CHAVE_LOCAL, encoding="utf-8") as arquivo:
            return json.load(arquivo)

    return None


dados_credencial = _ler_credenciais()

# True quando o Firestore está realmente disponível (usado pelos testes).
configurado = dados_credencial is not None

if configurado:
    firebase_admin.initialize_app(credentials.Certificate(dados_credencial))
    db = firestore.client()
else:
    db = _FirestoreIndisponivel()

# Sem Firebase Storage aqui de propósito — exige plano pago (Blaze)
# vinculado só pra existir, mesmo dentro da cota grátis.
