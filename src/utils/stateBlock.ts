/**
 * Leitura do "Bloco de Estado" que o Mestre escreve no fim de cada turno (local, clima, PV, equipamentos...).
 * Aceita os formatos que ele costuma usar: lista com "Rótulo: valor", linhas com vários itens separados por "|",
 * títulos como "ESTADO ATUAL" / "Bloco de Estado Inicial", com ou sem markdown.
 */

export type StateKind =
  | 'location'
  | 'weather'
  | 'deadline'
  | 'hp'
  | 'wounds'
  | 'hunger'
  | 'xp'
  | 'defense'
  | 'equipment'
  | 'inventory'
  | 'money'
  | 'companion'
  | 'threat'
  | 'other';

export interface StateItem {
  kind: StateKind;
  label: string;
  value: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const KINDS: [RegExp, StateKind][] = [
  [/localiza|local\b|lugar|posicao/, 'location'],
  [/clima|tempo atmos|\bclima\b/, 'weather'],
  [/prazo|passagem de tempo|horario|hora\b|periodo/, 'deadline'],
  [/ferim|lesao|lesoes|condicao/, 'wounds'],
  [/fome|cansa|sede|fadiga|saciad/, 'hunger'],
  [/\bxp\b|experiencia/, 'xp'],
  [/defesa|armadura base|\bca\b/, 'defense'],
  [/^pv\b|pontos de vida|\bvida\b|saude/, 'hp'],
  [/estado fisico/, 'hp'],
  [/equip/, 'equipment'],
  [/dinheiro|ouro|moedas?|\bcobre\b|\bprata\b/, 'money'],
  [/invent|mochila|suprimento|itens/, 'inventory'],
  [/companh|aliad|parceir/, 'companion'],
  [/amea[cç]a|inimig|perigo/, 'threat'],
];

export function kindOf(label: string): StateKind {
  const l = norm(label).replace(/\*/g, '').trim();
  for (const [re, kind] of KINDS) if (re.test(l)) return kind;
  return 'other';
}

const HEADING = /^\W*(?:estado\s+atual|bloco\s+de\s+estado(?:\s+inicial)?)\W*$/i;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const clean = (s: string) =>
  s
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '') // marcador de lista
    .replace(/^#+\s*/, '')
    .replace(/\*\*|__/g, '')
    .replace(/[`>]/g, '')
    .trim();

/** Divide por "|" ignorando barras dentro de parênteses. */
function splitPipes(line: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of line) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === '|' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseSegment(seg: string): StateItem | null {
  const m = /^([^:：]{2,40}?)\s*[:：]\s*(.+)$/.exec(seg);
  if (m) {
    const label = m[1].trim();
    return { kind: kindOf(label), label, value: m[2].trim() };
  }
  const pv = /^PV\s*[:\-]?\s*(.+)$/i.exec(seg); // "PV 10/10"
  if (pv) return { kind: 'hp', label: 'PV', value: pv[1].trim() };
  const xp = /^XP\s*[:\-]?\s*(.+)$/i.exec(seg);
  if (xp) return { kind: 'xp', label: 'XP', value: xp[1].trim() };
  return null;
}

/** Itens de uma lista ("a, b, c" ou "a; b"), sem cortar vírgulas dentro de parênteses. */
export function splitList(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/\.$/, '').trim()).filter(Boolean);
}

export interface SplitResult {
  narrative: string;
  items: StateItem[] | null; // null = não foi possível reconhecer um bloco de estado
}

/** Separa a narração do bloco de estado e lê os itens do bloco. */
export function splitStateBlock(text: string): SplitResult {
  const lines = text.split('\n');

  // início do bloco: título "ESTADO ATUAL"/"Bloco de Estado" ou, sem título, a 1ª linha "Localização: ..."
  let start = lines.findIndex((l) => HEADING.test(clean(l)));
  if (start < 0) start = lines.findIndex((l, i) => i > 0 && /^\s*(?:[-*•]\s*)?\**\s*localiza[cç][aã]o\b[^:]*[:：]/i.test(l));
  if (start < 0) return { narrative: text, items: null };

  let narrEnd = start;
  while (narrEnd > 0 && (RULE.test(lines[narrEnd - 1]) || !lines[narrEnd - 1].trim())) narrEnd--;
  const narrative = lines.slice(0, narrEnd).join('\n').trimEnd();
  if (!narrative.trim()) return { narrative: text, items: null }; // sem narração antes: não mexe

  const items: StateItem[] = [];
  let considered = 0;
  for (const raw of lines.slice(start)) {
    const line = clean(raw);
    if (!line || RULE.test(raw) || HEADING.test(line)) continue;
    considered++;
    let parsedAny = false;
    for (const seg of splitPipes(line)) {
      const it = parseSegment(seg);
      if (it) {
        items.push(...expandPhysical(it).flatMap(expandCombined));
        parsedAny = true;
      }
    }
    if (!parsedAny) considered--; // linha solta (ex.: texto explicativo) não conta contra
  }
  // só troca a lista por ícones se o bloco foi realmente compreendido
  if (items.length < 2) return { narrative: text, items: null };
  for (const it of items) {
    if (it.kind === 'hp') it.value = it.value.replace(/^PV\s*[:\-]?\s*/i, '');
    if (!['equipment', 'inventory', 'companion', 'threat', 'other'].includes(it.kind)) {
      it.value = it.value.replace(/[.\s]+$/, '') || it.value;
    }
  }
  const unparsed = lines.slice(start).filter((l) => clean(l) && !RULE.test(l) && !HEADING.test(clean(l))).length - considered;
  if (unparsed > 2) return { narrative: text, items: null };
  return { narrative, items };
}

/** "Estado Físico: PV 10/10, Ferimentos: Nenhum, XP: 0" vira itens separados (PV, ferimentos, XP...). */
export function expandPhysical(item: StateItem): StateItem[] {
  if (item.kind !== 'hp' || !/estado fisico/.test(norm(item.label))) return [item];
  const extra: StateItem[] = [];
  const keep: string[] = [];
  for (const part of splitList(item.value)) {
    const sub = parseSegment(part);
    if (sub && sub.kind === 'hp') keep.push(sub.value); // "PV 10/10" é o próprio valor de vida
    else if (sub && sub.kind !== 'other') extra.push(sub);
    else keep.push(part);
  }
  return [{ ...item, value: keep.join(', ') || '—' }, ...extra];
}

/** "Localização e Clima: lugar; tempo" vira dois itens (local e clima). */
export function expandCombined(item: StateItem): StateItem[] {
  if (item.kind !== 'location' || !/clima|tempo/.test(norm(item.label))) return [item];
  const parts = item.value.split(/\s*;\s*|\s+[-–—]\s+/).filter(Boolean);
  if (parts.length < 2) return [item];
  return [
    { kind: 'location', label: 'Localização', value: parts[0] },
    { kind: 'weather', label: 'Clima', value: parts.slice(1).join('; ') },
  ];
}
