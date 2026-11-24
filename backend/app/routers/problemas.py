from fastapi import APIRouter, HTTPException

from app import schemas
from app.data.problemas import PROBLEMAS, PROBLEMAS_POR_ID

router = APIRouter(
    prefix="/problemas",
    tags=["Problemas da Comunidade"]
)


@router.get("/", response_model=list[schemas.ProblemaComunidade])
def listar():
    """Temas curados (seção 10 do spec) — ponto de partida pra um projeto
    no Criador de Projetos. Conteúdo público, não exige login."""
    return PROBLEMAS


@router.get("/{problema_id}", response_model=schemas.ProblemaComunidade)
def buscar(problema_id: str):
    problema = PROBLEMAS_POR_ID.get(problema_id)

    if problema is None:
        raise HTTPException(status_code=404, detail="Não encontrado.")

    return problema
