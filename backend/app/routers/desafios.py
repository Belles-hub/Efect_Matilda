from fastapi import APIRouter, Depends, HTTPException, Query

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.data.desafios import DESAFIOS, DESAFIOS_POR_ID
from app.erros import exigir_encontrado
from app.services import recomendacao

router = APIRouter(
    prefix="/desafios",
    tags=['Desafios "Experimente"']
)


@router.get("/", response_model=list[schemas.Desafio])
def listar(categoria: str | None = Query(default=None)):
    """Catálogo curado (seção 4 do spec) — não gerado por IA."""
    if categoria:
        return [d for d in DESAFIOS if d["categoria"] == categoria]

    return DESAFIOS


@router.get("/recomendados", response_model=list[schemas.DesafioRecomendado])
def recomendados(
    limite: int | None = Query(default=None, ge=1, le=50),
    usuario_auth=Depends(verificar_token)
):
    """Desafios ordenados pro perfil de quem está logada: áreas que ela quer
    experimentar, depois interesses, respeitando o nível da série; os já
    concluídos vão pro fim. Precisa vir antes de /{desafio_id}."""
    uid = usuario_auth["uid"]

    usuario = exigir_encontrado(crud_firebase.buscar_usuario(uid), "Usuário não encontrado.")
    concluidos = {c["desafio_id"] for c in crud_firebase.listar_desafios_concluidos(uid)}

    lista = recomendacao.recomendar_desafios(DESAFIOS, usuario["preferencias"], concluidos)

    return lista[:limite] if limite else lista


@router.get("/concluidos", response_model=list[schemas.DesafioConcluido])
def listar_concluidos(usuario_auth=Depends(verificar_token)):
    """Precisa vir antes de /{desafio_id}: senão "concluidos" seria lido
    como um id de desafio."""
    return crud_firebase.listar_desafios_concluidos(usuario_auth["uid"])


@router.get("/{desafio_id}", response_model=schemas.Desafio)
def buscar(desafio_id: str):
    desafio = DESAFIOS_POR_ID.get(desafio_id)

    if desafio is None:
        raise HTTPException(status_code=404, detail="Desafio não encontrado.")

    return desafio


@router.post("/{desafio_id}/reflexao", response_model=schemas.DesafioConcluido)
def registrar_reflexao(
    desafio_id: str,
    dados: schemas.ReflexaoDesafioRequest,
    usuario_auth=Depends(verificar_token)
):
    """Guarda a reflexão da estudante sobre o desafio — o que alimenta o
    Passaporte Matilda. Não há correção automática: o valor está em
    registrar e refletir, não em acertar."""
    uid = usuario_auth["uid"]
    desafio = DESAFIOS_POR_ID.get(desafio_id)

    if desafio is None:
        raise HTTPException(status_code=404, detail="Desafio não encontrado.")

    reflexao = dados.reflexao.strip()

    crud_firebase.salvar_desafio_concluido(
        uid, desafio_id, desafio["categoria"], desafio["titulo"], dados.resultado, reflexao
    )
    crud_firebase.criar_notificacao(
        uid, "desafio", f'Você concluiu o desafio "{desafio["titulo"]}"!'
    )

    return schemas.DesafioConcluido(
        desafio_id=desafio_id,
        categoria=desafio["categoria"],
        titulo=desafio["titulo"],
        resultado=dados.resultado,
        reflexao=reflexao,
    )
