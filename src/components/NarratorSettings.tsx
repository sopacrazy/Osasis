import { useState } from 'react';
import { Cloud, Loader2, Play, ScrollText, Square, WifiOff } from 'lucide-react';
import type { NarratorMode } from '../services/narrator/narrator';
import { useNarrator } from '../services/narrator/useNarrator';

const MODES: { id: NarratorMode; title: string; desc: string; icon: typeof Cloud }[] = [
  {
    id: 'elevenlabs',
    title: 'ElevenLabs — Narrador Cinematográfico',
    desc: 'Voz realista e expressiva (Flash v2.5). Exige internet e créditos.',
    icon: Cloud,
  },
  {
    id: 'offline',
    title: 'Narrador Offline',
    desc: 'Voz pt-BR do próprio navegador/sistema. Sem internet e sem custo.',
    icon: WifiOff,
  },
  {
    id: 'text',
    title: 'Somente Texto',
    desc: 'Sem áudio. Funciona 100% offline.',
    icon: ScrollText,
  },
];

export function NarratorSettings() {
  const { state, narrator } = useNarrator();
  const { settings, eleven, offlineAvailable, offlineVoiceName, offlineIsLocal, generating, playing } = state;
  const [voices, setVoices] = useState<{ voiceId: string; name: string; labels: Record<string, string> }[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const loadVoices = async () => {
    setLoadingVoices(true);
    setVoiceError(null);
    try {
      setVoices(await narrator.listElevenVoices());
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Não foi possível listar as vozes.');
    } finally {
      setLoadingVoices(false);
    }
  };

  const used = eleven?.usage.estimatedCredits ?? 0;
  const budget = eleven?.usage.monthlyCreditBudget ?? 0;
  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const offlineVoices = narrator.getOfflineVoices();
  const card =
    'rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-3';
  const select =
    'w-full rounded-md border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#14161B] px-2.5 py-1.5 text-xs';

  return (
    <div className={card}>
      <div>
        <span className="block text-sm font-medium">Narrador por voz</span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
          O Mestre é lido em voz alta enquanto o texto aparece.
        </span>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Modo de narração">
        {MODES.map(({ id, title, desc, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={settings.mode === id}
            onClick={() => narrator.updateSettings({ mode: id })}
            className={`w-full text-left flex gap-2.5 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
              settings.mode === id
                ? 'border-amber-500 bg-amber-600/10'
                : 'border-zinc-200 dark:border-[#2C303A] hover:border-amber-500/60'
            }`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <span className="block text-xs font-semibold">{title}</span>
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      {settings.mode === 'elevenlabs' && (
        <div className="space-y-2 rounded-md border border-zinc-200 dark:border-[#2C303A] p-3">
          {eleven === null && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Servidor de voz inacessível. A narração usará o modo offline, se disponível.
            </p>
          )}
          {eleven && !eleven.configured && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              ELEVENLABS_API_KEY não está configurada no .env do servidor. A narração usará o modo offline.
            </p>
          )}

          <label className="block text-[11px] text-zinc-500 dark:text-zinc-400">
            Voz do narrador
            {settings.voiceName && (
              <span className="ml-1 font-semibold text-zinc-700 dark:text-zinc-200">({settings.voiceName})</span>
            )}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadVoices}
              disabled={loadingVoices || !eleven?.configured}
              className="px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-[#343946] text-xs font-medium hover:bg-zinc-100 dark:hover:bg-[#22252D] disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              {loadingVoices ? 'Carregando…' : 'Listar vozes da conta'}
            </button>
            {voices.length > 0 && (
              <select
                className={select}
                value={settings.voiceId}
                onChange={(e) => {
                  const v = voices.find((x) => x.voiceId === e.target.value);
                  narrator.updateSettings({ voiceId: e.target.value, voiceName: v?.name ?? '' });
                }}
              >
                <option value="">Padrão do servidor (.env)</option>
                {voices.map((v) => (
                  <option key={v.voiceId} value={v.voiceId}>
                    {v.name}
                    {v.labels.gender ? ` · ${v.labels.gender}` : ''}
                    {v.labels.age ? ` · ${v.labels.age}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <input
            type="text"
            value={settings.voiceId}
            onChange={(e) => narrator.updateSettings({ voiceId: e.target.value.trim(), voiceName: '' })}
            placeholder="voice_id (vazio = ELEVENLABS_VOICE_ID do .env)"
            className={select}
            aria-label="voice_id da ElevenLabs"
          />
          {voiceError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{voiceError}</p>}

          {eleven && eleven.configured && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Consumo estimado neste mês ({eleven.usage.month})</span>
                <span className="font-mono-tabular">
                  ~{used.toLocaleString('pt-BR')} / {budget.toLocaleString('pt-BR')} créditos
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-[#2A2E38] overflow-hidden">
                <div className="h-full bg-amber-600" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Estimativa local calculada pelo jogo (caracteres × créditos por caractere). Não é o saldo oficial da
                ElevenLabs: consulte o painel deles para o saldo real. Áudios em cache não consomem créditos.
              </p>
            </div>
          )}
        </div>
      )}

      {settings.mode === 'offline' && (
        <div className="space-y-2 rounded-md border border-zinc-200 dark:border-[#2C303A] p-3">
          {offlineAvailable ? (
            <>
              <select
                className={select}
                value={settings.offlineVoiceURI}
                onChange={(e) => narrator.updateSettings({ offlineVoiceURI: e.target.value })}
                aria-label="Voz offline"
              >
                <option value="">Automática ({offlineVoiceName})</option>
                {offlineVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}){v.localService ? ' · local' : ' · online'}
                  </option>
                ))}
              </select>
              {!offlineIsLocal && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  A voz atual é de um serviço online do navegador e pode não funcionar sem internet. Escolha uma voz
                  marcada como "local".
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Nenhuma voz em português encontrada neste navegador/sistema. No Windows: Configurações → Hora e idioma →
              Fala → Adicionar vozes → Português (Brasil). Depois reabra o navegador.
            </p>
          )}
        </div>
      )}

      {settings.mode !== 'text' && (
        <>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Limite por narração</span>
              <span className="font-mono-tabular">{settings.maxChars} caracteres</span>
            </div>
            <input
              type="range"
              min={100}
              max={1200}
              step={50}
              value={settings.maxChars}
              onChange={(e) => narrator.updateSettings({ maxChars: Number(e.target.value) })}
              aria-label="Limite de caracteres por narração"
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              O que passar do limite continua escrito, mas não é narrado. Sugestão: 200–400.
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={settings.onlyImportant}
              onChange={(e) => narrator.updateSettings({ onlyImportant: e.target.checked })}
              className="mt-0.5 accent-amber-600"
            />
            <span>
              Narrar só cenas importantes
              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                Ignora respostas curtas (menos de 300 caracteres de narração). Ajustes técnicos nunca são narrados.
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-xs">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => narrator.updateSettings({ volume: Number(e.target.value) })}
              aria-label="Volume da narração"
              className="flex-1 accent-amber-600 cursor-pointer"
            />
            <span className="w-9 text-right font-mono-tabular text-xs">{Math.round(settings.volume * 100)}%</span>
          </div>

          <button
            type="button"
            onClick={() => (playing || generating ? narrator.stop() : narrator.testVoice())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : playing ? (
              <Square className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {playing || generating ? 'Parar' : 'Testar voz'}
          </button>
          {state.notice && <p className="text-[11px] text-amber-700 dark:text-amber-400">{state.notice}</p>}
        </>
      )}
    </div>
  );
}
