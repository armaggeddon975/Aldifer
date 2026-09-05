import type { APIRoute } from 'astro';

import { quoteRequestSchema } from '@/lib/schemas';
import { processSubmission } from '@/lib/submission';

/**
 * Recebe o pedido de orçamento — a ação primária do site.
 *
 * A rota é fina de propósito: honeypot, tempo de preenchimento, Turnstile,
 * limite por IP, persistência, e-mail e a política de falha vivem em
 * src/lib/submission.ts, compartilhados com /api/contato. A ordem dessas
 * checagens é sensível, e mantê-la em dois lugares seria pedir para elas
 * divergirem.
 *
 * Esta e /api/contato são as ÚNICAS rotas do site renderizadas sob demanda —
 * as outras 13 páginas são HTML pré-gerado.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const resultado = await processSubmission(request, 'orcamento', quoteRequestSchema);

  const { status, ...corpo } = resultado;
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
