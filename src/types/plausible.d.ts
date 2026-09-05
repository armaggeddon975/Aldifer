/**
 * Tipo do Plausible em `window`.
 *
 * O script vem de fora do bundle, então o TypeScript não sabe que
 * `window.plausible` existe. A função é OPCIONAL de propósito: sem
 * `PUBLIC_PLAUSIBLE_DOMAIN` o componente Analytics.astro não renderiza
 * script nenhum e ela nunca é definida — o `?.()` em src/lib/analytics.ts
 * depende disso para não lançar.
 *
 * A fila `q` é o stub que a documentação do Plausible recomenda, para o caso
 * de um evento ser disparado antes do script chegar.
 */
interface PlausibleFn {
  (event: string, options?: { props?: Record<string, string | number> }): void;
  q?: unknown[];
}

interface Window {
  plausible?: PlausibleFn;
}
