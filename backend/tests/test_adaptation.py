from app.services import adaptation


def test_prompt_base_e_socratico_e_nao_diagnostica():
    instrucoes = adaptation.montar_instrucoes_sistema({})

    assert "Matilda" in instrucoes
    assert "não entregue" in instrucoes
    assert "nunca sugira que a estudante tem algum transtorno" in instrucoes


def test_cada_modo_tem_sua_instrucao():
    assert "Modo CONVERSAR" in adaptation.montar_instrucoes_sistema({}, modo="conversar")
    assert "Modo PROJETO" in adaptation.montar_instrucoes_sistema({}, modo="projeto")


def test_modo_desconhecido_cai_em_conversar():
    assert "Modo CONVERSAR" in adaptation.montar_instrucoes_sistema({}, modo="qualquer")


def test_preferencias_da_estudante_entram_no_prompt():
    instrucoes = adaptation.montar_instrucoes_sistema({
        "serie": "6º ano",
        "objetivo": "descobrir uma área nova",
        "interesses": ["meio_ambiente", "programacao"],
        "modo_uso": "audio",
    }, area="meio_ambiente")

    assert "6º ano" in instrucoes
    assert "descobrir uma área nova" in instrucoes
    assert "Meio Ambiente" in instrucoes
    assert "Programação" in instrucoes
    assert "ouvir as respostas" in instrucoes


def test_modo_projeto_inclui_estado_do_projeto():
    projeto = {
        "titulo": "Desperdício de água na escola",
        "problema": "A torneira do pátio fica pingando.",
        "pergunta_pesquisa": None,
        "hipotese": None,
        "objetivo": None,
        "metodologia": None,
        "experimento": None,
        "coleta_dados": None,
        "analise": None,
        "conclusao": None,
    }

    instrucoes = adaptation.montar_instrucoes_sistema({}, modo="projeto", projeto=projeto)

    assert "Desperdício de água na escola" in instrucoes
    assert "A torneira do pátio fica pingando." in instrucoes
    assert "(ainda vazio)" in instrucoes


def test_sinal_de_confusao_muda_a_abordagem_so_com_repeticao():
    uma_vez = [{"role": "user", "content": "não entendi essa parte"}]
    duas_vezes = uma_vez + [{"role": "user", "content": "continua muito complicado pra mim"}]

    assert "Mude a abordagem" not in adaptation.montar_instrucoes_sistema({}, uma_vez)
    assert "Mude a abordagem" in adaptation.montar_instrucoes_sistema({}, duas_vezes)


def test_areas_que_quer_experimentar_entram_no_prompt():
    instrucoes = adaptation.montar_instrucoes_sistema(
        {"areas_que_quero_experimentar": ["ciberseguranca"]}
    )

    assert "quer experimentar" in instrucoes
    assert "Cibersegurança" in instrucoes


def test_sem_areas_para_experimentar_nao_cita_no_prompt():
    assert "quer experimentar" not in adaptation.montar_instrucoes_sistema({})
