/**
 * Preparação de texto para voz: separa a narração do "Bloco de Estado",
 * remove markdown e divide em trechos curtos (frases) para narrar enquanto o texto chega.
 */

// Linha que marca o início do bloco de estado/mecânica (não deve ser lida em voz alta).
const STATE_BLOCK_LINE =
  /^\s*(?:[#>*_\-\s]*)(?:bloco de estado|localiza[cç][aã]o\b|estado f[ií]sico|estado de equipamentos?|atualiza[cç][aã]o de invent[aá]rio|estado de companheiros?)/i;
const RULE_LINE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

/** Retorna só a parte narrativa (sem bloco de estado e sem markdown). */
export function narrativeOf(rawText: string): string {
  // marca interna de pedido de rolagem (completa ou ainda em streaming) nunca é lida em voz alta
  const raw = rawText.replace(/\[\[[^\]]*\]\]/g, '').replace(/\[\[[^\]]*$/, '');
  const kept: string[] = [];
  for (const line of raw.split('\n')) {
    if (RULE_LINE.test(line) && kept.some((l) => l.trim())) break; // "---" após a narração
    if (STATE_BLOCK_LINE.test(line)) break;
    kept.push(line);
  }
  return kept
    .join('\n')
    .replace(/^\s*[-•]\s+/gm, '') // marcadores de lista (dependem só do início da linha)
    .replace(/[*_`#>~]/g, '') // markdown (remoção caractere a caractere = estável durante o streaming)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');
}

export function isTechnicalAck(text: string): boolean {
  return /^\s*ajuste t[eé]cnico aplicado/i.test(text);
}

const SENTENCE_END = /[.!?…]+["”’')\]]*(?=\s)/g;
export const MAX_CHUNK_CHARS = 280;

/**
 * Extrai de `text` (a partir de `from`) as frases JÁ completas (terminadas e seguidas de espaço).
 * Retorna as frases e o novo deslocamento consumido.
 */
export function takeCompleteSentences(text: string, from: number): { sentences: string[]; next: number } {
  const rest = text.slice(from);
  const sentences: string[] = [];
  let last = 0;
  const cut = (end: number) => {
    const s = rest.slice(last, end).trim();
    if (s) sentences.push(s);
    last = end;
  };
  let m: RegExpExecArray | null;
  SENTENCE_END.lastIndex = 0;
  let newline = rest.indexOf('\n');
  while ((m = SENTENCE_END.exec(rest))) {
    const end = m.index + m[0].length;
    // não corta um diálogo no meio: fim de frase dentro de aspas abertas não é fronteira
    if (insideQuote(text, from + end)) continue;
    while (newline !== -1 && newline < end && newline >= last) {
      cut(newline);
      newline = rest.indexOf('\n', newline + 1);
    }
    cut(end);
  }
  // quebra de linha após o último fim de frase também fecha o trecho
  while (newline !== -1 && newline >= last && rest.slice(last, newline).trim()) {
    cut(newline);
    newline = rest.indexOf('\n', newline + 1);
  }
  return { sentences, next: from + last };
}

/** A posição `pos` do texto está dentro de aspas abertas (diálogo)? */
export function insideQuote(text: string, pos: number): boolean {
  let open = false;
  for (let k = 0; k < pos && k < text.length; k++) {
    const ch = text[k];
    if (ch === '"') open = !open;
    else if (ch === '“' || ch === '«') open = true;
    else if (ch === '”' || ch === '»') open = false;
  }
  return open;
}

/** Último ponto de quebra natural até `max` que não caia dentro de um diálogo. */
function safeBreak(s: string, max: number): number {
  const candidates = [', ', '; ', ': ', ' '];
  for (const sep of candidates) {
    let i = s.lastIndexOf(sep, max);
    while (i > max * 0.3) {
      if (!insideQuote(s, i)) return i;
      i = s.lastIndexOf(sep, i - 1);
    }
  }
  return -1;
}

/** Quebra frases muito longas (acima do limite por requisição) em pedaços menores, sem cortar diálogos. */
export function splitLong(sentence: string, max = MAX_CHUNK_CHARS): string[] {
  if (sentence.length <= max) return [sentence];
  const out: string[] = [];
  let s = sentence;
  while (s.length > max) {
    let i = safeBreak(s, max);
    if (i < 0) i = s.lastIndexOf(' ', max); // sem saída: o diálogo é maior que o limite
    if (i <= 0) i = max;
    out.push(s.slice(0, i + 1).trim());
    s = s.slice(i + 1).trim();
  }
  if (s) out.push(s);
  return out;
}

/** Cabe `text` em `budget` caracteres, preferindo cortar em fim de frase. */
export function fitToBudget(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const slice = text.slice(0, budget);
  const end = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (end > budget * 0.5) return slice.slice(0, end + 1);
  const sp = slice.lastIndexOf(' ');
  return (sp > 0 ? slice.slice(0, sp) : slice).replace(/[,;:]$/, '') + '.';
}
