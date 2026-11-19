import { useEffect, useRef, useState } from 'react';
import type { Campaign } from '../types/rpg';
import { apiFetch } from '../utils/api';

export type SyncStatus = 'saved' | 'saving' | 'error';

const DEBOUNCE_MS = 1500;
const RETRY_MS = 8000;

/**
 * Mantém as campanhas da conta salvas no servidor.
 * Grava só o que mudou, depois de uma pausa nas alterações (durante o streaming do Mestre
 * o texto muda a cada trecho; a gravação acontece quando ele termina). Campanhas removidas
 * localmente são apagadas no servidor.
 */
export function useCampaignSync(campaigns: Campaign[], initial: Campaign[], initialIsOnServer: boolean): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('saved');
  const latest = useRef(campaigns);
  const synced = useRef<Map<string, string>>(
    new Map(initialIsOnServer ? initial.map((c) => [c.id, JSON.stringify(c)] as const) : [])
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);
  const dirtyAgain = useRef(false);

  const flush = async () => {
    if (running.current) {
      dirtyAgain.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        dirtyAgain.current = false;
        const current = latest.current;
        const currentIds = new Set(current.map((c) => c.id));
        const jobs: Promise<void>[] = [];
        let pending = false;

        for (const c of current) {
          const json = JSON.stringify(c);
          if (synced.current.get(c.id) === json) continue;
          pending = true;
          jobs.push(
            apiFetch(`/api/campaigns/${encodeURIComponent(c.id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: json,
            }).then((r) => {
              if (!r.ok) throw new Error(`Falha ao salvar (${r.status})`);
              synced.current.set(c.id, json);
            })
          );
        }
        for (const id of [...synced.current.keys()]) {
          if (currentIds.has(id)) continue;
          pending = true;
          jobs.push(
            apiFetch(`/api/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => {
              if (!r.ok) throw new Error(`Falha ao apagar (${r.status})`);
              synced.current.delete(id);
            })
          );
        }

        if (pending) setStatus('saving');
        await Promise.all(jobs);
        setStatus('saved');
      } while (dirtyAgain.current);
    } catch {
      setStatus('error');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), RETRY_MS);
    } finally {
      running.current = false;
    }
  };

  useEffect(() => {
    latest.current = campaigns;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [campaigns]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao esconder a aba/fechar, tenta gravar na hora.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
