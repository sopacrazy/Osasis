/** Cache local de áudios narrados (IndexedDB). Todas as falhas são silenciosas: o cache é opcional. */

const DB_NAME = 'cronica-narrador';
const STORE = 'audio';
const MAX_ENTRIES = 600;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function hashKey(parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join('\u0000'));
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261; // FNV-1a (fallback em contexto não seguro)
  for (const b of data) h = Math.imul(h ^ b, 16777619);
  return `f${(h >>> 0).toString(16)}`;
}

export async function getCachedAudio(key: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => resolve((r.result?.blob as Blob | undefined) ?? null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putCachedAudio(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    store.put({ blob, at: Date.now() }, key);
    const count = store.count();
    count.onsuccess = () => {
      if (count.result <= MAX_ENTRIES) return;
      // remove os mais antigos
      const all: { key: IDBValidKey; at: number }[] = [];
      store.openCursor().onsuccess = (e) => {
        const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cur) {
          all.push({ key: cur.key, at: cur.value.at });
          cur.continue();
        } else {
          all
            .sort((a, b) => a.at - b.at)
            .slice(0, count.result - MAX_ENTRIES + 50)
            .forEach((x) => store.delete(x.key));
        }
      };
    };
  } catch {
    // quota ou transação falhou: segue sem cache
  }
}
