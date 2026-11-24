from fastapi import APIRouter, Depends, HTTPException

from app import crud_firebase, schemas
from app.auth import verificar_token
from app.erros import exigir_encontrado

router = APIRouter(
    prefix="/projetos",
    tags=["Criador de Projetos"]
)


@router.get("/", response_model=list[schemas.ProjetoResponse])
def listar(usuario_auth=Depends(verificar_token)):
    return crud_firebase.listar_projetos(usuario_auth["uid"])


@router.post("/", response_model=schemas.ProjetoResponse)
def criar(dados: schemas.ProjetoCriar, usuario_auth=Depends(verificar_token)):
    uid = usuario_auth["uid"]

    try:
        projeto = crud_firebase.criar_projeto(uid, dados.titulo.strip(), dados.tema_comunidade)
    except crud_firebase.LimiteDeProjetosError:
        raise HTTPException(
            status_code=409,
            detail="Você já tem muitos projetos guardados. Apague algum projeto antigo para criar outro."
        )

    crud_firebase.criar_notificacao(
        uid, "projeto", f'Você começou o projeto "{projeto["titulo"]}". Vamos investigar!'
    )

    return projeto


@router.get("/{projeto_id}", response_model=schemas.ProjetoResponse)
def buscar(projeto_id: str, usuario_auth=Depends(verificar_token)):
    projeto = crud_firebase.buscar_projeto(usuario_auth["uid"], projeto_id)

    return exigir_encontrado(projeto, "Projeto não encontrado.")


@router.put("/{projeto_id}", response_model=schemas.ProjetoResponse)
def atualizar(projeto_id: str, dados: schemas.ProjetoAtualizar, usuario_auth=Depends(verificar_token)):
    """A estudante manda o projeto inteiro (o Criador de Projetos edita
    campo a campo, mas sempre salva o objeto completo) — a IA nunca escreve
    estes campos por ela, só ajuda com perguntas no chat (modo="projeto")."""
    uid = usuario_auth["uid"]

    projeto_anterior = crud_firebase.buscar_projeto(uid, projeto_id)
    exigir_encontrado(projeto_anterior, "Projeto não encontrado.")

    projeto = crud_firebase.atualizar_projeto(uid, projeto_id, dados.model_dump())

    # Acabou de preencher a conclusão pela primeira vez: marco de projeto concluído.
    if dados.conclusao and not projeto_anterior.get("conclusao"):
        crud_firebase.criar_notificacao(
            uid, "projeto", f'Você concluiu o projeto "{projeto["titulo"]}"! Bom trabalho.'
        )

    return projeto


@router.delete("/{projeto_id}")
def deletar(projeto_id: str, usuario_auth=Depends(verificar_token)):
    if not crud_firebase.deletar_projeto(usuario_auth["uid"], projeto_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    return {"mensagem": "Projeto excluído."}
