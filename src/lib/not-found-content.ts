/**
 * Copy da página 404.
 *
 * O PROMPTS.md é explícito: "Nada de 'Página não encontrada' e ponto final."
 *
 * A razão é concreta neste site. Cerca de 100 URLs antigas de keyword stuffing
 * apontam para cá e têm histórico de indexação — a Etapa 10 as redireciona uma
 * a uma, mas alguma escapará, e quem cair aqui veio do Google procurando uma
 * BITOLA. Uma 404 que só se desculpa devolve essa pessoa ao Google, onde o
 * próximo resultado é um concorrente. Uma 404 com busca e com as seis
 * categorias a mantém dentro do site.
 */

export const notFoundPage = {
  seoTitle: 'Página não encontrada — Aldifer',
  seoDescription:
    'O endereço mudou ou não existe mais, mas o material continua todo aqui. Busque a bitola que você precisa ou entre por uma das seis categorias do catálogo.',
  heading: 'Esse endereço não existe mais',
  body:
    'O site foi refeito e algumas páginas antigas mudaram de lugar. O material continua todo aqui — busque a medida abaixo ou entre por uma categoria.',

  searchHeading: 'Busque pela medida',
  searchNote:
    'Aceita polegada e milímetro. Digite a bitola e vá direto para a tabela.',

  categoriesHeading: 'Ou entre por categoria',

  helpHeading: 'Ainda não achou?',
  helpBody:
    'Se o material que você procura não aparece na busca, pergunte. Nem toda medida em estoque tem página própria ainda.',
  helpCtaLabel: 'Falar com a Aldifer',
  helpCtaHref: '/contato',
  helpSecondaryLabel: 'Ver o catálogo completo',
  helpSecondaryHref: '/produtos',
} as const;
