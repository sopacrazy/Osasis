# Serviço de narração — Chatterbox pt-BR

Serviço Python **independente** que transforma o texto das histórias em voz, 100% local (nada é enviado a
terceiros, sem ElevenLabs nem APIs pagas). O jogo (Node) fala com ele por HTTP.

- Modelo: [`ResembleAI/Chatterbox-Multilingual-pt-br`](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-pt-br)
  (finetune de 500 M de parâmetros para português do Brasil, licença MIT) + o código do
  [Chatterbox](https://github.com/resemble-ai/chatterbox) (`chatterbox-tts==0.1.7`).
- O pacote publicado só sabe carregar o multilíngue genérico; por isso `engine.py` monta o modelo "à mão" com os
  pesos pt-BR (T3 `t3_pt_br.safetensors` + S3Gen `s3gen_v3.safetensors`, em `safetensors`, sem `pickle`).
- Modelos carregados **uma vez**, em segundo plano, na inicialização.

> **Aviso do projeto:** o README oficial informa que, a partir de agosto de 2026, o Chatterbox é "retired research"
> e não recebe mais manutenção. O código continua público (MIT). A versão fica fixada no `requirements.txt`.

## Requisitos e consumo (medidos neste projeto)

| Item | Valor |
|---|---|
| Python | 3.11 (versão testada pelo projeto; o 3.13 não é suportado pelas dependências fixadas) |
| Disco | ~3,3 GB de modelos + ~3 GB do ambiente Python |
| **Memória (CPU)** | **~4,3 GB de RAM em uso** (≈6 GB comprometidos) |
| Carga do modelo | 10 a 16 s |
| GPU | usa CUDA automaticamente se existir (`TTS_DEVICE=cuda`). **Não foi possível medir aqui** (o PC de testes tem Radeon, sem CUDA) |
| **Velocidade em CPU** | **4,5 a 6× o tempo da fala** (Ryzen 5 3500X, 6 núcleos): 14,3 s de áudio levaram 76 s |

Onde o tempo vai (frase de 4 s de fala): T3 (gera os "tokens de fala") 13 s, a ~7,4 tokens/s — para tempo real seriam
necessários ~25 tokens/s; S3Gen (decodificador) 4 a 9 s, dependendo dos passos de difusão (`TTS_CFM_STEPS`, padrão 4).
`cfg_weight=0` não acelera. A quantização int8 do T3 não funcionou com o código do modelo.

**Consequência:** em CPU a narração não acompanha a leitura. O jogo mostra o texto na hora, gera a voz em trechos e
**toca quando todos os trechos estão prontos** (sem "picotar"); os áudios ficam em cache e repetir é instantâneo.
Para voz em tempo real é preciso uma placa NVIDIA.

Radeon antiga (ex.: RX 570) no Windows não tem aceleração no PyTorch; o serviço roda na CPU.

## Instalação e execução

**Windows** (PowerShell, nesta pasta):
```powershell
winget install Python.Python.3.11     # se ainda não tiver
.\install.ps1                         # cria o ambiente, instala dependências e baixa os modelos (~3,3 GB)
.\start.ps1                           # sobe em http://127.0.0.1:8808
```

**Linux**:
```bash
sudo apt install python3.11 python3.11-venv   # se necessário
./install.sh
./start.sh
```

Variáveis opcionais (no ambiente antes de iniciar): `TTS_PORT` (8808), `TTS_HOST` (127.0.0.1), `TTS_TOKEN`
(exige o cabeçalho `X-TTS-Token`), `TTS_CFM_STEPS` (4; mais = mais nítido e mais lento), `TTS_THREADS`,
`TTS_DEVICE` (`cpu`/`cuda`), `TTS_MAX_CHARS` (600), `TTS_QUEUE_MAX` (24), `TTS_CACHE_MAX_MB` (500), `TTS_CACHE_DAYS` (14).

Do lado do jogo, no `.env` do servidor Node: `TTS_URL` (padrão `http://127.0.0.1:8808`) e, se usar token, `TTS_TOKEN`.

## API

| Método | Rota | Função |
|---|---|---|
| `POST` | `/api/tts/generate` | `{text, voice, style, session}` → enfileira. Devolve `{id, status, cached, position, eta_seconds}` |
| `GET` | `/api/tts/jobs/{id}?wait=20` | Estado do pedido (espera longa opcional) |
| `GET` | `/api/tts/audio/{id}` | Áudio WAV (24 kHz, 16 bits) |
| `DELETE` | `/api/tts/jobs/{id}` | Cancela um pedido pendente |
| `DELETE` | `/api/tts/sessions/{sid}` | Cancela todos os pendentes de uma narração |
| `GET` | `/api/tts/health` | Modelo pronto?, CPU/GPU, fila, velocidade medida (`rtf`), vozes e estilos |
| `GET` | `/api/tts/styles` | Estilos e parâmetros |

Fila com **um trabalhador** (a geração não ganha com paralelismo), limite de fila (429 quando cheia), limite de
texto (413), validação de estilo/voz (400), **deduplicação** (mesmo texto+voz+estilo reaproveita o mesmo trabalho),
**cache em disco** (`cache/`, limpeza por idade e tamanho a cada 30 min, temporários apagados) e cancelamento.
A semente do sorteio é derivada do texto e da voz: o mesmo texto sempre soa igual e a voz não muda entre trechos.

## Estilos testados (o que os parâmetros realmente fazem)

O modelo **não aceita instruções de emoção em texto**. O que ele controla são números. Medimos (mesma frase, mesma
semente, um parâmetro de cada vez; ver `tools/styletest.py`):

| Mudança | Ritmo | Tom médio | Energia |
|---|---|---|---|
| `exaggeration` 0,5 → 0,9 | **mais rápido** (4,27 → 3,67 s) | **mais agudo** (136 → 185 Hz) | maior |
| `exaggeration` 0,5 → 0,25 | **mais lento** (5,67 s) | igual | menor |
| `cfg_weight` 0,5 → 0,15 | **bem mais lento, com pausas** (6,7 s) | mais agudo | **bem maior**, mais variação de tom |
| `cfg_weight` 0,5 → 0,9 | mais rápido (3,6 s) | igual | igual |
| `exaggeration` baixa + `cfg_weight` alto | rápido | a fala **mais monótona** | — |

Estilos resultantes (`styles.py`): **normal** (0,5/0,5), **suspense** (0,4/0,25, pausa longa), **combate** (0,85/0,45),
**terror** (0,3/0,25, pausa longa), **tristeza** (0,25/0,5), **épico** (0,8/0,3), **diálogo** (0,65/0,4).
É uma amostra pequena (uma frase por configuração); os efeitos seguem o que o README do projeto descreve.

## Qualidade da pronúncia (pt-BR)

Teste objetivo: o áudio gerado do texto da demonstração foi transcrito com Whisper (`tests/asr_check.py`).
**92% das palavras coincidiram** com o texto. As diferenças foram o nome inventado "Eldoria" (ouvido como "Aldoria")
e uma troca em "estava nas mãos". Não há como medir naturalidade/emoção sem ouvir: as amostras estão em
`samples/` (`demo_completo.wav` é o texto da demonstração com 4 estilos).

## Voz do mestre

A voz padrão do modelo tem altura média de ~140 a 165 Hz (não é grave; uma voz masculina grave fica perto de 100 Hz).
Para clonar uma voz, coloque um WAV de **10 a 30 s, gravado por você ou com autorização**, em `voices/NOME.wav`;
ela aparece no jogo como opção (Configurações → Narrador → Voz). A clonagem não foi testada (não há gravação de
referência no projeto). Toda saída do Chatterbox leva a marca d'água Perth (não pode ser desligada).

## Usar o site da VPS com o serviço do seu PC

O serviço **não roda na VPS** (precisa de ~4,3 GB de RAM; a VPS tem 1 vCPU e pouca memória livre). Para testar o
site hospedado, abra um túnel reverso a partir deste PC (mantenha a janela aberta enquanto joga):

```powershell
.\tunnel-vps.ps1 -Server root@SEU_IP_DA_VPS
```

Ele expõe a porta 8808 deste PC **apenas no localhost da VPS**, que é onde o jogo procura (`TTS_URL` padrão).
Sem o túnel, o site cai sozinho para a voz do navegador.

## Testes

Com o serviço rodando: `.\.venv\Scripts\python.exe tests\test_service.py` (validações, fila, deduplicação, cache,
cancelamento, emendas) e `tests\asr_check.py` (pronúncia). `tools/bench.py` mede velocidade.

## Problemas comuns

- **"O arquivo de paginação é muito pequeno" (erro 1455) ao carregar o modelo** — falta memória virtual no Windows.
  Feche programas pesados ou aumente o arquivo de paginação; o health mostra o erro e o jogo usa a voz do navegador.
- **Porta em uso** — defina `TTS_PORT` e `TTS_URL` com a mesma porta.
- **Modelo "carregando"** — o jogo usa a voz do navegador nessa narração e consulta o estado a cada 4 s.
