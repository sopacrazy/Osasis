import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Camada de armazenamento (contas, sessões e campanhas por usuário).
 *  - Com DB_HOST definido no .env: MariaDB/MySQL (ver store-mysql.ts) — usado na VPS.
 *  - Sem DB_HOST: arquivos JSON em ./data — apenas para desenvolvimento local.
 * As duas implementações seguem a mesma interface `Store`.
 */

export interface User {
  id: string;
  username: string; // sempre em minúsculas
  passHash: string;
  createdAt: string;
  disabled?: boolean;
}

export interface Session {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export type CampaignData = Record<string, unknown>;

export class DuplicateUserError extends Error {}

export interface Store {
  readonly kind: 'mysql' | 'json';
  init(): Promise<void>;
  users: {
    byName(name: string): Promise<User | undefined>;
    byId(id: string): Promise<User | undefined>;
    list(): Promise<User[]>;
    create(username: string, passHash: string): Promise<User>; // lança DuplicateUserError
    setPassword(id: string, passHash: string): Promise<boolean>;
    remove(id: string): Promise<void>;
  };
  sessions: {
    create(tokenHash: string, session: Session): Promise<void>;
    get(tokenHash: string): Promise<Session | undefined>;
    remove(tokenHash: string): Promise<void>;
    removeForUser(userId: string, exceptHash?: string): Promise<void>;
  };
  campaigns: {
    list(userId: string): Promise<CampaignData[]>;
    count(userId: string): Promise<number>;
    exists(userId: string, id: string): Promise<boolean>;
    save(userId: string, id: string, campaign: CampaignData): Promise<void>;
    remove(userId: string, id: string): Promise<void>;
  };
}

export const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// ---------------------------------------------------------------------------
// Implementação em arquivos JSON (desenvolvimento)
// ---------------------------------------------------------------------------
export function createJsonStore(): Store {
  const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');
  const USERS_FILE = path.join(DATA_DIR, 'users.json');
  const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
  const CAMPAIGNS_DIR = path.join(DATA_DIR, 'campaigns');

  const ensureDir = (dir: string) => fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const readJson = <T>(file: string, fallback: T): T => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch {
      return fallback;
    }
  };
  const writeJson = (file: string, data: unknown) => {
    ensureDir(path.dirname(file));
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
    fs.renameSync(tmp, file);
  };

  let users: User[] = [];
  let sessions: Record<string, Session> = {};
  const dirOf = (userId: string) => path.join(CAMPAIGNS_DIR, userId);

  return {
    kind: 'json',
    async init() {
      users = readJson<User[]>(USERS_FILE, []);
      sessions = readJson<Record<string, Session>>(SESSIONS_FILE, {});
    },
    users: {
      byName: async (name) => users.find((u) => u.username === name.toLowerCase()),
      byId: async (id) => users.find((u) => u.id === id),
      list: async () => [...users],
      async create(username, passHash) {
        if (users.some((u) => u.username === username.toLowerCase())) throw new DuplicateUserError();
        const user: User = {
          id: crypto.randomUUID(),
          username: username.toLowerCase(),
          passHash,
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        writeJson(USERS_FILE, users);
        return user;
      },
      async setPassword(id, passHash) {
        const u = users.find((x) => x.id === id);
        if (!u) return false;
        u.passHash = passHash;
        writeJson(USERS_FILE, users);
        return true;
      },
      async remove(id) {
        users = users.filter((u) => u.id !== id);
        writeJson(USERS_FILE, users);
        for (const [k, s] of Object.entries(sessions)) if (s.userId === id) delete sessions[k];
        writeJson(SESSIONS_FILE, sessions);
        fs.rmSync(dirOf(id), { recursive: true, force: true });
      },
    },
    sessions: {
      async create(tokenHash, session) {
        const now = Date.now();
        for (const [k, s] of Object.entries(sessions)) if (s.expiresAt < now) delete sessions[k];
        sessions[tokenHash] = session;
        writeJson(SESSIONS_FILE, sessions);
      },
      async get(tokenHash) {
        const s = sessions[tokenHash];
        return s && s.expiresAt > Date.now() ? s : undefined;
      },
      async remove(tokenHash) {
        if (sessions[tokenHash]) {
          delete sessions[tokenHash];
          writeJson(SESSIONS_FILE, sessions);
        }
      },
      async removeForUser(userId, exceptHash) {
        for (const [k, s] of Object.entries(sessions)) if (s.userId === userId && k !== exceptHash) delete sessions[k];
        writeJson(SESSIONS_FILE, sessions);
      },
    },
    campaigns: {
      async list(userId) {
        const dir = dirOf(userId);
        if (!fs.existsSync(dir)) return [];
        return fs
          .readdirSync(dir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => readJson<CampaignData | null>(path.join(dir, f), null))
          .filter((c): c is CampaignData => c !== null);
      },
      async count(userId) {
        const dir = dirOf(userId);
        return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length : 0;
      },
      exists: async (userId, id) => fs.existsSync(path.join(dirOf(userId), `${id}.json`)),
      async save(userId, id, campaign) {
        writeJson(path.join(dirOf(userId), `${id}.json`), campaign);
      },
      async remove(userId, id) {
        fs.rmSync(path.join(dirOf(userId), `${id}.json`), { force: true });
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Escolha da implementação
// ---------------------------------------------------------------------------
export async function createStore(): Promise<Store> {
  let store: Store;
  if (process.env.DB_HOST) {
    const { createMysqlStore } = await import('./store-mysql.ts');
    store = createMysqlStore();
  } else {
    store = createJsonStore();
  }
  await store.init();
  return store;
}
