import type { SiteData } from './site.ts';

/**
 * Dados estruturados (JSON-LD).
 *
 * Módulo PURO e testável. As funções montam objetos; quem os serializa é o
 * componente.
 *
 * A REGRA QUE GOVERNA ESTE ARQUIVO: **só entra dado confirmado pela Aldifer.**
 * O CLAUDE.md a enuncia para o site inteiro, e aqui ela pesa mais que em
 * qualquer outro lugar. JSON-LD é o que o Google lê como declaração formal do
 * negócio: um horário inventado aparece no resultado de busca como se a
 * empresa o tivesse afirmado, e o cliente que chega no galpão fechado culpa a
 * Aldifer, não o site. Por isso `openingHours` e `geo` só entram quando os
 * campos existirem — hoje são `null` no site-config.json e são OMITIDOS.
 *
 * Dado ausente é melhor que dado errado: o Google trata propriedade faltante
 * como informação incompleta, e informação errada como motivo para desconfiar
 * de todo o resto.
 */

/** Remove chave com valor nulo, vazio ou array vazio, em profundidade. */
function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    const limpo = value.map(compact).filter((v) => v !== undefined);
    return limpo as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [chave, bruto] of Object.entries(value as Record<string, unknown>)) {
      const limpo = compact(bruto);
      const vazio =
        limpo === null ||
        limpo === undefined ||
        limpo === '' ||
        (Array.isArray(limpo) && limpo.length === 0);
      if (!vazio) saida[chave] = limpo;
    }
    return saida as T;
  }
  return value;
}

/**
 * Serializa para dentro de `<script type="application/ld+json">`.
 *
 * O `<` escapado é o que impede que um texto de conteúdo contendo
 * `</script>` feche a tag e injete markup na página. O conteúdo deste site
 * vem de arquivos versionados, então o risco é remoto — mas escapar custa uma
 * linha, e a alternativa é confiar que ninguém jamais escreverá uma tag numa
 * descrição de produto.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(compact(data)).replaceAll('<', '\\u003c');
}

/**
 * A empresa. Vai no layout base, em toda página.
 *
 * `HardwareStore` e não `LocalBusiness` genérico: é o tipo da seção 11 do
 * docs/CONTEUDO.md e o mais específico que descreve uma distribuidora de ferro
 * e aço com balcão. Tipo mais específico dá ao Google mais do que uma
 * classificação vaga.
 */
export function businessJsonLd(site: SiteData, siteUrl: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HardwareStore',
    '@id': new URL('/#empresa', siteUrl).href,
    name: site.legalName,
    alternateName: `${site.shortName} — ${site.slogan}`,
    url: siteUrl.href,
    telephone: site.phoneE164,
    email: site.email,
    foundingDate: String(site.foundedYear),
    image: new URL('/og-image.jpg', siteUrl).href,

    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.state,
      postalCode: site.address.postalCode,
      addressCountry: 'BR',
    },

    areaServed: [
      'São Bernardo do Campo',
      'Santo André',
      'São Caetano do Sul',
      'Diadema',
      'Mauá',
      'Ribeirão Pires',
      'São Paulo',
    ].map((nome) => ({ '@type': 'City', name: nome })),

    sameAs: site.social.map((link) => link.href),

    /**
     * `taxID` só quando o CNPJ existir. Hoje é null e a propriedade some.
     */
    taxID: site.cnpj ?? undefined,

    /**
     * OMITIDOS DE PROPÓSITO, e não por esquecimento:
     *
     * - `openingHours` — não consta em lugar nenhum do site atual da Aldifer.
     *   Declarado errado, o Google mostra "aberto agora" para quem está indo
     *   ao galpão fechado.
     * - `geo` — sem coordenada exata conferida, ela cai na rua errada da
     *   Estrada dos Alvarengas, que é longa.
     * - `priceRange` — o site não tem preço, por decisão do CLAUDE.md.
     * - `aggregateRating` — não temos avaliação real. Inventar avaliação em
     *   dado estruturado é violação das diretrizes do Google, além de mentira.
     */
    openingHours: site.openingHours ?? undefined,
  };
}

export type ItemListEntry = {
  readonly name: string;
  readonly url: string;
  readonly description?: string;
};

/**
 * Lista de itens, para as páginas de catálogo.
 *
 * `ItemList` com `url` em cada posição, e não `Product`: `Product` exige
 * `offers` com preço, e este site não publica preço. Um `Product` sem `offers`
 * é marcado como inválido pelo Rich Results Test, e com `offers` falso seria
 * pior — preço inventado.
 */
export function itemListJsonLd(items: readonly ItemListEntry[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      description: item.description,
      url: item.url,
    })),
  };
}
