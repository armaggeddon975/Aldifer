/**
 * Busca rápida — parte PURA, sem dependência de `astro:content`.
 *
 * Este módulo é importado pela ilha no navegador, então não pode tocar em nada
 * do lado do servidor. A montagem do índice fica em
 * src/pages/indice-de-busca.json.ts, que roda em build.
 *
 * Nenhuma biblioteca de busca: normalizar acento e casar substring resolve o
 * caso de uso — "chapa 1/8", "tubo 30x30", "cantoneira 25". Uma lib de busca
 * fuzzy custaria mais KB do que o índice inteiro.
 */

export type SearchProduct = {
  readonly nome: string;
  readonly href: string;
  readonly categoria: string;
  readonly termos: string;
};

export type SearchGauge = {
  /** Índice do produto em `produtos`. Evita repetir href e categoria 183 vezes. */
  readonly p: number;
  readonly rotulo: string;
  readonly termos: string;
};

export type SearchIndex = {
  readonly produtos: readonly SearchProduct[];
  readonly bitolas: readonly SearchGauge[];
};

export type SearchResult = {
  readonly titulo: string;
  readonly detalhe: string | null;
  readonly categoria: string;
  readonly href: string;
};

/**
 * Normaliza texto para comparação:
 * - remove acento, para "cantoneira" casar com quem digita sem acento;
 * - minúscula;
 * - unifica o sinal de multiplicação: "30 × 30", "30 x 30" e "30x30" viram
 *   a mesma coisa, porque o serralheiro escreve dos três jeitos;
 * - vírgula decimal vira ponto, para "4,75" casar com "4.75".
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove os diacríticos separados pelo NFD
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/(\d)\s*[x*]\s*(\d)/g, '$1x$2')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Casa quando TODOS os termos digitados aparecem na entrada. É a semântica
 * que o usuário espera: "tubo 30x30" restringe, não amplia.
 */
function matchesAll(haystack: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Busca no índice. Bitolas vêm primeiro quando a consulta tem número, porque
 * quem digita medida quer a linha da tabela, não a página do produto.
 */
export function search(index: SearchIndex, query: string, limit = 8): SearchResult[] {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];

  const tokens = normalized.split(' ').filter(Boolean);
  const hasNumber = /\d/.test(normalized);
  const results: SearchResult[] = [];

  const pushGauges = () => {
    for (const gauge of index.bitolas) {
      if (results.length >= limit) return;
      const product = index.produtos[gauge.p];
      if (!product) continue;
      if (!matchesAll(`${product.termos} ${gauge.termos}`, tokens)) continue;
      results.push({
        titulo: product.nome,
        detalhe: gauge.rotulo,
        categoria: product.categoria,
        href: product.href,
      });
    }
  };

  const pushProducts = () => {
    for (const product of index.produtos) {
      if (results.length >= limit) return;
      if (!matchesAll(product.termos, tokens)) continue;
      if (results.some((r) => r.href === product.href && r.detalhe === null)) continue;
      results.push({
        titulo: product.nome,
        detalhe: null,
        categoria: product.categoria,
        href: product.href,
      });
    }
  };

  if (hasNumber) {
    pushGauges();
    pushProducts();
  } else {
    pushProducts();
    pushGauges();
  }

  return results;
}
