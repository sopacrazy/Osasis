import type { Application, Request, Response } from 'express';

/**
 * Ponte entre o jogo e o serviço local de voz (Chatterbox, pasta tts-service/).
 * - Só usuários logados chegam aqui (o server.ts aplica requireAuth em /api/tts).
 * - O texto vai apenas para o serviço configurado em TTS_URL (padrão: o próprio computador).
 * - Nenhuma API paga: sem o serviço no ar, o jogo cai sozinho para a voz do navegador.
 */

const STYLES = ['normal', 'suspense', 'combate', 'terror', 'tristeza', 'epico', 'dialogo'];

const cfg = () => ({
  url: (process.env.TTS_URL || 'http://127.0.0.1:8808').replace(/\/+$/, ''),
  token: process.env.TTS_TOKEN || '',
  maxChars: Number(process.env.TTS_MAX_CHARS) || 600,
  ratePerMinute: Number(process.env.TTS_RATE_LIMIT_PER_MINUTE) || 90,
});

const hits = new Map<string, number[]>();
function limited(req: Request, res: Response): boolean {
  const key = req.ip || 'x';
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= cfg().ratePerMinute) {
    hits.set(key, recent);
    res.status(429).json({ code: 'rate_limited', error: 'Muitos pedidos de narração. Aguarde um instante.' });
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

async function callTts(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<globalThis.Response> {
  const c = cfg();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (c.token) headers['X-TTS-Token'] = c.token;
  return fetch(`${c.url}${path}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
}

function unavailable(res: Response) {
  res.status(503).json({
    code: 'tts_unavailable',
    error: 'O serviço de voz (Chatterbox) não está disponível. Use a voz do navegador ou inicie o serviço.',
  });
}

/** Repassa a resposta JSON do serviço (e o status HTTP dele). */
async function relayJson(r: globalThis.Response, res: Response) {
  const data = (await r.json().catch(() => ({}))) as { detail?: string };
  if (!r.ok) {
    res.status(r.status === 404 ? 404 : r.status >= 500 ? 502 : r.status).json({
      code: 'tts_error',
      error: typeof data.detail === 'string' ? data.detail : 'Erro no serviço de voz.',
    });
    return;
  }
  res.status(r.status).json(data);
}

export function registerTtsRoutes(app: Application) {
  // Estado do serviço. Nunca devolve erro HTTP: o jogo precisa saber "indisponível" sem alarde.
  app.get('/api/tts/health', async (_req, res) => {
    try {
      const r = await callTts('/api/tts/health', {}, 4000);
      const data = (await r.json()) as Record<string, unknown>;
      res.json({ reachable: true, ...data });
    } catch {
      res.json({ reachable: false, ok: false, ready: false, loading: false, error: 'Serviço de voz inacessível.' });
    }
  });

  app.post('/api/tts/generate', async (req, res) => {
    if (limited(req, res)) return;
    const c = cfg();
    const { text, voice, style, session } = (req.body ?? {}) as Record<string, unknown>;
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean) return void res.status(400).json({ code: 'invalid_text', error: 'Texto vazio.' });
    if (clean.length > c.maxChars) {
      return void res.status(413).json({ code: 'text_too_long', error: `Máximo de ${c.maxChars} caracteres por trecho.` });
    }
    const st = typeof style === 'string' && STYLES.includes(style) ? style : 'normal';
    const vc = typeof voice === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(voice) ? voice : 'padrao';
    const sid = typeof session === 'string' ? session.slice(0, 64) : '';
    try {
      const r = await callTts(
        '/api/tts/generate',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean, voice: vc, style: st, session: sid }) },
        10_000,
      );
      await relayJson(r, res);
    } catch {
      unavailable(res);
    }
  });

  app.get('/api/tts/jobs/:id', async (req, res) => {
    if (!/^[0-9a-f]{32}$/.test(req.params.id)) return void res.status(400).json({ error: 'Identificador inválido.' });
    const wait = Math.min(30, Math.max(0, Number(req.query.wait) || 0));
    try {
      const r = await callTts(`/api/tts/jobs/${req.params.id}?wait=${wait}`, {}, wait * 1000 + 8000);
      await relayJson(r, res);
    } catch {
      unavailable(res);
    }
  });

  app.get('/api/tts/audio/:id', async (req, res) => {
    if (!/^[0-9a-f]{32}$/.test(req.params.id)) return void res.status(400).json({ error: 'Identificador inválido.' });
    try {
      const r = await callTts(`/api/tts/audio/${req.params.id}`, {}, 30_000);
      if (!r.ok) return void res.status(r.status === 404 ? 404 : 502).json({ code: 'tts_error', error: 'Áudio indisponível.' });
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(Buffer.from(await r.arrayBuffer()));
    } catch {
      unavailable(res);
    }
  });

  app.delete('/api/tts/jobs/:id', async (req, res) => {
    if (!/^[0-9a-f]{32}$/.test(req.params.id)) return void res.status(400).json({ error: 'Identificador inválido.' });
    try {
      await callTts(`/api/tts/jobs/${req.params.id}`, { method: 'DELETE' }, 5000);
    } catch {
      // serviço fora do ar: nada a cancelar
    }
    res.json({ ok: true });
  });

  app.delete('/api/tts/sessions/:sid', async (req, res) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(req.params.sid)) return void res.status(400).json({ error: 'Sessão inválida.' });
    try {
      await callTts(`/api/tts/sessions/${req.params.sid}`, { method: 'DELETE' }, 5000);
    } catch {
      // idem
    }
    res.json({ ok: true });
  });
}
