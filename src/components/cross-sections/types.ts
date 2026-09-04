/** Perfis desenhados em seção transversal. */
export const CROSS_SECTION_VARIANTS = [
  'round-bar',
  'square-bar',
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
