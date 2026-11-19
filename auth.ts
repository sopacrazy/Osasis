import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { Application, NextFunction, Request, Response } from 'express';
import { DuplicateUserError, SAFE_ID, hashToken, type CampaignData, type Store } from './store.ts';

/**
 * Contas, sessões e campanhas por usuário.
 *  - Senhas com scrypt + sal (nunca em texto puro).
 *  - Sessão = cookie HttpOnly com token aleatório; no banco fica só o hash do token.
 *  - Cadastro somente com código de convite (INVITE_CODE, aceita vários separados por vírgula).
 *  - Limite de tentativas de login/cadastro por IP; checagem de Origin contra CSRF.
 */

const scryptAsync = promisify(crypto.scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SESSION_DAYS = 30;
const COOKIE_NAME = 'rpg_session';
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_CAMPAIGNS_PER_USER = 50;

export interface AuthedRequest extends Request {
  user?: { id: string; username: string };
  sessionHash?: string;
}

// ---- senhas -------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | null = null; // para igualar o tempo quando o usuário não existe

// ---- limite de tentativas ------------------------------------------------------
class Limiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}
  private recent(key: string) {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.hits.set(key, list);
    return list;
  }
  blocked(key: string) {
    return this.recent(key).length >= this.max;
  }
  add(key: string) {
    this.recent(key).push(Date.now());
  }
  clear(key: string) {
    this.hits.delete(key);
  }
}

const loginByIp = new Limiter(30, 15 * 60_000);
const loginByUser = new Limiter(8, 15 * 60_000); // ip + usuário
const registerByIp = new Limiter(5, 60 * 60_000);

// ---- cookies -------------------------------------------------------------------
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function cookieBase(req: Request): string {
  const basePath = process.env.PUBLIC_BASE_PATH || '/';
  const secure = process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE !== 'false' && req.secure);
  return `Path=${basePath}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function setSessionCookie(req: Request, res: Response, token: string) {
  res.append('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieBase(req)}; Max-Age=${SESSION_DAYS * 86400}`);
}

function clearSessionCookie(req: Request, res: Response) {
  res.append('Set-Cookie', `${COOKIE_NAME}=; ${cookieBase(req)}; Max-Age=0`);
}

// ---- convites ------------------------------------------------------------------
const inviteCodes = () =>
  (process.env.INVITE_CODE || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

function validInvite(given: unknown): boolean {
  if (typeof given !== 'string' || !given) return false;
  const a = crypto.createHash('sha256').update(given.trim()).digest();
  return inviteCodes().some((code) => crypto.timingSafeEqual(a, crypto.createHash('sha256').update(code).digest()));
}

// ---- middlewares ---------------------------------------------------------------
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ code: 'unauthenticated', error: 'Sessão expirada. Entre novamente.' });
    return;
  }
  next();
}

export async function registerAuthRoutes(app: Application, store: Store) {
  app.set('trust proxy', 'loopback'); // atrás do nginx: req.ip e req.secure corretos

  // Anexa o usuário da sessão (se houver) a toda requisição da API.
  app.use('/api', async (req: AuthedRequest, _res, next) => {
    try {
      const token = readCookie(req, COOKIE_NAME);
      if (token) {
        const hash = hashToken(token);
        const session = await store.sessions.get(hash);
        const user = session ? await store.users.byId(session.userId) : undefined;
        if (user && !user.disabled) {
          req.user = { id: user.id, username: user.username };
          req.sessionHash = hash;
        }
      }
    } catch (err) {
      console.error('[auth] falha ao ler sessão:', err);
    }
    next();
  });

  // Proteção CSRF: requisições que alteram dados precisam vir do mesmo site.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).hostname !== req.hostname) {
          res.status(403).json({ error: 'Origem não permitida.' });
          return;
        }
      } catch {
        res.status(403).json({ error: 'Origem inválida.' });
        return;
      }
    }
    next();
  });

  const startSession = async (req: Request, res: Response, userId: string) => {
    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    await store.sessions.create(hashToken(token), { userId, createdAt: now, expiresAt: now + SESSION_DAYS * 86400_000 });
    setSessionCookie(req, res, token);
  };

  // ---- rotas de autenticação ---------------------------------------------------
  app.get('/api/auth/config', (_req, res) => {
    res.json({ registrationOpen: inviteCodes().length > 0 });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ code: 'unauthenticated', error: 'Não autenticado.' });
      return;
    }
    res.json({ user: req.user });
  });

  app.post('/api/auth/register', async (req, res) => {
    const ip = req.ip || 'x';
    if (registerByIp.blocked(ip)) {
      res.status(429).json({ error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' });
      return;
    }
    registerByIp.add(ip);

    const { username, password, invite } = (req.body ?? {}) as Record<string, unknown>;
    if (inviteCodes().length === 0) {
      res.status(403).json({ error: 'Cadastro desativado neste servidor.' });
      return;
    }
    if (!validInvite(invite)) {
      res.status(403).json({ error: 'Código de convite inválido.' });
      return;
    }
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      res.status(400).json({ error: 'Usuário deve ter 3 a 20 caracteres: letras, números ou _ (sem espaços).' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'A senha deve ter entre 8 e 128 caracteres.' });
      return;
    }
    if (password.toLowerCase().includes(username.toLowerCase())) {
      res.status(400).json({ error: 'A senha não pode conter o nome de usuário.' });
      return;
    }

    try {
      const user = await store.users.create(username, await hashPassword(password));
      await startSession(req, res, user.id);
      res.status(201).json({ user: { id: user.id, username: user.username } });
    } catch (err) {
      if (err instanceof DuplicateUserError) {
        res.status(409).json({ error: 'Esse nome de usuário já está em uso.' });
        return;
      }
      console.error('[auth] erro no cadastro:', err);
      res.status(500).json({ error: 'Erro ao criar a conta. Tente novamente.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const ip = req.ip || 'x';
    const { username, password } = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const userKey = `${ip}|${name}`;

    if (loginByIp.blocked(ip) || loginByUser.blocked(userKey)) {
      res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' });
      return;
    }
    if (!name || typeof password !== 'string' || password.length > 128) {
      res.status(400).json({ error: 'Informe usuário e senha.' });
      return;
    }

    try {
      const user = await store.users.byName(name);
      dummyHash ??= hashPassword('senha-falsa-para-igualar-o-tempo');
      const ok = user ? await verifyPassword(password, user.passHash) : (await verifyPassword(password, await dummyHash), false);
      if (!user || !ok || user.disabled) {
        loginByIp.add(ip);
        loginByUser.add(userKey);
        res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        return;
      }
      loginByUser.clear(userKey);
      await startSession(req, res, user.id);
      res.json({ user: { id: user.id, username: user.username } });
    } catch (err) {
      console.error('[auth] erro no login:', err);
      res.status(500).json({ error: 'Erro ao entrar. Tente novamente.' });
    }
  });

  app.post('/api/auth/logout', async (req: AuthedRequest, res) => {
    if (req.sessionHash) await store.sessions.remove(req.sessionHash).catch(() => undefined);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post('/api/auth/password', requireAuth, async (req: AuthedRequest, res) => {
    const { current, next } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof current !== 'string' || typeof next !== 'string' || next.length < 8 || next.length > 128) {
      res.status(400).json({ error: 'A nova senha deve ter entre 8 e 128 caracteres.' });
      return;
    }
    const user = await store.users.byId(req.user!.id);
    if (!user || !(await verifyPassword(current, user.passHash))) {
      res.status(401).json({ error: 'Senha atual incorreta.' });
      return;
    }
    await store.users.setPassword(user.id, await hashPassword(next));
    await store.sessions.removeForUser(user.id, req.sessionHash); // encerra os outros aparelhos
    res.json({ ok: true });
  });

  // ---- campanhas do usuário ----------------------------------------------------
  const createdAtOf = (c: CampaignData) => String(c.createdAt ?? c.updatedAt ?? '');

  app.get('/api/campaigns', requireAuth, async (req: AuthedRequest, res) => {
    const list = await store.campaigns.list(req.user!.id);
    list.sort((a, b) => createdAtOf(b).localeCompare(createdAtOf(a)));
    res.json({ campaigns: list });
  });

  app.put('/api/campaigns/:id', requireAuth, async (req: AuthedRequest, res) => {
    const id = req.params.id;
    const body = req.body as CampaignData | undefined;
    if (!SAFE_ID.test(id) || !body || typeof body !== 'object' || body.id !== id || typeof body.title !== 'string') {
      res.status(400).json({ error: 'Campanha inválida.' });
      return;
    }
    const userId = req.user!.id;
    if (!(await store.campaigns.exists(userId, id)) && (await store.campaigns.count(userId)) >= MAX_CAMPAIGNS_PER_USER) {
      res.status(409).json({ error: `Limite de ${MAX_CAMPAIGNS_PER_USER} campanhas por conta atingido.` });
      return;
    }
    await store.campaigns.save(userId, id, body);
    res.json({ ok: true });
  });

  app.delete('/api/campaigns/:id', requireAuth, async (req: AuthedRequest, res) => {
    if (!SAFE_ID.test(req.params.id)) {
      res.status(400).json({ error: 'Campanha inválida.' });
      return;
    }
    await store.campaigns.remove(req.user!.id, req.params.id);
    res.json({ ok: true });
  });
}
