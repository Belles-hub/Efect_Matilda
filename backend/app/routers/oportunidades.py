from fastapi import APIRouter, Depends, HTTPException, Query

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.data.oportunidades import OPORTUNIDADES, OPORTUNIDADES_POR_ID
from app.erros import exigir_encontrado
from app.services import recomendacao

router = APIRouter(
    prefix="/oportunidades",
    tags=["Oportunidades"]
)


@router.get("/", response_model=list[schemas.Oportunidade])
def listar(
    categoria: str | None = Query(default=None),
    area: str | None = Query(default=None),
    modalidade: str | None = Query(default=None),
):
    """Programas reais e verificáveis (seção 7 do spec), filtráveis —
    conteúdo público, não exige login."""
    resultado = OPORTUNIDADES

    if categoria:
        resultado = [o for o in resultado if o["categoria"] == categoria]

    if area:
        resultado = [o for o in resultado if o.get("area") == area]

    if modalidade:
        resultado = [o for o in resultado if o["modalidade"] == modalidade]

    return resultado


@router.get("/recomendadas", response_model=list[schemas.OportunidadeRecomendada])
def recomendadas(
    limite: int | None = Query(default=None, ge=1, le=50),
    usuario_auth=Depends(verificar_token)
):
    """Olimpíadas e programas ordenados pro perfil: áreas que ela quer
    experimentar, interesses e proximidade (cidade/estado). Precisa vir
    antes de /{oportunidade_id}."""
    usuario = exigir_encontrado(
        crud_firebase.buscar_usuario(usuario_auth["uid"]), "Usuário não encontrado."
    )

    lista = recomendacao.recomendar_oportunidades(OPORTUNIDADES, usuario["preferencias"])

    return lista[:limite] if limite else lista


@router.get("/{oportunidade_id}", response_model=schemas.Oportunidade)
def buscar(oportunidade_id: str):
    oportunidade = OPORTUNIDADES_POR_ID.get(oportunidade_id)

    if oportunidade is None:
        raise HTTPException(status_code=404, detail="Não encontrada.")

    return oportunidade
