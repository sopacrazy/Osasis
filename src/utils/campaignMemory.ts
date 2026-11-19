import type { Campaign } from '../types/rpg';
import { ATTRIBUTE_LABELS, stripRollTags } from './rollRequest';

/**
 * Memória da campanha enviada ao Mestre a CADA turno (salva junto com a campanha no banco).
 * É a fonte de verdade: ficha, inventário registrado pelo arquivista, último estado, notas e guia.
 * O objetivo é o Mestre não inventar nem trocar detalhes (cor da espada, quantidades, nomes).
 */

const MAX_TOTAL = 7000;
const MAX_NOTE = 1500;
const MAX_STATE = 1400;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

/** Último "ESTADO ATUAL" escrito pelo próprio Mestre (bloco de estado do turno anterior). */
function lastStateBlock(campaign: Campaign): string {
  for (let i = campaign.messages.length - 1; i >= 0; i--) {
    const m = campaign.messages[i];
    if (m.role !== 'model') continue;
    const text = stripRollTags(m.text);
    const idx = text.search(/ESTADO ATUAL/i);
    if (idx >= 0) return clip(text.slice(idx).replace(/\n{3,}/g, '\n\n').trim(), MAX_STATE);
  }
  return '';
}

export function buildCampaignMemory(campaign: Campaign): string {
  const g = campaign.guide;
  const out: string[] = [];

  out.push(
    '\n### MEMÓRIA DA CAMPANHA (FONTE DE VERDADE — salva no banco de dados)',
    'Esta é a memória oficial desta campanha. Em qualquer conflito com o que você "lembra", ESTA memória vence.',
    '- NUNCA invente nem altere itens, cores, materiais, tamanhos, quantidades, nomes ou fatos que constem aqui ou no histórico. Descreva cada item exatamente como registrado (ex.: se é uma "espada de lâmina verde", ela é sempre verde).',
    '- Se o jogador usar algo que NÃO está no inventário, diga que ele não possui; não conceda o item.',
    '- Antes de narrar, confira o inventário, o estado físico e os fatos abaixo.'
  );

  const attrs = (Object.keys(ATTRIBUTE_LABELS) as (keyof typeof ATTRIBUTE_LABELS)[])
    .map((k) => `${ATTRIBUTE_LABELS[k]} ${campaign.attributes[k] >= 0 ? '+' : ''}${campaign.attributes[k]}`)
    .join(', ');
  out.push(`\n**Protagonista (ficha):** ${attrs}.`);

  const inventory = g?.inventory ?? [];
  if (inventory.length > 0) {
    out.push('\n**Inventário e equipamento registrados:**');
    for (const it of inventory) {
      const qty = it.quantity && it.quantity > 1 ? ` x${it.quantity}` : '';
      out.push(`- ${it.name}${qty} [${it.status || 'com o jogador'}]: ${it.description}`);
    }
  }

  const state = lastStateBlock(campaign);
  if (state) out.push('\n**Último estado informado por você (Mestre):**\n' + state);

  if (g) {
    if (g.currentQuests.length > 0) {
      out.push('\n**Missões ativas:**');
      for (const q of g.currentQuests) out.push(`- ${q.title}${q.location ? ` (${q.location})` : ''}: ${q.summary}${q.deadline ? ` Prazo: ${q.deadline}.` : ''}`);
    }
    if (g.knownCharacters.length > 0) {
      out.push('\n**Personagens conhecidos:**');
      for (const c of g.knownCharacters) out.push(`- ${c.name} — ${c.role} (${c.allegiance})${c.notes ? `: ${c.notes}` : ''}`);
    }
    if (g.knownLocations.length > 0) {
      out.push('\n**Locais conhecidos:**');
      for (const l of g.knownLocations) out.push(`- ${l.name}${l.distanceOrDirection ? ` (${l.distanceOrDirection})` : ''}: ${l.notes}`);
    }
    if (g.racesAndCreatures.length > 0) {
      out.push('\n**Criaturas e raças descobertas:**');
      for (const r of g.racesAndCreatures) out.push(`- ${r.name}: bônus ${r.bonuses}; fraquezas ${r.weaknesses}`);
    }
    if (g.remediesAndItems.length > 0) {
      out.push('\n**Remédios, recursos e receitas conhecidos:**');
      for (const r of g.remediesAndItems) out.push(`- ${r.name}: ${r.effect}`);
    }
  }

  const notes = campaign.notes.filter((n) => n.content.trim());
  if (notes.length > 0) {
    out.push('\n**Anotações do jogador (Bloco de Notas):**');
    for (const n of notes) out.push(`[${n.title}]\n${clip(n.content.trim(), MAX_NOTE)}`);
  }

  return clip(out.join('\n'), MAX_TOTAL);
}
