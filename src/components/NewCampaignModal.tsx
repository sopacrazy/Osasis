import { useState } from 'react';
import { X } from 'lucide-react';
import type { Difficulty, PlayerAttributes } from '../types/rpg';
import { DEFAULT_DIFFICULTY, DIFFICULTIES } from '../data/difficulty';

interface NewCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreateBlank: (title: string, attributes: PlayerAttributes, difficulty: Difficulty) => void;
  onCreateHashidPreset: (difficulty: Difficulty) => void;
}

export function NewCampaignModal({
  open,
  onClose,
  onCreateBlank,
  onCreateHashidPreset,
}: NewCampaignModalProps) {
  const [mode, setMode] = useState<'blank' | 'hashid'>('blank');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [attributes, setAttributes] = useState<PlayerAttributes>({
    potencia: 2,
    agilidade: 1,
    percepcao: 0,
    engenho: -1,
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'hashid') {
      onCreateHashidPreset(difficulty);
    } else {
      onCreateBlank(title.trim() || 'Crônica Inédita', attributes, difficulty);
    }
    setTitle('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-campaign-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#17191E] text-zinc-900 dark:text-zinc-100 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-[#262932]">
          <div>
            <h2 id="new-campaign-title" className="font-display text-lg font-semibold">
              Nova Campanha
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Inicie uma aventura do zero ou restaure o cenário do Oásis da Ravina
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D]"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMode('blank')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                mode === 'blank'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-zinc-200 dark:border-[#2A2E38] hover:border-zinc-400 dark:hover:border-zinc-500'
              }`}
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Do Zero (Fluxo 1 → 2 → 3)
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Você escolhe o universo e o Mestre cria 5 raças, 5 classes e ficha.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('hashid')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                mode === 'hashid'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-zinc-200 dark:border-[#2A2E38] hover:border-zinc-400 dark:hover:border-zinc-500'
              }`}
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Oásis da Ravina (Hashid)
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Carrega ficha completa, Artox, Borin, Zuri, inventário e missões.
              </div>
            </button>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nível da campanha
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Nível da campanha">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    difficulty === d.id
                      ? `${d.badge} ring-2 ring-amber-500`
                      : 'border-zinc-200 dark:border-[#2A2E38] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {DIFFICULTIES.find((d) => d.id === difficulty)?.short} Muda a complexidade da história e o rigor das regras.
            </p>
          </div>

          {mode === 'blank' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Título da Campanha
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Sombras de Valdris, Fronteira Cinzenta..."
                  className="w-full rounded-lg border border-zinc-200 dark:border-[#2E323D] bg-zinc-50 dark:bg-[#111317] px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Atributos Iniciais nos Dados (editáveis depois)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { key: 'potencia', label: 'Potência' },
                      { key: 'agilidade', label: 'Agilidade' },
                      { key: 'percepcao', label: 'Percepção' },
                      { key: 'engenho', label: 'Engenho' },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] p-2 text-center"
                    >
                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                        {item.label}
                      </span>
                      <input
                        type="number"
                        min={-3}
                        max={6}
                        value={attributes[item.key]}
                        onChange={(e) =>
                          setAttributes((prev) => ({
                            ...prev,
                            [item.key]: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full text-center font-mono-tabular text-sm font-semibold bg-transparent focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-[#262932] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-[#2E323D] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#22252D]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            Criar Campanha
          </button>
        </div>
      </form>
    </div>
  );
}
