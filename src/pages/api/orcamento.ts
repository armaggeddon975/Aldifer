import type { APIRoute } from 'astro';
import { Resend } from 'resend';

import { apiCopy } from '@/lib/form-content';
import { createLeadStore, type Lead } from '@/lib/lead-store';
import {
  buildHtmlBody,
  buildSubject,
  buildTextBody,
  buildWhatsappText,
  type EmailWarning,
} from '@/lib/quote-email';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { fieldErrors, quoteRequestSchema } from '@/lib/schemas';
import { verifyTurnstile } from '@/lib/turnstile';

/**
 * Recebe o pedido de orçamento.
 *
 * É a ÚNICA rota do site renderizada sob demanda — as outras 10 páginas são
 * HTML pré-gerado.
 *
 * A ordem das checagens é a da seção 7 do docs/CONTEUDO.md, e ela é
 * deliberada: validar antes de contar o limite faz com que só envio bem
 * formado consuma cota, senão um robô mandando lixo queimaria os 5 envios de
 * um serralheiro atrás do mesmo NAT.
 *
 * POLÍTICA DE FALHA: perder lead é o pior resultado possível para este site.
 * Então nada aqui recusa um pedido por causa de configuração ausente — quando
 * a persistência ou o anti-spam não estão disponíveis, o pedido segue e o
 * aviso é CARIMBADO no assunto do e-mail. Só devolve erro quando nem o e-mail
 * nem a persistência funcionaram, porque aí o pedido de fato se perdeu.
 */
export const prerender = false;

const MAX_BODY_BYTES = 64 * 1024;
const MIN_FILL_MS = 3000;

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);

  // Guarda barata antes de qualquer trabalho: corpo grande demais nem é lido.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, message: apiCopy.badRequest });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, message: apiCopy.badRequest });
  }

  // (b antes de a, de propósito) Honeypot, verificado no payload CRU.
  //
  // A ordem da seção 7 do CONTEUDO.md põe a validação antes do honeypot, e
  // testando descobri que isso vaza: o schema recusa `website` e a resposta
  // sai com fieldErrors.website, dizendo ao robô exatamente qual campo o
  // pegou. Verificando antes, a resposta é 200 com sucesso FALSO e o robô não
  // aprende nada. Nenhuma checagem é pulada — só invertida.
  //
  // Pessoa nenhuma chega a este campo: ele está fora da tela, com
  // tabindex="-1" e aria-hidden.
  const honeypot = (payload as { website?: unknown } | null)?.website;
  if (typeof honeypot === 'string' && honeypot !== '') {
    console.warn(`[orcamento] honeypot preenchido (${ip}): descartado em silêncio.`);
    return json(200, { ok: true, message: apiCopy.success, whatsappText: '' });
  }

  // (a) Revalida com o MESMO schema do cliente.
  const parsed = quoteRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const erros = fieldErrors(parsed.error);
    // Cinto e suspensório: o nome do honeypot nunca sai numa resposta de erro,
    // mesmo que alguém mude a ordem das checagens no futuro.
    delete erros.website;
    return json(400, { ok: false, message: apiCopy.invalid, fieldErrors: erros });
  }
  const data = parsed.data;

  // (c) Tempo de preenchimento. Aqui a mensagem é real: uma pessoa colando
  // dados rápido pode cair nisto e merece saber o que aconteceu.
  const fillMs = Date.now() - data.loadedAt;
  if (fillMs < MIN_FILL_MS) {
    return json(400, { ok: false, message: apiCopy.tooFast });
  }

  // (d) Turnstile, validado contra a API da Cloudflare.
  const turnstile = await verifyTurnstile(data.turnstileToken, ip);
  if (turnstile.status === 'falhou') {
    console.warn(`[orcamento] turnstile recusou (${ip}): ${turnstile.reason}`);
    return json(403, { ok: false, message: apiCopy.spamRejected });
  }

  // (e) Limite por IP, contado só sobre envio bem formado.
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return json(429, {
      ok: false,
      message: apiCopy.rateLimited,
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const lead: Lead = {
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    city: data.city,
    notes: data.notes,
    consent: data.consent,
    items: data.items,
    receivedAt: new Date().toISOString(),
    ip,
    userAgent: request.headers.get('user-agent'),
    fillSeconds: Math.round(fillMs / 1000),
  };

  const warnings: EmailWarning[] = [];
  if (turnstile.status === 'nao-configurado') {
    warnings.push('sem-antispam');
    console.warn('[orcamento] TURNSTILE_SECRET_KEY ausente: envio aceito sem verificação.');
  }

  // (f) Persiste. Obrigatório — e-mail sozinho perde lead.
  const store = createLeadStore();
  const saved = await store.save(lead);
  if (!saved.ok) {
    warnings.push('sem-persistencia');
    console.error(`[orcamento] PERSISTÊNCIA FALHOU (${store.name}): ${saved.reason}`);
  }

  // (g) E-mail via Resend, com reply-to no e-mail do cliente.
  const emailSent = await sendEmail(lead, warnings);

  // (h) Só é erro quando o pedido se perdeu nos DOIS caminhos.
  if (!emailSent.ok && !saved.ok) {
    console.error('[orcamento] PEDIDO PERDIDO: nem e-mail nem persistência funcionaram.');
    return json(502, { ok: false, message: apiCopy.notDelivered });
  }

  return json(200, {
    ok: true,
    message: apiCopy.success,
    whatsappText: buildWhatsappText(lead),
  });
};

async function sendEmail(
  lead: Lead,
  warnings: readonly EmailWarning[],
): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.QUOTE_MAIL_TO?.trim();
  const from = process.env.QUOTE_MAIL_FROM?.trim();

  if (!apiKey || !to || !from) {
    const faltando = [
      !apiKey && 'RESEND_API_KEY',
      !to && 'QUOTE_MAIL_TO',
      !from && 'QUOTE_MAIL_FROM',
    ]
      .filter(Boolean)
      .join(', ');
    console.error(`[orcamento] e-mail NÃO enviado, variáveis ausentes: ${faltando}`);
    return { ok: false, reason: `variáveis ausentes: ${faltando}` };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: to.split(',').map((address) => address.trim()),
      // Responder ao e-mail vai direto para o cliente, sem copiar endereço.
      replyTo: lead.email,
      subject: buildSubject(lead, warnings),
      text: buildTextBody(lead, warnings),
      html: buildHtmlBody(lead, warnings),
    });

    if (error) {
      console.error(`[orcamento] Resend recusou: ${error.message}`);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error(`[orcamento] erro ao chamar o Resend: ${String(error)}`);
    return { ok: false, reason: String(error) };
  }
}
