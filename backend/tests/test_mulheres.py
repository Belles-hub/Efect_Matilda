from tests.conftest import client


def test_lista_mulheres_sem_login():
    resposta = client.get("/mulheres/")

    assert resposta.status_code == 200
    assert len(resposta.json()) >= 8


def test_filtra_por_area():
    resposta = client.get("/mulheres/", params={"area": "inteligencia_artificial"})

    assert resposta.status_code == 200
    assert all(m["area"] == "inteligencia_artificial" for m in resposta.json())
    assert len(resposta.json()) >= 1


def test_cada_mulher_tem_desafio_relacionado_valido():
    desafios = {d["id"] for d in client.get("/desafios/").json()}

    for mulher in client.get("/mulheres/").json():
        if mulher["desafio_relacionado_id"]:
            assert mulher["desafio_relacionado_id"] in desafios


def test_buscar_por_id():
    resposta = client.get("/mulheres/ada-lovelace")

    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Ada Lovelace"


def test_id_inexistente_da_404():
    assert client.get("/mulheres/nao-existe").status_code == 404
