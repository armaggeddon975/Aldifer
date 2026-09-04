// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Necessário para canonical absoluto e para o sitemap.
  // [DECIDIR na Etapa 13] www x apex. Fixado em www para casar com o JSON-LD
  // da seção 11 do docs/CONTEUDO.md.
  site: 'https://www.aldifer.com.br',

  integrations: [react(), sitemap()],

  vite: {
    // Tailwind v4 entra como plugin do Vite. NÃO usar @astrojs/tailwind,
    // que é o caminho da v3.
    plugins: [tailwindcss()],
  },
});
