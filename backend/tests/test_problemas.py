from tests.conftest import client


def test_lista_os_oito_temas():
    resposta = client.get("/problemas/")

    assert resposta.status_code == 200
    assert len(resposta.json()) == 8


def test_cada_tema_tem_perguntas_norteadoras():
    for problema in client.get("/problemas/").json():
        assert len(problema["perguntas_norteadoras"]) >= 1


def test_buscar_por_id():
    resposta = client.get("/problemas/agua")

    assert resposta.status_code == 200
    assert resposta.json()["titulo"] == "Água"


def test_id_inexistente_da_404():
    assert client.get("/problemas/nao-existe").status_code == 404
