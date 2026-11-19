import type { Campaign } from '../types/rpg';
import { apiFetch } from '../utils/api';

export interface AccountUser {
  id: string;
  username: string;
}

async function readError(res: Response, fallback: string): Promise<Error> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(data.error || fallback);
}

/** Usuário da sessão atual, ou null se não estiver logado. */
export async function fetchMe(): Promise<AccountUser | null> {
  const res = await apiFetch('/api/auth/me');
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return ((await res.json()) as { user: AccountUser }).user;
}

export async function fetchAuthConfig(): Promise<{ registrationOpen: boolean }> {
  try {
    const res = await apiFetch('/api/auth/config');
    if (!res.ok) return { registrationOpen: true };
    return (await res.json()) as { registrationOpen: boolean };
  } catch {
    return { registrationOpen: true };
  }
}

export async function login(username: string, password: string): Promise<AccountUser> {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await readError(res, 'Não foi possível entrar.');
  return ((await res.json()) as { user: AccountUser }).user;
}

export async function register(username: string, password: string, invite: string): Promise<AccountUser> {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, invite }),
  });
  if (!res.ok) throw await readError(res, 'Não foi possível criar a conta.');
  return ((await res.json()) as { user: AccountUser }).user;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await apiFetch('/api/campaigns');
  if (!res.ok) throw await readError(res, 'Não foi possível carregar suas campanhas.');
  return ((await res.json()) as { campaigns: Campaign[] }).campaigns;
}
