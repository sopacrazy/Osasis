import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Sparkles, XCircle } from 'lucide-react';
import type { ChatMessage, DiceRollRecord, PlayerAttributes } from '../types/rpg';
import { ATTRIBUTE_LABELS, findAnswer, type RollRequest } from '../utils/rollRequest';
import { DieIcon } from './DieIcon';

interface RollRequestCardProps {
  messageId: string;
  request: RollRequest;
  messages: ChatMessage[];
  attributes: PlayerAttributes;
  isPending: boolean;
  disabled: boolean;
  onRoll: (messageId: string) => void;
}

const toneStyles: Record<NonNullable<DiceRollRecord['outcomeTone']>, string> = {
  'critical-fail': 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30',
  fail: 'text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/30',
  partial: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30',
  success: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  'critical-success': 'text-emerald-700 dark:text-emerald-200 bg-emerald-500/15 border-emerald-400/40',
};

export function modifierOf(request: RollRequest, attributes: PlayerAttributes): number {
  return (request.attribute ? attributes[request.attribute] : 0) + request.adjust;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Cartão de pedido de rolagem do Mestre: uma única rolagem, com os valores da ficha. */
export function RollRequestCard({
  messageId,
  request,
  messages,
  attributes,
  isPending,
  disabled,
  onRoll,
}: RollRequestCardProps) {
  const [rolling, setRolling] = useState(false);
  const [shown, setShown] = useState<number | null>(null);
  const lock = useRef(false);

  const answer = findAnswer(messages, messageId);
  const record = answer?.roll;
  const modifier = modifierOf(request, attributes);
  const diceLabel =
    request.mode === 'normal'
      ? `${request.quantity}D${request.sides}`
      : `2D20 (${request.mode === 'advantage' ? 'vantagem' : 'desvantagem'})`;
  const attrLabel = request.attribute ? ATTRIBUTE_LABELS[request.attribute] : null;

  // animação curta de "rolando" antes de confirmar a (única) rolagem
  useEffect(() => {
    if (!rolling) return;
    const spin = setInterval(() => setShown(Math.floor(Math.random() * request.sides) + 1), 70);
    const done = setTimeout(() => {
      clearInterval(spin);
      setRolling(false);
      onRoll(messageId);
    }, 750);
    return () => {
      clearInterval(spin);
      clearTimeout(done);
    };
  }, [rolling]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (lock.current || !isPending || disabled) return; // trava: um clique, uma rolagem
    lock.current = true;
    setRolling(true);
  };

  const Icon =
    record?.outcomeTone === 'critical-fail' || record?.outcomeTone === 'fail'
      ? XCircle
      : record?.outcomeTone === 'partial'
        ? AlertTriangle
        : record?.outcomeTone === 'critical-success'
          ? Sparkles
          : CheckCircle2;

  return (
    <div className="mt-3 rounded-lg border border-amber-600/35 dark:border-amber-500/30 bg-amber-500/[0.07] p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-lg border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <DieIcon sides={request.sides === 100 ? 20 : (request.sides as 4 | 6 | 8 | 10 | 12 | 20)} className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
            O Mestre pede uma rolagem
          </div>
          <div className="font-mono-tabular text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {diceLabel}
            {attrLabel && ` + ${attrLabel}`}
            {request.adjust !== 0 && ` (situação ${signed(request.adjust)})`}
            <span className="ml-1.5 text-zinc-500 dark:text-zinc-400 font-normal">
              = {signed(modifier)} no total
            </span>
          </div>
          {request.reason && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 break-words">{request.reason}</div>
          )}
        </div>
      </div>

      {record ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="font-mono-tabular">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{record.total}</span>
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              dado {record.rolls.join(', ')}
              {record.droppedRoll !== undefined && ` (descartado ${record.droppedRoll})`}
              {record.modifier !== 0 && ` ${signed(record.modifier)}`}
            </span>
          </div>
          {record.outcomeLabel && record.outcomeTone && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${toneStyles[record.outcomeTone]}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {record.outcomeLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Lock className="w-3 h-3" /> Rolagem enviada ao Mestre
          </span>
        </div>
      ) : isPending ? (
        <button
          type="button"
          onClick={start}
          disabled={rolling || disabled}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
        >
          {rolling ? (
            <span className="font-mono-tabular text-lg">{shown ?? '…'}</span>
          ) : (
            <>
              <DieIcon sides={20} className="w-4 h-4" />
              <span>Rolar {diceLabel}</span>
            </>
          )}
        </button>
      ) : (
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <Lock className="w-3 h-3" /> Pedido encerrado (sem rolagem)
        </div>
      )}
    </div>
  );
}
