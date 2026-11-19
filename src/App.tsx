import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Campaign } from './types/rpg';
import { HASHID_CAMPAIGN, hydrateCampaignGuide } from './data/presets';
import { AuthPage } from './components/AuthPage';
import Game from './Game';
import {
  fetchAuthConfig,
  fetchCampaigns,
  fetchMe,
  logout,
  type AccountUser,
} from './services/account';
import { AUTH_EXPIRED_EVENT } from './utils/api';

const LEGACY_CAMPAIGNS_KEY = 'cronica_dado_campaigns_v1';
const THEME_KEY = 'cronica_dado_theme_v1';

type Phase =
  | { name: 'loading' }
  | { name: 'login'; registrationOpen: boolean; notice?: string | null }
  | { name: 'loading-data'; user: AccountUser }
  | { name: 'error'; user: AccountUser; message: string }
  | { name: 'game'; user: AccountUser; campaigns: Campaign[]; onServer: boolean };

/** Campanhas salvas neste navegador antes das contas existirem (se houver). */
function readLegacyCampaigns(): Campaign[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_CAMPAIGNS_KEY) ?? 'null') as Campaign[] | null;
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === 'string') : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  // Tema aplicado já na tela de login (o jogo cuida dele depois)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      document.documentElement.classList.toggle('dark', saved ? saved === 'dark' : true);
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const showLogin = useCallback(async (notice?: string | null) => {
    const { registrationOpen } = await fetchAuthConfig();
    setPhase({ name: 'login', registrationOpen, notice });
  }, []);

  const loadAccount = useCallback(async (user: AccountUser) => {
    setPhase({ name: 'loading-data', user });
    try {
      const fromServer = await fetchCampaigns();
      if (fromServer.length > 0) {
        setPhase({ name: 'game', user, campaigns: fromServer.map(hydrateCampaignGuide), onServer: true });
        return;
      }

      // Conta nova (sem campanhas): oferece importar as que existiam neste navegador.
      const legacy = readLegacyCampaigns();
      if (legacy.length > 0) {
        const importIt = window.confirm(
          `Encontramos ${legacy.length} campanha(s) salvas neste navegador.\n\nDeseja importá-las para a sua conta?`
        );
        if (importIt) {
          try {
            localStorage.setItem(`${LEGACY_CAMPAIGNS_KEY}_importado`, JSON.stringify(legacy));
            localStorage.removeItem(LEGACY_CAMPAIGNS_KEY);
          } catch {
            // cópia de segurança é só cortesia
          }
          setPhase({ name: 'game', user, campaigns: legacy.map(hydrateCampaignGuide), onServer: false });
          return;
        }
      }
      setPhase({ name: 'game', user, campaigns: [HASHID_CAMPAIGN], onServer: false });
    } catch (err) {
      setPhase({
        name: 'error',
        user,
        message: err instanceof Error ? err.message : 'Não foi possível carregar suas campanhas.',
      });
    }
  }, []);

  // Sessão existente?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await fetchMe();
        if (cancelled) return;
        if (user) await loadAccount(user);
        else await showLogin();
      } catch {
        if (!cancelled) await showLogin('Não foi possível falar com o servidor. Verifique a conexão.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAccount, showLogin]);

  // Sessão expirou durante o jogo
  useEffect(() => {
    const onExpired = () => {
      void showLogin('Sua sessão expirou. Entre novamente.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [showLogin]);

  const handleLogout = async () => {
    await logout();
    await showLogin();
  };

  if (phase.name === 'login') {
    return (
      <AuthPage
        registrationOpen={phase.registrationOpen}
        notice={phase.notice}
        onAuthenticated={(user) => void loadAccount(user)}
      />
    );
  }

  if (phase.name === 'game') {
    return (
      <Game
        key={phase.user.id}
        user={phase.user}
        initialCampaigns={phase.campaigns}
        initialOnServer={phase.onServer}
        onLogout={() => void handleLogout()}
      />
    );
  }

  if (phase.name === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F6F6F4] dark:bg-[#111317] text-zinc-900 dark:text-zinc-100">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-sm text-rose-700 dark:text-rose-300">{phase.message}</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void loadAccount(phase.user)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold cursor-pointer"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-[#343946] text-sm font-medium cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6F4] dark:bg-[#111317] text-zinc-500 dark:text-zinc-400">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
        <span>{phase.name === 'loading-data' ? 'Carregando suas campanhas…' : 'Carregando…'}</span>
      </div>
    </div>
  );
}
