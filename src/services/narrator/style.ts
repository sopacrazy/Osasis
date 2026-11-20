import type { ChatMessage } from '../../types/rpg';

/** Estilos de narração do serviço de voz (Chatterbox). */
export type NarrationStyle = 'normal' | 'suspense' | 'combate' | 'terror' | 'tristeza' | 'epico' | 'dialogo';

export const STYLE_LABELS: Record<NarrationStyle, string> = {
  normal: 'Normal',
  suspense: 'Suspense',
  combate: 'Combate',
  terror: 'Terror',
  tristeza: 'Tristeza',
  epico: 'Épico',
  dialogo: 'Diálogo',
};

export interface SceneContext {
  /** O jogo está em combate (bloco de estado com ameaça/combate iniciado, ou rolagem de ataque recente). */
  inCombat: boolean;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const COMBAT =
  /\b(ataca\w*|golpe\w*|golpeia\w*|espada|lamina|flecha\w*|rosna\w*|garras?|presas?|investe\w*|dano|luta\w*|combate|embosca\w*|explod\w*|sangr\w*|machad\w*|arremess\w*|desvia\w*|esquiva\w*|estoca\w*|morde\w*|salta sobre)\b/;
const TERROR =
  /\b(sussurr\w*|cadaver\w*|assombr\w*|espectro\w*|fantasma\w*|maldi\w*|grito\w*|apodrec\w*|ossos?|uivo\w*|horror\w*|corpos?|esquelet\w*|demonio\w*|possuid\w*|agonia)\b/;
const SAD = /\b(chora\w*|lagrima\w*|luto|perda|saudade\w*|funeral|morreu|solidao|despedida|triste\w*|melancol\w*|ruina\w*|abandonad\w*|vazio|tumulo\w*|sepultura\w*)\b/;
const EPIC =
  /\b(destino|lenda\w*|profecia\w*|deuses?|exercito\w*|vitoria|gloria|trono|coroa|heroi\w*|aventureiros?|batalha final|imperio|dragao|dragoes)\b/;
const SUSPENSE =
  /\b(silencio|ao longe|de repente|algo se move|passos|rangido|porta|escur\w*|noite|nevoa|neblina|observ\w*|espreita\w*|sombra\w*|esquecid\w*|despertou|misterio\w*|segredo\w*|sinos?)\b/;

/** Fração do texto que está entre aspas (diálogo). */
function quotedShare(text: string): number {
  let inside = 0;
  let open = false;
  for (const ch of text) {
    if (ch === '"' || ch === '“' || ch === '«') open = ch === '"' ? !open : true;
    else if (ch === '”' || ch === '»') open = false;
    else if (open) inside++;
  }
  return inside / Math.max(text.length, 1);
}

/** Escolhe o estilo de um trecho a partir do próprio texto e do contexto da cena (sem chamadas externas). */
export function classifyStyle(text: string, ctx: SceneContext): NarrationStyle {
  const t = norm(text);
  if (/^\s*[—–-]\s*\S/.test(text) || /^\s*[“"«]/.test(text) || quotedShare(text) >= 0.3) return 'dialogo';
  if (COMBAT.test(t) || (ctx.inCombat && /\b(lobo|inimigo|criatura|fera|besta|monstro|guarda|soldado)s?\b/.test(t))) return 'combate';
  if (TERROR.test(t)) return 'terror';
  if (SAD.test(t)) return 'tristeza';
  if (EPIC.test(t) || (/!/.test(text) && text.length > 40)) return 'epico';
  if (SUSPENSE.test(t) || /\.\.\.\s*$|…\s*$/.test(text.trim())) return 'suspense';
  return 'normal';
}

/** Lê o bloco de estado mais recente do Mestre para saber se a cena é de combate. */
export function detectCombat(messages: ChatMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'model') continue;
    const idx = m.text.search(/ESTADO ATUAL|BLOCO DE ESTADO/i);
    if (idx < 0) continue;
    const block = norm(m.text.slice(idx));
    if (/combate iniciado|em combate/.test(block)) return true;
    const threat = /ameaca:\s*([^\n]*)/.exec(block);
    return Boolean(threat && !/^\s*(nenhuma|nenhum|-|nao ha|sem)\b/.test(threat[1]));
  }
  return false;
}
