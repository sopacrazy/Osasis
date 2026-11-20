# Narrador por voz

O Mestre é lido em voz alta **enquanto o texto aparece**: o texto chega primeiro e o áudio é gerado por trechos
(frases), numa fila, e tocado na ordem. Nada é enviado a APIs pagas.

## Modos (Configurações → Narrador por voz)

| Modo | Precisa de | Custo |
|---|---|---|
| **Chatterbox — voz expressiva local** | o serviço `tts-service/` rodando | zero |
| **Narrador do navegador** | voz pt-BR do sistema/navegador | zero |
| **Somente texto** | nada | zero |

Se o serviço Chatterbox não estiver no ar (ou ainda estiver carregando, ou der erro), o jogo troca sozinho para a
voz do navegador, e se também não houver voz, segue só com texto. O aviso aparece no cabeçalho do chat.

## Como funciona o Chatterbox

1. Chega uma resposta do Mestre → o texto aparece na hora.
2. O jogo corta a narração em trechos (frases; **diálogos entre aspas nunca são cortados**) e identifica o
   **estilo** de cada trecho pelo conteúdo e pelo contexto (o "Estado Atual" do turno anterior diz se há combate):
   normal, suspense, combate, terror, tristeza, épico ou diálogo. Dá para fixar um estilo nas configurações.
3. Cada trecho vai ao serviço (`/api/tts/generate`), que gera o áudio com os parâmetros do estilo.
4. Os áudios tocam na ordem, ficam em cache (IndexedDB no navegador e disco no serviço) e repetir é instantâneo.
5. Se a geração for mais lenta que a fala (CPU), o jogo **espera todos os trechos ficarem prontos** antes de tocar.

O **bloco de estado**, o markdown, as marcas de rolagem/ficha e os "Ajustes técnicos" nunca são lidos.

## Executar o serviço

Veja [`tts-service/README.md`](tts-service/README.md): instalação (Windows/Linux), consumo de memória, velocidade
medida, estilos testados, qualidade da pronúncia, voz do mestre e como usar o site da VPS com o serviço do seu PC.

Resumo: `cd tts-service && .\install.ps1 && .\start.ps1` (Windows) ou `./install.sh && ./start.sh` (Linux).
No servidor Node, `TTS_URL` (padrão `http://127.0.0.1:8808`) aponta para o serviço.

## Economia e limites

- **Limite por narração** (padrão 400 caracteres, 100 a 1200) e "Narrar só cenas importantes" (≥ 300 caracteres).
- O prólogo da campanha tem um limite maior (até 1100 caracteres).
- No servidor Node: `/api/tts/*` exige login, limite de pedidos por minuto (`TTS_RATE_LIMIT_PER_MINUTE`, 90),
  texto máximo por trecho (`TTS_MAX_CHARS`, 600).

## Segurança

- Só usuários logados usam `/api/tts`. O texto vai apenas ao serviço em `TTS_URL`.
- O serviço escuta só em `127.0.0.1`; `TTS_TOKEN` (opcional) exige um cabeçalho em todas as rotas.
