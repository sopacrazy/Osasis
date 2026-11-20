import { Loader2, Pause, Play, Repeat, Square, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useNarrator } from '../services/narrator/useNarrator';

const btn =
  'w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const idle =
  'border-amber-700/25 dark:border-amber-500/25 text-amber-800 dark:text-amber-300 hover:bg-amber-600/10';

/** Controles rápidos do narrador (cabeçalho do chat). A configuração completa fica em Configurações. */
export function NarratorControls() {
  const { state, narrator } = useNarrator();
  const { settings, generating, playing, paused, usingFallback, notice, hasLast } = state;
  const textOnly = settings.mode === 'text';
  const offline = settings.mode === 'offline' || usingFallback;

  return (
    <div className="flex flex-col items-end gap-1 min-w-0">
      <div className="flex items-center gap-1.5 rounded-lg border border-amber-700/30 dark:border-amber-500/25 bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-[#241d12] dark:to-[#1b1710] px-1.5 py-1">
        <button
          type="button"
          onClick={() => narrator.updateSettings({ enabled: !settings.enabled })}
          aria-pressed={settings.enabled}
          title={settings.enabled ? 'Desativar narração por voz' : 'Ativar narração por voz'}
          aria-label="Ativar ou desativar a narração por voz"
          className={`${btn} ${
            settings.enabled
              ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-500'
              : idle
          }`}
        >
          {settings.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {settings.enabled && !textOnly && (
          <>
            {playing && (
              <button
                type="button"
                onClick={() => (paused ? narrator.resume() : narrator.pause())}
                title={paused ? 'Continuar' : 'Pausar'}
                aria-label={paused ? 'Continuar narração' : 'Pausar narração'}
                className={`${btn} ${idle}`}
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}
            {(playing || generating) && (
              <button
                type="button"
                onClick={() => narrator.stop()}
                title="Interromper"
                aria-label="Interromper narração"
                className={`${btn} ${idle}`}
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => narrator.replay()}
              disabled={!hasLast}
              title="Repetir a última narração"
              aria-label="Repetir a última narração"
              className={`${btn} ${idle}`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => narrator.updateSettings({ volume: Number(e.target.value) })}
              aria-label="Volume da narração"
              title={`Volume: ${Math.round(settings.volume * 100)}%`}
              className="hidden sm:block w-16 accent-amber-600 cursor-pointer"
            />
          </>
        )}

        {settings.enabled && generating && (
          <span className="inline-flex items-center gap-1 pl-1 pr-1.5 text-[11px] text-amber-800 dark:text-amber-300 whitespace-nowrap">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Gerando voz…</span>
          </span>
        )}
        {settings.enabled && !generating && playing && !paused && (
          <span className="pl-1 pr-1.5 text-[11px] text-amber-800 dark:text-amber-300 whitespace-nowrap hidden sm:inline">
            Narrando
          </span>
        )}
        {settings.enabled && offline && !textOnly && (
          <span
            title="Narrador offline (voz do navegador, sem custo)"
            className="inline-flex items-center gap-1 px-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 whitespace-nowrap"
          >
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
      </div>
      {settings.enabled && notice && (
        <p className="max-w-[260px] text-right text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          {notice}
        </p>
      )}
    </div>
  );
}
