import type { AttributeKey, ChatMessage, DieSides, RollMode } from '../types/rpg';

/**
 * Pedido de rolagem do Mestre. Formato da marca (uma linha, no fim da narração):
 *   [[ROLAGEM|1D20|Agilidade|0|normal|Agarrar a machadinha antes do lobo]]
 * campos: dado | atributo (ou "nenhum") | ajuste situacional (inteiro) | modo | motivo
 */
export interface RollRequest {
  sides: DieSides;
  quantity: number;
  attribute: AttributeKey | null;
  adjust: number;
  mode: RollMode;
  reason: string;
}

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  potencia: 'Potência',
  agilidade: 'Agilidade',
  percepcao: 'Percepção',
  engenho: 'Engenho',
};

const SIDES: DieSides[] = [4, 6, 8, 10, 12, 20, 100];

const TAG = /\[\[\s*ROLAGEM\s*\|([^\]]*)\]\]/i;
const TAG_ALL = /\[\[\s*ROLAGEM\s*\|[^\]]*\]\]/gi;
const TAG_PARTIAL_AT_END = /\[\[[^\]]*$/;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

function parseAttribute(raw: string): AttributeKey | null | undefined {
  const v = norm(raw);
  if (v === '' || v === 'nenhum' || v === 'nenhuma' || v === '-') return null;
  if (v.startsWith('pot')) return 'potencia';
  if (v.startsWith('agi')) return 'agilidade';
  if (v.startsWith('per')) return 'percepcao';
  if (v.startsWith('eng')) return 'engenho';
  return undefined; // atributo desconhecido
}

/** Lê o primeiro pedido de rolagem válido do texto do Mestre. */
export function parseRollRequest(text: string): RollRequest | null {
  const m = TAG.exec(text);
  if (!m) return null;
  const parts = m[1].split('|').map((p) => p.trim());
  const dice = /^(\d{1,2})\s*d\s*(\d{1,3})$/i.exec(parts[0] ?? '');
  if (!dice) return null;
  const quantity = Number(dice[1]);
  const sides = Number(dice[2]) as DieSides;
  if (!SIDES.includes(sides) || quantity < 1 || quantity > 6) return null;

  const attribute = parseAttribute(parts[1] ?? '');
  if (attribute === undefined) return null;

  const adjust = Math.max(-5, Math.min(5, Math.trunc(Number(parts[2] ?? '0')) || 0));
  const modeRaw = norm(parts[3] ?? 'normal');
  const mode: RollMode = modeRaw.startsWith('vant') ? 'advantage' : modeRaw.startsWith('desv') ? 'disadvantage' : 'normal';

  return { sides, quantity, attribute, adjust, mode, reason: (parts.slice(4).join(' | ') || '').slice(0, 140) };
}

/** Remove as marcas internas (inclusive uma marca ainda incompleta, durante o streaming). */
export function stripRollTags(text: string): string {
  return text.replace(TAG_ALL, '').replace(TAG_PARTIAL_AT_END, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

export interface PendingRoll {
  messageId: string;
  request: RollRequest;
}

/** Resposta (do jogador) a um pedido: mensagem do usuário com `rollAnswerTo` apontando para o pedido. */
export function findAnswer(messages: ChatMessage[], requestMessageId: string): ChatMessage | undefined {
  return messages.find((m) => m.role === 'user' && m.rollAnswerTo === requestMessageId);
}

/**
 * Pedido de rolagem em aberto: o último do Mestre, ainda sem resposta, e sem nenhuma mensagem
 * normal do jogador depois dele (ajustes técnicos e seus avisos não encerram o pedido).
 */
export function getPendingRoll(messages: ChatMessage[], streaming = false): PendingRoll | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user') {
      if (m.isTechnicalAdjustment) continue;
      return null; // jogador seguiu a história sem rolar
    }
    if (m.role === 'model') {
      const request = parseRollRequest(m.text);
      if (request) {
        if (streaming && i === messages.length - 1 && !/\]\]/.test(m.text)) return null;
        return findAnswer(messages, m.id) ? null : { messageId: m.id, request };
      }
      if (/ajuste t[eé]cnico aplicado/i.test(m.text)) continue; // aviso do Mestre
      return null;
    }
  }
  return null;
}
