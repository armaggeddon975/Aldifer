import type { CrossSectionVariant } from '@/components/cross-sections/types';

import { type LegendEntry, buildLegend } from './cross-section-legend.ts';
import type { QuoteItem } from './quote.ts';
import { type LabelSource, describeDimension } from './dimension-label.ts';
import { WEIGHT_FORMULAS, type WeightFormulaId, plateWeightPerSquareMeter } from './steel.ts';

/**
 * Modelo da calculadora de peso. Módulo PURO e testável.
 *
 * ZERO DUPLICAÇÃO DE FÓRMULA: nada aqui calcula peso. Este módulo só descreve
 * quais campos cada perfil pede e delega para `WEIGHT_FORMULAS` de
 * src/lib/steel.ts, o mesmo registro que gera a coluna de peso das tabelas de
 * bitola. Se uma fórmula mudar lá, a calculadora acompanha sem ninguém tocar
 * neste arquivo.
 *
 * O rótulo da medida também é reaproveitado: `describeDimension` é a mesma
 * função que nomeia as linhas do catálogo, então "30 × 30 × 2 mm" sai igual na
 * calculadora e na tabela — e o item que vai para a lista de orçamento fica
 * indistinguível de um adicionado pelo catálogo.
 */

export type CalculatorParam = {
  /** Nome do parâmetro em steel.ts. */
  readonly name: string;
  /** Chave curta na URL, para o link caber numa mensagem de WhatsApp. */
  readonly urlKey: string;
  readonly label: string;
  readonly unit: string;
};

export type CalculatorProfile = {
  /** Slug em português, usado em ?perfil= — regra de URL do CONTEUDO.md. */
  readonly slug: string;
  readonly label: string;
  readonly crossSection: CrossSectionVariant;
  /**
   * Ausente nos perfis que NÃO têm fórmula. Aba cônica e raio de concordância
   * tornam qualquer cálculo aproximado errado, então perfil I e U consultam
   * tabela de usina — e a interface explica isso em vez de dar um número falso.
   */
  readonly formula?: WeightFormulaId;
  readonly params: readonly CalculatorParam[];
  /** Onde encontrar a tabela, quando não há fórmula. */
  readonly tableHref?: string;
};

const mm = (name: string, urlKey: string, label: string): CalculatorParam => ({
  name,
  urlKey,
  label,
  unit: 'mm',
});

export const CALCULATOR_PROFILES: readonly CalculatorProfile[] = [
  {
    slug: 'barra-redonda',
    label: 'Barra redonda',
    crossSection: 'round-bar',
    formula: 'round-bar',
    params: [mm('diameter', 'd', 'Diâmetro')],
  },
  {
    slug: 'barra-quadrada',
    label: 'Barra quadrada',
    crossSection: 'square-bar',
    formula: 'square-bar',
    params: [mm('side', 'l', 'Lado')],
  },
  {
    slug: 'barra-chata',
    label: 'Barra chata',
    crossSection: 'flat-bar',
    formula: 'flat-bar',
    params: [mm('width', 'b', 'Largura'), mm('thickness', 'e', 'Espessura')],
  },
  {
    slug: 'barra-sextavada',
    label: 'Barra sextavada',
    crossSection: 'hex-bar',
    formula: 'hex-bar',
    params: [mm('acrossFlats', 'f', 'Entre faces')],
  },
  {
    slug: 'tubo-redondo',
    label: 'Tubo redondo',
    crossSection: 'round-tube',
    formula: 'round-tube',
    params: [mm('outerDiameter', 'd', 'Diâmetro externo'), mm('wall', 'e', 'Parede')],
  },
  {
    slug: 'tubo-quadrado',
    label: 'Tubo quadrado',
    crossSection: 'square-tube',
    formula: 'square-tube',
    params: [mm('side', 'l', 'Lado'), mm('wall', 'e', 'Parede')],
  },
  {
    slug: 'tubo-retangular',
    label: 'Tubo retangular',
    crossSection: 'rect-tube',
    formula: 'rect-tube',
    params: [mm('base', 'b', 'Base'), mm('height', 'h', 'Altura'), mm('wall', 'e', 'Parede')],
  },
  {
    slug: 'cantoneira',
    label: 'Cantoneira',
    crossSection: 'angle',
    formula: 'angle',
    params: [
      mm('leg1', 'a1', 'Aba 1'),
      mm('leg2', 'a2', 'Aba 2'),
      mm('thickness', 'e', 'Espessura'),
    ],
  },
  {
    slug: 'perfil-t',
    label: 'Perfil T',
    crossSection: 'tee',
    formula: 'tee',
    params: [
      mm('flange', 'a', 'Aba'),
      mm('height', 'h', 'Altura'),
      mm('thickness', 'e', 'Espessura'),
    ],
  },
  {
    slug: 'chapa',
    label: 'Chapa',
    crossSection: 'plate',
    formula: 'plate-piece',
    params: [
      mm('thickness', 'e', 'Espessura'),
      mm('width', 'b', 'Largura'),
      mm('length', 'c', 'Comprimento'),
    ],
  },
  // --- sem fórmula: consultam tabela de usina ------------------------------
  {
    slug: 'perfil-i',
    label: 'Perfil I',
    crossSection: 'i-beam',
    params: [],
    tableHref: '/produtos/perfis/perfil-i',
  },
  {
    slug: 'perfil-u',
    label: 'Perfil U',
    crossSection: 'u-channel',
    params: [],
    tableHref: '/produtos/perfis/perfil-u',
  },
];

const BY_SLUG = new Map(CALCULATOR_PROFILES.map((profile) => [profile.slug, profile]));

/**
 * Perfil que a calculadora abre quando a URL não pede outro.
 *
 * FONTE ÚNICA, e é por isso que ele mora aqui e não no componente. Antes o
 * script tinha `findProfile('tubo-quadrado')` como último recurso enquanto o
 * `<select>` — sem nenhuma `<option selected>` — começava no primeiro perfil do
 * registro, a barra redonda. Servidor e cliente discordavam: toda visita sem
 * query trocava o perfil depois de hidratar.
 *
 * A discordância ficou invisível desde a Etapa 7 porque o servidor renderizava
 * TODOS os grupos de campo escondidos: nenhum estava "errado" antes do script
 * rodar, porque nenhum estava aparecendo. Assim que o grupo do padrão passou a
 * vir visível — para a calculadora funcionar sem JavaScript — a discordância
 * virou um deslocamento de layout.
 */
export const DEFAULT_PROFILE_SLUG = 'tubo-quadrado';

/**
 * Legenda das cotas do desenho para um perfil da calculadora.
 *
 * Reaproveita `buildLegend`, o MESMO mapa letra→medida que a página de produto
 * usa. Sem isso a calculadora mostraria o desenho com `A`, `B` e `e` soltos ao
 * lado de campos chamados "Aba 1" e "Espessura", e caberia ao cliente adivinhar
 * qual letra é qual campo.
 *
 * Perfil sem fórmula não tem campo, logo não tem legenda: no lugar dela a
 * interface explica por que o cálculo não existe e manda para a tabela.
 */
export function legendFor(profile: CalculatorProfile): LegendEntry[] {
  return buildLegend(
    profile.crossSection,
    profile.params.map((param) => ({ key: param.name, label: param.label })),
  );
}

export function findProfile(slug: string | null | undefined): CalculatorProfile | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** Perfil de um produto do catálogo, para o link ?produto= da página de produto. */
export function profileForFormula(
  formula: WeightFormulaId | undefined,
): CalculatorProfile | undefined {
  if (!formula) return undefined;
  return CALCULATOR_PROFILES.find((profile) => profile.formula === formula);
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

export type CalculatorInput = {
  /** Valor de cada parâmetro, pelo nome usado em steel.ts. */
  readonly values: Readonly<Record<string, number>>;
  /** Comprimento da peça em metros. Ignorado quando a fórmula já é por peça. */
  readonly lengthMeters?: number;
  readonly quantity?: number;
};

export type CalculatorResult = {
  /** kg por metro linear. Ausente nas fórmulas que já dão peso por peça. */
  readonly perMeter: number | null;
  /** kg por peça: por metro × comprimento, ou o próprio resultado da fórmula. */
  readonly perPiece: number | null;
  /** kg do lote: por peça × quantidade. */
  readonly total: number | null;
  /** kg/m², só para chapa. */
  readonly perSquareMeter: number | null;
  /** A medida como o mercado a nomeia, igual à do catálogo. */
  readonly dimension: string;
  /** Faltou preencher algum campo. */
  readonly incomplete: boolean;
};

const EMPTY: CalculatorResult = {
  perMeter: null,
  perPiece: null,
  total: null,
  perSquareMeter: null,
  dimension: '',
  incomplete: true,
};

/**
 * Calcula tudo o que a interface mostra.
 *
 * Devolve `incomplete` em vez de zero quando falta campo: mostrar "0,000 kg/m"
 * para um formulário pela metade parece resultado, e o serralheiro pode anotar
 * o zero como se fosse resposta.
 */
export function calculate(
  profile: CalculatorProfile,
  input: CalculatorInput,
): CalculatorResult {
  if (!profile.formula) return EMPTY;

  const spec = WEIGHT_FORMULAS[profile.formula];

  for (const param of spec.params) {
    const value = input.values[param];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return EMPTY;
  }

  const raw = spec.compute(input.values);
  if (!Number.isFinite(raw)) return EMPTY;

  const quantity =
    typeof input.quantity === 'number' && input.quantity > 0 ? Math.floor(input.quantity) : 1;

  const source: LabelSource = {
    weightFormula: profile.formula,
    dimensionColumns: profile.params.map((param) => ({
      key: param.name,
      label: `${param.label} (${param.unit})`,
    })),
  };
  const dimension = describeDimension(source, input.values);

  // Fórmula por peça (chapa): o comprimento já é um dos parâmetros, em mm.
  if (spec.unit === 'kg/peça') {
    const thickness = input.values.thickness;
    return {
      perMeter: null,
      perPiece: raw,
      total: raw * quantity,
      perSquareMeter: typeof thickness === 'number' ? plateWeightPerSquareMeter(thickness) : null,
      dimension,
      incomplete: false,
    };
  }

  // Fórmula por metro linear.
  const length =
    typeof input.lengthMeters === 'number' && input.lengthMeters > 0 ? input.lengthMeters : null;

  return {
    perMeter: raw,
    perPiece: length === null ? null : raw * length,
    total: length === null ? null : raw * length * quantity,
    perSquareMeter: null,
    dimension,
    incomplete: false,
  };
}

// ---------------------------------------------------------------------------
// Estado na URL
//
// O serralheiro manda o link para o cliente dele pelo WhatsApp, então as
// chaves são curtas: ?perfil=tubo-redondo&d=30&e=2&m=6&q=10
// ---------------------------------------------------------------------------

/** Produto de origem, quando o visitante chegou por ?produto=. */
export type SourceProduct = {
  readonly slug: string;
  readonly name: string;
};

/**
 * Monta o item que vai para a lista de orçamento.
 *
 * Está aqui, e não no script do componente, porque duas regras dele custam
 * dinheiro se regredirem e nenhuma delas é pega por type check:
 *
 * 1. IDENTIDADE. Quem chegou de /produtos/chapas/chapa-fina-a-frio tem de
 *    pedir "Chapa Fina a Frio". Um item que diz só "Chapa" obriga a Aldifer a
 *    ligar de volta para saber se é fina a frio, fina a quente ou grossa — a
 *    objeção nº 1 do projeto, recriada dentro do próprio formulário.
 * 2. COMPRIMENTO. Na chapa o comprimento já está na medida, em milímetros. O
 *    campo em metros fica escondido nesse perfil, e mandar o valor dele
 *    resultaria em "Comprimento: 6 m" numa chapa de 2000 mm.
 *
 * Devolve null quando o cálculo está incompleto: item sem medida não entra.
 */
export function buildQuoteItem(
  profile: CalculatorProfile,
  input: CalculatorInput,
  product?: SourceProduct | null,
): QuoteItem | null {
  const result = calculate(profile, input);
  if (result.incomplete) return null;

  const isPlate = profile.formula === 'plate-piece';
  const quantity =
    input.quantity && input.quantity > 0 ? Math.floor(input.quantity) : 1;

  return {
    productSlug: product?.slug ?? profile.slug,
    productName: product?.name ?? profile.label,
    dimension: result.dimension,
    length: !isPlate && input.lengthMeters ? `${input.lengthMeters} m` : undefined,
    quantity,
    unit: isPlate ? 'chapa' : 'barra',
  };
}

export const URL_LENGTH_KEY = 'm';
export const URL_QUANTITY_KEY = 'q';
export const URL_PROFILE_KEY = 'perfil';
/** Usado pelo link da página de produto: ?produto=tubo-quadrado. */
export const URL_PRODUCT_KEY = 'produto';

export function toSearchParams(
  profile: CalculatorProfile,
  input: CalculatorInput,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set(URL_PROFILE_KEY, profile.slug);

  for (const param of profile.params) {
    const value = input.values[param.name];
    if (typeof value === 'number' && Number.isFinite(value)) {
      params.set(param.urlKey, String(value));
    }
  }

  if (input.lengthMeters) params.set(URL_LENGTH_KEY, String(input.lengthMeters));
  if (input.quantity && input.quantity !== 1) params.set(URL_QUANTITY_KEY, String(input.quantity));

  return params;
}

/** Aceita vírgula decimal: quem digita "1,5" no celular não quer erro. */
function parseNumber(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function fromSearchParams(params: URLSearchParams): {
  readonly profile: CalculatorProfile | undefined;
  readonly input: CalculatorInput;
} {
  const profile = findProfile(params.get(URL_PROFILE_KEY));

  const values: Record<string, number> = {};
  if (profile) {
    for (const param of profile.params) {
      const value = parseNumber(params.get(param.urlKey));
      if (value !== undefined) values[param.name] = value;
    }
  }

  return {
    profile,
    input: {
      values,
      lengthMeters: parseNumber(params.get(URL_LENGTH_KEY)),
      quantity: parseNumber(params.get(URL_QUANTITY_KEY)),
    },
  };
}
