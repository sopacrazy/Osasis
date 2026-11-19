/** Monta a URL de uma rota da API respeitando o caminho-base do app (ex.: /rpg/ em produção). */
export const apiUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

/** Disparado quando o servidor responde 401 (sessão expirada): o app volta para a tela de login. */
export const AUTH_EXPIRED_EVENT = 'cronica:auth-expired';

/** fetch da API com cookies de sessão; avisa o app se a sessão expirou. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(apiUrl(path), { credentials: 'same-origin', ...init });
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return res;
}
