import type { CharacterSheet, PlayerAttributes } from '../types/rpg';

export const ATTR_ORDER: (keyof PlayerAttributes)[] = ['potencia', 'agilidade', 'percepcao', 'engenho'];
export const ATTR_NAMES: Record<keyof PlayerAttributes, string> = {
  potencia: 'Potência',
  agilidade: 'Agilidade',
  percepcao: 'Percepção',
  engenho: 'Engenho',
};
export const ATTR_VALUES = [2, 1, 0, -1] as const;

export const DEFAULT_EQUIPMENT = ['Mochila', 'Cantil de água', '3 dias de ração'];

export function emptySheet(): CharacterSheet {
  return {
    name: '',
    race: '',
    className: '',
    origin: '',
    attributes: { potencia: 2, agilidade: 1, percepcao: 0, engenho: -1 },
    skills: ['', ''],
    classAbility: '',
    companion: '',
    equipment: [...DEFAULT_EQUIPMENT],
    gold: 10,
    silver: 0,
    copper: 0,
  };
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Garante que os atributos usem exatamente +2, +1, 0 e -1 (cada valor uma vez). */
export function normalizeAttributes(raw: Partial<Record<keyof PlayerAttributes, unknown>> | undefined): PlayerAttributes {
  const nums = ATTR_ORDER.map((k) => Number(raw?.[k]));
  const isPermutation =
    nums.every((n) => Number.isFinite(n)) && [...nums].sort((a, b) => b - a).join() === ATTR_VALUES.join();
  if (isPermutation) {
    return Object.fromEntries(ATTR_ORDER.map((k, i) => [k, nums[i]])) as unknown as PlayerAttributes;
  }
  // fora do padrão: mantém a ordem de preferência indicada (maior valor = +2) e redistribui
  const ranked = ATTR_ORDER.map((k, i) => ({ k, v: Number.isFinite(nums[i]) ? nums[i] : -99, i })).sort(
    (a, b) => b.v - a.v || a.i - b.i
  );
  const out = {} as PlayerAttributes;
  ranked.forEach((r, idx) => {
    out[r.k] = ATTR_VALUES[idx];
  });
  return out;
}

/** Troca de valor entre atributos para manter a distribuição válida (um valor por atributo). */
export function assignAttribute(
  current: PlayerAttributes,
  key: keyof PlayerAttributes,
  value: number
): PlayerAttributes {
  const other = ATTR_ORDER.find((k) => k !== key && current[k] === value);
  const next = { ...current, [key]: value };
  if (other) next[other] = current[key];
  return next;
}

export function sheetErrors(s: CharacterSheet): string[] {
  const errors: string[] = [];
  if (!s.name.trim()) errors.push('Informe o nome do personagem.');
  if (!s.race.trim()) errors.push('Informe a raça.');
  if (!s.className.trim()) errors.push('Informe a classe.');
  if (!s.skills[0].trim() || !s.skills[1].trim()) errors.push('Informe as duas perícias.');
  if (!s.classAbility.trim()) errors.push('Informe a habilidade de classe.');
  return errors;
}

const money = (s: CharacterSheet) => `${s.gold} ouro, ${s.silver} prata, ${s.copper} cobre`;
const attrLine = (a: PlayerAttributes) => ATTR_ORDER.map((k) => `${ATTR_NAMES[k]} ${signed(a[k])}`).join(', ');

/** Mensagem enviada ao Mestre quando o jogador salva a ficha. */
export function formatSheetForChat(s: CharacterSheet): string {
  return [
    'FICHA DO PERSONAGEM',
    `Nome: ${s.name.trim()}`,
    `Raça: ${s.race.trim()}`,
    `Classe: ${s.className.trim()}`,
    `Origem: ${s.origin.trim() || 'Não informada'}`,
    `Atributos: ${attrLine(s.attributes)}`,
    `Perícias (+1): ${s.skills[0].trim()}; ${s.skills[1].trim()}`,
    `Habilidade de Classe: ${s.classAbility.trim()}`,
    `Companheiro/Aliado: ${s.companion.trim() || 'Nenhum'}`,
    `Equipamentos iniciais: ${s.equipment.filter((e) => e.trim()).join('; ') || 'Nenhum'}`,
    `Dinheiro: ${money(s)}`,
    'Estado inicial: PV 10, Defesa 0, XP 0, sem ferimentos, alimentado e hidratado.',
    'Estou pronto para começar a aventura.',
  ].join('\n');
}

/** Conteúdo das abas do Bloco de Notas preenchidas com a ficha. */
export function sheetToNotes(s: CharacterSheet): { ficha: string; inventario: string } {
  const ficha = `# Ficha de Personagem

* Nome: ${s.name.trim()}
* Raça: ${s.race.trim()}
* Classe: ${s.className.trim()}
* Origem / Histórico Curto: ${s.origin.trim()}

## Estado Atual
* Pontos de Vida (PV): 10
* Defesa Base: 0
* XP Atual: 0
* Ferimentos: Nenhum
* Fome/Cansaço: Alimentado e hidratado

## Atributos Base (+2, +1, 0, -1)
${ATTR_ORDER.map((k) => `* ${ATTR_NAMES[k]}: ${signed(s.attributes[k])}`).join('\n')}

## Perícias & Habilidade Especial
* Perícia 1 (+1): ${s.skills[0].trim()}
* Perícia 2 (+1): ${s.skills[1].trim()}
* Habilidade de Classe: ${s.classAbility.trim()}

## Companheiro / Aliado
* Nome e Descrição: ${s.companion.trim() || 'Nenhum'}`;

  const items = s.equipment.filter((e) => e.trim());
  const inventario = `# Dinheiro
* Ouro: ${s.gold}
* Prata: ${s.silver}
* Cobre: ${s.copper}

# Equipamentos Iniciais
${items.length ? items.map((e) => `* ${e.trim()}`).join('\n') : '* '}

# Mochila & Suprimentos
* `;

  return { ficha, inventario };
}
