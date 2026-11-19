import type { DiceRollRecord, DieSides, RollMode } from '../types/rpg';

function randomInt(max: number): number {
  // 1..max, com fonte criptográfica quando disponível
  if (typeof globalThis.crypto !== 'undefined') {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return (buf[0] % max) + 1;
  }
  return Math.floor(Math.random() * max) + 1;
}

export function evaluateD20Outcome(
  naturalDie: number,
  total: number
): { label: string; tone: NonNullable<DiceRollRecord['outcomeTone']> } {
  if (naturalDie === 1) {
    return { label: '1 Natural · Falha Crítica', tone: 'critical-fail' };
  }
  if (naturalDie === 20 || total >= 19) {
    return {
      label: naturalDie === 20 ? '20 Natural · Sucesso Crítico' : '19+ · Sucesso Crítico',
      tone: 'critical-success',
    };
  }
  if (total <= 8) {
    return { label: '2–8 · Falha / Complicação', tone: 'fail' };
  }
  if (total <= 13) {
    return { label: '9–13 · Sucesso Parcial', tone: 'partial' };
  }
  return { label: '14–18 · Sucesso Limpo', tone: 'success' };
}

export function formatRollForChat(record: DiceRollRecord): string {
  const diePart =
    record.mode === 'advantage' && record.droppedRoll !== undefined
      ? `2D20 Vantagem (${record.rolls[0]} | desc. ${record.droppedRoll})`
      : record.mode === 'disadvantage' && record.droppedRoll !== undefined
        ? `2D20 Desvantagem (${record.rolls[0]} | desc. ${record.droppedRoll})`
        : `${record.quantity}D${record.sides} (${record.rolls.join(', ')})`;

  const modPart =
    record.modifier !== 0 || record.modifierLabel
      ? ` ${record.modifier >= 0 ? `+ ${record.modifier}` : `- ${Math.abs(record.modifier)}`}${
          record.modifierLabel ? ` ${record.modifierLabel}` : ''
        }`
      : '';

  return `[Rolagem: ${diePart}${modPart} = ${record.total}]`;
}

export interface RollParams {
  sides: DieSides;
  quantity: number;
  mode: RollMode;
  modifier: number;
  modifierLabel?: string;
}

/** Faz UMA rolagem e devolve o registro completo (dados, modificador, total e faixa de resultado). */
export function performRoll({ sides, quantity, mode, modifier, modifierLabel }: RollParams): DiceRollRecord {
  const effectiveMode: RollMode = sides === 20 && quantity === 1 ? mode : 'normal';
  let rolls: number[] = [];
  let droppedRoll: number | undefined;

  if (effectiveMode === 'advantage' || effectiveMode === 'disadvantage') {
    const r1 = randomInt(20);
    const r2 = randomInt(20);
    rolls = [effectiveMode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2)];
    droppedRoll = effectiveMode === 'advantage' ? Math.min(r1, r2) : Math.max(r1, r2);
  } else {
    for (let i = 0; i < quantity; i++) rolls.push(randomInt(sides));
  }

  const total = rolls.reduce((acc, v) => acc + v, 0) + modifier;
  let outcomeLabel: string | undefined;
  let outcomeTone: DiceRollRecord['outcomeTone'] | undefined;
  if (sides === 20 && rolls.length === 1) {
    const o = evaluateD20Outcome(rolls[0], total);
    outcomeLabel = o.label;
    outcomeTone = o.tone;
  }

  return {
    id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    sides,
    quantity: effectiveMode === 'normal' ? quantity : 2,
    rolls,
    droppedRoll,
    mode: effectiveMode,
    modifier,
    modifierLabel,
    total,
    outcomeLabel,
    outcomeTone,
  };
}
