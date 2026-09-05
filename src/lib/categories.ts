/**
 * As seis categorias do catálogo.
 *
 * Módulo PURO, sem `astro:content` e sem Zod — e é por isso que ele existe
 * separado de `src/content.config.ts`.
 *
 * O `keystatic.config.ts` roda NO NAVEGADOR: o painel é uma aplicação
 * client-side, e a configuração dele é carregada como módulo de browser.
 * Importar `content.config.ts` de lá puxa `astro:content` e `astro/loaders`,
 * que não existem fora do build — o painel abria em branco com 500 no módulo.
 *
 * Uma definição só, importada pelos dois lados. Categoria acrescentada aqui
 * aparece no schema do conteúdo e no seletor do painel de uma vez; duplicar a
 * lista faria as duas divergirem no primeiro acréscimo.
 *
 * A ORDEM é a do menu e a dos cards. Os slugs são destino dos
 * redirecionamentos 301 do site antigo (Etapa 10) — mudar um derruba tráfego.
 */
export const PRODUCT_CATEGORIES = [
  'barras',
  'tubos',
  'chapas',
  'perfis',
  'telas',
  'diversos',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Rótulo de cada categoria, para o seletor do painel. */
export const CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  barras: 'Barras',
  tubos: 'Tubos',
  chapas: 'Chapas',
  perfis: 'Perfis',
  telas: 'Telas',
  diversos: 'Diversos',
};
