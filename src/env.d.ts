/**
 * Variáveis de ambiente próprias, tipadas.
 *
 * Só as que o CÓDIGO lê por `import.meta.env`. As que ficam só no servidor de
 * produção — `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, as do Keystatic — são
 * lidas por `process.env` dentro de rotas de API e não passam por aqui.
 *
 * Sem esta declaração, `import.meta.env.SHOW_DRAFTS` não existe para o
 * TypeScript e o `astro check` reprova — o que é o comportamento certo: variável
 * de ambiente sem tipo é variável que ninguém sabe que existe.
 */
interface ImportMetaEnv {
  /**
   * Publica os produtos em `status: 'rascunho'` NUM BUILD DE PRODUÇÃO.
   *
   * `'true'` liga. Qualquer outro valor, ou ausente, mantém os rascunhos fora.
   * Ver a nota em `src/lib/products.ts`, que explica por que isto é variável de
   * ambiente e não uma linha de código.
   */
  readonly SHOW_DRAFTS?: string;
}
