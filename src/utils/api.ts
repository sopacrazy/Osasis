/** Monta a URL de uma rota da API respeitando o caminho-base do app (ex.: /rpg/ em produção). */
export const apiUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
