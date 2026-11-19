import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type, type Content } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { registerNarrationRoutes } from './narration.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '4mb' }));

registerNarrationRoutes(app);

const PORT = Number(process.env.PORT) || 3000;

interface IncomingMessage {
  role: 'user' | 'model';
  text: string;
}

interface GmChatRequestBody {
  messages: IncomingMessage[];
  systemPrompt: string;
}

interface UpdateGuideRequestBody {
  currentGuide: unknown;
  recentMessages: IncomingMessage[];
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ---- Gemini: modelo e nível de raciocínio configuráveis ------------------
// GEMINI_THINKING: MINIMAL | LOW | MEDIUM | HIGH. Mais baixo = a narração começa mais rápido.
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
const GEMINI_THINKING = () => {
  const v = (process.env.GEMINI_THINKING || 'LOW').toUpperCase() as keyof typeof ThinkingLevel;
  return ThinkingLevel[v] ?? ThinkingLevel.LOW;
};

// ---- Provedor local (Ollama) -------------------------------------------
// Ative com LLM_PROVIDER=ollama no .env. Funciona 100% offline.
const useOllama = () => (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase() === 'ollama';
const OLLAMA_URL = () => process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || 'qwen3:4b-instruct';

const GUIDE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    currentQuests: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, location: { type: 'string' }, deadline: { type: 'string' }, summary: { type: 'string' } }, required: ['title', 'location', 'summary'] } },
    knownLocations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, distanceOrDirection: { type: 'string' }, resources: { type: 'string' }, notes: { type: 'string' } }, required: ['name', 'notes'] } },
    racesAndCreatures: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, bonuses: { type: 'string' }, weaknesses: { type: 'string' }, notes: { type: 'string' } }, required: ['name', 'bonuses', 'weaknesses'] } },
    remediesAndItems: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, effect: { type: 'string' }, usageOrSource: { type: 'string' } }, required: ['name', 'effect'] } },
    knownCharacters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, allegiance: { type: 'string' }, notes: { type: 'string' } }, required: ['name', 'role', 'allegiance'] } },
  },
  required: ['currentQuests', 'knownLocations', 'racesAndCreatures', 'remediesAndItems', 'knownCharacters'],
};

async function ollamaChat(body: Record<string, unknown>): Promise<globalThis.Response> {
  const r = await fetch(`${OLLAMA_URL()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL(), think: false, ...body }),
  });
  if (!r.ok) {
    throw new Error(`Ollama respondeu ${r.status}: ${await r.text()}`);
  }
  return r;
}

function ollamaErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
    return `Não consegui conectar ao Ollama em ${OLLAMA_URL()}. Ele está rodando? (abra o app Ollama ou execute "ollama serve")`;
  }
  if (msg.includes('not found')) {
    return `Modelo "${OLLAMA_MODEL()}" não instalado. Execute: ollama pull ${OLLAMA_MODEL()}`;
  }
  return `Falha na comunicação com o Mestre local: ${msg}`;
}

async function streamOllamaToSse(res: Response, messages: IncomingMessage[], systemPrompt: string) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const r = await ollamaChat({
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt || '' },
        ...messages.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      ],
    });

    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const text = (JSON.parse(line) as { message?: { content?: string } }).message?.content;
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: ollamaErrorMessage(err) })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    provider: useOllama() ? 'ollama' : 'gemini',
    model: useOllama() ? OLLAMA_MODEL() : GEMINI_MODEL(),
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post('/api/gm/chat', async (req: Request, res: Response) => {
  const body = req.body as GmChatRequestBody | undefined;

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: 'Histórico de mensagens inválido ou vazio.' });
    return;
  }

  if (useOllama()) {
    await streamOllamaToSse(res, body.messages, body.systemPrompt);
    return;
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch {
    res.status(500).json({
      error: 'Chave da API Gemini não configurada no servidor. Verifique as configurações de Secrets.',
    });
    return;
  }

  const contents: Content[] = body.messages.map((msg) => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }],
  }));

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    // O plano gratuito devolve 503 (alta demanda) em picos curtos: tenta de novo
    // enquanto nenhum texto foi enviado ao jogador.
    let sentAny = false;
    for (let attempt = 1; ; attempt++) {
      try {
        const stream = await ai.models.generateContentStream({
          model: GEMINI_MODEL(),
          contents,
          config: {
            systemInstruction: body.systemPrompt || '',
            thinkingConfig: {
              thinkingLevel: GEMINI_THINKING(),
            },
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            sentAny = true;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        break;
      } catch (e) {
        const m = e instanceof Error ? e.message : '';
        const transient = m.includes('503') || m.includes('UNAVAILABLE');
        if (sentAny || !transient || attempt >= 4) throw e;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao consultar o Mestre.';
    let userMessage = `Falha na comunicação com o Mestre: ${message}`;
    if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
      userMessage = 'Chave da API inválida ou sem permissão. Verifique a configuração em Settings > Secrets.';
    } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      userMessage = 'Limite de requisições atingido no momento. Aguarde alguns segundos e tente novamente.';
    }
    res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

app.post('/api/gm/update-guide', async (req: Request, res: Response) => {
  const body = req.body as UpdateGuideRequestBody | undefined;
  if (!body || !Array.isArray(body.recentMessages) || body.recentMessages.length === 0) {
    res.status(400).json({ error: 'Mensagens insuficientes para atualizar o guia.' });
    return;
  }

  const transcript = body.recentMessages
    .map((m) => `${m.role === 'model' ? 'MESTRE' : 'JOGADOR'}: ${m.text}`)
    .join('\n\n');

  const prompt = `Você é o arquivista do Guia Geral de uma campanha de RPG solo em Português (BR).
Analise o Guia Atual (JSON) e os turnos recentes abaixo. Retorne o Guia Atualizado em JSON mesclando tudo o que o protagonista JÁ DESCOBRIU no mundo até aqui, sem inventar spoilers futuros.

Regras de atualização:
1. Preserve informações válidas do Guia Atual e atualize prazos, status de missões ou descobertas novas reveladas nas mensagens recentes.
2. Em "currentQuests": missões ativas, objetivos, local de destino e prazos.
3. Em "knownLocations": lugares conhecidos, direção/distância e quais recursos específicos podem ser coletados lá.
4. Em "racesAndCreatures": raças, inimigos e criaturas descobertas, detalhando bônus, fraquezas/penalidades (ex: vulnerabilidade ao frio, sol, fogo, armadura) e táticas.
5. Em "remediesAndItems": para que serve cada remédio, poção, erva, recurso ou receita de criação/forja descoberta.
6. Em "knownCharacters": NPCs aliados, neutros ou inimigos com nome único, papel e alinhamento.
7. Se nada novo foi descoberto nos turnos recentes, retorne o Guia Atual preservado.

GUIA ATUAL:
${JSON.stringify(body.currentGuide ?? {})}

TURNOS RECENTES:
${transcript}`;

  if (useOllama()) {
    try {
      const r = await ollamaChat({
        stream: false,
        format: GUIDE_JSON_SCHEMA,
        messages: [{ role: 'user', content: prompt }],
      });
      const data = (await r.json()) as { message?: { content?: string } };
      const parsed = JSON.parse((data.message?.content ?? '').trim());
      res.json({ ...parsed, lastUpdatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: ollamaErrorMessage(err) });
    }
    return;
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch {
    res.status(500).json({ error: 'Chave da API Gemini não configurada.' });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL(),
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentQuests: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  location: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  summary: { type: Type.STRING },
                },
                required: ['title', 'location', 'summary'],
              },
            },
            knownLocations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  distanceOrDirection: { type: Type.STRING },
                  resources: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['name', 'notes'],
              },
            },
            racesAndCreatures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  bonuses: { type: Type.STRING },
                  weaknesses: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['name', 'bonuses', 'weaknesses'],
              },
            },
            remediesAndItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  effect: { type: Type.STRING },
                  usageOrSource: { type: Type.STRING },
                },
                required: ['name', 'effect'],
              },
            },
            knownCharacters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  allegiance: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['name', 'role', 'allegiance'],
              },
            },
          },
          required: [
            'currentQuests',
            'knownLocations',
            'racesAndCreatures',
            'remediesAndItems',
            'knownCharacters',
          ],
        },
      },
    });

    const jsonText = (response.text ?? '').trim();
    const parsed = JSON.parse(jsonText);
    res.json({
      ...parsed,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar guia.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer();
