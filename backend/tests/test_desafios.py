from tests.conftest import client


def test_lista_o_catalogo_sem_precisar_de_login():
    resposta = client.get("/desafios/")

    assert resposta.status_code == 200
    desafios = resposta.json()
    assert len(desafios) >= 8
    assert all("instrucoes" in d and "perguntas_reflexao" in d for d in desafios)


def test_filtra_por_categoria():
    resposta = client.get("/desafios/", params={"categoria": "programacao"})

    assert resposta.status_code == 200
    assert all(d["categoria"] == "programacao" for d in resposta.json())
    assert len(resposta.json()) >= 1


def test_busca_um_desafio_pelo_id():
    resposta = client.get("/desafios/ia-padroes")

    assert resposta.status_code == 200
    assert resposta.json()["titulo"] == "Ensine uma IA a reconhecer padrões"


def test_desafio_inexistente_da_404():
    resposta = client.get("/desafios/nao-existe")

    assert resposta.status_code == 404


def test_registrar_reflexao_exige_login():
    resposta = client.post(
        "/desafios/ia-padroes/reflexao",
        json={"resultado": "funcionou", "reflexao": "Deu certo!"},
    )

    assert resposta.status_code == 401


def test_registrar_reflexao_e_listar_concluidos(usuario_teste):
    resposta = client.post(
        "/desafios/ia-padroes/reflexao",
        json={"resultado": "parcial", "reflexao": "Funcionou parcialmente porque um objeto não se encaixou."},
        headers=usuario_teste["headers"],
    )

    assert resposta.status_code == 200
    assert resposta.json()["resultado"] == "parcial"

    concluidos = client.get("/desafios/concluidos", headers=usuario_teste["headers"])

    assert concluidos.status_code == 200
    assert len(concluidos.json()) == 1
    assert concluidos.json()[0]["desafio_id"] == "ia-padroes"


def test_reflexao_em_desafio_inexistente_da_404(usuario_teste):
    resposta = client.post(
        "/desafios/nao-existe/reflexao",
        json={"resultado": "funcionou", "reflexao": "ok"},
        headers=usuario_teste["headers"],
    )

    assert resposta.status_code == 404


def test_resultado_invalido_da_422(usuario_teste):
    resposta = client.post(
        "/desafios/ia-padroes/reflexao",
        json={"resultado": "mais ou menos", "reflexao": "ok"},
        headers=usuario_teste["headers"],
    )

    assert resposta.status_code == 422
