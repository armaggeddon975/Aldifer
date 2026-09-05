/**
 * Verificação do Cloudflare Turnstile, do lado do servidor.
 *
 * Validar só no cliente não protege nada: quem quer enviar spam fala direto
 * com o endpoint. O token que o widget produz só vale depois de trocado com a
 * API da Cloudflare, aqui.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult =
  | { readonly status: 'ok' }
  | { readonly status: 'falhou'; readonly reason: string }
  /**
   * Chave não configurada. Deliberadamente NÃO é 'falhou': fechar o
   * formulário por falta de configuração perderia lead real, e perder lead é
   * o pior resultado possível para este site.
   *
   * Em vez disso o envio segue e o aviso é carimbado no assunto do e-mail,
   * para a Aldifer descobrir pelo próprio pedido que a proteção está desligada.
   */
  | { readonly status: 'nao-configurado' };

export async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { status: 'nao-configurado' };

  if (!token) return { status: 'falhou', reason: 'token ausente' };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'desconhecido') body.set('remoteip', ip);

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      // Sem timeout o endpoint pendura à espera da Cloudflare.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { status: 'falhou', reason: `siteverify respondeu ${response.status}` };
    }

    const data = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (data.success) return { status: 'ok' };

    return {
      status: 'falhou',
      reason: data['error-codes']?.join(', ') || 'resposta sem sucesso',
    };
  } catch (error) {
    // Indisponibilidade da Cloudflare não pode derrubar o pedido: trata como
    // não verificado, com o aviso carimbado, em vez de recusar o lead.
    return { status: 'falhou', reason: `erro ao consultar siteverify: ${String(error)}` };
  }
}
