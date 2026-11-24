from tests.conftest import client


def test_criar_e_listar_projeto(usuario_teste):
    criado = client.post(
        "/projetos/", json={"titulo": "Desperdício de água na escola"},
        headers=usuario_teste["headers"]
    )

    assert criado.status_code == 200
    dados = criado.json()
    assert dados["titulo"] == "Desperdício de água na escola"
    assert dados["etapa_atual"] == 1
    assert dados["problema"] is None

    listagem = client.get("/projetos/", headers=usuario_teste["headers"])

    assert listagem.status_code == 200
    assert any(p["id"] == dados["id"] for p in listagem.json())


def test_criar_projeto_a_partir_de_um_problema_da_comunidade(usuario_teste):
    resposta = client.post(
        "/projetos/",
        json={"titulo": "Investigando a água do bairro", "tema_comunidade": "agua"},
        headers=usuario_teste["headers"]
    )

    assert resposta.status_code == 200
    assert resposta.json()["tema_comunidade"] == "agua"


def test_atualizar_projeto_avanca_etapa_sem_a_ia_escrever_por_ela(usuario_teste):
    projeto = client.post(
        "/projetos/", json={"titulo": "Meu projeto"}, headers=usuario_teste["headers"]
    ).json()

    atualizado = client.put(
        f"/projetos/{projeto['id']}",
        json={
            "titulo": "Meu projeto",
            "problema": "A torneira do pátio pinga o dia todo.",
            "pergunta_pesquisa": "Quanta água se perde por dia?",
        },
        headers=usuario_teste["headers"]
    )

    assert atualizado.status_code == 200
    dados = atualizado.json()
    assert dados["problema"] == "A torneira do pátio pinga o dia todo."
    assert dados["etapa_atual"] == 3  # 2 campos preenchidos -> próxima etapa é a 3ª


def test_buscar_projeto_de_outra_pessoa_nao_aparece(usuario_teste):
    resposta = client.get("/projetos/nao-existe", headers=usuario_teste["headers"])

    assert resposta.status_code == 404


def test_deletar_projeto(usuario_teste):
    projeto = client.post(
        "/projetos/", json={"titulo": "Projeto a apagar"}, headers=usuario_teste["headers"]
    ).json()

    apagado = client.delete(f"/projetos/{projeto['id']}", headers=usuario_teste["headers"])
    assert apagado.status_code == 200

    depois = client.get(f"/projetos/{projeto['id']}", headers=usuario_teste["headers"])
    assert depois.status_code == 404


def test_titulo_vazio_da_422(usuario_teste):
    resposta = client.post("/projetos/", json={"titulo": ""}, headers=usuario_teste["headers"])

    assert resposta.status_code == 422


def test_projetos_exige_login():
    assert client.get("/projetos/").status_code == 401
