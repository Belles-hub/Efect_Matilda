import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


TamanhoFonte = Literal["pequena", "media", "grande"]
ModoUso = Literal["texto", "audio", "libras"]

# As oito áreas de interesse do spec (seção 2 — categorias da Home / seção 4
# — categorias do "Experimente"). Uma estudante pode ter mais de uma.
AreaInteresse = Literal[
    "ciencia", "tecnologia", "programacao", "ciberseguranca",
    "inteligencia_artificial", "meio_ambiente", "ciencia_de_dados",
    "experimentos",
]


class Preferencias(BaseModel):
    tamanho_fonte: TamanhoFonte | None = None
    modo_uso: ModoUso | None = None
    # Áreas descobertas na etapa "Descobrir Interesses" — não é uma escolha
    # de carreira, é só o que orienta as recomendações de desafios,
    # mulheres na ciência e oportunidades.
    interesses: list[AreaInteresse] | None = None
    # Áreas que ela ainda não conhece, mas quer experimentar (mesmo catálogo
    # de `interesses`).
    areas_que_quero_experimentar: list[AreaInteresse] | None = None
    # Texto livre, com teto de tamanho: são só rótulos ("8º ano", "Fortaleza-CE").
    serie: str | None = Field(default=None, max_length=40)
    localizacao: str | None = Field(default=None, max_length=80)
    objetivo: str | None = Field(default=None, max_length=200)
    # Marca que a pessoa passou (ou pulou) a etapa Descobrir — sem isso o app
    # perguntaria de novo a cada login.
    onboarding_concluido: bool | None = None
    # Qual personagem aparece no perfil (só um rótulo, ex.: "estrela").
    avatar: str | None = Field(default=None, max_length=20)

    @field_validator("interesses", "areas_que_quero_experimentar")
    @classmethod
    def areas_sem_repeticao(cls, valor: list[str] | None) -> list[str] | None:
        if valor is None:
            return None

        vistos: list[str] = []
        for item in valor:
            if item not in vistos:
                vistos.append(item)

        return vistos


# Restrito de propósito: o e-mail vira o id do documento no Firestore, e um id
# não pode conter "/" (viraria um caminho de subcoleção).
_EMAIL = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$")


def _normalizar_email(valor: str) -> str:
    """E-mail é o identificador da conta: minúsculo e sem espaços, senão
    "Ana@x.com" e "ana@x.com" virariam duas contas diferentes."""
    limpo = valor.strip().lower()

    if not _EMAIL.match(limpo) or len(limpo) > 254:
        raise ValueError("Digite um e-mail válido (ex.: nome@exemplo.com).")

    return limpo


def _nome_valido(valor: str) -> str:
    valor = valor.strip()

    if len(valor) < 2:
        raise ValueError("Digite seu nome.")

    if len(valor) > 80:
        raise ValueError("O nome pode ter no máximo 80 caracteres.")

    return valor


def _senha_valida(valor: str) -> str:
    if len(valor) < 6:
        raise ValueError("A senha precisa ter pelo menos 6 caracteres.")

    if len(valor) > 72:
        # bcrypt só olha os primeiros 72 bytes: melhor recusar do que
        # aceitar uma senha que seria silenciosamente truncada.
        raise ValueError("A senha pode ter no máximo 72 caracteres.")

    return valor


class UsuarioCreate(BaseModel):
    """Perfil de quem entrou com o Google (o Firebase já provou o e-mail)."""
    nome: str
    email: str
    preferencias: Preferencias | None = None

    @field_validator("nome")
    @classmethod
    def nome_ok(cls, valor: str) -> str:
        return _nome_valido(valor)

    @field_validator("email")
    @classmethod
    def email_ok(cls, valor: str) -> str:
        return _normalizar_email(valor)


class UsuarioResponse(BaseModel):
    id: str
    nome: str
    email: str | None = None
    status: str
    preferencias: Preferencias

    model_config = ConfigDict(from_attributes=True)


class UsuarioUpdate(BaseModel):
    # O e-mail não entra aqui de propósito: ele é o identificador da conta
    # (id do documento) — trocar exigiria "mudar o documento de endereço".
    nome: str | None = None
    preferencias: Preferencias | None = None

    @field_validator("nome")
    @classmethod
    def nome_ok(cls, valor: str | None) -> str | None:
        return _nome_valido(valor) if valor is not None else None


class UsuarioRegistroSenha(BaseModel):
    nome: str
    email: str
    senha: str
    # Confirmação de que leu os Termos. Como o público inclui menores, o texto
    # dos Termos pede que um responsável acompanhe o cadastro.
    aceitou_termos: bool
    # A pergunta de segurança é quem confirma a identidade depois, no
    # "esqueci minha senha" — ainda não existe envio de e-mail no projeto.
    pergunta_seguranca: str
    resposta_seguranca: str
    preferencias: Preferencias | None = None

    @field_validator("nome")
    @classmethod
    def nome_ok(cls, valor: str) -> str:
        return _nome_valido(valor)

    @field_validator("email")
    @classmethod
    def email_ok(cls, valor: str) -> str:
        return _normalizar_email(valor)

    @field_validator("senha")
    @classmethod
    def senha_ok(cls, valor: str) -> str:
        return _senha_valida(valor)

    @field_validator("aceitou_termos")
    @classmethod
    def termos_obrigatorios(cls, valor: bool) -> bool:
        if not valor:
            raise ValueError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.")
        return valor

    @field_validator("pergunta_seguranca")
    @classmethod
    def pergunta_nao_pode_ser_vazia(cls, valor: str) -> str:
        valor = valor.strip()
        if len(valor) < 5:
            raise ValueError("Escolha uma pergunta de segurança.")
        return valor

    @field_validator("resposta_seguranca")
    @classmethod
    def resposta_nao_pode_ser_vazia(cls, valor: str) -> str:
        valor = valor.strip()
        if len(valor) < 2:
            raise ValueError("Escreva uma resposta pra sua pergunta de segurança.")
        return valor


class LoginSenha(BaseModel):
    email: str
    senha: str

    @field_validator("email")
    @classmethod
    def email_ok(cls, valor: str) -> str:
        return _normalizar_email(valor)


class SolicitarRedefinicaoSenha(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_ok(cls, valor: str) -> str:
        return _normalizar_email(valor)


class PerguntaSegurancaResponse(BaseModel):
    pergunta: str


class RedefinirSenha(BaseModel):
    email: str
    resposta_seguranca: str
    nova_senha: str

    @field_validator("email")
    @classmethod
    def email_ok(cls, valor: str) -> str:
        return _normalizar_email(valor)

    @field_validator("nova_senha")
    @classmethod
    def senha_ok(cls, valor: str) -> str:
        return _senha_valida(valor)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    uid: str


# ---------------------------------------------------------------------------
# Mentora Matilda (chat)
# ---------------------------------------------------------------------------

class ChatMensagem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


# Limites do material anexado (o texto já vem lido pela rota /chat/material).
MAX_MATERIAIS_POR_CONVERSA = 4
MAX_CHARS_TODO_MATERIAL = 24000


class MaterialAnexado(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    texto: str = Field(min_length=1, max_length=9000)


class MaterialArquivo(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    # Arquivo em base64 (o tipo é conferido pelos bytes, não por este campo).
    dados: str = Field(min_length=8, max_length=7_500_000)


class MaterialLido(BaseModel):
    nome: str
    tipo: Literal["imagem", "documento"]
    texto: str
    aviso: str | None = None


# Modos da conversa com a Matilda: livre (curiosidade científica em geral) ou
# ligada a um projeto específico do Criador de Projetos (o system prompt vira
# o roteiro PROBLEMA→PERGUNTA→HIPÓTESE→...→CONCLUSÃO daquele projeto).
ModoMatilda = Literal["conversar", "projeto"]


class ChatRequest(BaseModel):
    mensagem: str = Field(min_length=1, max_length=500)
    historico: list[ChatMensagem] = Field(default=[], max_length=40)
    # Material que a estudante anexou nesta conversa (foto de experimento,
    # tabela de dados coletados, etc.).
    material: list[MaterialAnexado] = Field(default=[], max_length=MAX_MATERIAIS_POR_CONVERSA)
    # Tamanho de fonte que a pessoa está usando agora na tela — pode ser
    # diferente do que ela escolheu no perfil.
    tamanho_fonte_atual: TamanhoFonte | None = None
    modo: ModoMatilda = "conversar"
    projeto_id: str | None = Field(default=None, max_length=40)
    area: str | None = Field(default=None, max_length=40)

    @field_validator("material")
    @classmethod
    def material_nao_passa_do_limite(cls, itens: list[MaterialAnexado]) -> list[MaterialAnexado]:
        if sum(len(m.texto) for m in itens) > MAX_CHARS_TODO_MATERIAL:
            raise ValueError("Material demais nesta conversa. Remova algum arquivo.")

        return itens


class ChatResponse(BaseModel):
    resposta: str


TipoEstudo = Literal["plano", "atividades", "mapa", "resumo"]


class EstudoRequest(BaseModel):
    tipo: TipoEstudo
    tema: str = Field(min_length=2, max_length=200)
    serie: str | None = Field(default=None, max_length=60)
    dias: int = Field(default=7, ge=1, le=30)
    material: list[MaterialAnexado] = Field(default=[], max_length=MAX_MATERIAIS_POR_CONVERSA)


class EstudoSecao(BaseModel):
    titulo: str
    pontos: list[str]


class EstudoResponse(BaseModel):
    tipo: TipoEstudo
    titulo: str
    secoes: list[EstudoSecao]


# ---------------------------------------------------------------------------
# Desafios "Experimente"
# ---------------------------------------------------------------------------

NivelDesafio = Literal["iniciante", "intermediario", "avancado"]
ResultadoDesafio = Literal["funcionou", "parcial", "nao_funcionou"]


class Desafio(BaseModel):
    """Catálogo curado (dado estruturado, não gerado por IA) — ver
    app/data/desafios.py."""
    id: str
    categoria: AreaInteresse
    titulo: str
    descricao: str
    objetivo: str
    tempo_estimado_min: int
    nivel: NivelDesafio
    area_cientifica: str
    instrucoes: list[str]
    atividade: str
    perguntas_reflexao: list[str]
    # Detalhamento de como fazer a atividade. Opcionais (padrão vazio) pra
    # não quebrar nada que já lê o desafio sem eles.
    materiais: list[str] = []
    dicas: list[str] = []
    o_que_observar: list[str] = []
    cuidados: list[str] = []


class DesafioRecomendado(Desafio):
    """Desafio do catálogo + por que ele foi sugerido pra esta estudante."""
    motivo: str


class ReflexaoDesafioRequest(BaseModel):
    resultado: ResultadoDesafio
    reflexao: str = Field(min_length=1, max_length=1000)


class DesafioConcluido(BaseModel):
    desafio_id: str
    categoria: AreaInteresse
    titulo: str
    resultado: ResultadoDesafio
    reflexao: str
    concluido_em: datetime | None = None


# ---------------------------------------------------------------------------
# Mulheres na ciência
# ---------------------------------------------------------------------------

class MulherCiencia(BaseModel):
    """Referências reais (dado curado, ver app/data/mulheres.py)."""
    id: str
    nome: str
    area: AreaInteresse
    atuacao: str
    bio: str
    conquista: str
    desafio_relacionado_id: str | None = None


class MulherRecomendada(MulherCiencia):
    motivo: str


# ---------------------------------------------------------------------------
# Oportunidades
# ---------------------------------------------------------------------------

CategoriaOportunidade = Literal[
    "olimpiada", "feira_cientifica", "competicao_tecnologia", "hackathon",
    "programa_estudantil", "iniciacao_cientifica", "bolsa", "projeto_evento",
]
Modalidade = Literal["presencial", "online", "hibrido"]


class Oportunidade(BaseModel):
    """Programas reais e verificáveis (dado curado, ver
    app/data/oportunidades.py) — prazos que variam por edição aparecem como
    texto orientando a conferir o site oficial, nunca como data inventada."""
    id: str
    categoria: CategoriaOportunidade
    nome: str
    descricao: str
    quem_pode_participar: str
    prazo: str | None = None
    local: str
    modalidade: Modalidade
    link_oficial: str
    area: AreaInteresse | None = None


class OportunidadeRecomendada(Oportunidade):
    motivo: str


# ---------------------------------------------------------------------------
# Problemas da comunidade
# ---------------------------------------------------------------------------

# Os 8 temas da seção 10 do spec — um recorte próprio, diferente das áreas de
# interesse (ex.: "água" e "agricultura" não são áreas de carreira, são
# pontos de partida concretos pra observar o entorno).
TemaComunidade = Literal[
    "agua", "agricultura", "residuos", "clima", "educacao",
    "inclusao_digital", "seguranca", "meio_ambiente",
]


class ProblemaComunidade(BaseModel):
    id: str
    titulo: str
    descricao: str
    tema: TemaComunidade
    perguntas_norteadoras: list[str]


# ---------------------------------------------------------------------------
# Criador de Projetos
# ---------------------------------------------------------------------------

# As 9 etapas do método científico (seção 9 do spec), preenchidas
# progressivamente pela própria estudante — a Matilda ajuda com perguntas no
# chat (modo="projeto"), mas nunca escreve o projeto no lugar dela.
CAMPOS_PROJETO = (
    "problema", "pergunta_pesquisa", "hipotese", "objetivo", "metodologia",
    "experimento", "coleta_dados", "analise", "conclusao",
)


class ProjetoCriar(BaseModel):
    titulo: str = Field(min_length=1, max_length=120)
    # Preenchido quando o projeto nasce de um tema de "Problemas da Comunidade".
    tema_comunidade: str | None = Field(default=None, max_length=120)


class ProjetoAtualizar(BaseModel):
    titulo: str = Field(min_length=1, max_length=120)
    problema: str | None = Field(default=None, max_length=1000)
    pergunta_pesquisa: str | None = Field(default=None, max_length=500)
    hipotese: str | None = Field(default=None, max_length=1000)
    objetivo: str | None = Field(default=None, max_length=500)
    metodologia: str | None = Field(default=None, max_length=1500)
    experimento: str | None = Field(default=None, max_length=1500)
    coleta_dados: str | None = Field(default=None, max_length=1500)
    analise: str | None = Field(default=None, max_length=1500)
    conclusao: str | None = Field(default=None, max_length=1500)


class ProjetoResponse(BaseModel):
    id: str
    titulo: str
    tema_comunidade: str | None = None
    problema: str | None = None
    pergunta_pesquisa: str | None = None
    hipotese: str | None = None
    objetivo: str | None = None
    metodologia: str | None = None
    experimento: str | None = None
    coleta_dados: str | None = None
    analise: str | None = None
    conclusao: str | None = None
    etapa_atual: int
    criado_em: datetime | None = None


# ---------------------------------------------------------------------------
# Passaporte Matilda
# ---------------------------------------------------------------------------

# As 4 primeiras são calculadas a partir de dados reais registrados; as
# outras 4 dependem de vivências fora da plataforma (feira, competição,
# projeto de IA, participação científica) — por isso a própria estudante
# marca quando aconteceram.
CONQUISTAS_MANUAIS = (
    "primeira_feira_cientifica", "primeira_competicao",
    "primeiro_projeto_ia", "primeira_participacao_cientifica",
)


class ConquistaPassaporte(BaseModel):
    id: str
    titulo: str
    descricao: str
    conquistada: bool
    automatica: bool
    conquistada_em: str | None = None


class EventoTrajetoria(BaseModel):
    tipo: Literal["desafio", "projeto", "conquista"]
    titulo: str
    data: str | None = None


JornadaEtapa = Literal["descobrir", "experimentar", "criar", "participar"]


class PassaporteResponse(BaseModel):
    conquistas: list[ConquistaPassaporte]
    linha_do_tempo: list[EventoTrajetoria]
    desafios_concluidos: int
    projetos_criados: int
    interesses: list[str]
    jornada_etapa: JornadaEtapa


class MarcarConquistaRequest(BaseModel):
    conquistada: bool


class Notificacao(BaseModel):
    id: str
    tipo: str
    mensagem: str
    lida: bool
    criado_em: datetime | None = None
