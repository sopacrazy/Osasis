import { NarratorSettings } from './NarratorSettings';
import { X, Music, VolumeX, Type as TypeIcon, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  chatFontSize: number;
  onChangeChatFontSize: (size: number) => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  musicVolume: number;
  onChangeMusicVolume: (volume: number) => void;
}

export function SettingsModal({
  open,
  onClose,
  chatFontSize,
  onChangeChatFontSize,
  musicEnabled,
  onToggleMusic,
  musicVolume,
  onChangeMusicVolume,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-xl border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#17191E] text-zinc-900 dark:text-zinc-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-[#262932]">
          <div>
            <h2 id="settings-modal-title" className="font-display text-lg font-semibold">
              Configurações
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Leitura e ambiente da mesa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D]"
            aria-label="Fechar configurações"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Chat Font Size Slider */}
          <div className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">Tamanho do texto do chat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  {chatFontSize}px
                </span>
                {chatFontSize !== 15 && (
                  <button
                    type="button"
                    onClick={() => onChangeChatFontSize(15)}
                    title="Restaurar padrão (15px)"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    aria-label="Restaurar tamanho padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 font-mono-tabular">A-</span>
              <input
                type="range"
                min={12}
                max={22}
                step={1}
                value={chatFontSize}
                onChange={(e) => onChangeChatFontSize(Number(e.target.value))}
                aria-label="Tamanho do texto do chat"
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-mono-tabular">
                A+
              </span>
            </div>

            <p
              style={{ fontSize: `${chatFontSize}px` }}
              className="rounded-md border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#14161B] px-3 py-2 text-zinc-700 dark:text-zinc-200 leading-relaxed"
            >
              Prévia: O vento do cânion traz o cheiro de sal e cinzas antes do amanhecer.
            </p>
          </div>

          {/* Background Music Toggle & Volume */}
          <div className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-zinc-50/70 dark:bg-[#1C1F26] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {musicEnabled ? (
                  <Music className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                )}
                <div>
                  <span className="block text-sm font-medium">Música de fundo</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    Ambiência sonora suave durante a campanha
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleMusic}
                aria-pressed={musicEnabled}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  musicEnabled
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'border border-zinc-300 dark:border-[#343946] bg-white dark:bg-[#14161B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#22252D]'
                }`}
              >
                {musicEnabled ? 'Ativada' : 'Desativada'}
              </button>
            </div>

            {musicEnabled && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Volume</span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) => onChangeMusicVolume(Number(e.target.value))}
                  aria-label="Volume da música de fundo"
                  className="flex-1 accent-amber-600 cursor-pointer"
                />
                <span className="w-9 text-right font-mono-tabular text-xs text-zinc-600 dark:text-zinc-300">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
            )}
          </div>
          <NarratorSettings />
        </div>

        <div className="px-5 py-3 border-t border-zinc-200 dark:border-[#262932] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
