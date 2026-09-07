import { getCollection, type CollectionEntry } from 'astro:content';

import {
  type DimensionRow,
  describeDimension as describeRow,
} from './dimension-label';
import type { QuoteUnit } from './quote';
import { WEIGHT_FORMULAS, computeRowWeight, formatWeight } from './steel';

export type Product = CollectionEntry<'products'>;
export type Category = CollectionEntry<'categories'>;

/**
 * Rascunho aparece em desenvolvimento e NÃO entra no build de produção.
 *
 * As bitolas das tabelas são faixa comercial padrão de mercado, não o estoque
 * da Aldifer. Publicar bitola que a empresa não tem gera pedido que ela não
 * consegue atender — pior que não publicar nada. Ver README, seção de
 * pendências bloqueantes.
 *
 * A CHAVE `SHOW_DRAFTS` EXISTE PARA REVISÃO, e é variável de ambiente de
 * propósito (acrescentada em 07/09/2026).
 *
 * Durante a revisão do site é preciso ver o catálogo cheio — as 27 páginas de
 * produto, o filtro, as tabelas de bitola, o botão de adicionar ao orçamento.
 * Sem isso a revisão acontece num catálogo de categorias vazias, que não é o
 * site que vai existir.
 *
 * POR QUE VARIÁVEL DE AMBIENTE E NÃO UMA LINHA DE CÓDIGO: durante as Etapas 12
 * e 13 eu troquei esta linha por `true` várias vezes para medir, e tive de
 * lembrar de reverter em cada uma. Uma delas quase foi commitada. Trocar código
 * para revisar é convite para o valor de teste chegar à produção; variável de
 * ambiente se apaga com um clique no painel da Vercel, e o código nunca deixa
 * de dizer a verdade.
 *
 * O QUE PROTEGE QUEM VÊ O SITE ASSIM: cada produto em rascunho renderiza o
 * `<DraftNotice>`, e o /produtos mostra "N de M produtos estão em rascunho. As
 * bitolas são faixa comercial padrão de mercado, não o estoque real da
 * Aldifer." Ou seja, o catálogo de revisão se identifica como tal em toda
 * página — não é o site fingindo estar pronto.
 *
 * Não tem prefixo `PUBLIC_` porque este módulo só roda em build e no servidor;
 * assim a chave não vai para o bundle do navegador.
 */
export const SHOW_DRAFTS: boolean =
  import.meta.env.DEV || import.meta.env.SHOW_DRAFTS === 'true';

export function isDraft(product: Product): boolean {
  return product.data.status === 'rascunho';
}

/** Produtos visíveis no ambiente atual, já ordenados. */
export async function getVisibleProducts(category?: string): Promise<Product[]> {
  const all = await getCollection('products');
  return all
    .filter((product) => SHOW_DRAFTS || !isDraft(product))
    .filter((product) => !category || product.data.category === category)
    .sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'pt-BR'));
}

export async function getVisibleCategories(): Promise<Category[]> {
  const all = await getCollection('categories');
  return all.sort((a, b) => a.data.order - b.data.order);
}

// ---------------------------------------------------------------------------
// Montagem da tabela de bitolas
// ---------------------------------------------------------------------------

export type TableCell = {
  readonly text: string;
  readonly numeric: boolean;
};

export type ProductTable = {
  readonly columns: readonly { readonly label: string; readonly numeric: boolean }[];
  readonly rows: readonly (readonly TableCell[])[];
  /** Linha bruta correspondente, para o botão "Adicionar" da Etapa 4. */
  readonly rawRows: readonly Readonly<Record<string, string | number>>[];
};

/** Quantas casas decimais a coluna precisa para não perder informação. */
function decimalsInColumn(
  rows: readonly Readonly<Record<string, string | number>>[],
  key: string,
): number {
  let most = 0;
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== 'number') continue;
    const text = String(value);
    const dot = text.indexOf('.');
    if (dot >= 0) most = Math.max(most, text.length - dot - 1);
  }
  return most;
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const WEIGHT_COLUMN_LABEL: Record<string, string> = {
  'kg/m': 'Peso (kg/m)',
  // plate-piece só é usada em chapa, e "por chapa" é como o cliente pede.
  'kg/peça': 'Peso (kg/chapa)',
  'kg/m²': 'Peso (kg/m²)',
};

/**
 * Monta a tabela de bitolas pronta para renderizar.
 *
 * A coluna de peso é ANEXADA aqui, calculada por src/lib/steel.ts. Nenhum peso
 * vem do arquivo de conteúdo — o schema em src/content.config.ts recusa em
 * build qualquer produto `calculado` cujas linhas não permitam o cálculo.
 *
 * Cada coluna numérica recebe a precisão decimal mínima que preserva seus
 * valores, para que os dígitos alinhem na coluna sem zeros inventados.
 */
export function getProductTable(product: Product): ProductTable {
  const { dimensionColumns, dimensions, weightSource, weightFormula } = product.data;

  const decimals = new Map<string, number>();
  for (const column of dimensionColumns) {
    if (column.numeric) decimals.set(column.key, decimalsInColumn(dimensions, column.key));
  }

  const spec = weightFormula ? WEIGHT_FORMULAS[weightFormula] : null;

  const columns = [
    ...dimensionColumns.map((column) => ({ label: column.label, numeric: column.numeric })),
  ];

  if (weightSource === 'calculado' && spec) {
    columns.push({ label: WEIGHT_COLUMN_LABEL[spec.unit] ?? `Peso (${spec.unit})`, numeric: true });
  } else if (weightSource === 'tabela-usina') {
    columns.push({ label: 'Peso', numeric: false });
  }

  const rows = dimensions.map((row) => {
    const cells: TableCell[] = dimensionColumns.map((column) => {
      const value = row[column.key];
      const text =
        typeof value === 'number' && column.numeric
          ? formatNumber(value, decimals.get(column.key) ?? 0)
          : String(value ?? '');
      return { text, numeric: column.numeric };
    });

    if (weightSource === 'calculado' && weightFormula) {
      const weight = computeRowWeight(weightFormula, row);
      cells.push({ text: weight === null ? '—' : formatWeight(weight), numeric: true });
    } else if (weightSource === 'tabela-usina') {
      cells.push({ text: 'consultar', numeric: false });
    }

    return cells;
  });

  return { columns, rows, rawRows: dimensions };
}

// ---------------------------------------------------------------------------
// Rótulo de bitola — a lógica vive em ./dimension-label.ts, que é puro e
// testável; aqui fica só o invólucro que aceita uma entrada da coleção.
// ---------------------------------------------------------------------------

export function describeDimension(product: Product, row: DimensionRow): string {
  return describeRow(product.data, row);
}

// ---------------------------------------------------------------------------
// URLs — minúscula, hífen, sem acento, em português (regra do CONTEUDO.md)
// ---------------------------------------------------------------------------

export function categoryHref(categorySlug: string): string {
  return `/produtos/${categorySlug}`;
}

export function productHref(product: Product): string {
  return `/produtos/${product.data.category}/${product.id}`;
}

// ---------------------------------------------------------------------------
// Unidade de venda
// ---------------------------------------------------------------------------

/**
 * Como o produto é vendido, para o campo `unit` da lista de orçamento.
 *
 * Derivado da categoria em vez de virar campo do schema: barra, tubo e perfil
 * saem em barra de comprimento comercial; chapa sai por chapa; tela sai em
 * rolo; o resto é peça. Se algum produto fugir da regra da categoria, aí sim
 * vale um campo próprio no frontmatter.
 */
const UNIT_BY_CATEGORY: Record<string, QuoteUnit> = {
  barras: 'barra',
  tubos: 'barra',
  perfis: 'barra',
  chapas: 'chapa',
  telas: 'rolo',
  diversos: 'peça',
};

export function quoteUnitFor(product: Product): QuoteUnit {
  return UNIT_BY_CATEGORY[product.data.category] ?? 'peça';
}
