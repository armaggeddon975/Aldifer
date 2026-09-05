import { z } from 'zod';

import { QUOTE_UNITS } from './quote.ts';

/**
 * Schema ÚNICO do pedido de orçamento, usado no cliente e no servidor.
 *
 * Módulo PURO: nada de `astro:content`, nada de DOM. O componente do
 * formulário importa para validar antes de enviar, e src/pages/api/orcamento.ts
 * importa o MESMO schema para revalidar. Dois schemas divergiriam, e o cliente
 * passaria a aceitar o que o servidor recusa.
 *
 * As mensagens dizem O QUE FAZER. "Campo inválido" obriga o usuário a adivinhar,
 * e quem está no balcão com o cliente esperando não adivinha: desiste.
 */

/** Só os dígitos, para validar telefone escrito de qualquer jeito. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Telefone brasileiro com DDD: 10 dígitos (fixo) ou 11 (celular).
 * Aceita com e sem +55, com e sem máscara — o serralheiro digita do jeito dele.
 */
function isBrazilianPhone(value: string): boolean {
  let digits = digitsOf(value);
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11;
}

const quoteItemSchema = z.object({
  productSlug: z.string().min(1),
  productName: z.string().min(1),
  dimension: z.string().min(1),
  length: z.string().optional(),
  quantity: z.number().int().positive(),
  unit: z.enum(QUOTE_UNITS),
  note: z.string().max(300).optional(),
});

/**
 * Campos comuns ao pedido de orçamento e ao formulário de contato da Etapa 8.
 * O contato reaproveita isto sem a lista de itens.
 */
export const contactBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escreva seu nome, para sabermos com quem falar.')
    .max(120, 'Nome muito longo. Use até 120 caracteres.'),

  company: z.string().trim().max(120, 'Nome de empresa muito longo.').optional(),

  email: z.email('Confira o e-mail: falta o @ ou o domínio, como nome@empresa.com.br.'),

  phone: z
    .string()
    .trim()
    .refine(isBrazilianPhone, 'Informe o telefone com DDD, como (11) 94344-1919.'),

  city: z.string().trim().max(80, 'Nome de cidade muito longo.').optional(),

  notes: z.string().trim().max(2000, 'Observação muito longa. Use até 2000 caracteres.').optional(),

  /**
   * Consentimento LGPD. `literal(true)` porque desmarcado o checkbox não é
   * `false`: ele simplesmente não é enviado pelo navegador.
   */
  consent: z.literal(true, {
    message: 'Marque a autorização para podermos responder ao seu pedido.',
  }),

  /**
   * Honeypot. Escondido por CSS, com tabindex="-1" e autocomplete="off":
   * pessoa nenhuma o vê ou tabula até ele, mas robô que preenche todo input
   * do formulário cai aqui. A mensagem nunca chega a um humano.
   */
  website: z.literal('', { message: 'Campo reservado.' }),

  /**
   * Momento em que o formulário foi carregado, para medir o tempo de
   * preenchimento no servidor.
   *
   * É valor vindo do cliente e portanto forjável — quem quiser burlar manda o
   * timestamp que quiser. Serve para barrar robô ingênuo, que envia em
   * milissegundos; o portão de verdade é o Turnstile.
   */
  loadedAt: z.number().int().positive('Recarregue a página e tente novamente.'),

  /** Token do Cloudflare Turnstile, validado contra a API deles no servidor. */
  turnstileToken: z.string().optional(),
});

/**
 * Mensagem do formulário de contato da Etapa 8.
 *
 * A diferença que importa em relação ao orçamento: aqui `notes` é OBRIGATÓRIO
 * e tem mínimo. No orçamento a observação é acessória — a lista de material já
 * diz o que a pessoa quer. No contato, a mensagem É o pedido: recebê-la vazia
 * daria à Aldifer um nome e um telefone sem assunto, e alguém teria de ligar
 * para descobrir por quê.
 */
export const contactMessageSchema = contactBaseSchema.extend({
  notes: z
    .string()
    .trim()
    .min(10, 'Escreva sua dúvida ou pedido, com pelo menos algumas palavras.')
    .max(2000, 'Mensagem muito longa. Use até 2000 caracteres.'),

  /**
   * Aqui `0` é permitido e significa "não medido".
   *
   * O formulário de contato funciona SEM JavaScript, e nesse caminho ninguém
   * escreve o timestamp: o campo oculto vai com o valor 0 do HTML. Exigir
   * `positive()` como no orçamento recusaria justamente quem está sem script —
   * e a mensagem seria "recarregue a página", que não resolveria nada.
   *
   * O servidor pula a checagem de tempo quando recebe 0. Não é perda de
   * defesa: o próprio valor sempre foi forjável, e o portão de verdade contra
   * robô é o Turnstile.
   */
  loadedAt: z
    .number()
    .int()
    .nonnegative('Recarregue a página e tente novamente.'),
});

/** Sentinela de `loadedAt`: o envio veio sem JavaScript e não foi cronometrado. */
export const FILL_TIME_UNMEASURED = 0;

export const quoteRequestSchema = contactBaseSchema.extend({
  items: z
    .array(quoteItemSchema)
    .min(1, 'Sua lista está vazia. Escolha ao menos uma medida no catálogo.')
    .max(200, 'Lista muito longa. Envie até 200 medidas por pedido.'),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ContactMessage = z.infer<typeof contactMessageSchema>;
export type ContactBase = z.infer<typeof contactBaseSchema>;

/** Nomes dos campos que aparecem na tela, para mapear erro -> input. */
export const FORM_FIELDS = [
  'name',
  'company',
  'email',
  'phone',
  'city',
  'notes',
  'consent',
] as const;

export type FormField = (typeof FORM_FIELDS)[number];

/**
 * Reduz os erros do Zod a um mapa campo -> primeira mensagem.
 *
 * Uma mensagem por campo, e não a lista inteira: três avisos empilhados no
 * mesmo campo não ajudam ninguém a consertá-lo.
 */
export function fieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const map: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    map[key] ??= issue.message;
  }
  return map;
}
