from tests.conftest import client


def test_passaporte_inicial_comeca_na_etapa_descobrir(usuario_teste):
    resposta = client.get("/passaporte/", headers=usuario_teste["headers"])

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["jornada_etapa"] == "descobrir"
    assert dados["desafios_concluidos"] == 0
    assert dados["projetos_criados"] == 0
    assert all(not c["conquistada"] for c in dados["conquistas"])


def test_primeiro_desafio_desbloqueia_conquistas_automaticas(usuario_teste):
    client.put(
        f"/usuarios/{usuario_teste['uid']}",
        json={"preferencias": {"interesses": ["ciencia"]}},
        headers=usuario_teste["headers"]
    )
    client.post(
        "/desafios/ia-padroes/reflexao",
        json={"resultado": "funcionou", "reflexao": "Consegui separar os objetos!"},
        headers=usuario_teste["headers"],
    )

    resposta = client.get("/passaporte/", headers=usuario_teste["headers"])
    dados = resposta.json()

    assert dados["jornada_etapa"] == "criar"  # tem interesse e desafio, falta projeto
    ids_conquistados = {c["id"] for c in dados["conquistas"] if c["conquistada"]}
    assert "primeiro_desafio" in ids_conquistados
    assert "primeiro_experimento" in ids_conquistados
    assert "primeiro_projeto" not in ids_conquistados
    assert len(dados["linha_do_tempo"]) == 1


def test_primeiro_projeto_com_hipotese_desbloqueia_conquista(usuario_teste):
    projeto = client.post(
        "/projetos/", json={"titulo": "Projeto de teste"}, headers=usuario_teste["headers"]
    ).json()

    client.put(
        f"/projetos/{projeto['id']}",
        json={"titulo": "Projeto de teste", "hipotese": "Acho que a planta cresce mais com mais luz."},
        headers=usuario_teste["headers"],
    )

    dados = client.get("/passaporte/", headers=usuario_teste["headers"]).json()
    ids_conquistados = {c["id"] for c in dados["conquistas"] if c["conquistada"]}

    assert "primeiro_projeto" in ids_conquistados
    assert "primeira_hipotese" in ids_conquistados


def test_marcar_e_desmarcar_conquista_manual(usuario_teste):
    marcar = client.post(
        "/passaporte/conquistas/primeira_feira_cientifica",
        json={"conquistada": True},
        headers=usuario_teste["headers"],
    )
    assert marcar.status_code == 200

    dados = client.get("/passaporte/", headers=usuario_teste["headers"]).json()
    conquista = next(c for c in dados["conquistas"] if c["id"] == "primeira_feira_cientifica")
    assert conquista["conquistada"] is True
    assert conquista["automatica"] is False
    assert any(e["tipo"] == "conquista" for e in dados["linha_do_tempo"])

    desmarcar = client.post(
        "/passaporte/conquistas/primeira_feira_cientifica",
        json={"conquistada": False},
        headers=usuario_teste["headers"],
    )
    assert desmarcar.status_code == 200

    dados2 = client.get("/passaporte/", headers=usuario_teste["headers"]).json()
    conquista2 = next(c for c in dados2["conquistas"] if c["id"] == "primeira_feira_cientifica")
    assert conquista2["conquistada"] is False


def test_marcar_conquista_invalida_da_404(usuario_teste):
    resposta = client.post(
        "/passaporte/conquistas/conquista-inventada",
        json={"conquistada": True},
        headers=usuario_teste["headers"],
    )

    assert resposta.status_code == 404


def test_passaporte_exige_login():
    assert client.get("/passaporte/").status_code == 401
