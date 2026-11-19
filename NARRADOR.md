# Narrador por voz

O Mestre é lido em voz alta **enquanto o texto aparece**: a cada frase completa do streaming, o trecho
entra numa fila de áudio. O jogo nunca espera o áudio; o texto sempre aparece primeiro.

## Modos (Configurações → Narrador por voz)

| Modo | Precisa de | Custo |
|---|---|---|
| **ElevenLabs — Cinematográfico** | internet + `ELEVENLABS_API_KEY` | créditos (modelo `eleven_flash_v2_5`) |
| **Narrador Offline** | voz pt-BR instalada no sistema/navegador | zero |
| **Somente Texto** | nada | zero |

Se a ElevenLabs falhar (sem internet, sem chave, orçamento esgotado, erro do serviço), o jogo troca sozinho
para o narrador offline; se também não houver voz offline, segue só com texto. O aviso aparece no cabeçalho do chat.

## Configurar a ElevenLabs

1. Crie a chave em elevenlabs.io (Developers → API Keys) e coloque no `.env`: `ELEVENLABS_API_KEY="..."`.
2. Escolha a voz do narrador (grave, madura, misteriosa, boa em pt-BR):
   - abra o jogo → Configurações → Modo ElevenLabs → **Listar vozes da conta** e escolha uma; ou
   - copie o `voice_id` da Voice Library (adicione a voz à sua conta) e use `ELEVENLABS_VOICE_ID` no `.env`.
   Use **Testar voz** para ouvir antes de jogar.
3. Reinicie o servidor (`npm run dev`).

Nenhuma voz foi pré-definida de propósito: os `voice_id` dependem da sua conta e podem mudar.

## Economia de créditos

- Modelo Flash v2.5, só a parte **narrativa** é lida (o Bloco de Estado, inventário e markdown são ignorados;
  "Ajuste técnico" nunca é narrado).
- Limite por narração (padrão 400 caracteres, ajustável de 100 a 1200). O excedente fica só em texto.
- "Narrar só cenas importantes": ignora respostas com menos de 300 caracteres de narração.
- Cache em duas camadas: IndexedDB no navegador e disco no servidor (`.cache/narracao`). A chave é o hash de
  texto + modelo + voz + configurações; texto idêntico nunca é cobrado duas vezes. "Repetir" e "Ouvir" usam o cache.
- Requisições simultâneas idênticas são unificadas em uma só chamada.
- Orçamento mensal **estimado** (`NARRATOR_MONTHLY_CREDIT_BUDGET`): o servidor reserva os créditos antes de chamar
  a API e recusa com HTTP 402 ao atingir o limite. Se a chamada falhar, a reserva é devolvida.
- O consumo exibido é uma **estimativa local** (caracteres × `NARRATOR_CREDITS_PER_CHAR`), não o saldo oficial.
  Consulte o painel da ElevenLabs para o saldo real.

## Segurança

- A chave só existe no servidor. O navegador chama `POST /api/narracao` e recebe apenas o áudio.
- O endpoint só aceita requisições do próprio computador (loopback). Para acessar de outra máquina, defina
  `NARRATOR_AUTH_TOKEN` e envie `Authorization: Bearer <token>`.
- Validação de texto (vazio, tamanho máximo), `voice_id` validado, rate limit por IP, timeout de 15 s.

## Endpoints

- `GET /api/narracao/status` — configuração, modelo e consumo estimado.
- `GET /api/narracao/voices` — vozes da conta ElevenLabs.
- `POST /api/narracao` `{ text, voiceId? }` → `audio/mpeg` (cabeçalho `X-Narration-Cache: hit|miss`).
  Erros: 400 texto/voz inválidos, 401, 402 orçamento, 413 texto longo, 429 rate limit, 502/504 falha do provedor,
  503 sem chave.

## Narrador offline: o que foi usado

O modo offline usa a **Web Speech API** do navegador (`speechSynthesis`) com voz `pt-BR`, preferindo vozes
marcadas como locais (funcionam sem internet) e masculinas, com tom levemente grave. No Windows, instale a voz em
Configurações → Hora e idioma → Fala. O Piper (WASM) não foi adotado: exigiria baixar o runtime e o modelo
(dezenas de MB) de CDN/Hugging Face na primeira vez e adicionar dependências pesadas. A troca é simples:
o motor offline está isolado em `speak()` em `src/services/narrator/narrator.ts`.

## Estrutura

- `narration.ts` — backend (ElevenLabs, cache, orçamento, rate limit).
- `src/services/narrator/` — `narrator.ts` (fila/streaming/fallback), `text.ts` (limpeza e frases),
  `audioCache.ts` (IndexedDB), `useNarrator.ts` (hook).
- `src/components/NarratorControls.tsx` (barra no chat) e `NarratorSettings.tsx` (configurações).
