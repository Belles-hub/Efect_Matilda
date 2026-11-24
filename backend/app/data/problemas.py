"""Problemas da Comunidade — seção 10 do spec: temas concretos do entorno
que podem virar o ponto de partida de um projeto no Criador de Projetos.
Dado curado (não gerado por IA). Textos curtos de propósito.
"""

PROBLEMAS: list[dict] = [
    {
        "id": "agua",
        "titulo": "Água",
        "descricao": "Torneira pingando, mangueira aberta, chuveiro ligado à toa — o desperdício costuma estar à vista, só falta medir.",
        "tema": "agua",
        "perguntas_norteadoras": [
            "Onde você observa desperdício de água de verdade (não só supõe)?",
            "Que pergunta investigável dá pra fazer a partir disso?",
            "Como coletar dados sem equipamento especial?",
        ],
    },
    {
        "id": "agricultura",
        "titulo": "Agricultura",
        "descricao": "De uma horta escolar a um quintal, plantas reagem a água, luz e solo de formas que dá pra medir.",
        "tema": "agricultura",
        "perguntas_norteadoras": [
            "Existe uma horta ou jardim que você possa observar por semanas?",
            "Que condição (água, luz, solo) você testaria mudando uma coisa de cada vez?",
            "Como mediria o resultado?",
        ],
    },
    {
        "id": "residuos",
        "titulo": "Resíduos",
        "descricao": "Quanto lixo reciclável vira lixo comum só porque ninguém separou?",
        "tema": "residuos",
        "perguntas_norteadoras": [
            "Onde você pode observar como o lixo é (ou não) separado?",
            "Que pergunta dá pra investigar sobre esse volume?",
            "Que mudança simples você testaria?",
        ],
    },
    {
        "id": "clima",
        "titulo": "Clima",
        "descricao": "Dias mais quentes, chuva fora de época, calor em bairros sem árvore — clima local também é dado científico.",
        "tema": "clima",
        "perguntas_norteadoras": [
            "Que mudança de clima você percebe no seu bairro?",
            "Que dado você acompanharia (temperatura, chuva, arborização)?",
            "Que fonte confiável existe pra comparar (INMET, prefeitura)?",
        ],
    },
    {
        "id": "educacao",
        "titulo": "Educação",
        "descricao": "Como as pessoas estudam e aprendem também é assunto de investigação.",
        "tema": "educacao",
        "perguntas_norteadoras": [
            "Que dificuldade de estudar você observa em você ou colegas?",
            "Que pergunta dá pra montar a partir disso?",
            "Como coletar dados sem invadir a privacidade de ninguém?",
        ],
    },
    {
        "id": "inclusao_digital",
        "titulo": "Inclusão Digital",
        "descricao": "Nem todo mundo tem o mesmo acesso a internet ou computador.",
        "tema": "inclusao_digital",
        "perguntas_norteadoras": [
            "Que diferença de acesso à tecnologia você percebe ao redor?",
            "Que pergunta dá pra investigar sobre isso, com respeito?",
            "Que solução simples reduziria essa diferença?",
        ],
    },
    {
        "id": "seguranca",
        "titulo": "Segurança",
        "descricao": "De senha fraca a rua mal iluminada — segurança se investiga com dados, não só medo.",
        "tema": "seguranca",
        "perguntas_norteadoras": [
            "Que situação de (in)segurança você poderia observar?",
            "Que dado objetivo você coletaria sobre isso?",
            "Que solução testaria primeiro, em pequena escala?",
        ],
    },
    {
        "id": "meio_ambiente",
        "titulo": "Meio Ambiente",
        "descricao": "Árvore cortada, praça largada, poluição visível — o entorno está cheio de perguntas esperando.",
        "tema": "meio_ambiente",
        "perguntas_norteadoras": [
            "Que mudança ambiental você observa onde vive?",
            "Que pergunta nasce dessa observação?",
            "Que dado simples você coletaria por algumas semanas?",
        ],
    },
]

PROBLEMAS_POR_ID: dict[str, dict] = {problema["id"]: problema for problema in PROBLEMAS}
