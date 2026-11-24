"""Catálogo de desafios "Experimente" — dado estruturado e curado (seção 4
do spec), não gerado por IA. Cada desafio é uma atividade prática curta que
a estudante pode fazer com o que já tem em casa/escola, seguida de
perguntas de reflexão pra estimular raciocínio científico, não só acerto.
Textos curtos de propósito — direto ao ponto.

Pra adicionar um desafio novo: um novo dict aqui, com um "id" único —
nenhuma outra parte do backend precisa mudar.
"""

DESAFIOS: list[dict] = [
    {
        "id": "ia-padroes",
        "categoria": "inteligencia_artificial",
        "titulo": "Ensine uma IA a reconhecer padrões",
        "descricao": "Crie uma regra que separe exemplos em grupos, do jeito que uma IA faz.",
        "objetivo": "Entender que toda IA de classificação começa com uma regra que separa exemplos.",
        "tempo_estimado_min": 10,
        "nivel": "iniciante",
        "area_cientifica": "Ciência da Computação e IA",
        "instrucoes": [
            "Separe uns 10 objetos pequenos e bem variados e espalhe na mesa (botões, moedas, grãos, clipes, tampinhas...).",
            "Olhe com calma e escolha UMA característica pra separar em 2 grupos: tamanho, cor, forma ou material. Só uma, senão a regra fica confusa.",
            "Faça os 2 grupos e escreva a regra em uma frase, no formato \"vai pro grupo A se ...; senão vai pro grupo B\".",
            "Pegue 3 objetos novos que não estavam na mesa. Sem falar nada, entregue só a sua frase pra outra pessoa e peça pra ela decidir o grupo de cada um.",
            "Compare: ela colocou cada objeto no mesmo grupo que você colocaria? Anote os acertos e os desencontros.",
            "Se houve desencontro, reescreva a regra deixando mais clara e teste de novo com os mesmos 3 objetos.",
        ],
        "materiais": [
            "10 objetos pequenos e variados",
            "Papel e lápis",
            "Uma pessoa para testar sua regra (família, colega)",
        ],
        "dicas": [
            "Regras como \"objeto bonito\" não funcionam: a outra pessoa precisa conseguir decidir sem te perguntar.",
            "Uma IA de verdade faz o mesmo: aprende uma regra a partir de exemplos e depois aplica em casos novos.",
        ],
        "o_que_observar": [
            "Quantos dos 3 objetos novos foram pro grupo certo?",
            "Algum objeto ficou na dúvida? Por quê?",
        ],
        "atividade": "Crie uma regra simples o bastante pra outra pessoa aplicar sem te perguntar nada.",
        "perguntas_reflexao": [
            "A pessoa chegou aos mesmos grupos que você? Por quê?",
            "O que aconteceria com um objeto que não se encaixa na regra?",
        ],
    },
    {
        "id": "programacao-semaforo",
        "categoria": "programacao",
        "titulo": "Programe a lógica de um semáforo",
        "descricao": "Todo programa começa como uma sequência de decisões no papel.",
        "objetivo": "Praticar lógica sequencial: condições, ordem e repetição.",
        "tempo_estimado_min": 15,
        "nivel": "iniciante",
        "area_cientifica": "Ciência da Computação",
        "instrucoes": [
            "Desenhe 3 quadrados no papel: vermelho, amarelo e verde. Eles são os \"estados\" do seu semáforo.",
            "Ao lado de cada cor, escreva por quantos segundos ela fica acesa (ex.: verde 30, amarelo 5, vermelho 30).",
            "Escreva o ciclo em passos numerados: 1) acende verde por 30s; 2) acende amarelo por 5s; 3) acende vermelho por 30s; 4) volta ao passo 1.",
            "Agora acrescente o botão de pedestre com um \"se\": SE o botão foi apertado, ENTÃO termina o verde mais cedo, passa pelo amarelo e fecha pro carro.",
            "\"Execute\" sua sequência em voz alta, como se fosse o computador: siga os passos exatamente como escreveu, sem pular nem adivinhar nada.",
            "Marque com um X o passo em que você travou ou precisou \"adivinhar\" e reescreva esse passo mais claro.",
        ],
        "materiais": [
            "Papel e lápis (ou canetinhas)",
            "Cronômetro do celular (opcional)",
        ],
        "dicas": [
            "Um computador só faz o que está escrito, na ordem escrita. Se um passo está vago, o programa quebra.",
            "Use as palavras SE, ENTÃO e REPITA: elas aparecem em praticamente toda linguagem de programação.",
        ],
        "o_que_observar": [
            "Em qual passo você teve que \"adivinhar\" o que fazer?",
            "O que acontece se o botão for apertado durante o amarelo?",
        ],
        "atividade": "Escreva a lógica completa de um semáforo com botão de pedestre.",
        "perguntas_reflexao": [
            "Qual passo foi mais confuso de escrever? O que isso diz sobre o problema?",
            "O que muda se dois pedestres apertarem o botão ao mesmo tempo?",
        ],
    },
    {
        "id": "ciberseguranca-senha",
        "categoria": "ciberseguranca",
        "titulo": "Teste a força de uma senha",
        "descricao": "Quanto tempo alguém levaria pra quebrar uma senha? Investigue.",
        "objetivo": "Entender por que tamanho e variedade tornam uma senha mais forte.",
        "tempo_estimado_min": 15,
        "nivel": "iniciante",
        "area_cientifica": "Segurança da Informação",
        "instrucoes": [
            "Invente (NÃO use suas senhas reais) 3 senhas de exemplo: uma simples (123456), uma média (gato2024) e uma forte (uma frase longa com símbolos, como Meu-Gato-Voa@Lua!).",
            "Para cada uma, conte o tamanho (quantos caracteres) e quais tipos aparecem: letras minúsculas (26), maiúsculas (26), números (10), símbolos (cerca de 30).",
            "Some os tipos de cada senha. Ex.: \"gato2024\" usa minúsculas + números = 36 opções por posição.",
            "Calcule as combinações: (opções por posição) elevado ao (tamanho). Use a calculadora do celular em modo científico, tecla x^y. Ex.: 36^8.",
            "Monte uma tabelinha com as 3 senhas e o resultado de cada uma. Escreva os números por extenso ou em potência de 10.",
            "Compare: quantas vezes a senha forte tem mais combinações do que a simples?",
        ],
        "materiais": [
            "Papel e lápis",
            "Calculadora do celular (modo científico)",
        ],
        "dicas": [
            "Cada caractere a mais multiplica o número de combinações, por isso o tamanho pesa tanto.",
            "Nunca compartilhe nem escreva senhas reais em atividades ou sites: invente exemplos.",
        ],
        "o_que_observar": [
            "Qual senha tem o maior número de combinações?",
            "Aumentar o tamanho ou misturar mais tipos de caracteres fez mais diferença?",
        ],
        "cuidados": [
            "Use só senhas inventadas para o teste. Nunca as suas de verdade.",
        ],
        "atividade": "Descubra, com números reais, por que \"123456\" é tão fácil de quebrar.",
        "perguntas_reflexao": [
            "O que pesou mais: tamanho ou variedade de caracteres?",
            "O que você mudaria nas suas próprias senhas?",
        ],
    },
    {
        "id": "dados-temperatura",
        "categoria": "ciencia_de_dados",
        "titulo": "Encontre um padrão nos dados do tempo",
        "descricao": "Dados brutos não contam história sozinhos — quem encontra o padrão é você.",
        "objetivo": "Praticar coleta, organização e leitura de dados.",
        "tempo_estimado_min": 20,
        "nivel": "intermediario",
        "area_cientifica": "Ciência de Dados",
        "instrucoes": [
            "Escolha de onde vai tirar a temperatura: um termômetro de casa ou a previsão do tempo da sua cidade. Use SEMPRE a mesma fonte.",
            "Durante 7 dias seguidos, anote a temperatura máxima do dia, sempre no mesmo horário. Anote também se choveu ou fez sol.",
            "Monte uma tabela com 2 colunas: dia da semana e temperatura (e uma terceira, opcional, com o tempo: sol, nublado, chuva).",
            "Desenhe um gráfico de barras: os dias no eixo de baixo e a temperatura no eixo da lateral. Cada barra é um dia. Use papel quadriculado se tiver.",
            "Olhe para as barras e procure um padrão: sobe, desce, se repete? Os dias de chuva ficaram mais frios?",
            "Escreva em uma frase o que os dados contam, começando com \"Nesta semana, a temperatura...\".",
        ],
        "materiais": [
            "Termômetro ou app de previsão do tempo",
            "Papel quadriculado (ou comum) e régua",
            "Lápis e canetinhas",
        ],
        "dicas": [
            "Escala do gráfico: se a menor temperatura foi 24 e a maior 32, comece o eixo em 20 e vá até 35.",
            "Com poucos dias, é difícil ter certeza de um padrão. Cientistas também precisam de muitos dados.",
        ],
        "o_que_observar": [
            "Qual foi o dia mais quente e o mais frio?",
            "A variação de um dia pro outro foi grande ou pequena?",
        ],
        "atividade": "Transforme 7 números soltos em um padrão que conta uma história.",
        "perguntas_reflexao": [
            "O padrão se manteria com mais 7 dias de dados? Por quê?",
            "Que outra informação ajudaria a explicar as variações?",
        ],
    },
    {
        "id": "meio-ambiente-agua",
        "categoria": "meio_ambiente",
        "titulo": "Meça o desperdício de água em um dia",
        "descricao": "Quanta água escorre sem a gente perceber? Meça, não chute.",
        "objetivo": "Coletar dados reais e propor uma hipótese de solução.",
        "tempo_estimado_min": 25,
        "nivel": "iniciante",
        "area_cientifica": "Ciências Ambientais",
        "instrucoes": [
            "Reúna: um copo ou garrafa com medida em mL (ou uma garrafa de 500 mL) e um cronômetro.",
            "Abra a torneira do jeito que você costuma usar para escovar os dentes ou lavar as mãos e coloque o copo embaixo por exatos 60 segundos.",
            "Meça quanto encheu e anote em mL. Se encher antes de 1 minuto, anote o tempo e calcule: mL ÷ segundos × 60.",
            "Converta para litros dividindo por 1000 (ex.: 1500 mL = 1,5 L). Esse é o consumo por minuto.",
            "Estime: se ela ficasse aberta 10 minutos a mais por dia, são 10 × (litros por minuto). Multiplique por 30 para ver o mês.",
            "Escreva uma hipótese de solução, como \"se eu fechar a torneira enquanto ensaboo, vou economizar X litros por dia\", e diga como testaria.",
        ],
        "materiais": [
            "Copo ou garrafa com medida em mL",
            "Cronômetro do celular",
            "Papel e lápis",
        ],
        "dicas": [
            "Reaproveite a água que você mediu: use pra regar uma planta.",
            "Se não tiver copo medidor, use uma garrafa de 500 mL e conte quantas vezes enche em 1 minuto.",
        ],
        "o_que_observar": [
            "O volume foi maior ou menor do que você imaginava?",
            "A pressão da torneira muda o resultado?",
        ],
        "atividade": "Transforme uma torneira comum em um dado real sobre desperdício.",
        "perguntas_reflexao": [
            "O número foi maior ou menor do que você esperava?",
            "Sua solução funcionaria pra todo mundo, ou só pra alguns?",
        ],
    },
    {
        "id": "ciencia-densidade-gelo",
        "categoria": "ciencia",
        "titulo": "Descubra por que o gelo flutua",
        "descricao": "Quase tudo afunda ao virar sólido. A água faz o contrário.",
        "objetivo": "Investigar densidade e formular uma hipótese antes de testar.",
        "tempo_estimado_min": 15,
        "nivel": "iniciante",
        "area_cientifica": "Física e Química",
        "instrucoes": [
            "Antes de começar, escreva sua hipótese: o gelo vai afundar, boiar ou ficar no meio? E por quê?",
            "Encha um copo transparente com água até a metade.",
            "Coloque 2 ou 3 cubos de gelo com cuidado, sem jogar. Observe de lado, na altura do copo.",
            "Desenhe o que você vê: marque com uma linha onde está a superfície da água e quanto do gelo fica acima e abaixo dela.",
            "Espere uns 10 minutos e observe de novo: o que acontece com o nível da água conforme o gelo derrete?",
            "Só depois pesquise o que é densidade e compare com a sua hipótese. Pense: o gelo é mais ou menos denso que a água líquida?",
        ],
        "materiais": [
            "Copo transparente",
            "Água",
            "Cubos de gelo",
            "Papel e lápis",
        ],
        "dicas": [
            "A maior parte do gelo (cerca de 90%) fica submersa e só uma pontinha aparece. Observe isso com atenção.",
            "Quando a água congela, ela ocupa mais espaço. Por isso o gelo é menos denso e boia.",
        ],
        "o_que_observar": [
            "Quanto do gelo ficou acima da água?",
            "O nível da água subiu, desceu ou ficou igual quando o gelo derreteu?",
        ],
        "atividade": "Teste sua própria hipótese antes de buscar a explicação científica.",
        "perguntas_reflexao": [
            "Sua hipótese bateu com o que você observou?",
            "Por que isso importa pra vida em lagos congelados?",
        ],
    },
    {
        "id": "tecnologia-sensor-luz",
        "categoria": "tecnologia",
        "titulo": "Investigue o sensor de luz do celular",
        "descricao": "Seu celular ajusta o brilho sozinho — sensores em tempo real.",
        "objetivo": "Entender como um sensor vira uma decisão automática.",
        "tempo_estimado_min": 15,
        "nivel": "iniciante",
        "area_cientifica": "Engenharia e Sistemas Embarcados",
        "instrucoes": [
            "Nas configurações do celular, ative o brilho automático (também chamado de brilho adaptável) e deixe o brilho manual no meio.",
            "Escolha 3 lugares com luz bem diferente: um claro (perto da janela ou ao ar livre), um médio (sala acesa) e um escuro (quarto com a luz apagada).",
            "Em cada um, deixe a tela ligada uns 5 segundos e observe o brilho. Anote de 1 (bem fraco) a 5 (bem forte).",
            "Teste o sensor: cubra a parte de cima da tela (perto da câmera frontal) com o dedo por alguns segundos e veja se o brilho muda.",
            "Desenhe o caminho em setas: luz do ambiente → sensor mede a luz → o celular compara com o que está programado → a tela muda o brilho.",
            "Escreva em uma frase qual é a \"regra\" que o celular parece seguir (ex.: \"quanto mais luz, mais brilho\").",
        ],
        "materiais": [
            "Um celular com brilho automático",
            "Papel e lápis",
        ],
        "dicas": [
            "O sensor costuma ficar perto da câmera frontal. Se não achar, confira com um dedo cobrindo a parte de cima.",
            "A mudança pode demorar um ou dois segundos. Espere antes de anotar.",
        ],
        "o_que_observar": [
            "Em qual ambiente o brilho foi mais alto e em qual foi mais baixo?",
            "O que aconteceu quando você cobriu o sensor?",
        ],
        "atividade": "Mapeie o caminho do \"sensor perceber luz\" até \"a tela mudar\".",
        "perguntas_reflexao": [
            "Que outro aparelho do seu dia a dia tem um sensor assim?",
            "O que dava errado se o sensor errasse a leitura?",
        ],
    },
    {
        "id": "experimentos-torre-liquidos",
        "categoria": "experimentos",
        "titulo": "Empilhe líquidos sem misturar",
        "descricao": "Mel, água e óleo em camadas separadas — sem parede nenhuma.",
        "objetivo": "Explorar densidade de forma visual, prevendo antes de ver.",
        "tempo_estimado_min": 20,
        "nivel": "intermediario",
        "area_cientifica": "Física",
        "instrucoes": [
            "Escreva sua hipótese: qual será a ordem das camadas, de baixo para cima, com mel, água e óleo? Justifique.",
            "Com um adulto, separe um copo alto e transparente e pingue algumas gotas de corante na água para ela ficar colorida.",
            "Coloque cerca de 3 colheres de mel no fundo, sem deixar escorrer nas paredes do copo.",
            "Incline o copo e despeje a água colorida bem devagar, escorrendo pela parede ou por cima de uma colher. Assim ela não fura o mel.",
            "Do mesmo jeito, despeje o óleo por cima, devagar. Espere uns minutos para as camadas se acalmarem.",
            "Observe de lado, desenhe e pinte as camadas e compare com a sua hipótese. Se quiser, solte uma uva-passa ou uma moeda e veja onde ela para.",
        ],
        "materiais": [
            "Copo alto e transparente",
            "Mel",
            "Água com corante alimentício",
            "Óleo de cozinha",
            "Colher",
            "Um adulto para ajudar",
        ],
        "dicas": [
            "Quanto mais devagar você despejar, mais nítidas ficam as camadas.",
            "Densidade é quanto \"material\" cabe em um espaço. O mais denso afunda e o menos denso fica por cima.",
        ],
        "o_que_observar": [
            "As camadas ficaram separadas ou alguma se misturou?",
            "Onde parou o objeto que você soltou no copo?",
        ],
        "cuidados": [
            "Faça com um adulto e limpe qualquer derramamento, porque óleo e mel deixam o chão escorregadio.",
        ],
        "atividade": "Use densidade pra prever a ordem das camadas antes de ver.",
        "perguntas_reflexao": [
            "Sua hipótese acertou a ordem? O que te fez pensar assim?",
            "O que aconteceria se misturasse tudo com uma colher?",
        ],
    },
]

DESAFIOS_POR_ID: dict[str, dict] = {desafio["id"]: desafio for desafio in DESAFIOS}
