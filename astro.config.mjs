// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';

import { QUOTE_BOOT } from './src/lib/quote-boot.mjs';

/**
 * Hash do único script inline que eu escrevo à mão.
 *
 * CALCULADO da MESMA constante que o layout renderiza, em vez de digitado: um
 * hash digitado sai de sincronia na primeira alteração do script e passa a
 * BLOQUEAR o próprio site — foi o argumento para não escrever a CSP à mão, e
 * vale aqui igual.
 *
 * O script decide, antes da primeira pintura, se a lista de orçamento tem
 * itens. Sem ele o /orcamento media CLS de 0,183 a 0,332. Ver
 * src/lib/quote-boot.mjs.
 */
const HASH_DO_BOOT = /** @type {`sha256-${string}`} */ (
  `sha256-${createHash('sha256').update(QUOTE_BOOT, 'utf8').digest('base64')}`
);

/**
 * Host do Plausible, quando configurado.
 *
 * Lido AQUI, em tempo de configuração, porque a CSP é montada no build: sem o
 * host na diretiva, ligar o analytics depois exigiria mexer na CSP também, e
 * quem liga uma variável de ambiente na Vercel não vai lembrar disso.
 *
 * Sem a variável, o host não entra na CSP e nenhum script de analytics é
 * carregado — a política fica mais restrita, não mais frouxa.
 */
const PLAUSIBLE_HOST = process.env.PUBLIC_PLAUSIBLE_HOST?.trim() || 'https://plausible.io';
const usaPlausible = Boolean(process.env.PUBLIC_PLAUSIBLE_DOMAIN?.trim());

const analytics = usaPlausible ? [PLAUSIBLE_HOST] : [];

/**
 * Junta as fontes de uma diretiva, ignorando entrada vazia.
 *
 * O `@type` fixa o retorno como diretiva `connect-src`, que é o único uso:
 * o tipo do Astro para diretiva é um template literal, e uma string comum
 * não lhe serve.
 *
 * @param {...(string | string[])} partes
 * @returns {`connect-src${string}`}
 */
const fontes = (...partes) =>
  /** @type {`connect-src${string}`} */ (partes.flat().filter(Boolean).join(' '));

// https://astro.build/config
export default defineConfig({
  /**
   * Necessário para canonical absoluto e para o sitemap.
   *
   * WWW É O CANÔNICO. Decidido na Etapa 13 por medição, não por preferência.
   *
   * O site antigo responde 200 tanto em `aldifer.com.br` quanto em
   * `www.aldifer.com.br`, sem redirect entre os dois e sem
   * `<link rel="canonical">` em página nenhuma. Na ausência de canonical, o
   * sinal mais forte é o link interno — e TODO link e TODO asset do HTML antigo
   * é URL absoluta com `www`:
   *
   *   href="https://www.aldifer.com.br/barra-chata.php"
   *   href="https://www.aldifer.com.br/css/main.css"
   *
   * Então `www` é o host que o Google indexou, e é nele que o histórico dos 117
   * redirects da Etapa 10 vale. Escolher o apex jogaria fora esse histórico
   * duas vezes: no redirect de host e no de caminho.
   *
   * O DNS precisa acompanhar: apex com 301 para www. Hoje o `www` é CNAME do
   * apex, o inverso do que passa a valer. Ver docs/DEPLOY.md.
   */
  site: 'https://www.aldifer.com.br',

  // Sem @astrojs/react: as ilhas deste site são custom elements em JS puro.
  // Medido na Etapa 3, o runtime do React custava 57,2 KB gzip para hospedar
  // 1,8 KB de busca, e a QuoteBar global da Etapa 5 espalharia esse custo por
  // todas as páginas. O público acessa de Android de entrada em 4G de obra.
  // Adapter da Vercel, necessário para `export const prerender = false`, que
  // não existe em saída puramente estática.
  //
  // A saída CONTINUA estática por padrão: só as rotas que marcam
  // `prerender = false` são renderizadas sob demanda — hoje /api/orcamento e
  // /api/contato. As 16 páginas do site seguem HTML pré-gerado em build.
  adapter: vercel(),

  build: {
    /**
     * CSS EMBUTIDO NO HTML, e não em arquivo linkado.
     *
     * O padrão do Astro é `'auto'`, que embute folha abaixo de 4 KB. A do site
     * tem 32,7 KB crus / 7,3 KB gzip, então ficava em arquivo — e como
     * `<link rel="stylesheet">` BLOQUEIA A PINTURA, ela custava um round-trip
     * antes do primeiro pixel.
     *
     * POR QUE MUDOU (medido na Etapa 12, mediana de 9 execuções em /orcamento,
     * que é a página mais pesada do site com 242 KB):
     *
     *   CSS em arquivo:  LCP 2,41–2,56s — 4 de 9 execuções ACIMA da meta
     *   CSS embutido:    LCP 2,40–2,41s — 0 de 9 acima, e a variação sumiu
     *
     * O gargalo estava na ordem de descoberta: o `preload` da Archivo é escrito
     * antes no <head>, e o Astro injeta o <link> da folha no FIM do head —
     * então o navegador começava a fonte antes do CSS que bloqueia a pintura.
     * Embutir tira a folha dessa disputa.
     *
     * [REMEDIR — ver docs/CHECKLIST-LANCAMENTO.md] O contexto daquela medição
     * mudou duas vezes desde então, e nos dois casos a favor da folha LINKADA:
     *
     *   1. A Archivo tinha 90.104 bytes porque carregava o eixo de largura.
     *      Instanciada em wdth 125%, caiu para 34.648 — a disputa por banda
     *      com o CSS ficou muito menor.
     *   2. A medição foi feita em http/1.1, no servidor de teste local. A
     *      Vercel serve http/2, onde a requisição da folha é multiplexada na
     *      conexão já aberta e custa muito menos que um round-trip inteiro.
     *
     * Ou seja: é provável que hoje a folha linkada passe o portão, e ela é
     * melhor para quem navega várias páginas do catálogo — 6,6 KB gzip a menos
     * por página, com cache compartilhado. A medição certa é na URL de preview
     * da Vercel, não aqui.
     *
     * O CUSTO, honestamente: some o cache compartilhado da folha, e cada
     * página passa a carregar 6,6 KB gzip a mais. Em troca, o PRIMEIRO
     * carregamento fica até um pouco mais leve — 14.775 bytes de HTML com o
     * estilo dentro, contra 8.150 de HTML mais 7.279 de CSS — e com um
     * round-trip a menos.
     *
     * A ALTERNATIVA MEDIDA E RECUSADA foi tirar o `preload` da Archivo: o LCP
     * também passava, mas o FCP piorava 0,6s em TODA página (1,58s → 2,19s na
     * home), porque o `font-display: swap` mantém o texto invisível durante o
     * período de bloqueio. Perder meio segundo de primeira pintura em todo o
     * site para poupar 6,6 KB não se paga.
     *
     * A CSP acompanha: o Astro hasheia o <style> que ele mesmo embute e o
     * inclui em `style-src-elem`. Verificado no HTML gerado.
     */
    inlineStylesheets: 'always',
  },

  security: {
    /**
     * Content-Security-Policy gerada pelo Astro, com HASH dos scripts inline.
     *
     * POR QUE NÃO ESCREVI A CSP À MÃO no vercel.json: o Astro embute em cada
     * página os scripts pequenos — o menu mobile tem 372 B, o carregador do
     * mapa 494 B, a busca rápida 3,7 KB. Uma CSP de cabeçalho só os aceitaria
     * com `unsafe-inline`, que desliga a proteção que a CSP existe para dar, ou
     * com hashes escritos à mão que mudam a cada build e passariam a bloquear o
     * próprio site na primeira alteração de código.
     *
     * O Astro calcula os hashes no build e emite um <meta http-equiv> por
     * página. Fica sempre em sincronia com o código.
     *
     * O QUE O <meta> NÃO ACEITA: `frame-ancestors`, `report-uri` e `sandbox`.
     * Esses três só valem em cabeçalho HTTP — o `frame-ancestors` está no
     * vercel.json, como uma segunda política que restringe apenas isso.
     */
    csp: {
      directives: [
        // Nada é permitido por omissão. Cada recurso abaixo é liberado por
        // diretiva, e o que não estiver listado é bloqueado.
        "default-src 'none'",

        // Imagens: as do próprio site, mais data: — o Astro embute imagem
        // pequena como data URI, e o desenho de seção transversal é SVG inline.
        "img-src 'self' data:",

        // Fontes auto-hospedadas em /fonts. Nada de CDN, por decisão do
        // CLAUDE.md.
        "font-src 'self'",

        // O manifest e o índice de busca são do próprio site.
        "manifest-src 'self'",

        // XHR: o índice de busca, os dois endpoints de formulário e a
        // verificação do Turnstile.
        fontes("connect-src 'self'", 'https://challenges.cloudflare.com', analytics),

        // iframes: o desafio do Turnstile e o mapa do Google, que só carrega
        // sob clique.
        "frame-src https://challenges.cloudflare.com https://www.google.com",

        // Os formulários postam para o próprio site, e só.
        "form-action 'self'",

        // Sem <base>, sem <object>, sem <embed>: nada aqui usa e liberar
        // amplia superfície de ataque de graça.
        "base-uri 'none'",
        "object-src 'none'",

        // Enquadrar o site em iframe de terceiro é o vetor de clickjacking.
        // Aqui só serve para navegador antigo: o `frame-ancestors` de verdade
        // está no cabeçalho do vercel.json, porque <meta> o ignora.
        "child-src 'none'",

        // Sem worker e sem media.
        "worker-src 'none'",
        "media-src 'none'",

        // Força https em qualquer requisição que escape com http://.
        'upgrade-insecure-requests',
      ],

      scriptDirective: {
        // O hash do script de boot, calculado acima da mesma constante que o
        // layout usa. `kind: 'element'` porque é um <script>, não um atributo.
        hashes: [{ hash: HASH_DO_BOOT, kind: /** @type {const} */ ('element') }],

        // 'self' para os módulos que o Astro emite como arquivo, mais o script
        // do Turnstile e o do analytics. Os inline entram por hash, calculado
        // pelo Astro — não são listados aqui.
        resources: [
          { resource: "'self'", kind: /** @type {const} */ ('element') },
          {
            resource: 'https://challenges.cloudflare.com',
            kind: /** @type {const} */ ('element'),
          },
          ...analytics.map((host) => ({
            resource: host,
            kind: /** @type {const} */ ('element'),
          })),
        ],
      },

      styleDirective: {
        // O Astro embute CSS pequeno e escopa estilo de componente; os hashes
        // vêm dele. 'self' cobre a folha principal em arquivo.
        resources: [{ resource: "'self'", kind: /** @type {const} */ ('element') }],
      },
    },
  },

  integrations: [
    react(),
    keystatic(),
    sitemap({
      /**
       * Página `noindex` NÃO entra no sitemap.
       *
       * As duas telas de resultado do formulário de contato têm
       * `<meta name="robots" content="noindex">`. Listá-las no sitemap mandaria
       * ao Google dois sinais opostos sobre a mesma URL — "rastreie" e "não
       * indexe" — e o Search Console reporta isso como erro
       * ("Submitted URL marked noindex").
       *
       * A lista é explícita em vez de derivada do HTML: o filtro do sitemap
       * roda antes de haver HTML para inspecionar.
       */
      filter: (page) =>
        ![
          '/mensagem-enviada/',
          '/mensagem-nao-enviada/',
          // O painel do Keystatic. Não é conteúdo e exige login no GitHub —
          // indexá-lo levaria gente a uma tela de autenticação vinda da busca.
          '/keystatic/',
          '/admin/',
        ].some((rota) => page.endsWith(rota)),
    }),
  ],

  vite: {
    // Tailwind v4 entra como plugin do Vite. NÃO usar @astrojs/tailwind,
    // que é o caminho da v3.
    plugins: [tailwindcss()],
  },
});
