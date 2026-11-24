"""Perfil científico (interesses, áreas que quer experimentar, objetivo).

Diferente dos outros testes, estes NÃO tocam o Firestore: o `db` do
crud_firebase é trocado por um fake em memória e a autenticação é
sobrescrita por uma usuária fixa.
"""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.main import app

pytestmark = pytest.mark.offline

UID = "ana@efectmatilda.teste"


class _Doc:
    def __init__(self, store, uid):
        self._store, self._uid = store, uid

    @property
    def exists(self):
        return self._uid in self._store

    def to_dict(self):
        import copy
        return copy.deepcopy(self._store[self._uid])

    def get(self):
        return self

    def update(self, campos):
        dados = self._store[self._uid]
        for caminho, valor in campos.items():
            alvo = dados
            *pais, ultimo = caminho.split(".")
            for p in pais:
                alvo = alvo.setdefault(p, {})
            alvo[ultimo] = valor


class _Colecao:
    def __init__(self, store):
        self._store = store

    def document(self, uid):
        return _Doc(self._store, uid)


class _FakeDb:
    def __init__(self, store):
        self._store = store

    def collection(self, nome):
        assert nome == "usuarios"
        return _Colecao(self._store)


@pytest.fixture
def api(monkeypatch):
    store = {
        UID: {
            "nome": "Ana",
            "email": UID,
            "preferencias": {"modo_uso": "texto", "serie": "8º ano"},
        },
        "bia@efectmatilda.teste": {"nome": "Bia", "preferencias": {"objetivo": "segredo"}},
    }
    monkeypatch.setattr(crud_firebase, "db", _FakeDb(store))
    app.dependency_overrides[verificar_token] = lambda: {"uid": UID}
    yield TestClient(app), store
    app.dependency_overrides.pop(verificar_token, None)


# --- Pydantic ---------------------------------------------------------------

def test_schema_aceita_areas_validas():
    p = schemas.Preferencias(areas_que_quero_experimentar=["tecnologia", "meio_ambiente"])
    assert p.areas_que_quero_experimentar == ["tecnologia", "meio_ambiente"]


def test_schema_rejeita_area_invalida():
    with pytest.raises(ValidationError):
        schemas.Preferencias(areas_que_quero_experimentar=["astrologia"])


def test_schema_remove_duplicatas_mantendo_ordem():
    p = schemas.Preferencias(areas_que_quero_experimentar=["ciencia", "programacao", "ciencia"])
    assert p.areas_que_quero_experimentar == ["ciencia", "programacao"]


def test_schema_sem_o_campo_continua_valido():
    assert schemas.Preferencias(interesses=["ciencia"]).areas_que_quero_experimentar is None


# --- Rotas + persistência ---------------------------------------------------

def test_salva_e_recupera_areas_que_quero_experimentar(api):
    client, _ = api
    r = client.put(f"/perfil/{UID}/preferencias",
                   json={"areas_que_quero_experimentar": ["ciberseguranca", "experimentos"]})
    assert r.status_code == 200

    r = client.get(f"/perfil/{UID}/preferencias")
    assert r.json()["areas_que_quero_experimentar"] == ["ciberseguranca", "experimentos"]


def test_atualizar_interesses_preserva_outros_campos(api):
    client, store = api
    client.put(f"/perfil/{UID}/preferencias",
               json={"areas_que_quero_experimentar": ["tecnologia"], "objetivo": "ser cientista"})

    r = client.put(f"/perfil/{UID}/preferencias", json={"interesses": ["ciencia"]})

    assert r.status_code == 200
    prefs = store[UID]["preferencias"]
    assert prefs == {
        "modo_uso": "texto", "serie": "8º ano",
        "areas_que_quero_experimentar": ["tecnologia"],
        "objetivo": "ser cientista", "interesses": ["ciencia"],
    }


def test_atualizar_objetivo_preserva_areas(api):
    client, store = api
    client.put(f"/perfil/{UID}/preferencias", json={"interesses": ["ciencia"]})
    client.put(f"/perfil/{UID}/preferencias", json={"objetivo": "trabalhar com IA"})
    assert store[UID]["preferencias"]["interesses"] == ["ciencia"]
    assert store[UID]["preferencias"]["objetivo"] == "trabalhar com IA"


def test_area_invalida_na_rota_da_422_e_nao_grava(api):
    client, store = api
    r = client.put(f"/perfil/{UID}/preferencias",
                   json={"areas_que_quero_experimentar": ["astrologia"]})
    assert r.status_code == 422
    assert "areas_que_quero_experimentar" not in store[UID]["preferencias"]


def test_redefinir_limpa_preferencias(api):
    client, store = api
    client.put(f"/perfil/{UID}/preferencias", json={"areas_que_quero_experimentar": ["ciencia"]})
    r = client.post(f"/perfil/{UID}/preferencias/redefinir")
    assert r.status_code == 200
    assert store[UID]["preferencias"] == {}


# --- Autorização ------------------------------------------------------------

def test_nao_le_nem_altera_perfil_de_outra_usuaria(api):
    client, store = api
    outro = "bia@efectmatilda.teste"

    assert client.get(f"/perfil/{outro}/preferencias").status_code == 403
    assert client.put(f"/perfil/{outro}/preferencias",
                      json={"interesses": ["ciencia"]}).status_code == 403
    assert client.post(f"/perfil/{outro}/preferencias/redefinir").status_code == 403
    assert store[outro]["preferencias"] == {"objetivo": "segredo"}


def test_sem_token_da_401():
    app.dependency_overrides.pop(verificar_token, None)
    r = TestClient(app).get(f"/perfil/{UID}/preferencias")
    assert r.status_code == 401
