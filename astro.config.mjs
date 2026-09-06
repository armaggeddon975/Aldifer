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
     * CSS EM ARQUIVO LINKADO — `'auto'`, que é o padrão do Astro.
     *
     * Esta linha já foi `'always'`, e a reversão é o exemplo mais claro deste
     * projeto de uma otimização que envelheceu. Fica registrada porque quem ler
     * o histórico vai encontrar a decisão anterior bem argumentada.
     *
     * POR QUE ELA FOI EMBUTIDA (Etapa 12). `<link rel="stylesheet">` bloqueia a
     * pintura, e o `preload` da Archivo — que então tinha 90.104 bytes, porque
     * carregava o eixo de largura — é escrito antes no <head>, enquanto o Astro
     * injeta o <link> da folha no FIM. O navegador começava 90 KB de fonte
     * antes do CSS crítico. Medido em 9 execuções no /orcamento: 4 de 9 acima
     * da meta de LCP com a folha em arquivo, 0 de 9 embutida.
     *
     * POR QUE VOLTOU (Etapa 13). Duas condições daquela medição mudaram:
     *
     *   1. A Archivo passou a ser instanciada em wdth 125% e caiu para 34.648
     *      bytes. A disputa por banda encolheu 55 KB.
     *   2. A medição foi feita em http/1.1, no servidor de teste local. A
     *      Vercel serve http/2, onde a requisição da folha é multiplexada na
     *      conexão já aberta em vez de custar um round-trip inteiro.
     *
     * Remedido EM PRODUÇÃO, em https://aldifer.vercel.app, 3 execuções por
     * página. A folha linkada ganhou em tudo:
     *
     *              LCP embutido   LCP linkado
     *   Home           1,38s         1,11s
     *   Categoria      1,36s         1,22s
     *   Calculadora    1,52s         1,37s
     *   Orçamento      1,53s         1,37s
     *
     * O FCP do /orcamento caiu de 1,37s para 1,07s e o pior CLS dele de 0,052
     * para 0,018. Nenhuma métrica piorou.
     *
     * E a folha linkada ainda é melhor pelo lado que a medição de UMA página
     * não mostra: ela tem cache compartilhado, então cada página seguinte da
     * navegação carrega 6,6 KB gzip a menos. O público deste site navega várias
     * páginas do catálogo, de 4G, e o CLAUDE.md diz que cada KB conta.
     *
     * A LIÇÃO, que vale além deste caso: número de performance tem prazo de
     * validade. Este foi medido em http/1.1 contra uma fonte que não existe
     * mais, e a conclusão inverteu.
     */
    inlineStylesheets: 'auto',
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
