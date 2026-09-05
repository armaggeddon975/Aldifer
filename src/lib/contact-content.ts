/**
 * Copy da página Contato e das duas páginas de resultado do formulário.
 *
 * A hierarquia da página segue o CLAUDE.md: a ação primária do site é o pedido
 * de orçamento estruturado, e o contato é secundário. Por isso a página abre
 * mandando quem quer material para o catálogo, e o formulário daqui é para
 * dúvida — não para pedido de bitola, que se faz melhor pela lista.
 */

export const contactPage = {
  seoTitle: 'Contato e Endereço — Aldifer São Bernardo',
  seoDescription:
    'Estrada dos Alvarengas, 5338, São Bernardo do Campo. Telefone (11) 4344-1919. Veja rota, horário e envie seu pedido de orçamento.',
  heading: 'Contato',
  intro:
    'Telefone, e-mail e endereço abaixo. Se o que você precisa é preço de material, o caminho mais rápido é montar a lista no catálogo: o pedido chega com bitola, comprimento e quantidade, e a resposta não precisa de ida e volta.',
  quoteCtaLabel: 'Montar lista de orçamento',
  quoteCtaHref: '/produtos',
} as const;

export const contactChannels = {
  heading: 'Canais diretos',
  phoneLabel: 'Telefone',
  phoneNote: 'Ligação e o mesmo número para quem prefere falar.',
  emailLabel: 'E-mail',
  emailNote: 'Resposta em até 1 dia útil, em horário comercial.',
  whatsappLabel: 'WhatsApp',
  addressLabel: 'Endereço',
  hoursLabel: 'Horário de funcionamento',

  /** Pendências da lista do README. Só aparecem em desenvolvimento. */
  whatsappPending: {
    label: 'Número de WhatsApp direto.',
    detail:
      'O site atual manda para um linktr.ee em vez do número. Sem o número não há link wa.me, e um botão de WhatsApp que abre uma página intermediária perde gente no caminho.',
  },
  hoursPending: {
    label: 'Horário de funcionamento.',
    detail:
      'Não consta em lugar nenhum do site atual. É a informação que mais falta numa página de contato: sem ela o cliente não sabe se vale sair de casa.',
  },
} as const;

export const contactFacade = {
  heading: 'Como reconhecer',
  description:
    'O galpão fica na Estrada dos Alvarengas, número 5338. A fachada é laranja, com o logotipo pintado na parede e o número na lateral.',
  alt: 'Fachada laranja do galpão da Aldifer, com o logotipo pintado na parede, o portão azul de entrada e o número 5338 na lateral.',
} as const;

export const contactForm = {
  heading: 'Mandar uma mensagem',
  description:
    'Para dúvida técnica, disponibilidade de uma medida específica ou qualquer assunto que não seja um pedido de material.',

  labelName: 'Seu nome',
  labelCompany: 'Empresa',
  labelEmail: 'E-mail',
  labelPhone: 'Telefone com DDD',
  labelCity: 'Cidade',
  labelMessage: 'Sua mensagem',
  labelConsent:
    'Autorizo a Aldifer a usar meus dados para responder a esta mensagem.',
  labelHoneypot: 'Site (não preencha)',
  optional: '(opcional)',

  phoneHint: 'Fixo ou celular, com DDD.',
  messageHint: 'Quanto mais específico, menos ida e volta.',
  messagePlaceholder: '',

  submitIdle: 'Enviar mensagem',
  submitSending: 'Enviando…',

  errorHeading: 'A mensagem não foi enviada',
  invalidHeading: 'Confira os campos marcados',

  successHeading: 'Mensagem enviada',
  successBody:
    'Recebemos sua mensagem e respondemos em até 1 dia útil, em horário comercial. Se for urgente, ligue.',
  successCatalogLabel: 'Ver o catálogo',
} as const;

/** Página estática de sucesso, destino do envio sem JavaScript. */
export const messageSent = {
  seoTitle: 'Mensagem enviada — Aldifer',
  seoDescription:
    'Sua mensagem chegou à Aldifer. Respondemos em até 1 dia útil, em horário comercial.',
  heading: 'Mensagem enviada',
  body:
    'Recebemos sua mensagem e respondemos em até 1 dia útil, em horário comercial. Não é preciso enviar de novo.',
  urgentIntro: 'Se for urgente, ligue:',
  ctaLabel: 'Ver o catálogo',
  ctaHref: '/produtos',
  backLabel: 'Voltar ao contato',
  backHref: '/contato',
} as const;

/**
 * Página estática de falha.
 *
 * NÃO diz "erro no formulário": neste caminho os erros de preenchimento já
 * foram barrados pelo navegador antes do envio. O que sobra é envio muito
 * rápido, limite por IP e falha de entrega — e em nenhum desses casos a pessoa
 * consegue fazer algo com um nome de campo. O que resolve é o telefone.
 */
export const messageFailed = {
  seoTitle: 'A mensagem não foi enviada — Aldifer',
  seoDescription:
    'Não conseguimos registrar sua mensagem. Fale com a Aldifer pelo telefone (11) 4344-1919 ou por e-mail.',
  heading: 'A mensagem não foi enviada',
  body:
    'Alguma coisa impediu o envio e sua mensagem não chegou. Não perca tempo tentando adivinhar o que foi: fale direto com a gente pelos canais abaixo, que funcionam sempre.',
  retryLabel: 'Tentar o formulário de novo',
  retryHref: '/contato#formulario',
} as const;
