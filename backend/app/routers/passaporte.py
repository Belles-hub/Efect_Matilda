from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.erros import exigir_encontrado

router = APIRouter(
    prefix="/passaporte",
    tags=["Passaporte Matilda"]
)

# As 4 conquistas manuais (seção 8 do spec): dependem de vivências fora da
# plataforma, então quem marca que aconteceram é a própria estudante.
_TITULOS_MANUAIS = {
    "primeira_feira_cientifica": (
        "Primeira feira científica", "Você participou de uma feira de ciências."
    ),
    "primeira_competicao": (
        "Primeira competição", "Você participou de uma olimpíada, hackathon ou competição de tecnologia."
    ),
    "primeiro_projeto_ia": (
        "Primeiro projeto de IA", "Você criou um projeto envolvendo inteligência artificial."
    ),
    "primeira_participacao_cientifica": (
        "Primeira participação científica", "Você participou de uma iniciação científica ou evento científico."
    ),
}

_SEM_DATA = datetime.min.replace(tzinfo=timezone.utc)


def _montar_conquistas(desafios: list[dict], projetos: list[dict], manuais: dict) -> list[dict]:
    """Só se ganha — nunca se perde —, e não existe ranking: cada conquista
    compara a estudante só com ela mesma."""
    conquistas = [
        {
            "id": "primeiro_desafio",
            "titulo": "Primeiro desafio",
            "descricao": "Você concluiu seu primeiro desafio prático.",
            "conquistada": len(desafios) >= 1,
            "automatica": True,
            "conquistada_em": None,
        },
        {
            "id": "primeiro_experimento",
            "titulo": "Primeiro experimento",
            "descricao": "Você colocou a mão na massa em um experimento.",
            "conquistada": len(desafios) >= 1,
            "automatica": True,
            "conquistada_em": None,
        },
        {
            "id": "primeira_hipotese",
            "titulo": "Primeira hipótese",
            "descricao": "Você formulou uma hipótese em um projeto.",
            "conquistada": any(p.get("hipotese") for p in projetos),
            "automatica": True,
            "conquistada_em": None,
        },
        {
            "id": "primeiro_projeto",
            "titulo": "Primeiro projeto",
            "descricao": "Você começou seu primeiro projeto no Criador de Projetos.",
            "conquistada": len(projetos) >= 1,
            "automatica": True,
            "conquistada_em": None,
        },
    ]

    for id_, (titulo, descricao) in _TITULOS_MANUAIS.items():
        conquistas.append({
            "id": id_,
            "titulo": titulo,
            "descricao": descricao,
            "conquistada": id_ in manuais,
            "automatica": False,
            "conquistada_em": manuais.get(id_),
        })

    return conquistas


def _montar_linha_do_tempo(desafios: list[dict], projetos: list[dict], manuais: dict) -> list[dict]:
    eventos = []

    for desafio in desafios:
        criado_em = desafio.get("criado_em")
        eventos.append((
            criado_em or _SEM_DATA,
            {
                "tipo": "desafio",
                "titulo": desafio["titulo"],
                "data": criado_em.date().isoformat() if criado_em else None,
            },
        ))

    for projeto in projetos:
        criado_em = projeto.get("criado_em")
        eventos.append((
            criado_em or _SEM_DATA,
            {
                "tipo": "projeto",
                "titulo": projeto["titulo"],
                "data": criado_em.date().isoformat() if criado_em else None,
            },
        ))

    for id_, data_str in manuais.items():
        titulo = _TITULOS_MANUAIS.get(id_, (id_, ""))[0]

        try:
            ordenar = datetime.fromisoformat(data_str).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            ordenar = _SEM_DATA

        eventos.append((ordenar, {"tipo": "conquista", "titulo": titulo, "data": data_str}))

    eventos.sort(key=lambda item: item[0], reverse=True)

    return [evento for _, evento in eventos]


def _jornada_etapa(interesses: list, desafios: list, projetos: list) -> str:
    if not interesses:
        return "descobrir"

    if not desafios:
        return "experimentar"

    if not projetos:
        return "criar"

    return "participar"


@router.get("/", response_model=schemas.PassaporteResponse)
def painel(usuario_auth=Depends(verificar_token)):
    uid = usuario_auth["uid"]

    usuario = exigir_encontrado(crud_firebase.buscar_usuario(uid), "Usuário não encontrado.")

    desafios = crud_firebase.listar_desafios_concluidos(uid)
    projetos = crud_firebase.listar_projetos(uid)
    manuais = crud_firebase.buscar_conquistas_manuais(uid)
    interesses = usuario["preferencias"].get("interesses") or []

    return schemas.PassaporteResponse(
        conquistas=_montar_conquistas(desafios, projetos, manuais),
        linha_do_tempo=_montar_linha_do_tempo(desafios, projetos, manuais),
        desafios_concluidos=len(desafios),
        projetos_criados=len(projetos),
        interesses=interesses,
        jornada_etapa=_jornada_etapa(interesses, desafios, projetos),
    )


@router.post("/conquistas/{conquista_id}")
def marcar_conquista(
    conquista_id: str,
    dados: schemas.MarcarConquistaRequest,
    usuario_auth=Depends(verificar_token)
):
    if conquista_id not in schemas.CONQUISTAS_MANUAIS:
        raise HTTPException(status_code=404, detail="Conquista não encontrada.")

    uid = usuario_auth["uid"]
    manuais = crud_firebase.marcar_conquista_manual(uid, conquista_id, dados.conquistada)

    if manuais is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if dados.conquistada:
        titulo = _TITULOS_MANUAIS[conquista_id][0]
        crud_firebase.criar_notificacao(uid, "conquista", f'Nova conquista no seu Passaporte: "{titulo}"!')

    return {"mensagem": "Conquista atualizada.", "conquistas_manuais": manuais}
