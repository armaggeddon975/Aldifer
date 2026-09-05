/**
 * Peso teórico de perfis de aço carbono.
 *
 * Densidade do aço carbono: 7.850 kg/m³, o que dá o fator 0,00785 kg por mm²
 * de seção por metro linear. Todas as constantes abaixo derivam dele, e cada
 * função traz a dedução no comentário — número mágico em cálculo de engenharia
 * é impossível de auditar depois.
 *
 * IMPORTANTE: é peso TEÓRICO. As fórmulas tratam a seção como geometria
 * perfeita, ignorando raio de canto em tubo e cantoneira, e a laminação tem
 * tolerância dimensional. O peso real varia tipicamente ±3%.
 *
 * Perfil I, U e H NÃO têm fórmula simples: a aba é cônica e há raio de
 * concordância entre aba e alma. Esses consultam tabela de usina — ver
 * `weightSource: 'tabela-usina'` no schema de produtos.
 */

/** kg por mm² de seção, por metro linear. Vem de 7.850 kg/m³. */
export const STEEL_DENSITY_FACTOR = 0.00785;

/** kg/m³, para exibir na interface da calculadora. */
export const STEEL_DENSITY = 7850;

// ---------------------------------------------------------------------------
// Barras — dimensões em mm, resultado em kg/m
// ---------------------------------------------------------------------------

/**
 * Barra redonda: P = 0,006165 × Ø²
 * Dedução: área = π·Ø²/4, então 0,00785 × π/4 = 0,0061654.
 */
export function roundBarWeight(diameter: number): number {
  return 0.006165 * diameter ** 2;
}

/**
 * Barra quadrada: P = 0,00785 × L²
 * Dedução: área = L².
 */
export function squareBarWeight(side: number): number {
  return STEEL_DENSITY_FACTOR * side ** 2;
}

/**
 * Barra chata: P = 0,00785 × largura × espessura
 * Dedução: área = largura × espessura.
 */
export function flatBarWeight(width: number, thickness: number): number {
  return STEEL_DENSITY_FACTOR * width * thickness;
}

/**
 * Barra sextavada: P = 0,0068 × entre-faces²
 * Dedução: área do hexágono regular = (√3/2)·a² = 0,8660·a²,
 * então 0,00785 × 0,8660 = 0,006798.
 */
export function hexBarWeight(acrossFlats: number): number {
  return 0.0068 * acrossFlats ** 2;
}

// ---------------------------------------------------------------------------
// Tubos — dimensões em mm, resultado em kg/m
// ---------------------------------------------------------------------------

/**
 * Tubo redondo: P = 0,02466 × parede × (Ø_externo − parede)
 * Dedução: a coroa circular tem área π·(D² − d²)/4 com d = D − 2e, e
 * D² − d² = 4e·(D − e). Logo área = π·e·(D − e), e 0,00785 × π = 0,024661.
 */
export function roundTubeWeight(outerDiameter: number, wall: number): number {
  return 0.02466 * wall * (outerDiameter - wall);
}

/**
 * Tubo quadrado: P = 0,0314 × parede × (lado − parede)
 * Dedução: área = L² − (L − 2e)² = 4e·(L − e), e 0,00785 × 4 = 0,0314.
 */
export function squareTubeWeight(side: number, wall: number): number {
  return 0.0314 * wall * (side - wall);
}

/**
 * Tubo retangular: P = 0,0157 × parede × (base + altura − 2 × parede)
 * Dedução: área = b·h − (b − 2e)(h − 2e) = 2e·(b + h − 2e),
 * e 0,00785 × 2 = 0,0157.
 */
export function rectTubeWeight(base: number, height: number, wall: number): number {
  return 0.0157 * wall * (base + height - 2 * wall);
}

// ---------------------------------------------------------------------------
// Perfis abertos — dimensões em mm, resultado em kg/m
// ---------------------------------------------------------------------------

/**
 * Cantoneira: P = 0,00785 × espessura × (aba₁ + aba₂ − espessura)
 * Dedução: as duas abas somadas descontando a sobreposição no canto, ou seja
 * área = e·(a₁ + a₂ − e). Ignora o raio de concordância, então subestima
 * levemente o peso real.
 */
export function angleWeight(leg1: number, leg2: number, thickness: number): number {
  return STEEL_DENSITY_FACTOR * thickness * (leg1 + leg2 - thickness);
}

/**
 * Perfil T: P = 0,00785 × espessura × (aba + altura − espessura)
 * Mesma geometria da cantoneira: dois retângulos com sobreposição descontada.
 */
export function teeWeight(flange: number, height: number, thickness: number): number {
  return STEEL_DENSITY_FACTOR * thickness * (flange + height - thickness);
}

// ---------------------------------------------------------------------------
// Chapas
// ---------------------------------------------------------------------------

/**
 * Chapa, peso por peça: P = 0,00000785 × espessura × largura × comprimento
 * As TRÊS dimensões em mm, resultado em kg por chapa.
 * Dedução: 0,00785 kg/mm²/m ÷ 1000 mm/m = 0,00000785 kg/mm³.
 */
export function plateWeightPerPiece(thickness: number, width: number, length: number): number {
  return 0.00000785 * thickness * width * length;
}

/**
 * Chapa, peso por metro quadrado: P = 7,85 × espessura
 * Espessura em mm, resultado em kg/m².
 * Dedução: 7.850 kg/m³ × 0,001 m = 7,85 kg/m² por mm de espessura.
 */
export function plateWeightPerSquareMeter(thickness: number): number {
  return 7.85 * thickness;
}

// ---------------------------------------------------------------------------
// Registro das fórmulas
//
// Liga cada id de fórmula aos nomes dos campos que ela lê numa linha da tabela
// de bitolas. É isto que permite ao build calcular a coluna de peso sem que
// nenhum peso seja digitado à mão, e ao schema Zod recusar em build uma linha
// que não tenha os campos necessários.
// ---------------------------------------------------------------------------

export type WeightUnit = 'kg/m' | 'kg/peça' | 'kg/m²';

/**
 * Ids das fórmulas, como tupla const. É tupla e não Object.keys porque o
 * z.enum do Zod precisa dessa informação de tipo para gerar o schema, e
 * porque o `satisfies Record<WeightFormulaId, ...>` abaixo passa a garantir
 * que nenhum id fique sem implementação.
 */
export const WEIGHT_FORMULA_IDS = [
  'round-bar',
  'square-bar',
  'flat-bar',
  'hex-bar',
  'round-tube',
  'square-tube',
  'rect-tube',
  'angle',
  'tee',
  'plate-piece',
  'plate-square-meter',
] as const;

export type WeightFormulaId = (typeof WEIGHT_FORMULA_IDS)[number];

export type WeightFormulaSpec = {
  /** Rótulo em português, para exibir na calculadora. */
  readonly label: string;
  /** Campos que a fórmula lê de cada linha da tabela. */
  readonly params: readonly string[];
  readonly unit: WeightUnit;
  /** A fórmula escrita, para mostrar na página da calculadora. */
  readonly expression: string;
  readonly compute: (row: Readonly<Record<string, number>>) => number;
};

export const WEIGHT_FORMULAS = {
  'round-bar': {
    label: 'Barra redonda',
    params: ['diameter'],
    unit: 'kg/m',
    expression: 'P = 0,006165 × Ø²',
    compute: (r) => roundBarWeight(r.diameter!),
  },
  'square-bar': {
    label: 'Barra quadrada',
    params: ['side'],
    unit: 'kg/m',
    expression: 'P = 0,00785 × lado²',
    compute: (r) => squareBarWeight(r.side!),
  },
  'flat-bar': {
    label: 'Barra chata',
    params: ['width', 'thickness'],
    unit: 'kg/m',
    expression: 'P = 0,00785 × largura × espessura',
    compute: (r) => flatBarWeight(r.width!, r.thickness!),
  },
  'hex-bar': {
    label: 'Barra sextavada',
    params: ['acrossFlats'],
    unit: 'kg/m',
    expression: 'P = 0,0068 × entre-faces²',
    compute: (r) => hexBarWeight(r.acrossFlats!),
  },
  'round-tube': {
    label: 'Tubo redondo',
    params: ['outerDiameter', 'wall'],
    unit: 'kg/m',
    expression: 'P = 0,02466 × parede × (Ø externo − parede)',
    compute: (r) => roundTubeWeight(r.outerDiameter!, r.wall!),
  },
  'square-tube': {
    label: 'Tubo quadrado',
    params: ['side', 'wall'],
    unit: 'kg/m',
    expression: 'P = 0,0314 × parede × (lado − parede)',
    compute: (r) => squareTubeWeight(r.side!, r.wall!),
  },
  'rect-tube': {
    label: 'Tubo retangular',
    params: ['base', 'height', 'wall'],
    unit: 'kg/m',
    expression: 'P = 0,0157 × parede × (base + altura − 2 × parede)',
    compute: (r) => rectTubeWeight(r.base!, r.height!, r.wall!),
  },
  angle: {
    label: 'Cantoneira',
    params: ['leg1', 'leg2', 'thickness'],
    unit: 'kg/m',
    expression: 'P = 0,00785 × espessura × (aba₁ + aba₂ − espessura)',
    compute: (r) => angleWeight(r.leg1!, r.leg2!, r.thickness!),
  },
  tee: {
    label: 'Perfil T',
    params: ['flange', 'height', 'thickness'],
    unit: 'kg/m',
    expression: 'P = 0,00785 × espessura × (aba + altura − espessura)',
    compute: (r) => teeWeight(r.flange!, r.height!, r.thickness!),
  },
  'plate-piece': {
    label: 'Chapa, por peça',
    params: ['thickness', 'width', 'length'],
    unit: 'kg/peça',
    expression: 'P = 0,00000785 × espessura × largura × comprimento',
    compute: (r) => plateWeightPerPiece(r.thickness!, r.width!, r.length!),
  },
  'plate-square-meter': {
    label: 'Chapa, por m²',
    params: ['thickness'],
    unit: 'kg/m²',
    expression: 'P = 7,85 × espessura',
    compute: (r) => plateWeightPerSquareMeter(r.thickness!),
  },
} as const satisfies Record<WeightFormulaId, WeightFormulaSpec>;

/**
 * Calcula o peso de uma linha da tabela de bitolas.
 * Devolve null quando algum campo exigido pela fórmula falta ou não é número —
 * assim uma linha malformada mostra um vazio honesto em vez de NaN na tela.
 */
export function computeRowWeight(
  formulaId: WeightFormulaId,
  row: Readonly<Record<string, string | number>>,
): number | null {
  const spec = WEIGHT_FORMULAS[formulaId];
  const values: Record<string, number> = {};

  for (const param of spec.params) {
    const raw = row[param];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    values[param] = raw;
  }

  const result = spec.compute(values);
  return Number.isFinite(result) ? result : null;
}

/**
 * Formata peso em português do Brasil: vírgula decimal e 3 casas, que é a
 * precisão usual das tabelas de bitola.
 */
export function formatWeight(value: number, fractionDigits = 3): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
