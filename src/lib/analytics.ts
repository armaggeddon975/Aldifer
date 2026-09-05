/**
 * Eventos de conversão.
 *
 * Módulo PURO e seguro para rodar no navegador com o analytics DESLIGADO: sem
 * `PUBLIC_PLAUSIBLE_DOMAIN` o componente Analytics.astro não renderiza script
 * nenhum, `window.plausible` não existe, e `track` simplesmente não faz nada.
 * Nada aqui pode lançar exceção — um erro no meio do caminho de sucesso do
 * formulário esconderia a confirmação do pedido por causa de uma métrica.
 *
 * O `orcamento_enviado` é O evento do site. O CLAUDE.md define o sucesso do
 * projeto como "pedidos de orçamento estruturados recebidos", e é este o
 * contador que mede exatamente isso.
 */

/** Nomes fixos: evento digitado errado vira métrica perdida, sem erro visível. */
export const EVENTS = {
  /** Pedido de orçamento enviado com sucesso. A conversão do site. */
  quoteSent: 'orcamento_enviado',
  /** Mensagem do formulário de contato enviada. Conversão secundária. */
  contactSent: 'contato_enviado',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Registra um evento, se houver analytics.
 *
 * `props` são dimensões do Plausible — no orçamento, quantas medidas o pedido
 * trazia. Serve para responder "o pedido médio tem 1 medida ou 20?", que muda
 * como a Aldifer organiza o atendimento.
 */
export function track(name: EventName, props?: Record<string, string | number>): void {
  try {
    // Cria a fila se o script remoto ainda não chegou.
    //
    // POR QUE AQUI e não num <script> inline no HTML, como a documentação do
    // Plausible sugere: a CSP deste site não aceita script inline sem hash, e
    // o Astro só hasheia os scripts que ELE processa — um `is:inline` passa
    // sem hash e é BLOQUEADO. Testado: com o stub inline, a fila não existia
    // e o console acusava a violação.
    //
    // A fila neste formato é a que o script do Plausible drena ao carregar,
    // então um envio rápido não perde a conversão. Se o script nunca chegar,
    // por bloqueador de anúncio, os eventos ficam na memória sem efeito.
    if (!window.plausible) {
      const fila: PlausibleFn = (...args: Parameters<PlausibleFn>) => {
        (fila.q ??= []).push(args);
      };
      window.plausible = fila;
    }

    window.plausible(name, props ? { props } : undefined);
  } catch {
    // Métrica nunca interrompe o fluxo de quem está pedindo material.
  }
}
