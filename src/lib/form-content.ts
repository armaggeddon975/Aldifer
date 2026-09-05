/**
 * Copy do formulário de orçamento e das respostas do servidor.
 *
 * As mensagens do servidor moram aqui, e não dentro do endpoint, porque são
 * texto visível ao usuário — a mesma regra que vale para componente vale para
 * resposta de API.
 *
 * Módulo puro: importado pelo formulário no navegador E pelo endpoint.
 */

export const formCopy = {
  heading: 'Seus dados para o orçamento',
  description:
    'Cinco campos. O telefone é obrigatório porque a resposta costuma sair mais rápido por WhatsApp que por e-mail.',

  labelName: 'Nome',
  labelCompany: 'Empresa',
  labelEmail: 'E-mail',
  labelPhone: 'Telefone ou WhatsApp',
  labelCity: 'Cidade',
  labelNotes: 'Observações',
  labelConsent:
    'Autorizo a Aldifer a usar meus dados de contato para responder a este pedido de orçamento. Li a Política de Privacidade.',

  optional: '(opcional)',
  notesHint: 'Corte sob medida, prazo, condição de entrega — o que o pedido precisar.',
  phoneHint: 'Com DDD. Ex.: (11) 94344-1919',

  /** Rótulo do honeypot. Nunca chega a olho humano, mas leitor de tela pode ler. */
  labelHoneypot: 'Não preencha este campo',

  submitIdle: 'Enviar pedido de orçamento',
  submitSending: 'Enviando…',

  successHeading: 'Pedido recebido',
  successBody: 'Respondemos em até 1 dia útil, em horário comercial.',
  successWhatsappLabel: 'Mandar o mesmo pedido pelo WhatsApp',
  successNewLabel: 'Voltar ao catálogo',

  errorHeading: 'Não foi possível enviar',
  /** O telefone entra por interpolação, para não duplicar o dado. */
  errorBodyTemplate: (phone: string) => `Tente novamente ou chame no ${phone}.`,

  /** Anúncio do resumo de erros, para leitor de tela. */
  errorSummaryTemplate: (count: number) =>
    count === 1
      ? 'Há 1 campo para corrigir. Confira as mensagens abaixo dos campos.'
      : `Há ${count} campos para corrigir. Confira as mensagens abaixo dos campos.`,

  emptyListHeading: 'Escolha as medidas antes de enviar',
  emptyListBody: 'O pedido precisa de pelo menos uma medida da tabela de bitolas.',
} as const;

/** Mensagens que o endpoint devolve. */
export const apiCopy = {
  badRequest: 'Não entendi o pedido. Recarregue a página e tente novamente.',
  tooFast: 'Envio muito rápido. Confira os dados e tente novamente.',
  invalid: 'Confira os campos marcados e envie de novo.',
  rateLimited:
    'Você já enviou vários pedidos na última hora. Aguarde um pouco ou ligue para falar direto com o comercial.',
  spamRejected: 'Não foi possível confirmar que você não é um robô. Recarregue a página e tente novamente.',
  /** Nem o e-mail nem a persistência funcionaram: o pedido foi PERDIDO. */
  notDelivered:
    'Não conseguimos registrar seu pedido agora. Por favor, ligue para o comercial — não queremos que você perca a viagem.',
  success: 'Pedido recebido. Respondemos em até 1 dia útil, em horário comercial.',
} as const;
