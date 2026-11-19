import { useState } from 'react';
import { AlertCircle, Loader2, Send, Sparkles, X } from 'lucide-react';
import type { CharacterSheet, ChatMessage, Difficulty, PlayerAttributes } from '../types/rpg';
import { suggestCharacter } from '../services/character';
import {
  assignAttribute,
  ATTR_NAMES,
  ATTR_ORDER,
  ATTR_VALUES,
  DEFAULT_EQUIPMENT,
  emptySheet,
  sheetErrors,
} from '../utils/characterSheet';

interface CharacterSheetModalProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  difficulty: Difficulty | undefined;
  onSave: (sheet: CharacterSheet) => void;
}

const field =
  'w-full rounded-lg border border-zinc-200 dark:border-[#2E323D] bg-zinc-50 dark:bg-[#111317] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500';
const label = 'block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';
const sectionTitle = 'font-display text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2.5';
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Formulário de ficha do personagem, com preenchimento automático conforme o universo da campanha. */
export function CharacterSheetModal({ open, onClose, messages, difficulty, onSave }: CharacterSheetModalProps) {
  const [sheet, setSheet] = useState<CharacterSheet>(emptySheet);
  const [attrsTouched, setAttrsTouched] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  if (!open) return null;

  const set = <K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) =>
    setSheet((s) => ({ ...s, [key]: value }));

  const handleAutoFill = async () => {
    setSuggesting(true);
    setSuggestError(null);
    setErrors([]);
    try {
      // 1ª vez: completa só o que está vazio. Depois: "Sugerir outra" refaz tudo.
      const current = autoFilled
        ? undefined
        : {
            name: sheet.name,
            race: sheet.race,
            className: sheet.className,
            origin: sheet.origin,
            classAbility: sheet.classAbility,
            companion: sheet.companion,
            skill1: sheet.skills[0],
            skill2: sheet.skills[1],
          };
      const s = await suggestCharacter(messages, difficulty, current);
      setSheet((prev) => {
        const keep = (mine: string, theirs: string) => (!autoFilled && mine.trim() ? mine : theirs);
        const equipmentIsDefault = prev.equipment.join('|') === DEFAULT_EQUIPMENT.join('|');
        return {
          ...prev,
          name: keep(prev.name, s.name),
          race: keep(prev.race, s.race),
          className: keep(prev.className, s.className),
          origin: keep(prev.origin, s.origin),
          classAbility: keep(prev.classAbility, s.classAbility),
          companion: keep(prev.companion, s.companion),
          skills: [keep(prev.skills[0], s.skills[0]), keep(prev.skills[1], s.skills[1])],
          attributes: !autoFilled && attrsTouched ? prev.attributes : s.attributes,
          equipment: !autoFilled && !equipmentIsDefault ? prev.equipment : s.equipment.length ? s.equipment : prev.equipment,
        };
      });
      setAutoFilled(true);
      setAttrsTouched(false);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Não foi possível sugerir a ficha agora.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const problems = sheetErrors(sheet);
    setErrors(problems);
    if (problems.length > 0) return;
    onSave(sheet);
    setSheet(emptySheet());
    setAutoFilled(false);
    setAttrsTouched(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-modal-title"
    >
      <form
        onSubmit={handleSave}
        noValidate
        className="w-full max-w-2xl max-h-[94vh] flex flex-col rounded-xl border border-zinc-200 dark:border-[#2C303A] bg-white dark:bg-[#17191E] text-zinc-900 dark:text-zinc-100 shadow-xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-200 dark:border-[#262932] shrink-0">
          <div>
            <h2 id="sheet-modal-title" className="font-display text-lg font-semibold">
              Ficha do personagem
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Preencha à mão ou use o preenchimento automático conforme o universo da sua campanha.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D] cursor-pointer"
            aria-label="Fechar ficha"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {(errors.length > 0 || suggestError) && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {suggestError && <p>{suggestError}</p>}
                {errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            </div>
          )}

          <section>
            <h3 className={sectionTitle}>Identidade</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="block sm:col-span-3">
                <span className={label}>Nome *</span>
                <input className={field} value={sheet.name} onChange={(e) => set('name', e.target.value)} maxLength={60} placeholder="Nome do personagem" />
              </label>
              <label className="block sm:col-span-1">
                <span className={label}>Raça *</span>
                <input className={field} value={sheet.race} onChange={(e) => set('race', e.target.value)} maxLength={40} placeholder="Ex.: Elfo" />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Classe *</span>
                <input className={field} value={sheet.className} onChange={(e) => set('className', e.target.value)} maxLength={40} placeholder="Ex.: Patrulheiro" />
              </label>
              <label className="block sm:col-span-3">
                <span className={label}>Origem / histórico curto</span>
                <textarea className={`${field} resize-y`} rows={2} value={sheet.origin} onChange={(e) => set('origin', e.target.value)} maxLength={400} placeholder="De onde você vem e o que o trouxe até aqui" />
              </label>
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Atributos</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5">
              Distribua +2, +1, 0 e −1: cada valor só pode ser usado uma vez (ao escolher um valor já usado, os dois trocam de lugar).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ATTR_ORDER.map((k) => (
                <label key={k} className="block rounded-lg border border-zinc-200 dark:border-[#2A2E38] p-2.5">
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">{ATTR_NAMES[k]}</span>
                  <select
                    value={sheet.attributes[k]}
                    onChange={(e) => {
                      setAttrsTouched(true);
                      set('attributes', assignAttribute(sheet.attributes as PlayerAttributes, k, Number(e.target.value)));
                    }}
                    className="w-full bg-transparent font-mono-tabular text-base font-semibold focus:outline-none cursor-pointer"
                  >
                    {ATTR_VALUES.map((v) => (
                      <option key={v} value={v} className="text-zinc-900">
                        {signed(v)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Perícias e habilidade</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Perícia 1 (+1) *</span>
                <input className={field} value={sheet.skills[0]} onChange={(e) => set('skills', [e.target.value, sheet.skills[1]])} maxLength={60} placeholder="Ex.: Rastreamento" />
              </label>
              <label className="block">
                <span className={label}>Perícia 2 (+1) *</span>
                <input className={field} value={sheet.skills[1]} onChange={(e) => set('skills', [sheet.skills[0], e.target.value])} maxLength={60} placeholder="Ex.: Furtividade" />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Habilidade de classe *</span>
                <input className={field} value={sheet.classAbility} onChange={(e) => set('classAbility', e.target.value)} maxLength={200} placeholder="Ex.: Tiro certeiro (1 uso por descanso)" />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Companheiro / aliado</span>
                <input className={field} value={sheet.companion} onChange={(e) => set('companion', e.target.value)} maxLength={120} placeholder="Nenhum" />
              </label>
            </div>
          </section>

          <section>
            <h3 className={sectionTitle}>Equipamentos e dinheiro</h3>
            <label className="block mb-3">
              <span className={label}>Equipamentos iniciais (um por linha)</span>
              <textarea
                className={`${field} resize-y font-mono-tabular text-[13px]`}
                rows={5}
                value={sheet.equipment.join('\n')}
                onChange={(e) => set('equipment', e.target.value.split('\n'))}
                placeholder={'Mochila\nCantil de água\n3 dias de ração'}
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ['gold', 'Ouro'],
                  ['silver', 'Prata'],
                  ['copper', 'Cobre'],
                ] as const
              ).map(([k, name]) => (
                <label key={k} className="block">
                  <span className={label}>{name}</span>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    className={`${field} font-mono-tabular`}
                    value={sheet[k]}
                    onChange={(e) => set(k, Math.max(0, Math.min(9999, Math.trunc(Number(e.target.value)) || 0)))}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-[#262932] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleAutoFill()}
            disabled={suggesting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-600/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 disabled:opacity-60 text-xs font-semibold cursor-pointer"
          >
            {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {suggesting ? 'Criando sugestão…' : autoFilled ? 'Sugerir outra' : 'Preencher automático'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-[#2E323D] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#22252D] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={suggesting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Salvar e enviar ao Mestre
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
