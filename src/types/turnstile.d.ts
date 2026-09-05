/**
 * Tipo do widget do Cloudflare Turnstile em `window`.
 *
 * O script deles é carregado por `<script src>` de fora do bundle, então o
 * TypeScript não tem como saber que `window.turnstile` existe. Antes da
 * Etapa 8 o QuoteForm resolvia isso com um cast inline de nove linhas; com
 * dois formulários usando o widget, o cast seria copiado — e um cast copiado
 * é uma declaração que pode divergir da outra.
 *
 * `zero-config` proposital: só o que os dois formulários realmente chamam.
 * Documentação: https://developers.cloudflare.com/turnstile/
 */
interface TurnstileRenderOptions {
  readonly sitekey: string;
  /** Recebe o token quando a pessoa passa pelo desafio. */
  readonly callback?: (token: string) => void;
  /** O token vence em 5 minutos; um formulário longo pode chegar lá. */
  readonly 'expired-callback'?: () => void;
  readonly 'error-callback'?: () => void;
  readonly language?: string;
  readonly theme?: 'light' | 'dark' | 'auto';
}

interface TurnstileApi {
  render: (el: HTMLElement, opts: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

interface Window {
  turnstile?: TurnstileApi;
}
