from fastapi import APIRouter, Depends, HTTPException

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.erros import exigir_encontrado, traduzir_erros_da_ia
from app.services import adaptation, estudo, ia, material

router = APIRouter(
    prefix="/chat",
    tags=["Mentora Matilda"]
)

MENSAGEM_LIMITE_DIARIO = (
    "Você atingiu o limite de mensagens de hoje. "
    "Descanse um pouco e volte amanhã!"
)


def registrar_uso_ou_429(uid: str):
    """Conta um uso de IA do dia; se já bateu o teto, vira 429."""
    try:
        crud_firebase.registrar_uso_chat(uid)
    except crud_firebase.LimiteDeUsoExcedidoError:
        raise HTTPException(status_code=429, detail=MENSAGEM_LIMITE_DIARIO)


@router.post("/", response_model=schemas.ChatResponse)
def conversar(
    dados: schemas.ChatRequest,
    usuario_auth=Depends(verificar_token)
):
    uid = usuario_auth["uid"]

    usuario = crud_firebase.buscar_usuario(uid)

    usuario = exigir_encontrado(usuario, "Usuário não encontrado.")

    registrar_uso_ou_429(uid)

    # O tamanho de fonte que a estudante está usando agora na tela (se veio
    # na requisição) reflete o uso real dela melhor do que a preferência
    # salva no perfil, então tem prioridade.
    preferencias_efetivas = dict(usuario["preferencias"])

    if dados.tamanho_fonte_atual:
        preferencias_efetivas["tamanho_fonte"] = dados.tamanho_fonte_atual

    historico = [item.model_dump() for item in dados.historico]

    # Modo "projeto": busca o estado atual do projeto pra Matilda saber
    # exatamente qual das 9 etapas ainda está vazia.
    projeto = None

    if dados.modo == "projeto" and dados.projeto_id:
        projeto = exigir_encontrado(
            crud_firebase.buscar_projeto(uid, dados.projeto_id),
            "Projeto não encontrado."
        )

    instrucoes = adaptation.montar_instrucoes_sistema(
        preferencias_efetivas,
        historico,
        modo=dados.modo,
        area=dados.area,
        projeto=projeto,
        material=[item.model_dump() for item in dados.material],
    )

    with traduzir_erros_da_ia("Não foi possível falar com a Matilda agora. Tente novamente em instantes."):
        resposta = ia.gerar_resposta(dados.mensagem, historico, instrucoes)

    crud_firebase.salvar_mensagem(uid, "user", dados.mensagem, materia=dados.area)
    crud_firebase.salvar_mensagem(uid, "assistant", resposta)

    return schemas.ChatResponse(resposta=resposta)


@router.post("/material", response_model=schemas.MaterialLido)
def ler_material(
    dados: schemas.MaterialArquivo,
    usuario_auth=Depends(verificar_token)
):
    """Lê uma foto ou arquivo (experimento, dados coletados) e devolve o
    texto. Nada é guardado: o arquivo só existe na memória durante esta
    chamada."""
    uid = usuario_auth["uid"]

    exigir_encontrado(crud_firebase.buscar_usuario(uid), "Usuário não encontrado.")

    try:
        preparado = material.preparar(dados.nome, dados.dados)

        # Foto usa o modelo de visão (custa mais): conta no limite diário.
        # PDF, Word e texto são lidos aqui mesmo, sem IA.
        if preparado.eh_imagem:
            registrar_uso_ou_429(uid)

        with traduzir_erros_da_ia("Não consegui ler esse arquivo agora. Tente de novo em instantes."):
            tipo, texto, aviso = material.ler(preparado)

    except material.MaterialInvalido as erro:
        raise HTTPException(status_code=erro.status, detail=str(erro))

    return schemas.MaterialLido(nome=preparado.nome, tipo=tipo, texto=texto, aviso=aviso)


@router.post("/estudo", response_model=schemas.EstudoResponse)
def material_de_estudo(
    dados: schemas.EstudoRequest,
    usuario_auth=Depends(verificar_token)
):
    """Plano de estudos, mapa mental ou resumo sobre um tema — volta
    estruturado pra tela desenhar e a estudante baixar em PDF."""
    uid = usuario_auth["uid"]

    usuario = exigir_encontrado(crud_firebase.buscar_usuario(uid), "Usuário não encontrado.")

    registrar_uso_ou_429(uid)

    serie = dados.serie or usuario["preferencias"].get("serie")

    with traduzir_erros_da_ia("Não consegui montar o material agora. Tente novamente em instantes."):
        resultado = estudo.gerar(
            dados.tipo, dados.tema, serie, dados.dias,
            [item.model_dump() for item in dados.material],
        )

    return schemas.EstudoResponse(**resultado)


@router.get("/resumo", response_model=schemas.ChatResponse)
def resumo(
    usuario_auth=Depends(verificar_token)
):
    uid = usuario_auth["uid"]

    usuario = crud_firebase.buscar_usuario(uid)

    usuario = exigir_encontrado(usuario, "Usuário não encontrado.")

    historico = crud_firebase.listar_mensagens(uid)

    if not historico:
        return schemas.ChatResponse(
            resposta="Você ainda não teve nenhuma conversa com a Matilda. Que tal começar agora?"
        )

    registrar_uso_ou_429(uid)

    instrucoes = adaptation.montar_instrucoes_sistema(usuario["preferencias"], historico)

    with traduzir_erros_da_ia("Não foi possível gerar o resumo agora. Tente novamente em instantes."):
        resposta = ia.gerar_resumo(historico, instrucoes)

    return schemas.ChatResponse(resposta=resposta)
