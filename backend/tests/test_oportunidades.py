from tests.conftest import client


def test_lista_oportunidades_sem_login():
    resposta = client.get("/oportunidades/")

    assert resposta.status_code == 200
    assert len(resposta.json()) >= 6
    assert all(o["link_oficial"].startswith("https://") for o in resposta.json())


def test_filtra_por_categoria():
    resposta = client.get("/oportunidades/", params={"categoria": "olimpiada"})

    assert resposta.status_code == 200
    assert all(o["categoria"] == "olimpiada" for o in resposta.json())
    assert len(resposta.json()) >= 2


def test_filtra_por_modalidade():
    resposta = client.get("/oportunidades/", params={"modalidade": "presencial"})

    assert resposta.status_code == 200
    assert all(o["modalidade"] == "presencial" for o in resposta.json())


def test_buscar_por_id():
    resposta = client.get("/oportunidades/obi")

    assert resposta.status_code == 200
    assert "Informática" in resposta.json()["nome"]


def test_id_inexistente_da_404():
    assert client.get("/oportunidades/nao-existe").status_code == 404
