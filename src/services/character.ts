import type { CharacterSheet, ChatMessage, Difficulty } from '../types/rpg';
import { apiFetch } from '../utils/api';
import { normalizeAttributes } from '../utils/characterSheet';
import { stripRollTags } from '../utils/rollRequest';

type Suggestion = Pick<
  CharacterSheet,
  'name' | 'race' | 'className' | 'origin' | 'attributes' | 'skills' | 'classAbility' | 'companion' | 'equipment'
>;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Pede ao Mestre uma ficha sugerida de acordo com o universo/estilo da campanha. */
export async function suggestCharacter(
  messages: ChatMessage[],
  difficulty: Difficulty | undefined,
  current?: Record<string, string>
): Promise<Suggestion> {
  const res = await apiFetch('/api/gm/character-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.slice(-8).map((m) => ({ role: m.role, text: stripRollTags(m.text) })),
      difficulty,
      current,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Não foi possível sugerir a ficha agora.');

  const skills = Array.isArray(data.skills) ? data.skills.map(text).filter(Boolean) : [];
  const equipment = Array.isArray(data.equipment) ? data.equipment.map(text).filter(Boolean) : [];
  return {
    name: text(data.name),
    race: text(data.race),
    className: text(data.className),
    origin: text(data.origin),
    attributes: normalizeAttributes(data.attributes as Record<string, unknown> | undefined),
    skills: [skills[0] ?? '', skills[1] ?? ''],
    classAbility: text(data.classAbility),
    companion: text(data.companion) || 'Nenhum',
    equipment,
  };
}
