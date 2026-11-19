import type { Campaign, CampaignGuide, Difficulty, NoteTab } from '../types/rpg';

export const GM_CORE_RULES = `Atue como um Mestre de RPG de mesa experiente, narrativo, tático e implacável. Estamos jogando uma campanha solo em turnos em Português (BR), onde o usuário interpreta o protagonista e você narra o mundo, os NPCs, os perigos e as consequências das escolhas.

### FLUXO DE INÍCIO (PARA NOVAS CAMPANHAS)
1. Definição do Universo: NÃO crie raças, classes, ficha ou história antes de saber o estilo do universo (a menos que o contexto da campanha já esteja definido no histórico). Se o universo ainda não foi definido, dê boas-vindas curtas e pergunte qual estilo de universo e ambientação o jogador quer explorar.
2. Criação Sob Medida: Assim que o jogador definir o universo, apresente:
   - 5 Raças adequadas ao cenário (cada uma com traços únicos, sentidos especiais e 1 fraqueza natural clara).
   - 5 Classes adequadas ao cenário (cada uma com equipamento inicial, 2 Perícias Treinadas que concedem +1 adicional e 1 Habilidade Especial de Classe com usos limitados por descanso).
   - O pedido da ficha: NÃO escreva modelo de ficha em texto. Ao final dessa mensagem, em uma linha própria, escreva exatamente a marca [[FICHA]]. O jogo mostra ao jogador um formulário para preencher nome, raça, classe, atributos (+2, +1, 0, -1), perícias, habilidade, companheiro e equipamentos (com preenchimento automático) e envia a ficha pronta como a próxima mensagem dele, que começa com "FICHA DO PERSONAGEM".
3. Início da Aventura: Somente após o jogador enviar a ficha preenchida (ou quando uma campanha já estiver em andamento), narre um gancho imersivo colocando-o em uma situação concreta ou inesperada.

---

### SISTEMA DE REGRAS E MECÂNICAS OBRIGATÓRIAS

#### 1. Atributos e Penalidades Reais (Sem Bônus Automáticos)
- 4 Atributos Base com distribuição fixa na criação (+2, +1, 0 e -1):
  - Potência: Força física, vigor, combate corpo a corpo, escalada pesada, resistir a ferimentos e venenos.
  - Agilidade: Destreza, pontaria, esquiva, furtividade, reflexos e trabalho manual fino.
  - Percepção: Instinto, sobrevivência, rastreamento, notar emboscadas, ler intenções de NPCs, achar recursos e pontos fracos.
  - Engenho: Intelecto, fabricação (crafting), alquimia, conhecimento de criaturas, tática e persuasão.
- Penalidades Situacionais (-1 a -3): Aplique redutores rigorosos sempre que o protagonista agir no escuro sem luz, trabalhar sem ferramentas adequadas, lutar ferido, carregar excesso de peso, estar exausto/com fome ou tentar ações apressadas sob pressão.

#### 2. Rolagens Frequentes e Escala Rígida de D20
- O jogador rola os próprios dados, em um cartão de rolagem do jogo: NUNCA role dados pelo jogador. Sempre que uma ação envolver risco, técnica, coleta, fabricação, furtividade, persuasão ou combate, peça o teste usando a MARCA DE ROLAGEM (descrita na seção "PEDIDOS DE ROLAGEM" mais abaixo) e aguarde a resposta.
- Frequência Alta: Exija rolagens inclusive em etapas preparatórias (coletar materiais sem estragá-los, montar itens na bancada, camuflar armadilhas, perceber mentiras).
- Tabela de Consequências (Total do Dado + Modificadores):
  - 1 Natural (Falha Crítica): Desastre imediato — ferramenta quebra, item destruído irreversivelmente, corda arrebenta ou contra-ataque pesado.
  - 2 a 8 (Falha / Complicação): Ação falha com custo — materiais estragam, golpe resvala na armadura sem dano ou barulho atrai predadores/guardas.
  - 9 a 13 (Sucesso Parcial / Custoso): Sucesso incompleto ou com preço — leva o dobro do tempo, gasta munição/recursos extras, item fica frágil, deixa rastros ou sofre ferimento leve.
  - 14 a 18 (Sucesso Limpo): Execução precisa conforme planejado.
  - 19+ ou 20 Natural (Sucesso Crítico): Resultado superior — Obra-Prima com bônus, acerto em ponto vital ignorando armadura ou economia de materiais.

#### 3. Combate Tático, Armaduras e Chefes Difíceis
- Inimigos possuem Pontos de Vida (PV), Defesa/Armadura e Moral. Armaduras de metal ou carapaças grossas desviam ataques comuns sem flanqueamento, táticas, juntas de armadura ou armas perfurantes adequadas.
- Tropas organizadas usam formação de escudos, cobertura, tochas contra furtividade, chamam reforços e exploram as fraquezas da ficha. Chefes e capitães exigem estratégia em múltiplos turnos.

#### 4. Mundo Imprevisível e Reviravoltas Negativas
- Inclua reviravoltas orgânicas e perigos surpresa — prisioneiros que mentem, aliados com interesses ocultos, mudanças bruscas de clima, animais agressivos, infecções e inimigos chegando antes do prazo.

#### 5. Sobrevivência, Crafting Detalhado e Ficha Persistente
- Crafting realista exige componentes específicos, ferramentas certas e testes de criação.
- Conceda XP ao final de missões, combates difíceis e descobertas importantes.
- BLOCO DE ESTADO OBRIGATÓRIO ao final de CADA turno narrativo, formatado claramente com:
  - Localização, Clima e Passagem de Tempo / Prazos
  - Estado Físico (PV, Ferimentos, Fome/Cansaço e XP atual)
  - Estado de Equipamentos
  - Atualização de Inventário (itens gastos, quebrados ou coletados — os totais o jogador controla no próprio bloco de notas)
  - Estado de Companheiros / Aliados Próximos

#### 6. Diretrizes de Condução Críticas
- Coerência Absoluta de Nomes e Inventário: Mantenha rigorosamente os mesmos nomes próprios de NPCs, locais e inimigos do início ao fim da campanha, sem nunca repetir nomes entre personagens diferentes. Acompanhe com precisão as quantidades na mochila e suprimentos do jogador (flechas, virotes, água, rações, moedas, materiais) em concordância com o que consta no Bloco de Notas dele.
- Leituras de Rolagem do Jogador: Quando o jogador enviar um resultado de dado (ex.: "[Rolagem: 1D20 (17) + 1 Percepção = 18]" ou apenas o valor natural do dado), confira o bônus aplicável, verifique se houve alguma penalidade situacional (-1 a -3), classifique na Escala Rígida de D20 e narre imediatamente as consequências táticas.
- "Ajuste técnico:": Se a mensagem do jogador começar exatamente com "Ajuste técnico:", apenas absorva e aplique o ajuste solicitado nas regras/campanha para os próximos turnos e responda APENAS com "Ajuste técnico aplicado." sem narrar nada, sem justificar e sem comentar sobre o pedido.
- NÃO dê opções de resposta (ex.: nunca liste "O que você faz? A) ... B) ... C) ..."). Deixe que o próprio jogador pense e tome suas decisões livremente.
- Se o jogador aplicar algum bônus errado ou quebrar as regras, sinalize o erro objetivamente e peça para repetir o movimento.
- O Bloco de Notas e os Dados pertencem exclusivamente ao jogador — você nunca rola dados nem edita as anotações dele.

---

### PERSONALIDADE E ESTILO DE NARRAÇÃO (O TEXTO SERÁ LIDO EM VOZ ALTA)
Você é um mestre de RPG de fantasia medieval experiente, responsável por narrar uma aventura imersiva e dinâmica.
- Narre sempre em português brasileiro, com descrições envolventes, misteriosas e cinematográficas, mas sem excessos.
- Descreva o ambiente, os acontecimentos e as consequências das decisões do jogador. Nunca tome decisões pelo personagem do jogador.
- Diferencie claramente momentos de tranquilidade, suspense, exploração e combate (ritmo calmo e descritivo no primeiro; frases curtas e tensas no combate).
- Use frases naturais, com pontuação adequada para narração em voz alta. Evite listas, tabelas, emojis e markdown dentro da parte narrativa.
- Respeite o estado da campanha, os personagens, o inventário e os acontecimentos anteriores. Não invente alterações nas regras nem nos resultados dos dados.
- Tamanho: seja CONCISO. Em situações normais, a parte NARRATIVA deve ter no máximo 2 ou 3 frases curtas (cerca de 100 a 250 caracteres): vá direto ao que o jogador percebe e às consequências da ação, sem floreios nem repetir o que já foi dito. Só em momentos realmente importantes (revelações, chefes, mortes, grandes decisões) use até cerca de 450 caracteres.
### PEDIDOS DE ROLAGEM (CARTÃO NO JOGO)
Quando precisar de um teste, NÃO escreva a instrução no texto (nunca escreva frases como "Role 1D20 + Agilidade"). Em vez disso, ao final da narração, em uma linha própria e ANTES do bloco de estado, escreva exatamente uma marca neste formato (o jogo a transforma em um cartão com botão de rolar):
[[ROLAGEM|dado|atributo|ajuste|modo|motivo]]
- dado: 1D20 (padrão) ou outro, como 1D4 ou 2D6.
- atributo: Potência, Agilidade, Percepção, Engenho ou nenhum. O jogo soma sozinho o bônus que está na ficha do jogador: NÃO escreva o valor do bônus.
- ajuste: número inteiro de -3 a 3 para penalidade ou bônus situacional (0 se não houver).
- modo: normal, vantagem ou desvantagem.
- motivo: frase curta (até 12 palavras) dizendo o que o teste decide.
Exemplo: [[ROLAGEM|1D20|Agilidade|-1|normal|Agarrar a machadinha antes que o lobo ataque]]
Regras: no máximo UMA marca por resposta. Depois de pedir a rolagem, PARE: não narre o desfecho nem escreva o bloco de estado como se o teste já tivesse ocorrido; aguarde o resultado, que chegará como "[Rolagem: ... = total]". Nunca peça rolagem em resposta a "Ajuste técnico:".

- Estrutura do turno: primeiro a narração (prosa corrida); depois, se precisar de teste, a marca de rolagem; depois, separado por uma linha "---", o BLOCO DE ESTADO obrigatório. O limite de tamanho acima vale só para a narração, não para o bloco de estado. Os fluxos de criação de ficha/raças/classes continuam podendo ser longos e estruturados.`;

const HASHID_NOTES: NoteTab[] = [
  {
    id: 'tab-ficha',
    title: 'Ficha & Status',
    content: `# Ficha de Personagem

* Nome: Hashid
* Raça: Fennekin
* Classe: Rastreador das Areias
* Origem / Histórico Curto: Sou de um clã coletor do Oásis da Ravina, um oásis que surgiu de uma cachoeira dentro de uma ravina gigantesca que corta o deserto por quilômetros e com a proteção das cavernas a vegetação e a vida conseguiu prosperar mesmo nos dias mais quentes, meu trabalho era explorar entre as cavernas e a vegetação nativa por recursos úteis para meu povo além é claro das noites e dias explorando as dunas em busca de recursos que não encontrávamos na ravina.
* Título & Posição: Batedor Oficial do Oásis da Ravina (membro de confiança máxima do conselho de guerra do oásis)

## Estado Atual
* Pontos de Vida (PV Máximos): 9/9
* Defesa Base: 0
* XP Atual: 365
* Ferimentos: Formigamento leve nas patas dianteiras e cortes antigos cicatrizando sob ataduras (sem penalidades mecânicas)
* Fome/Cansaço: Alimentado e hidratado (sem penalidades)
* Artox: Recuperando-se bem na enfermaria (faltam ~2 dias para voltar a voar)

## Atributos Base
* Potência: -1
* Agilidade: +3
* Percepção: +1
* Engenho: 0

## Detalhes Relevantes
* Sofro -2 em Percepção e Pontaria sob o brilho intenso do sol do meio-dia se não usar óculos de fenda ou véu protetor.
* Sentido Especial: Audição Hipersensível e Visão Noturna — Enxergo perfeitamente na penumbra noturna e ouço emboscadas ou mudanças no vento muito antes de outros povos.
* Cada atadura usada em um descanso curto (ou logo após um combate) estanca sangramentos, impede que o ferimento infeccione no calor do deserto e recupera 1D4 + 1 PV.

## Perícias & Habilidade
* Rastreamento & Navegação (Percepção +1):
  - Seguir pegadas na areia, cascalho ou rocha e descobrir quantos alvos passaram, o peso deles e há quanto tempo.
  - Orientar-se pelas dunas, ventos e estrelas para não se perder nem cair em areia movediça.
  - Notar emboscadas, trilhas ocultas e armadilhas naturais antes de pisar nelas.
* Adestramento & Sobrevivência (Percepção +1):
  - Dar comandos complexos a Artox sob pressão (reconhecimento durante tempestade, distrair um inimigo armado ou sinalizar perigos específicos).
  - Lidar com animais selvagens ou montarias do deserto (camelos, lagartos de carga, feras territoriais).
  - Encontrar água oculta no subsolo, erguer abrigo contra tempestades de areia, coletar materiais/ervas sem estragá-los e montar acampamento seguro.
* Vínculo de Caça (1/2 usos disponíveis):
  - Coordena um ataque ou manobra sincronizada com seu companheiro animal contra o mesmo alvo, ignorando cobertura parcial ou abrindo brecha na defesa inimiga.

## Companheiro Animal
* Nome e Espécie: Artox / falcão-das-dunas
* Função Tática / Habilidade Natural: Reconhecimento aéreo.
* Em áreas com alguma vida silvestre, Artox caça pequenos lagartos, escorpiões e insetos por conta própria durante os voos. Porém, em travessias de areia morta sem caça, ele precisa que você compartilhe meia porção de comida e água por dia para não perder fôlego.`,
  },
  {
    id: 'tab-equipados',
    title: 'Equipados & Moedas',
    content: `# Dinheiro (Bolsa de Veludo)
* 35x Moedas de Ouro (pesadas e recém-cunhadas, vindas do baú da tenda de comando e do cinto de Varek)
* 125x Moedas de Prata (a maior pilha, reunida entre o baú de comando, o oficial e os guardas)
* 70x Moedas de Cobre (moedas de circulação comum das patrulhas)

# Equipados
* 1x Máscara de Latão com Lentes de Mica Fumê (no pescoço / ao equipar: -1 de percepção na visão lateral)
* 1x Insígnia de Prata de Batedor do Oásis (presa na capa térmica)
* 1x Adaga de Oficial com Cabo de Latão (perfura 1 ponto de armadura leve/média em ataques precisos)
* Par de Adagas Curvas de Caça com Bainhas Duplas Silenciosas
* Besta de Repetição Compacta
* 6x Virotes Leves
* Arco curto composto de chifre
* Aljava de couro simples (cabe 15 flechas)
* 15x Flechas de caça intactas (aljava)
* 3x Flechas perfurantes de aço temperado (suporte lateral da mochila) [ignoram 1 ponto de Defesa de armadura; -1 em disparos de longuíssima distância]
* 8x Flechas de caça intactas reserva guardadas na mochila
* Capa térmica de lã e linho (protege contra sol e frio noturno)
* Mochila de Couro Leve
* Cajado Entalhado com Anéis de Cobre
* Túnica Ocre e Carmesim de Bruxo`,
  },
  {
    id: 'tab-inventario',
    title: 'Inventário & Suprimentos',
    content: `# Inventário
* Kit de rastreamento
* Luneta de Latão com lentes escuras fumê (+1 em Percepção à distância sob sol forte, anulando ofuscamento e sem refletir o brilho do sol)
* 1x Luneta Telescópica de Latão com Lentes de Cristal (+2 em Percepção/Rastreamento à longa distância em luz normal, penumbra ou noite)
* 1x Bolsa com Pó Arcano Roxo (meia carga do catalisador instável usado na sabotagem — inflamável se exposto a faíscas)
* 1x Rolo de Corda de Cânhamo (10m)
* 2x Faixas largas de pano ocre e carmesim
* 1x Pederneira com Aço
* 1x Frasco Pequeno de Óleo Lubrificante

# Coletas da Expedição
* (vazio — adicione aqui seus novos achados)

# Suprimentos
* 4x Ataduras de ervas secas
* 2,5x Litros de água no Cantil de Couro
* 2x Litros de água no Cantil reserva
* 11x Porções de Rações Secas de Viagem (3 porções diárias)
* 2x Bulbos de Raiz-de-Água (purifica água e ajuda contra febre/insolação / Mastigar um bulbo recupera +1 PV imediato, equivale a 1 litro de água e garante resistência contra a exaustão pelo calor durante as próximas horas sob o sol do deserto)
* 2x Doses de Tintura Coagulante Forte (estanca sangramentos severos na hora e restaura +3 PV por dose aplicada)
* 2x Doses de Pomada Antisséptica e Analgésica (previne infecções de cortes ou queimaduras no deserto e suprime penalidades leves de dor por algumas horas)
* 1x Frasco de Unguento Mineral (usado para proteger a pele contra o ressecamento extremo do sol)
* 1x Frasco de Tônico Revitalizante do Sindicato (1 dose — +3 PV e remove fadiga)
* 1x Frasco de coagulante básico do Sindicato (1 dose — +2 PV e estanca sangramento)`,
  },
  {
    id: 'tab-missoes',
    title: 'Missões & História',
    content: `# Missões e Prazos
## Expedição Diplomática pelo Túnel da Cisterna
Viagem subterrânea de < 0,5 dia até o Clã de Pedra-Alta com Zuri e 2 batedores do oásis (pedidos de Bram para trazer de lá: Arnês de Escalada e Picareta Curta de Bram + 1x Pote Selado de Resina de Rocha-Negra).

## Prazo Inimigo
A expedição de 12 mercenários, 6 sapadores, 2 carroças e os Bruxos das Areias Sardis e Nadir parte do Poço de Pedra-Cinza em 3 dias (levando 1,5 dia de marcha até aqui — ou seja, cerca de 4 dias e meio até o ataque direto ao oásis, a menos que você intercepte ou sabote a força antes).

## Aliança com Pedra-Alta
Zuri ou Bram podem usar o túnel oculto da cisterna ao amanhecer para buscar reforços do Clã de Pedra-Alta, enquanto o outro permanece ajudando a fortificar e armadilhar as galerias subterrâneas do oásis.

# Inteligência e Segredos
* A Chave de Latão Gravada com o Selo da Hidra: Abre o cofre de carga blindado instalado na carroça principal de suprimentos no Poço de Pedra-Cinza. É lá dentro que ficam trancadas as cargas principais de Pó Arcano Roxo e os cilindros detonadores de escavação que os sapadores pretendem usar para abrir a rocha sobre o veio subterrâneo do oásis. Sem essa chave, nem os guardas do acampamento conseguem abrir o cofre sem arrombá-lo na forja.
* A Composição da Expedição (partida em 3 dias): Khar-Vesh está com tropas espalhadas em outras frentes. A força reunida no Poço de Pedra-Cinza (um dia e meio de marcha a nordeste) conta com 12 mercenários de escolta (besteiros e lanceiros), 6 sapadores com ferramentas pesadas de mineração, 2 carroças de carga e 2 Bruxos das Areias — o veterano Sardis e seu acólito Nadir.
* Como os Bruxos das Areias Lutam — e sua Fraqueza: Segundo Varek, Sardis e Nadir canalizam o Pó Arcano Roxo através de cajados com anéis ressonantes de metal (exatamente como o cajado entalhado que você carrega) para erguer paredes de areia cegante e disparar ondas de choque capazes de rachar pedra e derrubar defensores. Porém, eles precisam manter concentração imóvel e ambas as mãos no cajado para moldar os selos no ar — e carregam bolsas abertas de pó catalisador no cinto, o que os torna vulneráveis a disparos rápidos à distância e os impede de usar chamas abertas perto do próprio corpo.
* O Prazo de Silêncio: O alto comando só espera um sinal de fumaça verde da Garganta de Sal Seco caso haja atraso no abastecimento. Como a garganta foi limpa sem sobreviventes, o Poço de Pedra-Cinza provavelmente não enviará ninguém antes da marcha marcada para daqui a três dias — ou, no máximo, apenas uma dupla leve de reconhecimento na véspera.
* O Segredo Sob a Ravina: Segundo Zuri, os antigos mapas de mineração do Clã de Pedra-Alta registram uma rede natural de galerias de calcário logo abaixo do desfiladeiro sul do oásis — um lugar que o povo das montanhas chama de Câmara da Veia Azul. É ali que os cristais ressonantes subterrâneos mantêm a pressão da nascente que alimenta todo o Oásis da Ravina.
* O Verdadeiro Risco do Pó Arcano: Bram inclina-se para a frente com expressão grave: Varek queria desenhar os pontos mais finos do teto da caverna. Se aqueles Bruxos das Areias detonarem Pó Arcano Roxo sobre a falha sul para arrancar os cristais à força, a onda de choque vai rachar o leito de calcário e drenar toda a água do oásis para o abismo em poucas horas.
* A Passagem Oculta para Pedra-Alta: Existe um antigo túnel de manutenção selado há gerações que liga a cisterna inferior deste oásis às trilhas baixas das montanhas do Clã de Pedra-Alta, a menos de meio dia de marcha rápida pelo subsolo — totalmente invisível para qualquer patrulha de Khar-Vesh no deserto.

# Forja de Borin (Receitas Prometidas)
Se trouxer materiais de fora da ravina para Borin:
1. Pentes de Troca Rápida e Virotes Especiais (com tendões curados e latão fino): carregadores reservas para a Besta de Repetição Compacta + virotes assobiadores ou incendiários.
2. Lâminas Temperadas ao Salitre (com sal-gema puro e aço de Khar-Vesh): reforja as Adagas Curvas de Caça para rasgar couro grosso e frestas de armadura.
3. Arpéu Retrátil Silencioso e Cargas de Fumaça (com ferramentas finas e cristais de salitre): gancho encapado em couro e cartuchos de fumaça densa.`,
  },
  {
    id: 'tab-lore',
    title: 'Raças & Diário',
    content: `# Raças do Universo

## Fennekin (Raposino Nômade das Tempestades)
* Traços: Criaturas ágeis de pelagem cor de duna e orelhas grandes, pertencentes a clãs coletores e mensageiros. Movem-se sem afundar na areia fofa e têm facilidade para escalar e esquivar.
* Sentido Especial: Audição Hipersensível e Visão Noturna — Enxergam perfeitamente na penumbra noturna e ouvem emboscadas ou mudanças no vento muito antes de outros povos.
* Fraqueza Natural: Estrutura física frágil (-2 PV máximos iniciais) e sentidos sensíveis — sofrem -2 em Percepção e Pontaria sob o brilho intenso do sol do meio-dia se não usarem óculos de fenda ou véu protetor.

## Humano dos Oásis (Mercador e Artífice das Rotas)
* Traços: Adaptáveis e pragmáticos, dominam o comércio, a navegação pelas estrelas e o manuseio de tecnologias não mágicas da região. Recebem +1 em testes para negociar, barganhar ou operar mecanismos complexos.
* Sentido Especial: Olho Avaliador — Identifica rapidamente mercadorias falsificadas, armadilhas mecânicas comuns e pontos de desgaste em equipamentos.
* Fraqueza Natural: Nenhuma resistência inata a magia ou temperaturas extremas; sofre penalidades normais de desidratação e insolação se viajar sem proteção térmica e água abundante.

## Zarrak (Reptiliano de Escama-Cobre dos Cânions)
* Traços: Nômades tribais de sangue frio e pele couraçada que habitam desfiladeiros rochosos e planícies de sal. Possuem escamas naturais que concedem +1 de Defesa base e facilidade para se camuflar entre rochas e areia.
* Sentido Especial: Percepção Sísmica e Olfato de Água — Sentem vibrações de passos pesados na areia/rocha a média distância e farejam umidade oculta no subsolo.
* Fraqueza Natural: Sangue Frio — Durante as noites geladas do deserto ou dentro de ruínas subterrâneas úmidas e frias, sofrem -2 em Agilidade e Potência se não estiverem próximos a uma fonte ativa de calor.

## Qalid (Forjado-de-Areia das Ruínas Antigas)
* Traços: Construtos humanoides feitos de arenito encantado, juntas de bronze e um núcleo arcano ancestral que ainda pulsa no peito. Não precisam comer, beber água ou dormir, e são imunes a venenos e doenças comuns.
* Sentido Especial: Ressonância Arcana — Detectam a presença de magia ativa, maldições, espíritos ou relíquias encantadas nas proximidades.
* Fraqueza Natural: Pesados e ruidosos (-2 em Furtividade sobre areia solta ou pedra) e não recuperam Pontos de Vida descansando — exigem placas de bronze, argila especial e testes de Engenho para serem reparados.

## Vaelar (Cinzento-das-Cinzas de Sangue Elemental)
* Traços: Descendentes de antigos bruxos do deserto cujo sangue carrega faíscas de fogo e vento elementais. São resistentes ao calor extremo e podem gerar pequenas chamas ou brisas secas com um estalar de dedos.
* Sentido Especial: Visão Astral — Enxergam através de miragens, ilusões mágicas e conseguem notar espíritos invisíveis no plano físico.
* Fraqueza Natural: Sede Arcana — Seu calor interno consome o dobro de reservas hídricas; consomem 2x mais água por dia que qualquer outro mortal e sofrem penalidades severas rapidamente se ficarem sem beber.

---
# Diário de Campanha
Anote aqui pistas, suspeitas, nomes novos e lembretes táticos da sessão.`,
  },
];

export const HASHID_CAMPAIGN: Campaign = {
  id: 'campaign-hashid-oasis',
  title: 'Oásis da Ravina',
  subtitle: 'Hashid · Rastreador das Areias',
  universe: 'Deserto das Ravinas, Sindicato de Khar-Vesh e Pó Arcano Roxo',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  attributes: {
    potencia: -1,
    agilidade: 3,
    percepcao: 1,
    engenho: 0,
  },
  gmContextNotes: `CONTEXTO ATIVO DA CAMPANHA (OÁSIS DA RAVINA):
- Protagonista: Hashid, Fennekin, Rastreador das Areias, Batedor Oficial do Oásis da Ravina (Potência -1, Agilidade +3, Percepção +1, Engenho 0, PV 9/9, Defesa 0, XP 365).
- Companheiro Animal: Artox (falcão-das-dunas), atualmente recuperando-se na enfermaria (~2 dias restantes para voltar a voar).
- Aliados principais no Oásis: Zuri (conhece o antigo túnel oculto da cisterna e os mapas do Clã de Pedra-Alta), Bram (engenheiro/escavador, pediu arnês de escalada, picareta curta e 1 pote selado de Resina de Rocha-Negra em Pedra-Alta), Borin (ferreiro do oásis).
- Ameaça e Prazo: A Garganta de Sal Seco foi limpa sem sobreviventes (com Varek neutralizado/espólio recolhido e Chave de Latão com o Selo da Hidra tomada). No Poço de Pedra-Cinza (1,5 dia de marcha a nordeste), uma expedição inimiga de Khar-Vesh (12 mercenários besteiros e lanceiros, 6 sapadores, 2 carroças, e os Bruxos das Areias Sardis e Nadir) parte em 3 dias — cerca de 4,5 dias até atingir o Oásis da Ravina e tentar detonar Pó Arcano Roxo sobre a Câmara da Veia Azul.
- Itens notáveis com Hashid: Bolsa com meia carga de Pó Arcano Roxo instável (inflamável), Chave de Latão com Selo da Hidra (para o cofre da carroça no Poço de Pedra-Cinza), Cajado Entalhado com Anéis de Cobre e Túnica de Bruxo, Besta de Repetição Compacta (6 virotes), Arco curto composto (15 + 8 flechas de caça, 3 perfurantes de aço temperado), Adaga de Oficial + Par de Adagas Curvas, Luneta fumê e Luneta Telescópica.`,
  messages: [
    {
      id: 'msg-hashid-intro',
      role: 'model',
      createdAt: new Date().toISOString(),
      text: `### O Conselho da Cisterna

A brisa fria que sobe das águas do Oásis da Ravina carrega o cheiro úmido de musgo e calcário — um contraste seco com a poeira de sal e pólvora arcana ainda presa na sua capa térmica. No pátio recuado próximo à cisterna antiga, as tochas tremeluzem contra as paredes talhadas na rocha.

**Zuri** dobra o pergaminho gasto dos antigos túneis de mineração enquanto observa os dois batedores designados para a travessia pelo subsolo até o Clã de Pedra-Alta. Ao lado dela, **Bram** bate a ponta dos dedos na pedra selada da passagem oculta, repassando o pedido do arnês de escalada, da picareta curta e do pote selado de Resina de Rocha-Negra. Mais abaixo, no terraço da forja, o brilho das brasas denuncia que **Borin** ainda trabalha tarde da noite — e na enfermaria escavada na caverna leste, **Artox** descansa sob cuidados até recuperar a força nas asas.

O mapa sobre a mesa resume a conta contra o relógio: se a expedição do Sindicato de Khar-Vesh cumprir a marcha prevista a partir do Poço de Pedra-Cinza, **Sardis**, **Nadir**, os seis sapadores e os doze mercenários estarão sobre a falha sul em cerca de quatro dias e meio. Enquanto o silêncio da Garganta de Sal Seco segura o alarme por enquanto, a decisão de quem cruza a escuridão sob as montanhas ao amanhecer — ou de como aproveitar as próximas horas antes da partida — está sobre seus ombros.

Como você procede a partir daqui, Hashid?

---

**Estado Atual**
* **Localização, Clima e Tempo:** Oásis da Ravina (pátio da cisterna antiga) · Noite amena e seca no cânion · Faltam ~3 dias para a expedição partir do Poço de Pedra-Cinza (~4,5 dias até o ataque ao oásis).
* **Estado Físico:** PV 9/9 · Formigamento leve nas patas dianteiras e cortes cicatrizando (sem penalidades) · Alimentado e hidratado · XP: 365.
* **Equipamentos:** Armas, aljavas, besta (6 virotes), lunetas, cajado e bolsa de Pó Arcano Roxo intactos e prontos.
* **Inventário:** Sem alterações neste início de cena (verifique seu Bloco de Notas para saldos exatos).
* **Companheiros / Aliados:** Artox na enfermaria (~2 dias para voltar a voar); Zuri, Bram e 2 batedores do oásis no pátio; Borin na forja inferior.`,
    },
  ],
  notes: HASHID_NOTES,
  activeNoteId: 'tab-ficha',
  rollHistory: [],
  guide: {
    lastUpdatedAt: new Date().toISOString(),
    currentQuests: [
      {
        title: 'Expedição Diplomática pelo Túnel da Cisterna',
        location: 'Clã de Pedra-Alta (via passagem oculta na cisterna)',
        deadline: '< 0,5 dia de viagem subterrânea ao amanhecer',
        summary:
          'Atravessar o túnel antigo com Zuri e 2 batedores para pedir reforços (guerreiros e atiradores das montanhas) e trazer os itens de Bram: Arnês de Escalada, Picareta Curta e 1 Pote Selado de Resina de Rocha-Negra.',
      },
      {
        title: 'Conter a Expedição do Sindicato de Khar-Vesh',
        location: 'Poço de Pedra-Cinza (1,5 dia a nordeste) -> Oásis da Ravina',
        deadline: 'Partem em 3 dias (~4,5 dias até o ataque ao oásis)',
        summary:
          'Impedir que 12 mercenários, 6 sapadores, 2 carroças e os Bruxos das Areias Sardis e Nadir detonem Pó Arcano Roxo sobre a Câmara da Veia Azul e drenem a água do oásis. Garganta de Sal Seco está limpa, mantendo o prazo de silêncio por ora.',
      },
    ],
    knownLocations: [
      {
        name: 'Oásis da Ravina',
        distanceOrDirection: 'Base atual (cachoeira dentro do cânion)',
        resources: 'Água doce, vegetação nativa de cavernas, ervas medicinais e forja de Borin',
        notes: 'Cercado por cavernas que protegem do calor extremo. Abriga o Conselho, a enfermaria (Artox) e o acesso à cisterna antiga.',
      },
      {
        name: 'Câmara da Veia Azul',
        distanceOrDirection: 'Subsolo logo abaixo do desfiladeiro sul do oásis',
        resources: 'Cristais ressonantes subterrâneos',
        notes: 'Mantém a pressão da nascente do oásis. Se Pó Arcano Roxo detonar no teto da falha sul, o calcário racha e drena o oásis inteiro em poucas horas.',
      },
      {
        name: 'Passagem Oculta para Pedra-Alta',
        distanceOrDirection: 'Parede dos fundos do pátio da cisterna (< 0,5 dia de marcha subterrânea)',
        resources: 'Acesso seguro e invisível para patrulhas de superfície',
        notes: 'Antigo túnel de manutenção selado há gerações ligando o oásis às trilhas baixas das montanhas de Pedra-Alta.',
      },
      {
        name: 'Garganta de Sal Seco',
        distanceOrDirection: 'Rota intermediária antes do Poço de Pedra-Cinza',
        resources: 'Sal-gema e passagem estratégica',
        notes: 'Posto avançado limpo sem sobreviventes; o alto comando não espera sinal verde a menos que haja atraso.',
      },
      {
        name: 'Poço de Pedra-Cinza',
        distanceOrDirection: '1,5 dia de marcha a nordeste',
        resources: 'Cofre blindado com cargas principais de Pó Arcano Roxo e cilindros detonadores',
        notes: 'Base da expedição inimiga (12 mercenários, 6 sapadores, 2 carroças, Sardis e Nadir). Cofre abre com a Chave de Latão (Selo da Hidra).',
      },
    ],
    racesAndCreatures: [
      {
        name: 'Fennekin (Raposino Nômade)',
        bonuses: 'Não afunda na areia fofa; facilidade para escalar e esquivar; Audição Hipersensível e Visão Noturna.',
        weaknesses: '-2 PV máximos iniciais; sofre -2 em Percepção e Pontaria sob sol intenso do meio-dia sem óculos de fenda ou véu.',
      },
      {
        name: 'Humano dos Oásis',
        bonuses: '+1 para negociar, barganhar ou operar mecanismos; Olho Avaliador (nota falsificações, armadilhas mecânicas e desgaste).',
        weaknesses: 'Sem resistência mágica ou térmica inata; sofre penalidades normais de calor e desidratação.',
      },
      {
        name: 'Zarrak (Reptiliano Escama-Cobre)',
        bonuses: '+1 Defesa base (escamas); camuflagem entre rochas/areia; Percepção Sísmica e Olfato de Água.',
        weaknesses: 'Sangue Frio: durante noites geladas ou ruínas frias/úmidas sem calor ativo, sofre -2 em Agilidade e Potência.',
      },
      {
        name: 'Qalid (Forjado-de-Areia)',
        bonuses: 'Não come, não bebe e não dorme; imune a venenos/doenças; Ressonância Arcana (detecta magia, maldições e relíquias).',
        weaknesses: '-2 em Furtividade (pesado/ruidoso); não recupera PV descansando — exige placas de bronze, argila especial e teste de Engenho.',
      },
      {
        name: 'Vaelar (Sangue Elemental)',
        bonuses: 'Resistente ao calor extremo; gera pequenas chamas/brisas; Visão Astral (enxerga através de miragens, ilusões e espíritos).',
        weaknesses: 'Sede Arcana: consome 2x mais água por dia e sofre penalidades severas rapidamente se ficar sem beber.',
      },
      {
        name: 'Bruxos das Areias (Sardis & Nadir)',
        bonuses: 'Canalizam Pó Arcano Roxo em cajados com anéis metálicos para erguer paredes de areia cegante e disparar ondas de choque.',
        weaknesses: 'Precisam de concentração imóvel com as duas mãos no cajado; carregam bolsas abertas de pó inflamável no cinto (vulneráveis a disparos rápidos e fogo).',
      },
    ],
    remediesAndItems: [
      {
        name: 'Atadura de Ervas Secas',
        effect: 'Estanca sangramentos, impede infecção no calor do deserto e recupera 1D4 + 1 PV.',
        usageOrSource: 'Usar em descanso curto ou logo após combate.',
      },
      {
        name: 'Bulbo de Raiz-de-Água',
        effect: 'Purifica água, ajuda contra febre/insolação; mastigar recupera +1 PV imediato, equivale a 1L de água e dá resistência ao calor por horas.',
        usageOrSource: 'Uso imediato em travessias sob sol forte.',
      },
      {
        name: 'Tintura Coagulante Forte',
        effect: 'Estanca sangramentos severos na hora e restaura +3 PV por dose.',
        usageOrSource: 'Emergência em combate ou ferimento grave.',
      },
      {
        name: 'Pomada Antisséptica e Analgésica',
        effect: 'Previne infecções de cortes/queimaduras no deserto e suprime penalidades leves de dor por algumas horas.',
        usageOrSource: 'Aplicação tópica pós-ferimento.',
      },
      {
        name: 'Unguento Mineral',
        effect: 'Protege a pele contra o ressecamento extremo do sol.',
        usageOrSource: 'Aplicar antes de marchas diurnas.',
      },
      {
        name: 'Tônico Revitalizante do Sindicato',
        effect: 'Restaura +3 PV e remove fadiga (1 dose).',
        usageOrSource: 'Espólio do Sindicato.',
      },
      {
        name: 'Coagulante Básico do Sindicato',
        effect: 'Restaura +2 PV e estanca sangramento (1 dose).',
        usageOrSource: 'Espólio do Sindicato.',
      },
      {
        name: 'Chave de Latão (Selo da Hidra)',
        effect: 'Abre o cofre blindado instalado na carroça principal de suprimentos no Poço de Pedra-Cinza.',
        usageOrSource: 'Tomada de Varek na Garganta de Sal Seco.',
      },
      {
        name: 'Pó Arcano Roxo',
        effect: 'Catalisador arcano instável; extremamente inflamável se exposto a faíscas ou chamas.',
        usageOrSource: 'Meia carga na mochila; cargas principais no cofre de Pedra-Cinza.',
      },
      {
        name: 'Receitas da Forja de Borin',
        effect: '1) Pentes rápidos + virotes assobiadores/incendiários (tendões curados + latão fino). 2) Lâminas ao Salitre que rasgam couro/frestas (sal-gema + aço de Khar-Vesh). 3) Arpéu silencioso + cargas de fumaça (ferramentas finas + cristais de salitre).',
        usageOrSource: 'Levar materiais de fora da ravina para Borin forjar.',
      },
    ],
    knownCharacters: [
      {
        name: 'Artox',
        role: 'Falcão-das-dunas (Companheiro)',
        allegiance: 'Aliado fiel',
        notes: 'Em recuperação na enfermaria (~2 dias para voltar a voar). Faz reconhecimento aéreo e distração.',
      },
      {
        name: 'Zuri',
        role: 'Guia / Ligação com Pedra-Alta',
        allegiance: 'Aliada (Oásis da Ravina)',
        notes: 'Conhece os mapas antigos de mineração e a passagem secreta da cisterna até o Clã de Pedra-Alta.',
      },
      {
        name: 'Bram',
        role: 'Engenheiro / Escavador',
        allegiance: 'Aliado (Oásis da Ravina)',
        notes: 'Ajuda a fortificar galerias; pediu Arnês de Escalada, Picareta Curta e Resina de Rocha-Negra.',
      },
      {
        name: 'Borin',
        role: 'Ferreiro Mestre',
        allegiance: 'Aliado (Oásis da Ravina)',
        notes: 'Trabalha na forja do terraço inferior; prometeu melhorias táticas se receber materiais externos.',
      },
      {
        name: 'Varek',
        role: 'Oficial derrotado do Sindicato',
        allegiance: 'Inimigo (neutralizado)',
        notes: 'Portava a Chave da Hidra e revelou detalhes dos planos e fraquezas dos Bruxos das Areias.',
      },
      {
        name: 'Sardis & Nadir',
        role: 'Bruxo das Areias veterano e seu acólito',
        allegiance: 'Inimigos (Sindicato de Khar-Vesh)',
        notes: 'Lideram a expedição no Poço de Pedra-Cinza para explodir a falha sul.',
      },
    ],
  },
};

export const EMPTY_GUIDE: CampaignGuide = {
  currentQuests: [],
  knownLocations: [],
  racesAndCreatures: [],
  remediesAndItems: [],
  knownCharacters: [],
  inventory: [],
};

export function createBlankCampaign(
  title: string,
  attributes = { potencia: 2, agilidade: 1, percepcao: 0, engenho: -1 },
  difficulty: Difficulty = 'medio'
): Campaign {
  const id = `campaign-${Date.now()}`;
  const now = new Date().toISOString();

  const blankNotes: NoteTab[] = [
    {
      id: 'tab-ficha',
      title: 'Ficha & Status',
      content: `# Ficha de Personagem

* Nome:
* Raça:
* Classe:
* Origem / Histórico Curto:

## Estado Atual
* Pontos de Vida (PV):
* Defesa Base: 0
* XP Atual: 0
* Ferimentos: Nenhum
* Fome/Cansaço: Alimentado e hidratado

## Atributos Base (+2, +1, 0, -1)
* Potência: ${attributes.potencia >= 0 ? `+${attributes.potencia}` : attributes.potencia}
* Agilidade: ${attributes.agilidade >= 0 ? `+${attributes.agilidade}` : attributes.agilidade}
* Percepção: ${attributes.percepcao >= 0 ? `+${attributes.percepcao}` : attributes.percepcao}
* Engenho: ${attributes.engenho >= 0 ? `+${attributes.engenho}` : attributes.engenho}

## Perícias & Habilidade Especial
* Perícia 1 (+1):
* Perícia 2 (+1):
* Habilidade de Classe:

## Companheiro / Aliado
* Nome e Descrição:`,
    },
    {
      id: 'tab-inventario',
      title: 'Inventário & Moedas',
      content: `# Dinheiro
* Ouro: 0
* Prata: 0
* Cobre: 0

# Equipados
* 

# Mochila & Suprimentos
* `,
    },
    {
      id: 'tab-missoes',
      title: 'Missões & Mundo',
      content: `# Missões Ativas
* 

# NPCs, Raças e Pistas
* `,
    },
    {
      id: 'tab-diario',
      title: 'Diário Livre',
      content: `# Anotações da Sessão
Use este espaço livremente para rascunhos, cálculos, receitas de crafting e pistas.`,
    },
  ];

  return {
    id,
    title: title.trim() || 'Nova Campanha Solo',
    subtitle: 'Criação de Universo · Turno 0',
    universe: 'A definir pelo jogador',
    difficulty,
    createdAt: now,
    updatedAt: now,
    attributes,
    gmContextNotes: '',
    messages: [
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        createdAt: now,
        text: `Bem-vindo à mesa. Antes de traçarmos raças, classes, ficha ou o primeiro perigo à sua frente, preciso conhecer o mundo onde você quer sobreviver.

**Qual estilo de universo e ambientação você quer explorar nesta campanha?** *(Por exemplo: fantasia medieval sombria, fronteira selvagem e sobrevivência, intriga urbana e guildas, deserto místico, pós-apocalíptico, horror industrial, etc.)*`,
      },
    ],
    notes: blankNotes,
    activeNoteId: 'tab-ficha',
    rollHistory: [],
    guide: { ...EMPTY_GUIDE },
  };
}

/** Campanhas antigas podem não ter o Guia Geral: completa com o guia vazio (ou o do preset Hashid). */
export function hydrateCampaignGuide(camp: Campaign): Campaign {
  if (camp.guide) return camp;
  return {
    ...camp,
    guide: camp.id.includes('hashid') ? HASHID_CAMPAIGN.guide : { ...EMPTY_GUIDE },
  };
}
