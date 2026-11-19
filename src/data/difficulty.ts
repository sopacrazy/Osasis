import type { Difficulty } from '../types/rpg';

export interface DifficultyInfo {
  id: Difficulty;
  label: string;
  short: string; // descrição curta para o jogador
  badge: string; // classes do selo (Tailwind)
  prompt: string; // instruções adicionais para o Mestre
}

export const DEFAULT_DIFFICULTY: Difficulty = 'medio';

export const DIFFICULTIES: DifficultyInfo[] = [
  {
    id: 'muito-facil',
    label: 'Muito fácil',
    short: 'Para quem está começando: história simples, guiada e sem punição.',
    badge:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    prompt: `NÍVEL: MUITO FÁCIL (jogador iniciante — sobrepõe as regras de rigor acima onde houver conflito).
- Linguagem simples e direta, frases curtas, sem jargão. Na primeira vez que um termo de regra aparecer (teste, atributo, PV), explique em uma frase.
- Enredo linear e fácil de seguir: no máximo 1 ou 2 personagens por cena e um objetivo sempre claro. Sem traições, sem reviravoltas negativas, sem intrigas.
- Ao final da narração, deixe claro em uma frase o que o jogador pode tentar, em texto corrido (nunca em lista A/B/C). Se ele parecer perdido, dê uma dica sutil.
- Sem penalidades situacionais. Peça no máximo 1 rolagem por turno e só quando for importante. Falha nunca causa desastre irreversível: 1 natural vira só uma complicação leve.
- Inimigos fracos e combates curtos; o protagonista quase nunca morre. Ferimentos são leves e se recuperam logo.
- Na criação de personagem, ofereça apenas 3 raças e 3 classes, simples e bem explicadas, e ajude a preencher a ficha passo a passo.`,
  },
  {
    id: 'facil',
    label: 'Fácil',
    short: 'Narrativa clara, poucos personagens e erros que dá para corrigir.',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    prompt: `NÍVEL: FÁCIL (jogador com pouca experiência — suaviza as regras de rigor acima).
- Linguagem clara e acessível; evite floreios e termos difíceis. Explique regras quando necessário, de forma breve.
- Enredo simples, com poucos nomes e objetivos bem sinalizados. No máximo 2 ou 3 personagens por cena. Reviravoltas negativas só raras e leves.
- Penalidades situacionais de no máximo -1. Até 2 rolagens por turno. Falhas têm custo, mas sempre recuperável (nada irreversível, nada de morte súbita).
- Combates com inimigos abaixo do poder do protagonista; chefes têm fraquezas óbvias. Dê dicas ocasionais quando o jogador hesitar, em texto corrido.
- Na criação de personagem, ofereça 4 raças e 4 classes, com explicações curtas.`,
  },
  {
    id: 'medio',
    label: 'Médio',
    short: 'Equilibrado: desafio justo e uma narrativa com alguma profundidade.',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    prompt: `NÍVEL: MÉDIO (equilíbrio entre desafio e clareza).
- Narrativa com alguma profundidade (intrigas leves, 3 ou 4 NPCs recorrentes), mas sempre compreensível. Evite jargão sem explicação.
- Penalidades situacionais de -1 a -2. Rolagens frequentes quando houver risco. Reviravoltas ocasionais, com consequências justas.
- Sem dicas diretas: use pistas no ambiente e nos NPCs. Chefes exigem estratégia, mas têm fraquezas que podem ser descobertas.`,
  },
  {
    id: 'dificil',
    label: 'Difícil',
    short: 'Implacável: regras completas, intrigas e consequências duradouras.',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    prompt: `NÍVEL: DIFÍCIL (jogador experiente).
- Aplique todas as regras acima em sua forma integral: penalidades de -1 a -3, rolagens frequentes, reviravoltas negativas, chefes que exigem estratégia em vários turnos.
- Enredo com intrigas, NPCs com interesses ocultos e consequências duradouras. Sem dicas diretas e sem suavizar falhas.`,
  },
];

export function getDifficulty(id: Difficulty | undefined): DifficultyInfo | null {
  return DIFFICULTIES.find((d) => d.id === id) ?? null;
}

/** Bloco adicional do prompt. Campanhas antigas (sem nível) mantêm o comportamento original. */
export function difficultyPrompt(id: Difficulty | undefined): string {
  const info = getDifficulty(id);
  return info ? `\n### NÍVEL DE DIFICULDADE DA CAMPANHA\n${info.prompt}` : '';
}
