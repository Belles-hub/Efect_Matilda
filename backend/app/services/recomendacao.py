"""Recomendações personalizadas (desafios, oportunidades e mulheres na
ciência) a partir do perfil da estudante.

São funções puras: recebem o dict de preferências (como vem do Firestore) e
devolvem os itens do catálogo ordenados, cada um com um "motivo" curto em
português pra explicar por que apareceu. Nada aqui acessa o banco nem a IA,
então é previsível e fácil de testar.

Como a pontuação funciona:
  - área que ela quer experimentar  -> +3
  - área de interesse               -> +2
  - item sem área (serve pra todas) -> +1  (só oportunidades)
  Desafios ainda ganham ajuste de nível pela série, e oportunidades ganham
  bônus por estar na região dela. Empates mantêm a ordem do catálogo.
"""

import re
import unicodedata

PESO_QUERO_EXPERIMENTAR = 3
PESO_INTERESSE = 2
PESO_GERAL = 1
PESO_REGIAO = 2
PESO_ONLINE = 1
PENALIDADE_NIVEL_ALTO = 2

_ORDEM_NIVEL = {"iniciante": 0, "intermediario": 1, "avancado": 2}

_ROTULOS_AREA = {
    "ciencia": "Ciência",
    "tecnologia": "Tecnologia",
    "programacao": "Programação",
    "ciberseguranca": "Cibersegurança",
    "inteligencia_artificial": "Inteligência Artificial",
    "meio_ambiente": "Meio Ambiente",
    "ciencia_de_dados": "Ciência de Dados",
    "experimentos": "Experimentos",
}


def _rotulo(area: str | None) -> str:
    return _ROTULOS_AREA.get(area or "", area or "")


def _sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto.lower())
        if unicodedata.category(c) != "Mn"
    )


def _pontos_e_motivo_area(area: str | None, preferencias: dict) -> tuple[int, str | None]:
    quer = preferencias.get("areas_que_quero_experimentar") or []
    interesses = preferencias.get("interesses") or []

    if area and area in quer:
        return PESO_QUERO_EXPERIMENTAR, f"Você quer experimentar {_rotulo(area)}"

    if area and area in interesses:
        return PESO_INTERESSE, f"Combina com seu interesse em {_rotulo(area)}"

    return 0, None


def _serie_numero(serie: str | None) -> int | None:
    """"6º ano" -> 6; "2º ano do Ensino Médio" -> 11 (continua a contagem
    do fundamental). "Outra" ou vazio -> None."""
    if not serie:
        return None

    achado = re.match(r"\s*(\d+)", serie)

    if not achado:
        return None

    numero = int(achado.group(1))

    return numero + 9 if "médio" in serie.lower() or "medio" in serie.lower() else numero


def nivel_maximo_para_serie(serie: str | None) -> str | None:
    """Até que nível de desafio faz sentido sugerir. Sem série informada,
    não restringe nada."""
    numero = _serie_numero(serie)

    if numero is None:
        return None

    if numero <= 7:
        return "iniciante"

    if numero <= 9:
        return "intermediario"

    return "avancado"


def recomendar_desafios(
    desafios: list[dict],
    preferencias: dict,
    concluidos_ids: set[str] | None = None,
) -> list[dict]:
    feitos = concluidos_ids or set()
    nivel_max = nivel_maximo_para_serie(preferencias.get("serie"))

    pontuados = []

    for posicao, desafio in enumerate(desafios):
        pontos, motivo = _pontos_e_motivo_area(desafio.get("categoria"), preferencias)

        if nivel_max and _ORDEM_NIVEL.get(desafio["nivel"], 0) > _ORDEM_NIVEL[nivel_max]:
            pontos -= PENALIDADE_NIVEL_ALTO

        ja_feito = desafio["id"] in feitos

        if ja_feito:
            motivo = "Você já concluiu este desafio"
        elif not motivo:
            motivo = "Pra conhecer uma área nova"

        # Quem já concluiu vai pro fim, com a pontuação da área só pra
        # desempatar entre os concluídos.
        pontuados.append(((1 if ja_feito else 0, -pontos, posicao), {**desafio, "motivo": motivo}))

    pontuados.sort(key=lambda item: item[0])

    return [item for _, item in pontuados]


def _bonus_regiao(local: str, localizacao: str | None) -> bool:
    """Compara a cidade/estado da estudante ("Recife, PE") com o texto do
    local da oportunidade ("São Paulo (SP)", "... FUNCAP no Ceará")."""
    if not localizacao:
        return False

    local_norm = _sem_acento(local)

    # sigla do estado, só quando escrita como "(SP)" no catálogo
    for pedaco in re.split(r"[,\-/]", localizacao):
        pedaco = pedaco.strip()

        if re.fullmatch(r"[A-Za-z]{2}", pedaco) and f"({pedaco.lower()})" in local_norm:
            return True

    # nome de cidade ou estado inteiro (ignora palavras curtas como "de")
    for palavra in re.findall(r"[^\W\d_]{4,}", _sem_acento(localizacao)):
        if re.search(rf"\b{re.escape(palavra)}\b", local_norm):
            return True

    return False


def recomendar_oportunidades(oportunidades: list[dict], preferencias: dict) -> list[dict]:
    localizacao = preferencias.get("localizacao")

    pontuados = []

    for posicao, oportunidade in enumerate(oportunidades):
        area = oportunidade.get("area")
        pontos, motivo = _pontos_e_motivo_area(area, preferencias)

        if not area:
            pontos += PESO_GERAL
            motivo = motivo or "Aberta a várias áreas"

        if _bonus_regiao(oportunidade.get("local", ""), localizacao):
            pontos += PESO_REGIAO
            motivo = f"{motivo} · perto de você" if motivo else "Perto de você"
        elif oportunidade.get("modalidade") == "online":
            pontos += PESO_ONLINE
            motivo = f"{motivo} · dá pra fazer online" if motivo else "Dá pra fazer online"

        pontuados.append(((-pontos, posicao), {**oportunidade, "motivo": motivo or "Pra conhecer"}))

    pontuados.sort(key=lambda item: item[0])

    return [item for _, item in pontuados]


def recomendar_mulheres(
    mulheres: list[dict],
    preferencias: dict,
    concluidos_ids: set[str] | None = None,
) -> list[dict]:
    feitos = concluidos_ids or set()

    pontuados = []

    for posicao, mulher in enumerate(mulheres):
        pontos, motivo = _pontos_e_motivo_area(mulher.get("area"), preferencias)

        # Quem trabalhou numa área onde ela acabou de fazer um desafio é um
        # bom próximo passo: o desafio relacionado já foi concluído.
        if mulher.get("desafio_relacionado_id") in feitos:
            pontos += 1
            motivo = f"{motivo} · você fez o desafio ligado a ela" if motivo else "Você fez o desafio ligado a ela"

        pontuados.append(((-pontos, posicao), {**mulher, "motivo": motivo or "Pra se inspirar"}))

    pontuados.sort(key=lambda item: item[0])

    return [item for _, item in pontuados]
