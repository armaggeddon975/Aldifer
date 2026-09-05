/**
 * Conteúdo da Política de Privacidade.
 *
 * ATENÇÃO: é MINUTA. O texto é verdadeiro sobre o que este site tecnicamente
 * faz — os dados que coleta, para onde eles vão e por quanto tempo o navegador
 * os guarda — mas documento legal precisa de revisão de quem responde por ele.
 * Ver a lista de pendências do README.
 *
 * Os dois campos que NÃO posso afirmar estão marcados como pendência e não
 * renderizam em produção: o CNPJ do controlador e o prazo de retenção do lead.
 *
 * Escrito em português claro, não em juridiquês: a política que ninguém lê não
 * informa ninguém, e a LGPD exige informação acessível (art. 9º).
 */

export type PolicySection = {
  readonly id: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly list?: readonly string[];
};

export const privacyPage = {
  seoTitle: 'Política de Privacidade — Aldifer',
  seoDescription:
    'Quais dados a Aldifer coleta no site, para que os usa, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos pela LGPD.',
  heading: 'Política de Privacidade',
  updatedLabel: 'Última atualização',
  intro:
    'Esta página explica, em português claro, quais dados este site coleta, por que os coleta e o que você pode fazer a respeito. Ela vale para o site aldifer.com.br.',
} as const;

export const policySections: readonly PolicySection[] = [
  {
    id: 'quem-somos',
    heading: 'Quem é o controlador dos dados',
    paragraphs: [
      'A Aldifer Distribuidora de Ferro e Aço, com sede na Estrada dos Alvarengas, 5338, Núcleo São Jorge, São Bernardo do Campo / SP, CEP 09850-550, é a controladora dos dados pessoais tratados neste site.',
      'Para qualquer assunto relacionado a esta política, incluindo o exercício dos seus direitos, fale com contato@aldifer.com.br ou (11) 4344-1919.',
    ],
  },
  {
    id: 'dados-coletados',
    heading: 'Quais dados coletamos',
    paragraphs: [
      'Só o que você digita no formulário de orçamento, mais o mínimo técnico que qualquer site registra:',
    ],
    list: [
      'Nome, e-mail e telefone — obrigatórios, porque sem eles não há como responder ao seu pedido.',
      'Empresa e cidade — opcionais, ajudam a dimensionar entrega e atendimento.',
      'Observações que você escrever no pedido.',
      'A lista de materiais que você montou navegando pelo catálogo.',
      'Endereço IP e identificação do navegador, registrados junto com o envio para conter spam e abuso do formulário.',
      'O tempo que você levou preenchendo o formulário, usado apenas para distinguir pessoa de robô.',
    ],
  },
  {
    id: 'lista-no-navegador',
    heading: 'Sua lista de orçamento fica no seu navegador',
    paragraphs: [
      'Enquanto você escolhe medidas no catálogo, a lista é guardada no armazenamento local do SEU navegador, e não em nossos servidores. Nós só recebemos essa lista quando você preenche o formulário e clica em enviar.',
      'Essa lista é apagada automaticamente do seu navegador após 30 dias, e você pode apagá-la a qualquer momento pelo botão "Limpar a lista" na página de orçamento, ou limpando os dados do site no seu navegador.',
    ],
  },
  {
    id: 'finalidade',
    heading: 'Para que usamos',
    paragraphs: ['Para três coisas, e nada além delas:'],
    list: [
      'Responder ao seu pedido de orçamento e dar seguimento à negociação.',
      'Entrar em contato sobre esse pedido específico, por e-mail, telefone ou WhatsApp.',
      'Proteger o formulário contra spam e envio automatizado.',
    ],
  },
  {
    id: 'base-legal',
    heading: 'Com que base legal',
    paragraphs: [
      'Para responder ao seu pedido, a base é o seu consentimento (art. 7º, I da LGPD) — é aquela caixa que você marca antes de enviar, e ela nunca vem pré-marcada.',
      'Para dar seguimento a uma negociação já iniciada, a base é a execução de contrato ou procedimento preliminar a contrato (art. 7º, V).',
      'Para conter spam e abuso do formulário, a base é o legítimo interesse (art. 7º, IX): sem isso o formulário viraria inutilizável para você e para nós.',
    ],
  },
  {
    id: 'compartilhamento',
    heading: 'Com quem compartilhamos',
    paragraphs: [
      'Não vendemos e não cedemos seus dados para publicidade. Eles passam apenas por prestadores de serviço necessários para o site funcionar:',
    ],
    list: [
      'Vercel — hospedagem do site e registro técnico das requisições.',
      'Resend — envio do e-mail com o seu pedido para o nosso comercial.',
      'Cloudflare — verificação anti-robô do formulário (Turnstile), que não usa cookie de rastreamento.',
      'Google — apenas se você clicar para abrir o mapa ou traçar rota. O mapa não carrega sozinho: só quando você pede.',
    ],
  },
  {
    id: 'cookies',
    heading: 'Cookies e medição de audiência',
    paragraphs: [
      'Este site não usa cookie de rastreamento, não usa pixel de rede social e não faz perfil de comportamento. É por isso que você não vê aqui aquele aviso de cookies pedindo aceite.',
      'A medição de audiência, quando ativada, é feita por ferramenta sem cookie e sem identificação individual — ela conta visitas, não pessoas.',
    ],
  },
  {
    id: 'retencao',
    heading: 'Por quanto tempo guardamos',
    paragraphs: [
      'A lista de materiais no seu navegador: 30 dias, apagada automaticamente.',
      'O pedido de orçamento enviado fica guardado pelo tempo necessário para atender você e cumprir obrigações legais e fiscais decorrentes de uma eventual venda.',
      'Se você pedir a exclusão e não houver obrigação legal que nos obrigue a manter o registro, apagamos.',
    ],
  },
  {
    id: 'direitos',
    heading: 'Seus direitos',
    paragraphs: [
      'A LGPD garante a você, a qualquer momento e sem custo, o direito de:',
    ],
    list: [
      'Saber se tratamos dados seus e ter acesso a eles.',
      'Corrigir dado incompleto, inexato ou desatualizado.',
      'Pedir anonimização, bloqueio ou eliminação de dado desnecessário ou tratado fora da lei.',
      'Pedir a portabilidade dos dados a outro fornecedor.',
      'Revogar o consentimento e pedir a eliminação dos dados tratados com base nele.',
      'Ser informado sobre com quem compartilhamos seus dados.',
      'Se opor a um tratamento feito com base no legítimo interesse.',
    ],
  },
  {
    id: 'como-exercer',
    heading: 'Como exercer seus direitos',
    paragraphs: [
      'Escreva para contato@aldifer.com.br dizendo o que você quer. Respondemos no prazo da LGPD.',
      'Se precisarmos confirmar que é você mesmo, pediremos apenas o necessário para isso — nunca mais dados do que o pedido exige.',
    ],
  },
  {
    id: 'mudancas',
    heading: 'Mudanças nesta política',
    paragraphs: [
      'Se esta política mudar, a data de atualização no topo muda com ela. Alteração que afete a base legal do tratamento será comunicada antes de valer.',
    ],
  },
];
