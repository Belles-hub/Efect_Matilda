from fastapi import APIRouter, Depends, HTTPException, Query

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.data.mulheres import MULHERES, MULHERES_POR_ID
from app.erros import exigir_encontrado
from app.services import recomendacao

router = APIRouter(
    prefix="/mulheres",
    tags=["Mulheres na Ciência"]
)


@router.get("/", response_model=list[schemas.MulherCiencia])
def listar(area: str | None = Query(default=None)):
    """Referências reais (seção 6 do spec), filtráveis por área de
    interesse — conteúdo público, não exige login."""
    if area:
        return [m for m in MULHERES if m["area"] == area]

    return MULHERES


@router.get("/recomendadas", response_model=list[schemas.MulherRecomendada])
def recomendadas(
    limite: int | None = Query(default=None, ge=1, le=50),
    usuario_auth=Depends(verificar_token)
):
    """Mulheres da ciência ordenadas pro perfil. Precisa vir antes de
    /{mulher_id}."""
    uid = usuario_auth["uid"]

    usuario = exigir_encontrado(crud_firebase.buscar_usuario(uid), "Usuário não encontrado.")
    concluidos = {c["desafio_id"] for c in crud_firebase.listar_desafios_concluidos(uid)}

    lista = recomendacao.recomendar_mulheres(MULHERES, usuario["preferencias"], concluidos)

    return lista[:limite] if limite else lista


@router.get("/{mulher_id}", response_model=schemas.MulherCiencia)
def buscar(mulher_id: str):
    mulher = MULHERES_POR_ID.get(mulher_id)

    if mulher is None:
        raise HTTPException(status_code=404, detail="Não encontrada.")

    return mulher
