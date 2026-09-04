import type { APIRoute } from 'astro';

import { describeDimension, getVisibleCategories, getVisibleProducts, productHref } from '@/lib/products';
import { normalize, type SearchGauge, type SearchIndex, type SearchProduct } from '@/lib/search';

/**
 * Índice da busca rápida, gerado em BUILD como arquivo estático.
 *
 * É endpoint e não prop da ilha porque, como prop, os ~40 KB do índice
 * entrariam no HTML de toda página que tem a busca. Aqui ele só é baixado
 * quando o usuário realmente interage com o campo.
 *
 * Respeita o filtro de rascunho: em produção, enquanto os 27 produtos
 * estiverem em rascunho, este índice sai VAZIO — o que é correto, já que as
 * páginas de produto também não existem.
 */
export const GET: APIRoute = async () => {
  const [products, categories] = await Promise.all([getVisibleProducts(), getVisibleCategories()]);
  const categoryName = new Map(categories.map((category) => [category.id, category.data.name]));

  const produtos: SearchProduct[] = [];
  const bitolas: SearchGauge[] = [];

  for (const product of products) {
    const categoria = categoryName.get(product.data.category) ?? product.data.category;

    // Os termos do produto juntam tudo que alguém poderia digitar para
    // chegar nele: nome, categoria, resumo, aplicações e acabamentos.
    produtos.push({
      nome: product.data.name,
      href: productHref(product),
      categoria,
      termos: normalize(
        [
          product.data.name,
          categoria,
          product.data.shortDescription,
          ...product.data.applications,
          ...product.data.finishes,
        ].join(' '),
      ),
    });

    const index = produtos.length - 1;
    for (const row of product.data.dimensions) {
      const rotulo = describeDimension(product, row);
      bitolas.push({
        p: index,
        rotulo,
        // Além do rótulo, entram os valores crus: quem digita "30x30" casa
        // pelo rótulo, quem digita "1/8" casa pelo valor da coluna.
        termos: normalize(`${rotulo} ${Object.values(row).join(' ')}`),
      });
    }
  }

  const index: SearchIndex = { produtos, bitolas };

  return new Response(JSON.stringify(index), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // max-age=0 com must-revalidate: o navegador revalida por ETag e recebe
      // 304 quando nada mudou, o que custa ~0 byte. Com max-age longo, quem
      // visitou antes de um deploy veria sugestoes velhas por uma hora, e a
      // URL nao tem hash de conteudo para invalidar sozinha.
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
};
