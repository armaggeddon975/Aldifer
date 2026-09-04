/**
 * Rótulo de bitola — módulo PURO, sem dependência de `astro:content`.
 *
 * Separado de products.ts para poder rodar sob `node --test`: products.ts
 * importa `astro:content`, que só existe dentro do Astro.
 *
 * Esta lógica é usada na busca rápida, no aria-label do botão "Adicionar"
 * (Etapa 4) e no campo `dimension` da lista de orçamento (Etapa 5) — precisa
 * de teste, porque dois rótulos iguais para linhas diferentes são um defeito
 * silencioso: a sugestão aparece duplicada e o cliente pede a medida errada.
 */
import type { WeightFormulaId } from './steel';

/** O mínimo que o rótulo precisa saber do produto. */
export type LabelSource = {
  readonly weightFormula?: WeightFormulaId | undefined;
  readonly dimensionColumns: readonly { readonly key: string; readonly label: string }[];
};

export type DimensionRow = Readonly<Record<string, string | number>>;

/**
 * Número de dimensão, no padrão brasileiro e SEM separador de milhar.
 * "1200 mm" e não "1.200 mm": em cota, o ponto de milhar se confunde com
 * vírgula decimal na leitura rápida.
 */
function dim(value: string | number | undefined): string {
  return typeof value === 'number'
    ? value.toLocaleString('pt-BR', { useGrouping: false })
    : String(value ?? '');
}

/**
 * Como o mercado NOMEIA a bitola, que não é como a fórmula a calcula.
 *
 * Um tubo quadrado de lado 30 e parede 2 é pedido no balcão como "30 × 30 × 2",
 * repetindo o lado — a fórmula lê o lado uma vez só. Uma cantoneira 25 × 25 × 3
 * tem duas abas nomeadas separadamente mesmo quando são iguais.
 *
 * A fórmula é o discriminador principal, e não o conjunto de colunas, porque
 * barra chata e chapa a quente têm as MESMAS colunas (width, thickness,
 * length) com significados diferentes: na barra o comprimento é em metros, na
 * chapa é em milímetros. Só o conjunto de colunas não distingue as duas.
 */
const BY_FORMULA: Record<WeightFormulaId, (row: DimensionRow) => string> = {
  'round-bar': (r) => `Ø ${dim(r.diameter)} mm`,
  'square-bar': (r) => `${dim(r.side)} × ${dim(r.side)} mm`,
  'flat-bar': (r) => `${dim(r.width)} × ${dim(r.thickness)} mm`,
  'hex-bar': (r) => `${dim(r.acrossFlats)} mm entre faces`,
  'round-tube': (r) => `Ø ${dim(r.outerDiameter)} × ${dim(r.wall)} mm`,
  'square-tube': (r) => `${dim(r.side)} × ${dim(r.side)} × ${dim(r.wall)} mm`,
  'rect-tube': (r) => `${dim(r.base)} × ${dim(r.height)} × ${dim(r.wall)} mm`,
  angle: (r) => `${dim(r.leg1)} × ${dim(r.leg2)} × ${dim(r.thickness)} mm`,
  tee: (r) => `${dim(r.flange)} × ${dim(r.height)} × ${dim(r.thickness)} mm`,
  'plate-piece': (r) => `${dim(r.thickness)} mm · ${dim(r.width)} × ${dim(r.length)} mm`,
  'plate-square-meter': (r) => `${dim(r.thickness)} mm`,
};

/**
 * Produtos sem fórmula de peso, reconhecidos pelo conjunto de colunas.
 * A ordem importa: a primeira regra cujas colunas estejam TODAS presentes
 * ganha, então a mais específica vem primeiro.
 */
const BY_COLUMNS: readonly {
  readonly needs: readonly string[];
  readonly render: (row: DimensionRow) => string;
}[] = [
  // Chapa xadrez: a bitola em polegada é como o cliente pede.
  {
    needs: ['gauge', 'thickness', 'width', 'length'],
    render: (r) => `${dim(r.gauge)} · ${dim(r.thickness)} mm · ${dim(r.width)} × ${dim(r.length)} mm`,
  },
  // Perfil I e U: altura, aba e alma precisam de rótulo, porque três números
  // soltos não dizem qual é qual num perfil aberto.
  {
    needs: ['height', 'flange', 'web'],
    render: (r) => `altura ${dim(r.height)} · aba ${dim(r.flange)} · alma ${dim(r.web)} mm`,
  },
  // Telha: a largura útil já desconta a sobreposição.
  {
    needs: ['thickness', 'usefulWidth', 'length'],
    render: (r) => `${dim(r.thickness)} mm · útil ${dim(r.usefulWidth)} m · ${dim(r.length)} m`,
  },
  // Disco de corte: o furo é o que mais dá errado no pedido.
  {
    needs: ['diameter', 'thickness', 'bore'],
    render: (r) => `Ø ${dim(r.diameter)} × ${dim(r.thickness)} mm · furo ${dim(r.bore)} mm`,
  },
  // Eletrodo: a classificação AWS vem primeiro, é o que define o consumível.
  {
    needs: ['classification', 'diameter'],
    render: (r) => `${dim(r.classification)} · Ø ${dim(r.diameter)} mm`,
  },
  // Tela: malha e fio, com o BWG que é como o mercado especifica.
  {
    needs: ['mesh', 'wireBwg'],
    render: (r) => `malha ${dim(r.mesh)} mm · fio BWG ${dim(r.wireBwg)}`,
  },
];

/** Tira o parêntese do rótulo e devolve nome e unidade separados. */
function splitLabel(label: string): { name: string; unit: string } {
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(label);
  return match ? { name: match[1] ?? label, unit: match[2] ?? '' } : { name: label, unit: '' };
}

/**
 * Descreve uma linha da tabela de bitolas em uma linha de texto.
 *
 * Usado na busca rápida, no aria-label do botão "Adicionar" (Etapa 4) e no
 * campo `dimension` da lista de orçamento (Etapa 5). Precisa distinguir linhas
 * diferentes: duas sugestões com o mesmo rótulo são um defeito, não um detalhe.
 */
export function describeDimension(source: LabelSource, row: DimensionRow): string {
  const { weightFormula, dimensionColumns } = source;

  if (weightFormula) return BY_FORMULA[weightFormula](row);

  for (const rule of BY_COLUMNS) {
    if (rule.needs.every((key) => key in row)) return rule.render(row);
  }

  // Último recurso: percorre TODAS as colunas declaradas. Não recorta em três,
  // senão duas linhas que só diferem na última coluna sairiam idênticas.
  return dimensionColumns
    .map((column) => {
      const { name, unit } = splitLabel(column.label);
      return `${name} ${dim(row[column.key])}${unit ? ` ${unit}` : ''}`;
    })
    .join(' · ');
}

