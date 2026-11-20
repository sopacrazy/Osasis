import { Cloud, Cpu, Loader2, Play, RefreshCw, ScrollText, Square, WifiOff } from 'lucide-react';
import type { NarratorMode } from '../services/narrator/narrator';
import { STYLE_LABELS, type NarrationStyle } from '../services/narrator/style';
import { useNarrator } from '../services/narrator/useNarrator';

const MODES: { id: NarratorMode; title: string; desc: string; icon: typeof Cloud }[] = [
  {
    id: 'chatterbox',
    title: 'Chatterbox — Voz expressiva local',
    desc: 'Voz natural com entonação, gerada no seu computador. Grátis, sem enviar texto a terceiros.',
    icon: Cloud,
  },
  {
    id: 'offline',
    title: 'Narrador do navegador',
    desc: 'Voz pt-BR do navegador/sistema. Instantânea, sem internet e sem custo.',
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
  const { settings, tts, offlineAvailable, offlineVoiceName, offlineIsLocal, generating, playing, progress, etaSeconds } =
    state;
  const offlineVoices = narrator.getOfflineVoices();
  const card =
    'rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-3';
  const select =
    'w-full rounded-md border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#14161B] px-2.5 py-1.5 text-xs';

  const ttsLine = (() => {
    if (tts === null || !tts.reachable)
      return { tone: 'warn', text: 'Serviço de voz não encontrado. Inicie o tts-service (veja NARRADOR.md). Enquanto isso o jogo usa a voz do navegador.' };
    if (tts.error) return { tone: 'bad', text: `O serviço está no ar, mas o modelo falhou: ${tts.error}` };
    if (tts.loading || !tts.ready) return { tone: 'warn', text: 'Serviço conectado. Carregando o modelo de voz (leva alguns segundos)…' };
    return { tone: 'ok', text: `Conectado · ${tts.device === 'cuda' ? 'placa de vídeo (GPU)' : 'processador (CPU)'}` };
  })();
  const slow = tts?.ready && (tts.rtf ?? (tts.device === 'cpu' ? 4 : 0)) > 1.15;

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

      {settings.mode === 'chatterbox' && (
        <div className="space-y-2.5 rounded-md border border-zinc-200 dark:border-[#2C303A] p-3">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-[11px] ${
                ttsLine.tone === 'ok'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : ttsLine.tone === 'bad'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {ttsLine.text}
            </p>
            <button
              type="button"
              onClick={() => void narrator.refreshStatus()}
              title="Atualizar estado do serviço"
              aria-label="Atualizar estado do serviço"
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {tts?.ready && (
            <p className="flex items-start gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Cpu className="w-3.5 h-3.5 shrink-0 mt-px" />
              {tts.rtf !== null
                ? `Velocidade medida: ${tts.rtf.toLocaleString('pt-BR')}× o tempo da fala. `
                : 'Velocidade ainda não medida (depende da primeira narração). '}
              {slow
                ? 'Neste computador a voz demora para ficar pronta: o texto aparece na hora e a narração toca quando todos os trechos forem gerados. Os áudios ficam guardados e repetir é instantâneo.'
                : 'Geração mais rápida que a fala: a narração toca enquanto é gerada.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-zinc-500 dark:text-zinc-400">
              Voz do narrador
              <select
                className={`${select} mt-1`}
                value={settings.voice}
                onChange={(e) => narrator.updateSettings({ voice: e.target.value })}
              >
                {(tts?.voices?.length ? tts.voices : ['padrao']).map((v) => (
                  <option key={v} value={v}>
                    {v === 'padrao' ? 'Padrão do modelo' : v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-zinc-500 dark:text-zinc-400">
              Estilo
              <select
                className={`${select} mt-1`}
                value={settings.autoStyle ? 'auto' : settings.style}
                onChange={(e) =>
                  e.target.value === 'auto'
                    ? narrator.updateSettings({ autoStyle: true })
                    : narrator.updateSettings({ autoStyle: false, style: e.target.value as NarrationStyle })
                }
              >
                <option value="auto">Automático (pela cena)</option>
                {(Object.keys(STYLE_LABELS) as NarrationStyle[]).map((k) => (
                  <option key={k} value={k}>
                    {STYLE_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            No modo automático o jogo escolhe suspense, combate, terror, tristeza, épico ou diálogo conforme o trecho.
            A voz fica a mesma durante toda a campanha.
          </p>
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
                aria-label="Voz do navegador"
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
              O que passar do limite continua escrito, mas não é narrado. Com voz local lenta, valores menores ficam
              prontos mais rápido.
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
          {generating && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Gerando a voz{progress ? ` (${progress.ready}/${progress.total} trechos)` : ''}
              {etaSeconds ? ` · cerca de ${Math.max(1, Math.round(etaSeconds))} s` : ''}…
            </p>
          )}
          {state.notice && <p className="text-[11px] text-amber-700 dark:text-amber-400">{state.notice}</p>}
        </>
      )}
    </div>
  );
}
