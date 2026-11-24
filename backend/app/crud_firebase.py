import logging
import uuid
from datetime import datetime, timedelta, timezone

from google.cloud import firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter

from app.firebase import db

logger = logging.getLogger(__name__)


class LimiteDeUsoExcedidoError(Exception):
    pass


def _dia_atual() -> str:
    return datetime.now(timezone(timedelta(hours=-3))).date().isoformat()


def _incrementar_contador_diario(
    referencia,
    campo_contagem: str,
    campo_dia: str,
    limite_padrao: int,
    campo_limite: str | None = None,
    campos_extra: dict | None = None,
) -> None:
    """Incrementa um contador "zera todo dia" (usado pelo limite de chat) de
    forma atômica, via transação do Firestore, e levanta
    LimiteDeUsoExcedidoError se já bateu o teto.

    Sem a transação, duas requisições simultâneas liam o mesmo valor ANTES
    de qualquer uma escrever de volta — as duas passavam na checagem e o
    limite diário furava exatamente no cenário que ele deveria evitar (um
    token vazado gerando uso sem freio).
    """
    hoje = _dia_atual()

    @firestore.transactional
    def _transacao(transacao):
        snapshot = referencia.get(transaction=transacao)

        if not snapshot.exists:
            return

        dados = snapshot.to_dict()
        limite = dados.get(campo_limite, limite_padrao) if campo_limite else limite_padrao
        uso_hoje = dados.get(campo_contagem, 0) if dados.get(campo_dia) == hoje else 0

        if uso_hoje >= limite:
            raise LimiteDeUsoExcedidoError()

        atualizacoes = {campo_contagem: uso_hoje + 1, campo_dia: hoje}

        if campos_extra:
            atualizacoes.update(campos_extra)

        transacao.update(referencia, atualizacoes)

    _transacao(db.transaction())


# ---------------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------------

def _perfil_dict(uid: str, dados: dict) -> dict:
    return {
        "id": uid,
        "nome": dados.get("nome"),
        "email": dados.get("email"),
        "status": dados.get("status", "ativo"),
        "preferencias": dados.get("preferencias") or {},
        # Ajustes do painel de acessibilidade (contraste, tamanho de texto,
        # cursor etc.). Formato livre de propósito: quem define o formato é
        # o painel no frontend, não o backend — assim um ajuste novo lá não
        # exige alterar nada aqui.
        "preferencias_visuais": dados.get("preferencias_visuais") or {}
    }


MENSAGEM_BOAS_VINDAS = "Bem-vinda à Efect Matilda! Sua jornada científica começa agora."


def criar_perfil(uid: str, usuario):
    """Perfil de quem entrou com o Google. O uid vem sempre do token já
    verificado pelo Firebase (nunca do cliente)."""
    referencia = db.collection("usuarios").document(uid)

    if referencia.get().exists:
        return None

    dados = {
        "nome": usuario.nome,
        "email": usuario.email,
        "status": "ativo",
        "preferencias": (
            usuario.preferencias.model_dump(exclude_none=True)
            if usuario.preferencias
            else {}
        )
    }

    referencia.set(dados)

    criar_notificacao(uid, "boas_vindas", MENSAGEM_BOAS_VINDAS)

    return _perfil_dict(uid, dados)


def criar_perfil_senha(
    email: str,
    nome: str,
    senha_hash: str,
    pergunta_seguranca: str,
    resposta_seguranca_hash: str,
    preferencias=None
):
    # Sem Firebase Auth por trás, o próprio e-mail (normalizado) vira o id do
    # documento. create() falha se já existir, então duas requisições
    # simultâneas com o mesmo e-mail não criam duas contas.
    referencia = db.collection("usuarios").document(email)

    dados = {
        "nome": nome,
        "email": email,
        "senha_hash": senha_hash,
        "pergunta_seguranca": pergunta_seguranca,
        "resposta_seguranca_hash": resposta_seguranca_hash,
        "status": "ativo",
        "preferencias": (
            preferencias.model_dump(exclude_none=True)
            if preferencias
            else {}
        )
    }

    try:
        referencia.create(dados)
    except Exception as erro:
        # google.api_core.exceptions.AlreadyExists
        if erro.__class__.__name__ == "AlreadyExists":
            return None
        raise

    criar_notificacao(email, "boas_vindas", MENSAGEM_BOAS_VINDAS)

    return _perfil_dict(email, dados)


def existe_email(email: str) -> bool:
    return db.collection("usuarios").document(email).get().exists


def buscar_documento_por_email(email: str):
    # Usado só no login por senha: aqui precisamos do senha_hash,
    # que _perfil_dict nunca expõe pra fora da API.
    documento = db.collection("usuarios").document(email).get()

    if not documento.exists:
        return None

    return documento.to_dict()


def buscar_token_versao(uid: str) -> int:
    """0 se a conta não existe ou nunca trocou de senha — versão inicial
    implícita, sem precisar escrever o campo em toda conta nova."""
    documento = db.collection("usuarios").document(uid).get()

    if not documento.exists:
        return 0

    return documento.to_dict().get("token_versao", 0)


def atualizar_senha(email: str, senha_hash: str) -> int | None:
    """Troca o hash e sobe o token_versao — verificar_token (app/auth.py)
    confere essa versão a cada requisição, então qualquer token emitido
    ANTES desta troca vira inválido na hora.

    Devolve a nova versão (pra o router poder embutir ela no token que
    ele mesmo emite logo em seguida, senão a pessoa ficaria deslogada da
    própria sessão que acabou de criar ao redefinir a senha)."""
    referencia = db.collection("usuarios").document(email)
    documento = referencia.get()

    if not documento.exists:
        return None

    nova_versao = documento.to_dict().get("token_versao", 0) + 1

    criar_notificacao(email, "seguranca", "Sua senha foi alterada. Se não foi você, redefina de novo agora.")

    referencia.update({
        "senha_hash": senha_hash,
        "token_versao": nova_versao,
    })

    return nova_versao


def buscar_usuario(uid: str):
    documento = db.collection("usuarios").document(uid).get()

    if not documento.exists:
        return None

    return _perfil_dict(uid, documento.to_dict())


def atualizar_usuario(uid: str, dados):
    referencia = db.collection("usuarios").document(uid)

    documento = referencia.get()

    if not documento.exists:
        return None

    atualizacoes = dados.model_dump(exclude_unset=True, exclude_none=True)

    dados_atuais = documento.to_dict()

    # O Firestore substitui o mapa inteiro quando recebe um dict aninhado.
    # Usar caminhos com ponto atualiza só os campos realmente enviados.
    preferencias = atualizacoes.pop("preferencias", None)

    dados_atuais.update(atualizacoes)

    if preferencias:
        dados_atuais["preferencias"] = {
            **dados_atuais.get("preferencias", {}),
            **preferencias
        }
        for campo, valor in preferencias.items():
            atualizacoes[f"preferencias.{campo}"] = valor

    if atualizacoes:
        referencia.update(atualizacoes)

    return _perfil_dict(uid, dados_atuais)


def redefinir_preferencias(uid: str):
    """Volta as preferências de aprendizagem pro estado inicial (nenhuma
    escolhida). Usa .update() com o mapa inteiro, não caminho com ponto —
    é o único jeito de LIMPAR campos que a pessoa tinha escolhido antes,
    em vez de só sobrescrever os que vierem na requisição."""
    referencia = db.collection("usuarios").document(uid)
    documento = referencia.get()

    if not documento.exists:
        return None

    referencia.update({"preferencias": {}})

    dados_atuais = documento.to_dict()
    dados_atuais["preferencias"] = {}

    return _perfil_dict(uid, dados_atuais)


def salvar_preferencias_visuais(uid: str, preferencias_visuais: dict):
    """Sobrescreve o painel de acessibilidade inteiro (não faz merge campo a
    campo) — é assim que o painel no frontend sempre manda o estado, então
    reflete exatamente o que a pessoa vê na tela dela."""
    referencia = db.collection("usuarios").document(uid)
    documento = referencia.get()

    if not documento.exists:
        return None

    referencia.update({"preferencias_visuais": preferencias_visuais})

    dados_atuais = documento.to_dict()
    dados_atuais["preferencias_visuais"] = preferencias_visuais

    return _perfil_dict(uid, dados_atuais)


# ---------------------------------------------------------------------------
# Chat com a Matilda
# ---------------------------------------------------------------------------

LIMITE_DIARIO_CHAT_USUARIO = 300


def registrar_uso_chat(uid: str):
    """Limite diário por pessoa — protege contra um token vazado gerando
    custo de IA sem freio. Fica no Firestore, não em memória, pelo mesmo
    motivo do bloqueio de login: a API pode rodar em mais de uma instância."""
    referencia = db.collection("usuarios").document(uid)

    _incrementar_contador_diario(
        referencia, "contagem_chat_uso", "contagem_chat_dia", LIMITE_DIARIO_CHAT_USUARIO
    )


def salvar_mensagem(uid: str, role: str, content: str, materia: str | None = None):
    dados = {
        "role": role,
        "content": content,
        "criado_em": SERVER_TIMESTAMP
    }

    if materia:
        dados["materia"] = materia

    db.collection("usuarios").document(uid).collection("mensagens").add(dados)


def listar_mensagens(uid: str, limite: int = 50):
    # limit_to_last() não pode ser usado com .stream() (limitação do
    # cliente do Firestore) — precisa de .get(), que já retorna a lista pronta.
    documentos = (
        db.collection("usuarios").document(uid).collection("mensagens")
        .order_by("criado_em")
        .limit_to_last(limite)
        .get()
    )

    return [
        {"role": doc.to_dict()["role"], "content": doc.to_dict()["content"]}
        for doc in documentos
    ]


def listar_mensagens_com_data(uid: str, limite: int = 300):
    # Igual a listar_mensagens(), mas carregando também o horário de cada
    # mensagem — é o que permite montar os gráficos de atividade.
    documentos = (
        db.collection("usuarios").document(uid).collection("mensagens")
        .order_by("criado_em")
        .limit_to_last(limite)
        .get()
    )

    mensagens = []

    for doc in documentos:
        dados = doc.to_dict()

        mensagens.append({
            "role": dados["role"],
            "content": dados["content"],
            # criado_em pode vir None se o documento acabou de ser criado e o
            # SERVER_TIMESTAMP ainda não foi resolvido pelo Firestore.
            "criado_em": dados.get("criado_em")
        })

    return mensagens


# ---------------------------------------------------------------------------
# Notificações
# ---------------------------------------------------------------------------

def criar_notificacao(uid: str, tipo: str, mensagem: str) -> None:
    """Notificação real de eventos da própria conta (boas-vindas, senha
    alterada, plano criado) — nada de frase sorteada no frontend."""
    db.collection("usuarios").document(uid).collection("notificacoes").add({
        "tipo": tipo,
        "mensagem": mensagem,
        "lida": False,
        "criado_em": SERVER_TIMESTAMP
    })


def listar_notificacoes(uid: str, limite: int = 20):
    documentos = (
        db.collection("usuarios").document(uid).collection("notificacoes")
        .order_by("criado_em", direction=firestore.Query.DESCENDING)
        .limit(limite)
        .get()
    )

    return [
        {
            "id": documento.id,
            "tipo": documento.to_dict()["tipo"],
            "mensagem": documento.to_dict()["mensagem"],
            "lida": documento.to_dict().get("lida", False),
            "criado_em": documento.to_dict().get("criado_em")
        }
        for documento in documentos
    ]


def marcar_notificacoes_como_lidas(uid: str) -> None:
    documentos = (
        db.collection("usuarios").document(uid).collection("notificacoes")
        .where(filter=FieldFilter("lida", "==", False))
        .get()
    )

    lote = db.batch()

    for documento in documentos:
        lote.update(documento.reference, {"lida": True})

    lote.commit()


# ---------------------------------------------------------------------------
# Criador de Projetos
# ---------------------------------------------------------------------------

LIMITE_PROJETOS_POR_USUARIO = 30

CAMPOS_PROJETO = (
    "problema", "pergunta_pesquisa", "hipotese", "objetivo", "metodologia",
    "experimento", "coleta_dados", "analise", "conclusao",
)


class LimiteDeProjetosError(Exception):
    pass


def _projeto_dict(documento) -> dict:
    dados = documento.to_dict()

    resultado = {
        "id": documento.id,
        "titulo": dados.get("titulo", ""),
        "tema_comunidade": dados.get("tema_comunidade"),
        "etapa_atual": dados.get("etapa_atual", 1),
        "criado_em": dados.get("criado_em"),
    }
    resultado.update({campo: dados.get(campo) for campo in CAMPOS_PROJETO})

    return resultado


def _colecao_projetos(uid: str):
    return db.collection("usuarios").document(uid).collection("projetos")


def criar_projeto(uid: str, titulo: str, tema_comunidade: str | None = None) -> dict:
    colecao = _colecao_projetos(uid)

    # Teto de projetos guardados por pessoa — sem ele, dava pra encher o
    # banco criando projetos em loop.
    if len(list(colecao.limit(LIMITE_PROJETOS_POR_USUARIO).stream())) >= LIMITE_PROJETOS_POR_USUARIO:
        raise LimiteDeProjetosError()

    referencia = colecao.document()

    referencia.set({
        "titulo": titulo,
        "tema_comunidade": tema_comunidade,
        "etapa_atual": 1,
        "criado_em": SERVER_TIMESTAMP,
    })

    return _projeto_dict(referencia.get())


def listar_projetos(uid: str) -> list[dict]:
    documentos = _colecao_projetos(uid).order_by(
        "criado_em", direction=firestore.Query.DESCENDING
    ).limit(LIMITE_PROJETOS_POR_USUARIO).get()

    return [_projeto_dict(d) for d in documentos]


def buscar_projeto(uid: str, projeto_id: str) -> dict | None:
    documento = _colecao_projetos(uid).document(projeto_id).get()

    if not documento.exists:
        return None

    return _projeto_dict(documento)


def atualizar_projeto(uid: str, projeto_id: str, dados: dict) -> dict | None:
    """dados: titulo + os 9 campos do método científico (só os enviados)."""
    referencia = _colecao_projetos(uid).document(projeto_id)

    if not referencia.get().exists:
        return None

    atualizacoes = {k: v for k, v in dados.items() if v is not None}

    # etapa_atual acompanha até onde a estudante já preencheu, pra a barra de
    # progresso do wizard saber onde retomar.
    preenchidos = sum(1 for campo in CAMPOS_PROJETO if atualizacoes.get(campo))
    atualizacoes["etapa_atual"] = min(9, max(1, preenchidos + 1))

    referencia.update(atualizacoes)

    return _projeto_dict(referencia.get())


def deletar_projeto(uid: str, projeto_id: str) -> bool:
    referencia = _colecao_projetos(uid).document(projeto_id)

    if not referencia.get().exists:
        return False

    referencia.delete()

    return True


# ---------------------------------------------------------------------------
# Desafios "Experimente" (reflexões registradas pela estudante)
# ---------------------------------------------------------------------------

LIMITE_DESAFIOS_LISTADOS = 200


def salvar_desafio_concluido(
    uid: str, desafio_id: str, categoria: str, titulo: str, resultado: str, reflexao: str
) -> None:
    db.collection("usuarios").document(uid).collection("desafios_concluidos").add({
        "desafio_id": desafio_id,
        "categoria": categoria,
        "titulo": titulo,
        "resultado": resultado,
        "reflexao": reflexao,
        "criado_em": SERVER_TIMESTAMP,
    })


def listar_desafios_concluidos(uid: str, limite: int = LIMITE_DESAFIOS_LISTADOS) -> list[dict]:
    documentos = (
        db.collection("usuarios").document(uid).collection("desafios_concluidos")
        .order_by("criado_em", direction=firestore.Query.DESCENDING)
        .limit(limite)
        .get()
    )

    return [
        {
            "desafio_id": d.to_dict().get("desafio_id", ""),
            "categoria": d.to_dict().get("categoria", ""),
            "titulo": d.to_dict().get("titulo", ""),
            "resultado": d.to_dict().get("resultado", ""),
            "reflexao": d.to_dict().get("reflexao", ""),
            "criado_em": d.to_dict().get("criado_em"),
        }
        for d in documentos
    ]


# ---------------------------------------------------------------------------
# Passaporte Matilda (conquistas marcadas manualmente)
# ---------------------------------------------------------------------------

def buscar_conquistas_manuais(uid: str) -> dict:
    documento = db.collection("usuarios").document(uid).get()

    if not documento.exists:
        return {}

    return documento.to_dict().get("conquistas_manuais", {})


def marcar_conquista_manual(uid: str, conquista_id: str, conquistada: bool) -> dict | None:
    referencia = db.collection("usuarios").document(uid)
    documento = referencia.get()

    if not documento.exists:
        return None

    atuais = documento.to_dict().get("conquistas_manuais", {})

    if conquistada:
        atuais[conquista_id] = datetime.now(timezone.utc).date().isoformat()
    else:
        atuais.pop(conquista_id, None)

    referencia.update({"conquistas_manuais": atuais})

    return atuais


"""Bloqueio temporário depois de várias senhas erradas.

A contagem fica no Firestore, não em memória, de propósito: em produção a API
pode rodar em mais de uma instância (ou serverless), e um contador em memória
seria zerado a cada processo novo — ou seja, não protegeria nada.

O bloqueio é por conta, não por IP: quem tenta adivinhar a senha de alguém
troca de IP com facilidade, mas o alvo continua sendo a mesma conta.
"""

MAX_TENTATIVAS = 5
BLOQUEIO_MINUTOS = 15


def _referencia_tentativas(email: str):
    return db.collection("tentativas_login").document(email)


def _venceu(dados: dict) -> bool:
    """Registro mais velho que a janela de bloqueio não serve mais pra nada."""
    ultima = dados.get("ultima_falha")

    if ultima is None:
        return True

    return datetime.now(timezone.utc) - ultima >= timedelta(minutes=BLOQUEIO_MINUTOS)


def segundos_de_bloqueio(email: str) -> int:
    """0 se pode tentar; senão, quantos segundos faltam pra liberar."""
    referencia = _referencia_tentativas(email)
    documento = referencia.get()

    if not documento.exists:
        return 0

    dados = documento.to_dict()

    # Vencido: apaga em vez de só ignorar. Este registro guarda um e-mail
    # e um horário — não pode ficar no banco depois de perder a utilidade.
    if _venceu(dados):
        referencia.delete()
        return 0

    if dados.get("falhas", 0) < MAX_TENTATIVAS:
        return 0

    liberado_em = dados["ultima_falha"] + timedelta(minutes=BLOQUEIO_MINUTOS)
    restante = (liberado_em - datetime.now(timezone.utc)).total_seconds()

    return max(0, int(restante))


def registrar_falha_de_login(email: str):
    referencia = _referencia_tentativas(email)
    documento = referencia.get()

    falhas = 0

    if documento.exists:
        dados = documento.to_dict()
        # Erro de digitação de semana passada não soma com o de hoje.
        falhas = 0 if _venceu(dados) else dados.get("falhas", 0)

    agora = datetime.now(timezone.utc)

    referencia.set({
        "falhas": falhas + 1,
        "ultima_falha": agora,
        # Campo existe só pra uma política de TTL do Firestore poder apagar
        # sozinha o que ninguém mais consultar. A limpeza acima cobre quem
        # volta a tentar; o TTL cobre quem nunca mais aparece. Precisa ser
        # ligado uma vez no console: Firestore > TTL, coleção
        # "tentativas_login", campo "expira_em".
        "expira_em": agora + timedelta(minutes=BLOQUEIO_MINUTOS),
    })


def limpar_tentativas_de_login(email: str):
    """Acertou a senha: a contagem some, pra um erro de digitação de ontem
    não somar com o de hoje."""
    _referencia_tentativas(email).delete()


"""Limite de cadastros por IP.

Diferente do bloqueio de login (por conta), quem faz spam de cadastro varia o
e-mail a cada tentativa — não tem conta pra bloquear ainda, porque é isso que
está sendo criado. Por isso este limite é por IP."""

LIMITE_REGISTROS_POR_IP = 5
JANELA_REGISTRO_MINUTOS = 60


def _referencia_registros(ip: str):
    return db.collection("tentativas_registro").document(ip)


def registrar_tentativa_de_registro(ip: str):
    """Conta mais um cadastro vindo desse IP na última hora; bloqueia
    quando passa do limite. LimiteDeUsoExcedidoError é a mesma exceção já
    usada pelo limite diário de chat — o tratamento no router é sempre o
    mesmo: virar 429."""
    referencia = _referencia_registros(ip)
    documento = referencia.get()
    agora = datetime.now(timezone.utc)

    if documento.exists:
        dados = documento.to_dict()
        primeira_tentativa = dados.get("primeira_tentativa")

        if primeira_tentativa and agora - primeira_tentativa < timedelta(minutes=JANELA_REGISTRO_MINUTOS):
            if dados.get("contagem", 0) >= LIMITE_REGISTROS_POR_IP:
                raise LimiteDeUsoExcedidoError()

            referencia.update({"contagem": dados.get("contagem", 0) + 1})
            return

    referencia.set({
        "contagem": 1,
        "primeira_tentativa": agora,
        # TTL do Firestore apaga sozinho o que ninguém mais consultar —
        # precisa ser ligado uma vez no console (Firestore > TTL, coleção
        # "tentativas_registro", campo "expira_em"), igual o de login.
        "expira_em": agora + timedelta(minutes=JANELA_REGISTRO_MINUTOS),
    })


# ---------------------------------------------------------------------------
# Exclusão de conta
# ---------------------------------------------------------------------------

# Subcoleções que pertencem à pessoa. O Firestore não apaga subcoleções junto
# com o documento pai, então excluir a conta (direito de exclusão da LGPD)
# precisa passar por todas elas.
SUBCOLECOES_DO_USUARIO = ("mensagens", "notificacoes", "projetos", "desafios_concluidos")


def deletar_usuario(uid: str):
    referencia = db.collection("usuarios").document(uid)

    documento = referencia.get()

    if not documento.exists:
        return None

    for nome in SUBCOLECOES_DO_USUARIO:
        for item in referencia.collection(nome).stream():
            item.reference.delete()

    referencia.delete()

    _referencia_tentativas(uid).delete()

    return {"id": uid}
