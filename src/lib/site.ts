import { getEntry } from 'astro:content';

import { SITE_CONFIG_ID } from '@/content.config';

/**
 * Dados da empresa, da coleção `siteConfig`.
 *
 * Fonte única: src/content/site-config.json. Antes da Etapa 2 havia um módulo
 * src/data/site.ts com os mesmos dados; ele foi removido porque duas fontes de
 * verdade para telefone e endereço divergem na primeira alteração — e a partir
 * da Etapa 11 o Keystatic escreve exatamente neste JSON.
 *
 * Campo `null` significa "não confirmado pela Aldifer" e NÃO deve renderizar.
 * Ver a lista de pendências do README.
 */
export async function getSite() {
  const entry = await getEntry('siteConfig', SITE_CONFIG_ID);

  // Falha alto e cedo: sem os dados de contato, header e rodapé sairiam vazios
  // num build que "passou".
  if (!entry) {
    throw new Error(
      `siteConfig "${SITE_CONFIG_ID}" não carregou. Confira src/content/site-config.json.`,
    );
  }

  return entry.data;
}

export type SiteData = Awaited<ReturnType<typeof getSite>>;
