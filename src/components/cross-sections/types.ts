/** Perfis desenhados em seção transversal. */
export const CROSS_SECTION_VARIANTS = [
  'round-bar',
  'square-bar',
  // Acrescentada na Etapa 7: a calculadora oferece barra sextavada e ela
  // estava emprestando o desenho da redonda — um circulo no lugar de um
  // hexagono, exatamente o erro que estes desenhos existem para nao cometer.
  'hex-bar',
  'flat-bar',
  'round-tube',
  'square-tube',
  'rect-tube',
  'plate',
  'i-beam',
  'u-channel',
  'angle',
  'tee',
  // Acrescentadas na Etapa 2: as 6 categorias do catálogo precisam de desenho,
  // e a lista original não cobria telas nem telha.
  'mesh',
  'corrugated-sheet',
] as const;

export type CrossSectionVariant = (typeof CROSS_SECTION_VARIANTS)[number];
