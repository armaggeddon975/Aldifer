/**
 * Copy da home. Toda ela vem das seções 2 e 3 do docs/CONTEUDO.md e foi
 * aprovada na Fase 1 — NÃO reescrever.
 *
 * Existe como módulo tipado, e não dentro dos componentes, porque o CLAUDE.md
 * é explícito: "Conteúdo nunca hardcoded no JSX. O componente recebe dados,
 * não os contém." O mesmo padrão de src/lib/navigation.ts.
 *
 * A Etapa 11 pode promover isto a content collection se a Aldifer quiser
 * editar a home pelo painel; hoje o escopo do Keystatic é produto, categoria,
 * configuração e aviso.
 */

export type TextBlock = {
  readonly title: string;
  readonly body: string;
};

/** Aviso de dado não confirmado, atrelado ao bloco onde a afirmação aparece. */
export type PendingNote = {
  readonly label: string;
  readonly detail: string;
};

export const hero = {
  headline: 'Ferro e aço em pronta-entrega para quem trabalha no Grande ABC.',
  subheadline:
    'Barras, tubos, chapas, perfis e telas com estoque em São Bernardo do Campo. Monte sua lista de material e receba o orçamento pelo mesmo canal.',
  ctaPrimary: { label: 'Montar lista de orçamento', href: '/produtos' },
  ctaSecondaryLabel: 'Falar no WhatsApp',
  proofs: ['Desde 2002', 'São Bernardo do Campo', 'Atendimento a serralheria e indústria'],
} as const;

export const quickSearch = {
  heading: 'Já sabe a medida?',
  description:
    'Digite a bitola e vá direto para a tabela, sem passar pelo catálogo inteiro.',
} as const;

export const categories = {
  heading: 'O que temos em linha',
  description:
    'Cada categoria abre a tabela de bitolas com medida, comprimento e peso por metro.',
} as const;

/** Seção 4 do CONTEUDO.md — ataca a objeção nº 1 do CLAUDE.md. */
export const why = {
  heading: 'Por que a Aldifer',
  blocks: [
    {
      title: 'Estoque, não catálogo de encomenda',
      body: 'A linha completa de barras, tubos, chapas, perfis e telas fica no galpão de São Bernardo. Você consulta a medida no site e confirma a retirada no mesmo dia.',
    },
    {
      title: 'Quem atende entende de serralheria',
      body: 'Desde 2002 fornecendo para as serralherias e indústrias do Grande ABC. Você fala com quem sabe a diferença entre chapa fina a frio e a quente sem precisar explicar.',
    },
    {
      title: 'Pedido que já chega pronto',
      body: 'Monte a lista com bitola, quantidade e observação. O orçamento sai sem telefonema de ida e volta e sem risco de o material errado subir no caminhão.',
    },
  ] as const satisfies readonly TextBlock[],
  /**
   * O CONTEUDO.md marca o primeiro bloco com [CONFIRMAR: prazo e política de
   * retirada]. A afirmação "confirma a retirada no mesmo dia" é uma promessa
   * de prazo que a Aldifer ainda não confirmou.
   */
  pending: {
    label: 'Prazo e política de retirada.',
    detail:
      'O primeiro bloco afirma "confirma a retirada no mesmo dia". É promessa de prazo e precisa de confirmação da Aldifer antes do lançamento — item da lista bloqueante do README.',
  } satisfies PendingNote,
} as const;

export const calculator = {
  heading: 'Calculadora de peso',
  description:
    'Informe a bitola e receba o peso teórico em quilos por metro. Serve para orçar o serviço antes de comprar o material, e o resultado vai direto para a lista de orçamento.',
  cta: { label: 'Abrir a calculadora', href: '/calculadora-de-peso' },
  exampleCaption: 'Exemplo: tubo quadrado 30 × 30 mm, parede 2,00 mm',
} as const;

/** Seção 6 do CONTEUDO.md. */
export const audience = {
  heading: 'Para quem atendemos',
  blocks: [
    {
      title: 'Serralheria',
      body: 'Portões, grades, estruturas, corrimãos e escadas. Barras, tubos, chapas e degraus na medida que o projeto pede.',
    },
    {
      title: 'Indústria',
      body: 'Reposição, manutenção e fabricação. Perfis estruturais, chapas laminadas e tubos com fornecimento recorrente.',
    },
    {
      title: 'Construção',
      body: 'Estrutura metálica, telhas galvanizadas, telas e alambrados para obra e fechamento de terreno.',
    },
  ] as const satisfies readonly TextBlock[],
} as const;

export const location = {
  heading: 'Onde estamos',
  description: 'Retirada e atendimento no galpão, em São Bernardo do Campo.',
  routeLabel: 'Traçar rota no Google Maps',
  mapButtonLabel: 'Carregar o mapa',
  mapNote:
    'O mapa carrega sob clique. Embutido de imediato, o iframe do Google Maps baixaria perto de 900 KB e derrubaria o tempo de carregamento da página.',
  hoursPending: {
    label: 'Horário de funcionamento, incluindo sábado.',
    detail: 'Não consta no site atual. Sem ele, o bloco de horário não renderiza.',
  } satisfies PendingNote,
} as const;

export const closing = {
  heading: 'Monte sua lista e receba o orçamento',
  description:
    'Navegue pelo catálogo, junte as bitolas que o serviço pede e envie tudo de uma vez. O orçamento sai sem telefonema de ida e volta.',
  cta: { label: 'Montar lista de orçamento', href: '/produtos' },
} as const;
