"""Recomendações por perfil. Sem Firestore real: o serviço é puro e as rotas
usam um usuário fake no lugar do crud_firebase."""
import pytest
from fastapi.testclient import TestClient

from app import crud_firebase
from app.auth import verificar_token
from app.data.desafios import DESAFIOS
from app.data.mulheres import MULHERES
from app.data.oportunidades import OPORTUNIDADES
from app.main import app
from app.services import recomendacao as rec

pytestmark = pytest.mark.offline

UID = "ana@efectmatilda.teste"


def ids(lista):
    return [i["id"] for i in lista]


# --- desafios ---------------------------------------------------------------

def test_desafios_sem_perfil_mantem_ordem_do_catalogo():
    assert ids(rec.recomendar_desafios(DESAFIOS, {})) == ids(DESAFIOS)


def test_desafios_quero_experimentar_vem_antes_de_interesse():
    r = rec.recomendar_desafios(DESAFIOS, {
        "interesses": ["meio_ambiente"],
        "areas_que_quero_experimentar": ["programacao"],
    })
    assert r[0]["categoria"] == "programacao"
    assert r[1]["categoria"] == "meio_ambiente"
    assert "experimentar" in r[0]["motivo"]
    assert "interesse" in r[1]["motivo"]


def test_desafios_concluidos_vao_pro_fim():
    r = rec.recomendar_desafios(DESAFIOS, {"interesses": ["meio_ambiente"]}, {"meio-ambiente-agua"})
    assert r[-1]["id"] == "meio-ambiente-agua"
    assert r[-1]["motivo"] == "Você já concluiu este desafio"
    assert len(r) == len(DESAFIOS)


def test_desafios_serie_baixa_nao_sobe_nivel_alto_na_frente():
    r = rec.recomendar_desafios(DESAFIOS, {"serie": "6º ano", "interesses": ["ciencia_de_dados"]})
    # dados-temperatura é intermediário: 6º ano não deve recebê-lo em 1º
    assert r[0]["id"] != "dados-temperatura"


def test_desafios_ensino_medio_nao_penaliza_intermediario():
    r = rec.recomendar_desafios(DESAFIOS, {"serie": "1º ano do Ensino Médio", "interesses": ["ciencia_de_dados"]})
    assert r[0]["id"] == "dados-temperatura"


@pytest.mark.parametrize("serie,esperado", [
    ("6º ano", "iniciante"), ("7º ano", "iniciante"),
    ("8º ano", "intermediario"), ("9º ano", "intermediario"),
    ("1º ano do Ensino Médio", "avancado"), ("3º ano do Ensino Médio", "avancado"),
    ("Outra", None), (None, None), ("", None),
])
def test_nivel_maximo_para_serie(serie, esperado):
    assert rec.nivel_maximo_para_serie(serie) == esperado


# --- oportunidades ----------------------------------------------------------

def test_oportunidades_priorizam_area_de_interesse():
    r = rec.recomendar_oportunidades(OPORTUNIDADES, {"areas_que_quero_experimentar": ["programacao"]})
    assert r[0]["area"] == "programacao"
    assert "experimentar" in r[0]["motivo"]


def test_oportunidades_regiao_por_sigla_do_estado():
    sp = [o for o in OPORTUNIDADES if "(SP)" in o["local"]]
    assert sp, "o catálogo precisa ter ao menos uma oportunidade em SP"
    r = rec.recomendar_oportunidades(OPORTUNIDADES, {"localizacao": "São Paulo, SP"})
    assert "perto de você" in next(o for o in r if o["id"] == sp[0]["id"])["motivo"].lower()


def test_oportunidades_regiao_nao_casa_com_palavra_dentro_de_outra():
    # "Sao" / "Paulo" não devem casar com texto sem relação
    assert rec._bonus_regiao("Brasil", "Recife, PE") is False
    assert rec._bonus_regiao("Brasil (UFSM, online)", None) is False


def test_oportunidades_nenhuma_some_da_lista():
    assert len(rec.recomendar_oportunidades(OPORTUNIDADES, {})) == len(OPORTUNIDADES)


# --- mulheres ---------------------------------------------------------------

def test_mulheres_priorizam_area_e_desafio_concluido():
    alvo = next(m for m in MULHERES if m.get("desafio_relacionado_id"))
    r = rec.recomendar_mulheres(MULHERES, {}, {alvo["desafio_relacionado_id"]})
    assert r[0]["id"] == alvo["id"]
    assert "desafio" in r[0]["motivo"]

    r = rec.recomendar_mulheres(MULHERES, {"interesses": [MULHERES[-1]["area"]]})
    assert r[0]["area"] == MULHERES[-1]["area"]


# --- rotas ------------------------------------------------------------------

@pytest.fixture
def api(monkeypatch):
    estado = {"preferencias": {"interesses": ["meio_ambiente"], "serie": "8º ano", "localizacao": "São Paulo, SP"}}
    monkeypatch.setattr(crud_firebase, "buscar_usuario", lambda uid: {"id": uid, **estado} if uid == UID else None)
    monkeypatch.setattr(crud_firebase, "listar_desafios_concluidos",
                        lambda uid, *a, **k: [{"desafio_id": "meio-ambiente-agua"}])
    app.dependency_overrides[verificar_token] = lambda: {"uid": UID}
    yield TestClient(app), estado
    app.dependency_overrides.pop(verificar_token, None)


def test_rota_desafios_recomendados(api):
    client, _ = api
    r = client.get("/desafios/recomendados")
    assert r.status_code == 200
    corpo = r.json()
    assert len(corpo) == len(DESAFIOS)
    assert all("motivo" in d and "instrucoes" in d for d in corpo)
    assert corpo[-1]["id"] == "meio-ambiente-agua"  # concluído vai pro fim


def test_rota_limite(api):
    client, _ = api
    assert len(client.get("/desafios/recomendados", params={"limite": 2}).json()) == 2
    assert client.get("/oportunidades/recomendadas", params={"limite": 3}).status_code == 200
    assert client.get("/mulheres/recomendadas", params={"limite": 0}).status_code == 422


def test_rota_oportunidades_e_mulheres_recomendadas(api):
    client, _ = api
    assert all("motivo" in o for o in client.get("/oportunidades/recomendadas").json())
    assert all("motivo" in m for m in client.get("/mulheres/recomendadas").json())


def test_rotas_antigas_continuam_funcionando(api):
    client, _ = api
    assert client.get("/desafios/ia-padroes").status_code == 200
    assert client.get("/oportunidades/obi").status_code == 200
    assert len(client.get("/oportunidades/").json()) == len(OPORTUNIDADES)


def test_recomendadas_exigem_login():
    app.dependency_overrides.pop(verificar_token, None)
    c = TestClient(app)
    for rota in ("/desafios/recomendados", "/oportunidades/recomendadas", "/mulheres/recomendadas"):
        assert c.get(rota).status_code == 401
