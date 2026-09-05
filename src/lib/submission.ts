import { Resend } from 'resend';
import type { z } from 'zod';

import { apiCopy } from './form-content.ts';
import { createLeadStore, type Lead, type LeadKind } from './lead-store.ts';
import {
  buildHtmlBody,
  buildSubject,
  buildTextBody,
  buildWhatsappText,
  type EmailWarning,
} from './quote-email.ts';
import { checkRateLimit, clientIp } from './rate-limit.ts';
import { FILL_TIME_UNMEASURED, fieldErrors } from './schemas.ts';
import { verifyTurnstile } from './turnstile.ts';

/**
 * Pipeline de recebimento, compartilhado pelo pedido de orçamento e pela
 * mensagem de contato.
 *
 * ESTÁ AQUI, e não duplicado nas duas rotas, porque tudo o que ele faz é
 * sensível a ordem e a detalhe: honeypot antes da validação, tempo de
 * preenchimento, Turnstile, limite por IP contado só sobre envio bem formado,
 * persistência obrigatória e a política de falha. Eu já errei a ordem uma vez
 * na Etapa 6 — o honeypot vinha depois do Zod e a resposta de erro vazava o
 * nome do próprio campo-armadilha. Um erro desses corrigido em duas cópias é
 * um erro corrigido pela metade.
 *
 * A ordem das checagens é a da seção 7 do docs/CONTEUDO.md.
 *
 * POLÍTICA DE FALHA: perder lead é o pior resultado possível para este site.
 * Nada aqui recusa um envio por causa de configuração ausente — quando a
 * persistência ou o anti-spam não estão disponíveis, o envio segue e o aviso é
 * CARIMBADO no assunto do e-mail. Só devolve erro quando nem o e-mail nem a
 * persistência funcionaram, porque aí o pedido de fato se perdeu.
 */

const MAX_BODY_BYTES = 64 * 1024;
const MIN_FILL_MS = 3000;

/** Variáveis de ambiente do envio, por tipo. O contato pode ter destino próprio. */
const MAIL_TO_VAR: Record<LeadKind, readonly string[]> = {
  orcamento: ['QUOTE_MAIL_TO'],
  // Cai no destino do orçamento quando não houver caixa separada para contato:
  // melhor a mensagem chegar no lugar quase certo que não chegar.
  contato: ['CONTACT_MAIL_TO', 'QUOTE_MAIL_TO'],
};

export type SubmissionOutcome =
  | {
      readonly ok: true;
      readonly status: 200;
      readonly message: string;
      readonly whatsappText: string;
    }
  | {
      readonly ok: false;
      readonly status: 400 | 403 | 413 | 429 | 502;
      readonly message: string;
      readonly fieldErrors?: Partial<Record<string, string>>;
      readonly retryAfterSeconds?: number;
    };

/**
 * O que os dois schemas têm em comum, do ponto de vista deste pipeline.
 *
 * Declarado à mão em vez de derivado de `Lead`: `items` é obrigatório no Lead
 * (vazio no contato, mas presente) e AUSENTE no schema de contato. Derivar de
 * Lead recusaria o contactMessageSchema.
 */
type SubmissionPayload = {
  readonly name: string;
  readonly company?: string;
  readonly email: string;
  readonly phone: string;
  readonly city?: string;
  readonly notes?: string;
  readonly consent: true;
  readonly loadedAt: number;
  readonly turnstileToken?: string;
  readonly items?: Lead['items'];
};

type Schema = z.ZodType<SubmissionPayload>;

/**
 * Lê o corpo em JSON **ou** em formulário nativo.
 *
 * O formulário de contato funciona sem JavaScript: sem o script, o navegador
 * faz um POST comum, que chega como `application/x-www-form-urlencoded`. Todo
 * valor vem string nesse caminho, então os campos que o schema espera com
 * outro tipo são convertidos aqui — e só aqui, para o schema continuar sendo a
 * única autoridade sobre o que é válido.
 */
async function readPayload(request: Request): Promise<unknown> {
  const tipo = request.headers.get('content-type') ?? '';

  if (tipo.includes('application/json')) return request.json();

  if (tipo.includes('form-urlencoded') || tipo.includes('multipart/form-data')) {
    const form = await request.formData();
    const bruto = Object.fromEntries(form.entries());

    return {
      ...bruto,
      // Checkbox desmarcado não é enviado pelo navegador; marcado vem "on".
      consent: form.has('consent') ? true : undefined,
      loadedAt: Number(form.get('loadedAt') ?? 0),
      // O honeypot está sempre no HTML, então sempre chega — vazio quando
      // ninguém o tocou. Ausente só se alguém montar o POST à mão.
      website: typeof bruto.website === 'string' ? bruto.website : '',
    };
  }

  throw new Error(`content-type não suportado: ${tipo || '(vazio)'}`);
}

export async function processSubmission(
  request: Request,
  kind: LeadKind,
  schema: Schema,
): Promise<SubmissionOutcome> {
  const ip = clientIp(request);
  const tag = `[${kind}]`;

  // Guarda barata antes de qualquer trabalho: corpo grande demais nem é lido.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, status: 413, message: apiCopy.badRequest };
  }

  let payload: unknown;
  try {
    payload = await readPayload(request);
  } catch {
    return { ok: false, status: 400, message: apiCopy.badRequest };
  }

  // (b antes de a, de propósito) Honeypot, verificado no payload CRU.
  //
  // A ordem da seção 7 do CONTEUDO.md põe a validação antes do honeypot, e
  // testando descobri que isso vaza: o schema recusa `website` e a resposta sai
  // com fieldErrors.website, dizendo ao robô exatamente qual campo o pegou.
  // Verificando antes, a resposta é 200 com sucesso FALSO e o robô não aprende
  // nada. Nenhuma checagem é pulada — só invertida.
  const honeypot = (payload as { website?: unknown } | null)?.website;
  if (typeof honeypot === 'string' && honeypot !== '') {
    console.warn(`${tag} honeypot preenchido (${ip}): descartado em silêncio.`);
    return { ok: true, status: 200, message: apiCopy.success, whatsappText: '' };
  }

  // (a) Revalida com o MESMO schema do cliente.
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const erros = fieldErrors(parsed.error);
    // Cinto e suspensório: o nome do honeypot nunca sai numa resposta de erro,
    // mesmo que alguém mude a ordem das checagens no futuro.
    delete erros.website;
    return { ok: false, status: 400, message: apiCopy.invalid, fieldErrors: erros };
  }
  const data = parsed.data;

  // (c) Tempo de preenchimento. A mensagem é real: uma pessoa colando dados
  // rápido pode cair nisto e merece saber o que aconteceu.
  //
  // `loadedAt` igual a 0 significa que NINGUÉM cronometrou — é o envio sem
  // JavaScript, onde o campo oculto sai com o valor do HTML. Recusar aí
  // barraria justamente quem está sem script, e o valor sempre foi forjável:
  // o portão contra robô é o Turnstile, não este relógio.
  const medido = data.loadedAt !== FILL_TIME_UNMEASURED;
  const fillMs = medido ? Date.now() - data.loadedAt : 0;

  if (medido && fillMs < MIN_FILL_MS) {
    return { ok: false, status: 400, message: apiCopy.tooFast };
  }

  // (d) Turnstile, validado contra a API da Cloudflare.
  const turnstile = await verifyTurnstile(data.turnstileToken, ip);
  if (turnstile.status === 'falhou') {
    console.warn(`${tag} turnstile recusou (${ip}): ${turnstile.reason}`);
    return { ok: false, status: 403, message: apiCopy.spamRejected };
  }

  // (e) Limite por IP, contado só sobre envio bem formado.
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return {
      ok: false,
      status: 429,
      message: apiCopy.rateLimited,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  const lead: Lead = {
    kind,
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    city: data.city,
    notes: data.notes,
    consent: data.consent,
    items: data.items ?? [],
    receivedAt: new Date().toISOString(),
    ip,
    userAgent: request.headers.get('user-agent'),
    // -1 distingue "não cronometrado" de "enviado em zero segundo", que
    // seria leitura de robô, no campo de auditoria do e-mail.
    fillSeconds: medido ? Math.round(fillMs / 1000) : -1,
  };

  const warnings: EmailWarning[] = [];
  if (turnstile.status === 'nao-configurado') {
    warnings.push('sem-antispam');
    console.warn(`${tag} TURNSTILE_SECRET_KEY ausente: envio aceito sem verificação.`);
  }

  // (f) Persiste. Obrigatório — e-mail sozinho perde lead.
  const store = createLeadStore();
  const saved = await store.save(lead);
  if (!saved.ok) {
    warnings.push('sem-persistencia');
    console.error(`${tag} PERSISTÊNCIA FALHOU (${store.name}): ${saved.reason}`);
  }

  // (g) E-mail via Resend, com reply-to no e-mail do cliente.
  const emailSent = await sendEmail(lead, warnings, tag);

  // (h) Só é erro quando o envio se perdeu nos DOIS caminhos.
  if (!emailSent.ok && !saved.ok) {
    console.error(`${tag} ENVIO PERDIDO: nem e-mail nem persistência funcionaram.`);
    return { ok: false, status: 502, message: apiCopy.notDelivered };
  }

  return {
    ok: true,
    status: 200,
    message: apiCopy.success,
    whatsappText: buildWhatsappText(lead),
  };
}

async function sendEmail(
  lead: Lead,
  warnings: readonly EmailWarning[],
  tag: string,
): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.QUOTE_MAIL_FROM?.trim();

  // O contato tenta CONTACT_MAIL_TO e cai em QUOTE_MAIL_TO.
  const toVar = MAIL_TO_VAR[lead.kind].find((nome) => process.env[nome]?.trim());
  const to = toVar ? process.env[toVar]?.trim() : undefined;

  if (!apiKey || !to || !from) {
    const faltando = [
      !apiKey && 'RESEND_API_KEY',
      !to && MAIL_TO_VAR[lead.kind].join(' ou '),
      !from && 'QUOTE_MAIL_FROM',
    ]
      .filter(Boolean)
      .join(', ');
    console.error(`${tag} e-mail NÃO enviado, variáveis ausentes: ${faltando}`);
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
      console.error(`${tag} Resend recusou: ${error.message}`);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error(`${tag} erro ao chamar o Resend: ${String(error)}`);
    return { ok: false, reason: String(error) };
  }
}
