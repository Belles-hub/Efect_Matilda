"""Mulheres na Ciência — seção 6 do spec: referências reais, verificáveis,
ligadas a uma área de interesse e a um desafio relacionado, não uma lista
solta de biografias. Dado curado (não gerado por IA); pensado como ponto de
partida pra expandir com mais nomes, inclusive locais, no futuro. Textos
curtos de propósito — direto ao ponto.
"""

MULHERES: list[dict] = [
    {
        "id": "ada-lovelace",
        "nome": "Ada Lovelace",
        "area": "programacao",
        "atuacao": "Matemática, autora do primeiro algoritmo da história.",
        "bio": "No século 19, trabalhou com Babbage na Máquina Analítica e enxergou o que poucos viram: a máquina podia manipular símbolos, não só números.",
        "conquista": "Primeira pessoa a escrever o que hoje chamaríamos de um programa.",
        "desafio_relacionado_id": "programacao-semaforo",
    },
    {
        "id": "grace-hopper",
        "nome": "Grace Hopper",
        "area": "tecnologia",
        "atuacao": "Matemática, almirante e pioneira da programação.",
        "bio": "Ajudou a criar um dos primeiros compiladores — o programa que traduz linguagem humana pra linguagem de máquina.",
        "conquista": "Ajudou a popularizar o termo \"debugging\".",
        "desafio_relacionado_id": "tecnologia-sensor-luz",
    },
    {
        "id": "mayana-zatz",
        "nome": "Mayana Zatz",
        "area": "ciencia",
        "atuacao": "Geneticista brasileira, professora titular da USP.",
        "bio": "Fundou e coordena o Centro de Estudos do Genoma Humano da USP, referência em doenças genéticas no Brasil.",
        "conquista": "Ajudou famílias brasileiras a entender doenças raras de origem genética.",
        "desafio_relacionado_id": "ciencia-densidade-gelo",
    },
    {
        "id": "jaqueline-goes-de-jesus",
        "nome": "Jaqueline Goes de Jesus",
        "area": "ciencia_de_dados",
        "atuacao": "Bióloga brasileira, bioinformata e virologista.",
        "bio": "Liderou o sequenciamento do genoma do primeiro caso de covid-19 no Brasil, em 2020.",
        "conquista": "Trabalho decisivo no monitoramento científico da pandemia.",
        "desafio_relacionado_id": "dados-temperatura",
    },
    {
        "id": "suzana-herculano-houzel",
        "nome": "Suzana Herculano-Houzel",
        "area": "experimentos",
        "atuacao": "Neurocientista brasileira, professora na Vanderbilt (EUA).",
        "bio": "Criou um método pra contar neurônios de um cérebro de forma direta — mudou o que se sabia sobre o cérebro humano.",
        "conquista": "Referência mundial em neurociência comparada.",
        "desafio_relacionado_id": "experimentos-torre-liquidos",
    },
    {
        "id": "fei-fei-li",
        "nome": "Fei-Fei Li",
        "area": "inteligencia_artificial",
        "atuacao": "Cientista da computação, professora em Stanford.",
        "bio": "Criou o ImageNet, banco de imagens que treinou sistemas a reconhecer fotos — peça-chave da IA moderna.",
        "conquista": "Voz importante por uma IA mais humana e responsável.",
        "desafio_relacionado_id": "ia-padroes",
    },
    {
        "id": "jane-goodall",
        "nome": "Jane Goodall",
        "area": "meio_ambiente",
        "atuacao": "Primatóloga britânica, referência em comportamento animal.",
        "bio": "Décadas observando chimpanzés na Tanzânia — mudou o que a ciência sabia sobre eles.",
        "conquista": "Fundou um instituto que une pesquisa e conservação ambiental.",
        "desafio_relacionado_id": "meio-ambiente-agua",
    },
    {
        "id": "parisa-tabriz",
        "nome": "Parisa Tabriz",
        "area": "ciberseguranca",
        "atuacao": "Engenheira de segurança, diretora no Google.",
        "bio": "Liderou a segurança do Chrome — pensar como um invasor pra proteger antes do ataque.",
        "conquista": "Referência em usar segurança ofensiva para defesa.",
        "desafio_relacionado_id": "ciberseguranca-senha",
    },
]

MULHERES_POR_ID: dict[str, dict] = {mulher["id"]: mulher for mulher in MULHERES}
