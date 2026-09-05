// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Necessário para canonical absoluto e para o sitemap.
  // [DECIDIR na Etapa 13] www x apex. Fixado em www para casar com o JSON-LD
  // da seção 11 do docs/CONTEUDO.md.
  site: 'https://www.aldifer.com.br',

  // Sem @astrojs/react: as ilhas deste site são custom elements em JS puro.
  // Medido na Etapa 3, o runtime do React custava 57,2 KB gzip para hospedar
  // 1,8 KB de busca, e a QuoteBar global da Etapa 5 espalharia esse custo por
  // todas as páginas. O público acessa de Android de entrada em 4G de obra.
  // Adapter da Vercel, necessário para `export const prerender = false`, que
  // não existe em saída puramente estática.
  //
  // A saída CONTINUA estática por padrão: só as rotas que marcam
  // `prerender = false` são renderizadas sob demanda — hoje apenas
  // /api/orcamento. As 10 páginas do site seguem HTML pré-gerado em build.
  adapter: vercel(),

  integrations: [sitemap()],

  vite: {
    // Tailwind v4 entra como plugin do Vite. NÃO usar @astrojs/tailwind,
    // que é o caminho da v3.
    plugins: [tailwindcss()],
  },
});
