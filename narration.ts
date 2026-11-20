import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Application, Request, Response } from 'express';

/**
 * Narração por voz via ElevenLabs.
 * - A chave (ELEVENLABS_API_KEY) existe apenas aqui, no servidor.
 * - Cache de áudio em disco + deduplicação de requisições simultâneas.
 * - Orçamento mensal ESTIMADO em créditos (não é o saldo oficial da ElevenLabs).
 * - Rate limit por IP e acesso restrito a loopback (ou token) para proteger a chave.
 */

const API_BASE = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';
const CACHE_DIR = path.resolve(process.cwd(), process.env.NARRATOR_CACHE_DIR || '.cache/narracao');
const USAGE_FILE = path.join(CACHE_DIR, 'usage.json');

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const cfg = () => ({
  apiKey: process.env.ELEVENLABS_API_KEY || '',
  voiceId: process.env.ELEVENLABS_VOICE_ID || '',
  model: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
  maxCharsPerRequest: num(process.env.NARRATOR_MAX_CHARS_PER_REQUEST, 600),
  // Flash/Turbo custam ~0,5 crédito por caractere na API. Ajuste se o seu plano for diferente.
  creditsPerChar: num(process.env.NARRATOR_CREDITS_PER_CHAR, 0.5),
  monthlyCreditBudget: num(process.env.NARRATOR_MONTHLY_CREDIT_BUDGET, 5000),
  rateLimitPerMinute: num(process.env.NARRATOR_RATE_LIMIT_PER_MINUTE, 40),
  timeoutMs: num(process.env.NARRATOR_TIMEOUT_MS, 15000),
  authToken: process.env.NARRATOR_AUTH_TOKEN || '',
});

const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.8, speed: 0.95 };

// ---- uso mensal estimado ---------------------------------------------------
interface Usage {
  month: string;
  chars: number;
  credits: number;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

function readUsage(): Usage {
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8')) as Usage;
    if (u.month === currentMonth()) return u;
  } catch {
    // sem arquivo ainda
  }
  return { month: currentMonth(), chars: 0, credits: 0 };
}

function writeUsage(u: Usage) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(USAGE_FILE, JSON.stringify(u));
}

// ---- util -------------------------------------------------------------------
const inflight = new Map<string, Promise<Buffer>>();
const hits = new Map<string, number[]>();

function isLoopback(req: Request): boolean {
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

function authorize(req: Request, res: Response): boolean {
  const { authToken } = cfg();
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const ok = isLoopback(req) || (authToken !== '' && bearer === authToken);
  if (!ok) res.status(401).json({ code: 'unauthorized', error: 'Não autorizado.' });
  return ok;
}

function rateLimited(req: Request, res: Response): boolean {
  const key = req.socket.remoteAddress || 'x';
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= cfg().rateLimitPerMinute) {
    hits.set(key, recent);
    res.status(429).json({ code: 'rate_limited', error: 'Muitas requisições de narração. Aguarde um instante.' });
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

class NarrationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function synthesize(text: string, voiceId: string): Promise<Buffer> {
  const c = cfg();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeoutMs);
  try {
    const r = await fetch(
      `${API_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': c.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
          text,
          model_id: c.model,
          language_code: 'pt',
          voice_settings: VOICE_SETTINGS,
        }),
        signal: ctrl.signal,
      },
    );
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 300);
      if (r.status === 401) throw new NarrationError(502, 'upstream_auth', 'Chave da ElevenLabs inválida ou sem permissão.');
      if (r.status === 429) throw new NarrationError(502, 'upstream_limit', 'Limite da ElevenLabs atingido (créditos ou concorrência).');
      throw new NarrationError(502, 'upstream_error', `ElevenLabs respondeu ${r.status}. ${detail}`);
    }
    return Buffer.from(await r.arrayBuffer());
  } catch (err) {
    if (err instanceof NarrationError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new NarrationError(504, 'timeout', 'A ElevenLabs demorou demais para responder.');
    }
    throw new NarrationError(502, 'network', 'Sem conexão com a ElevenLabs.');
  } finally {
    clearTimeout(timer);
  }
}

export function registerNarrationRoutes(app: Application) {
  app.get('/api/narracao/status', (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    const c = cfg();
    const u = readUsage();
    res.json({
      configured: Boolean(c.apiKey),
      hasDefaultVoice: Boolean(c.voiceId),
      defaultVoiceId: c.voiceId || null,
      model: c.model,
      maxCharsPerRequest: c.maxCharsPerRequest,
      usage: {
        month: u.month,
        estimatedCredits: Math.round(u.credits),
        estimatedChars: u.chars,
        monthlyCreditBudget: c.monthlyCreditBudget,
        isEstimate: true, // NÃO é o saldo oficial da ElevenLabs
      },
    });
  });

  // Lista as vozes da conta para o jogador escolher o narrador.
  app.get('/api/narracao/voices', async (req: Request, res: Response) => {
    if (!authorize(req, res) || rateLimited(req, res)) return;
    const c = cfg();
    if (!c.apiKey) {
      res.status(503).json({ code: 'not_configured', error: 'ELEVENLABS_API_KEY não configurada.' });
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/v1/voices`, {
        headers: { 'xi-api-key': c.apiKey },
        signal: AbortSignal.timeout(c.timeoutMs),
      });
      if (!r.ok) {
        res.status(502).json({ code: 'upstream_error', error: `ElevenLabs respondeu ${r.status} ao listar vozes.` });
        return;
      }
      const data = (await r.json()) as {
        voices?: { voice_id: string; name: string; labels?: Record<string, string>; description?: string }[];
      };
      res.json({
        voices: (data.voices ?? []).map((v) => ({
          voiceId: v.voice_id,
          name: v.name,
          labels: v.labels ?? {},
        })),
      });
    } catch {
      res.status(502).json({ code: 'network', error: 'Sem conexão com a ElevenLabs.' });
    }
  });

  app.post('/api/narracao', async (req: Request, res: Response) => {
    if (!authorize(req, res) || rateLimited(req, res)) return;
    const c = cfg();

    const body = (req.body ?? {}) as { text?: unknown; voiceId?: unknown };
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
    if (!text) {
      res.status(400).json({ code: 'invalid_text', error: 'Texto vazio ou inválido.' });
      return;
    }
    if (text.length > c.maxCharsPerRequest) {
      res.status(413).json({
        code: 'text_too_long',
        error: `Texto excede o limite de ${c.maxCharsPerRequest} caracteres por narração.`,
      });
      return;
    }

    const voiceId = typeof body.voiceId === 'string' && body.voiceId ? body.voiceId : c.voiceId;
    if (!/^[A-Za-z0-9]{10,40}$/.test(voiceId)) {
      res.status(400).json({
        code: 'invalid_voice',
        error: 'Nenhum voice_id válido. Defina ELEVENLABS_VOICE_ID no .env ou escolha uma voz nas configurações.',
      });
      return;
    }

    // Cache em disco: texto idêntico + modelo + voz + configurações nunca é cobrado duas vezes.
    const key = crypto
      .createHash('sha256')
      .update(JSON.stringify({ text, model: c.model, voiceId, settings: VOICE_SETTINGS }))
      .digest('hex');
    const file = path.join(CACHE_DIR, `${key}.mp3`);
    const send = (audio: Buffer, cache: 'hit' | 'miss') => {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('X-Narration-Cache', cache);
      res.send(audio);
    };

    if (fs.existsSync(file)) {
      send(fs.readFileSync(file), 'hit');
      return;
    }

    if (!c.apiKey) {
      res.status(503).json({ code: 'not_configured', error: 'ELEVENLABS_API_KEY não configurada no servidor.' });
      return;
    }

    // Requisições simultâneas idênticas compartilham a mesma geração.
    const pending = inflight.get(key);
    if (pending) {
      try {
        send(await pending, 'hit');
      } catch (err) {
        const e = err as NarrationError;
        res.status(e.status ?? 502).json({ code: e.code ?? 'error', error: e.message });
      }
      return;
    }

    // Orçamento: reserva antes de chamar a API; nunca ultrapassa o limite configurado.
    const cost = text.length * c.creditsPerChar;
    const usage = readUsage();
    if (usage.credits + cost > c.monthlyCreditBudget) {
      res.status(402).json({
        code: 'budget_exceeded',
        error: 'Orçamento mensal de narração (estimado) esgotado.',
      });
      return;
    }
    usage.credits += cost;
    usage.chars += text.length;
    writeUsage(usage);

    const job = synthesize(text, voiceId).then((audio) => {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(file, audio);
      return audio;
    });
    inflight.set(key, job);

    try {
      send(await job, 'miss');
    } catch (err) {
      // Falhou: devolve a reserva, pois nada foi gerado.
      const u = readUsage();
      u.credits = Math.max(0, u.credits - cost);
      u.chars = Math.max(0, u.chars - text.length);
      writeUsage(u);
      const e = err as NarrationError;
      res.status(e.status ?? 502).json({ code: e.code ?? 'error', error: e.message });
    } finally {
      inflight.delete(key);
    }
  });
}
