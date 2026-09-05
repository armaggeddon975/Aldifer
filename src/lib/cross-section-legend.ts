/**
 * Legenda que liga as cotas do desenho às colunas da tabela de bitolas.
 *
 * O PROMPTS.md pede, na página de produto, "CrossSection grande, com as cotas
 * correspondendo às colunas da tabela". Sem legenda o desenho mostra `A`, `B`
 * e `e` soltos, e o cliente tem de adivinhar qual letra é qual medida.
 *
 * As letras são as que os componentes de src/components/cross-sections/
 * realmente desenham. Se um desenho mudar de letra, este mapa muda com ele —
 * o teste em cross-section-legend.test.ts cobre os treze perfis.
 *
 * Módulo PURO, sem `astro:content`.
 */
import type { CrossSectionVariant } from '@/components/cross-sections/types';

/** Letra desenhada na cota → chave da coluna que ela mede. */
type LegendMap = Partial<Record<CrossSectionVariant, readonly (readonly [string, string])[]>>;

const LEGEND: LegendMap = {
  'round-bar': [['Ø', 'diameter']],
  'square-bar': [['A', 'side']],
  'hex-bar': [['A', 'acrossFlats']],
  'flat-bar': [
    ['A', 'width'],
    ['e', 'thickness'],
  ],
  'round-tube': [
    ['Ø', 'outerDiameter'],
    ['e', 'wall'],
  ],
  'square-tube': [
    ['A', 'side'],
    ['e', 'wall'],
  ],
  'rect-tube': [
    ['A', 'base'],
    ['B', 'height'],
    ['e', 'wall'],
  ],
  plate: [['e', 'thickness']],
  'i-beam': [
    ['A', 'height'],
    ['B', 'flange'],
    ['e', 'web'],
  ],
  'u-channel': [
    ['A', 'height'],
    ['B', 'flange'],
    ['e', 'web'],
  ],
  angle: [
    ['A', 'leg1'],
    ['B', 'leg2'],
    ['e', 'thickness'],
  ],
  tee: [
    ['A', 'flange'],
    ['B', 'height'],
    ['e', 'thickness'],
  ],
  mesh: [
    ['A', 'mesh'],
    ['Ø', 'wireMm'],
  ],
  // A telha tem passo e altura de onda desenhados, mas nenhuma coluna
  // correspondente na tabela — só a espessura casa.
  'corrugated-sheet': [['e', 'thickness']],
};

export type LegendEntry = {
  /** A letra como aparece no desenho. */
  readonly letter: string;
  /** O rótulo da coluna, como o cliente o lê na tabela. */
  readonly label: string;
};

/**
 * Monta a legenda para um produto.
 *
 * Só entram as letras cuja coluna EXISTE neste produto: a telha desenha passo
 * e altura de onda que a tabela dela não tem, e mostrar "B = ?" seria pior que
 * omitir. Devolve lista vazia quando nada casa, e aí a página não renderiza a
 * legenda.
 */
export function buildLegend(
  variant: CrossSectionVariant | undefined,
  columns: readonly { readonly key: string; readonly label: string }[],
): LegendEntry[] {
  if (!variant) return [];

  const byKey = new Map(columns.map((column) => [column.key, column.label]));

  return (LEGEND[variant] ?? []).flatMap(([letter, key]) => {
    const label = byKey.get(key);
    return label ? [{ letter, label }] : [];
  });
}
