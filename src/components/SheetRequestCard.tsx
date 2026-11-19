import { CheckCircle2, ClipboardList } from 'lucide-react';
import type { CharacterSheet, ChatMessage } from '../types/rpg';

interface SheetRequestCardProps {
  messageId: string;
  messages: ChatMessage[];
  character?: CharacterSheet;
  disabled: boolean;
  onOpen: (messageId: string) => void;
}

/** Cartão do pedido de ficha do Mestre: abre o formulário (ou mostra que a ficha já foi enviada). */
export function SheetRequestCard({ messageId, messages, character, disabled, onOpen }: SheetRequestCardProps) {
  const answered = messages.some((m) => m.role === 'user' && m.sheetAnswerTo === messageId);

  return (
    <div className="mt-3 rounded-lg border border-amber-600/35 dark:border-amber-500/30 bg-amber-500/[0.07] p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-lg border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
          {answered ? <CheckCircle2 className="w-6 h-6" /> : <ClipboardList className="w-6 h-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {answered ? 'Ficha enviada ao Mestre' : 'O Mestre pede a ficha do seu personagem'}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 break-words">
            {answered && character
              ? `${character.name} · ${character.race} ${character.className}`
              : 'Preencha o formulário (ou use o preenchimento automático) e envie.'}
          </div>
        </div>
      </div>
      {!answered && (
        <button
          type="button"
          onClick={() => onOpen(messageId)}
          disabled={disabled}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          Preencher ficha
        </button>
      )}
    </div>
  );
}
