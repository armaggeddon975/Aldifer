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
] as const;

export type CrossSectionVariant = (typeof CROSS_SECTION_VARIANTS)[number];
