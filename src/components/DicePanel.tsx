import { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  SlidersHorizontal,
  History,
} from 'lucide-react';
import type { AttributeKey, DiceRollRecord, DieSides, PlayerAttributes, RollMode } from '../types/rpg';
import { DieIcon } from './DieIcon';
import { playDiceRollSound } from '../utils/sound';
import { performRoll } from '../utils/dice';

interface DicePanelProps {
  attributes: PlayerAttributes;
  onUpdateAttributes: (next: PlayerAttributes) => void;
  rollHistory: DiceRollRecord[];
  onAddRoll: (record: DiceRollRecord) => void;
  onClearHistory: () => void;
}

const DIE_TYPES: DieSides[] = [4, 6, 8, 10, 12, 20, 100];

const ATTR_META: { key: AttributeKey; short: string; label: string }[] = [
  { key: 'potencia', short: 'Pot', label: 'Potência' },
  { key: 'agilidade', short: 'Agi', label: 'Agilidade' },
  { key: 'percepcao', short: 'Per', label: 'Percepção' },
  { key: 'engenho', short: 'Eng', label: 'Engenho' },
];



export function DicePanel({
  attributes,
  onUpdateAttributes,
  rollHistory,
  onAddRoll,
  onClearHistory,
}: DicePanelProps) {
  const [selectedDie, setSelectedDie] = useState<DieSides>(20);
  const [quantity, setQuantity] = useState<number>(1);
  const [mode, setMode] = useState<RollMode>('normal');
  const [modifier, setModifier] = useState<number>(0);
  const [activeAttrKey, setActiveAttrKey] = useState<AttributeKey | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [editingAttrs, setEditingAttrs] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isRollingAnim, setIsRollingAnim] = useState<boolean>(false);

  const latestRoll = rollHistory[0] ?? null;

  const handleSelectAttribute = (key: AttributeKey) => {
    if (activeAttrKey === key) {
      setActiveAttrKey(null);
      setModifier(0);
    } else {
      setActiveAttrKey(key);
      setModifier(attributes[key]);
    }
  };

  const handleAdjustAttrValue = (key: AttributeKey, delta: number) => {
    const nextVal = Math.max(-5, Math.min(10, attributes[key] + delta));
    const nextAttrs = { ...attributes, [key]: nextVal };
    onUpdateAttributes(nextAttrs);
    if (activeAttrKey === key) {
      setModifier(nextVal);
    }
  };

  const handleRoll = (overrideDie?: DieSides) => {
    const die = overrideDie ?? selectedDie;
    if (overrideDie) {
      setSelectedDie(overrideDie);
    }

    const record = performRoll({
      sides: die,
      quantity,
      mode,
      modifier,
      modifierLabel: activeAttrKey ? ATTR_META.find((a) => a.key === activeAttrKey)?.label : undefined,
    });
    const outcomeTone = record.outcomeTone;

    if (soundEnabled) {
      playDiceRollSound(
        outcomeTone === 'critical-success',
        outcomeTone === 'critical-fail'
      );
    }

    setIsRollingAnim(true);
    setTimeout(() => setIsRollingAnim(false), 180);
    onAddRoll(record);
  };

  const renderOutcomeBadge = (record: DiceRollRecord) => {
    if (!record.outcomeLabel || !record.outcomeTone) return null;

    const toneStyles: Record<NonNullable<DiceRollRecord['outcomeTone']>, string> = {
      'critical-fail': 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30',
      fail: 'text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/30',
      partial: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30',
      success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
      'critical-success': 'text-emerald-700 dark:text-emerald-200 bg-emerald-500/15 border-emerald-400/40',
    };

    const Icon =
      record.outcomeTone === 'critical-fail' || record.outcomeTone === 'fail'
        ? XCircle
        : record.outcomeTone === 'partial'
          ? AlertTriangle
          : record.outcomeTone === 'critical-success'
            ? Sparkles
            : CheckCircle2;

    return (
      <div
        className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${toneStyles[record.outcomeTone]}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{record.outcomeLabel}</span>
      </div>
    );
  };

  return (
    <aside className="flex flex-col h-full bg-[#F6F6F4] dark:bg-[#14161B] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#17191E] shrink-0">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Dados de Mesa
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Toque na arena para rolar · mestre não interfere
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHistory((h) => !h)}
            title="Alternar histórico de rolagens"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showHistory
                ? 'bg-amber-600/12 text-amber-700 dark:text-amber-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#22252D]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="font-mono-tabular">{rollHistory.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Silenciar som dos dados' : 'Ativar som dos dados'}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#22252D] transition-colors"
            aria-label={soundEnabled ? 'Silenciar som dos dados' : 'Ativar som dos dados'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area: Either History List OR Tap-Anywhere Dice Arena */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Histórico de Rolagens
            </span>
            {rollHistory.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
          {rollHistory.length === 0 ? (
            <p className="text-xs text-zinc-500 py-10 text-center border border-dashed border-zinc-200 dark:border-[#262932] rounded-xl">
              Nenhuma rolagem feita nesta campanha ainda.
            </p>
          ) : (
            rollHistory.map((roll) => (
              <div
                key={roll.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#1B1E24] px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-mono-tabular font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {roll.total}{' '}
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      · {roll.quantity}D{roll.sides} ({roll.rolls.join(',')})
                      {roll.modifier !== 0
                        ? roll.modifier > 0
                          ? ` +${roll.modifier}`
                          : ` ${roll.modifier}`
                        : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {roll.timestamp}
                    {roll.outcomeLabel ? ` · ${roll.outcomeLabel}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-4 gap-3 overflow-y-auto">
          {/* Tap-Anywhere Roll Stage */}
          <button
            type="button"
            onClick={() => handleRoll()}
            className="flex-1 min-h-[210px] w-full rounded-xl border border-zinc-200 dark:border-[#2A2E38] bg-white dark:bg-[#1A1D24] hover:border-amber-500/60 dark:hover:border-amber-500/50 active:scale-[0.99] transition-all flex flex-col items-center justify-center p-5 text-center cursor-pointer select-none"
          >
            <div
              className={`transition-transform duration-150 ${
                isRollingAnim ? 'scale-90 rotate-6' : 'scale-100 rotate-0'
              }`}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-600/12 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                <DieIcon sides={selectedDie} className="w-8 h-8" />
              </div>
            </div>

            {latestRoll ? (
              <>
                <div className="text-xs font-mono-tabular text-zinc-500 dark:text-zinc-400">
                  {latestRoll.mode === 'advantage'
                    ? '2D20 Vantagem'
                    : latestRoll.mode === 'disadvantage'
                      ? '2D20 Desvantagem'
                      : `${latestRoll.quantity}D${latestRoll.sides}`}
                  {latestRoll.modifier !== 0
                    ? ` ${latestRoll.modifier > 0 ? `+ ${latestRoll.modifier}` : `- ${Math.abs(latestRoll.modifier)}`}`
                    : ''}
                  {latestRoll.modifierLabel ? ` (${latestRoll.modifierLabel})` : ''}
                </div>
                <div className="mt-1 font-mono-tabular text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {latestRoll.total}
                </div>
                <div className="mt-1.5 text-xs font-mono-tabular text-zinc-500 dark:text-zinc-400">
                  Dado: [{latestRoll.rolls.join(', ')}]
                  {latestRoll.droppedRoll !== undefined && ` · desc. ${latestRoll.droppedRoll}`}
                </div>
                {renderOutcomeBadge(latestRoll)}
              </>
            ) : (
              <>
                <div className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Toque aqui para rolar{' '}
                  {selectedDie === 20 && quantity === 1 && mode !== 'normal' ? '2' : quantity}D
                  {selectedDie}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Escolha o dado na barra abaixo ou aplique seu atributo
                </p>
              </>
            )}

            <span className="mt-4 text-[11px] text-zinc-400 dark:text-zinc-500">
              Clique em qualquer ponto desta área para rolar novamente
            </span>
          </button>

          <p className="text-[11px] text-center text-zinc-500 dark:text-zinc-400 shrink-0">
            Bandeja livre: estas rolagens não vão para o Mestre. As rolagens do jogo são feitas no cartão que o Mestre
            apresenta no chat.
          </p>

          {/* Compact Controls: Quantity, Modifier & Attributes */}
          <div className="space-y-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-white dark:bg-[#1B1E24] px-2.5 py-1.5">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Qtd</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded border border-zinc-200 dark:border-[#2D313B] disabled:opacity-35"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-mono-tabular text-xs font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    disabled={quantity >= 10}
                    className="w-7 h-7 flex items-center justify-center rounded border border-zinc-200 dark:border-[#2D313B] disabled:opacity-35"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-white dark:bg-[#1B1E24] px-2.5 py-1.5">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Mod</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttrKey(null);
                      setModifier((m) => Math.max(-10, m - 1));
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded border border-zinc-200 dark:border-[#2D313B]"
                    aria-label="Diminuir modificador"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-mono-tabular text-xs font-semibold">
                    {modifier >= 0 ? `+${modifier}` : modifier}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttrKey(null);
                      setModifier((m) => Math.min(15, m + 1));
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded border border-zinc-200 dark:border-[#2D313B]"
                    aria-label="Aumentar modificador"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {selectedDie === 20 && quantity === 1 && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-200/75 dark:bg-[#1B1E24] border border-zinc-200 dark:border-[#2A2E38]">
                {(
                  [
                    { id: 'normal', label: 'Normal' },
                    { id: 'advantage', label: 'Vantagem' },
                    { id: 'disadvantage', label: 'Desvantagem' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`flex-1 py-1 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                      mode === opt.id
                        ? 'bg-white dark:bg-[#2A2E38] text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Attribute Modifiers */}
            <div className="rounded-lg border border-zinc-200 dark:border-[#2A2E38] bg-white dark:bg-[#1B1E24] p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Atributos rápidos
                </span>
                <button
                  type="button"
                  onClick={() => setEditingAttrs((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{editingAttrs ? 'Pronto' : 'Editar'}</span>
                </button>
              </div>
              {!editingAttrs ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {ATTR_META.map((attr) => {
                    const val = attributes[attr.key];
                    const isSelected = activeAttrKey === attr.key;
                    return (
                      <button
                        key={attr.key}
                        type="button"
                        onClick={() => handleSelectAttribute(attr.key)}
                        className={`py-1 px-1 rounded border text-center transition-colors ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300'
                            : 'border-zinc-200 dark:border-[#2D313B] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#252932]'
                        }`}
                      >
                        <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                          {attr.short}
                        </span>
                        <span className="block font-mono-tabular text-xs font-semibold">
                          {val >= 0 ? `+${val}` : val}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {ATTR_META.map((attr) => {
                    const val = attributes[attr.key];
                    return (
                      <div key={attr.key} className="flex items-center justify-between text-[11px] px-1">
                        <span>{attr.short}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustAttrValue(attr.key, -1)}
                            className="w-5 h-5 rounded border border-zinc-200 dark:border-[#2D313B]"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-mono-tabular font-semibold">
                            {val >= 0 ? `+${val}` : val}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustAttrValue(attr.key, 1)}
                            className="w-5 h-5 rounded border border-zinc-200 dark:border-[#2D313B]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Polyhedral Die Selection Bar (thumb-friendly) */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-[#262932] bg-white dark:bg-[#17191E] p-2.5">
        <div className="grid grid-cols-7 gap-1">
          {DIE_TYPES.map((die) => {
            const active = selectedDie === die;
            return (
              <button
                key={die}
                type="button"
                onClick={() => {
                  setSelectedDie(die);
                  setShowHistory(false);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg border text-[11px] font-mono-tabular font-semibold transition-colors min-h-[46px] cursor-pointer ${
                  active
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-zinc-50 dark:bg-[#1D2027] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#2A2E38] hover:border-zinc-400'
                }`}
              >
                <DieIcon sides={die} className="w-3.5 h-3.5" />
                <span>D{die}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
