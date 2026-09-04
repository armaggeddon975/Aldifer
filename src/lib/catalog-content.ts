/**
 * Copy do catálogo. Mesmo padrão de src/lib/home-content.ts: o componente
 * recebe dados, não os contém.
 *
 * Title e description de /produtos vêm da seção 10 do docs/CONTEUDO.md. Os de
 * categoria e de produto vêm dos próprios arquivos de conteúdo.
 */

export const catalogPage = {
  seoTitle: 'Catálogo de Ferro e Aço — Aldifer',
  seoDescription:
    'Barras, tubos, chapas, perfis, telas e acessórios com medidas e bitolas. Consulte a linha completa e monte seu pedido de orçamento online.',
  heading: 'Catálogo completo',
  description:
    'A linha inteira, com a tabela de bitolas de cada produto. Filtre por categoria e acabamento, ou vá direto pela categoria.',
} as const;

export const filter = {
  legendCategory: 'Categoria',
  legendFinish: 'Acabamento',
  clearLabel: 'Limpar filtros',
  /** Anunciado em aria-live a cada mudança. */
  resultTemplate: (visible: number, total: number) =>
    visible === total
      ? `Mostrando todos os ${total} produtos.`
      : `Mostrando ${visible} de ${total} produtos.`,
  emptyHeading: 'Nenhum produto com esses filtros',
  emptyBody: 'Tente remover um dos filtros, ou navegue por uma categoria.',
  noScriptNote:
    'O filtro precisa de JavaScript. Sem ele, a lista abaixo mostra o catálogo completo — e os links de categoria continuam funcionando.',
} as const;

export const productPage = {
  applicationsHeading: 'Aplicações',
  finishesHeading: 'Acabamentos disponíveis',
  gaugeHeading: 'Tabela de bitolas',
  legendHeading: 'As cotas do desenho',
  legendNote: 'As letras do desenho correspondem às colunas da tabela.',
  notesHeading: 'Antes de pedir',
  addLabel: 'Adicionar',
  /** aria-label completo: "Adicionar" sozinho não diz nada no leitor de tela. */
  addAriaTemplate: (productName: string, dimension: string) =>
    `Adicionar ${productName.toLowerCase()} ${dimension} à lista de orçamento`,
  addedTemplate: (productName: string, dimension: string, total: number) =>
    `${productName} ${dimension} adicionado. ${total} ${total === 1 ? 'item' : 'itens'} na lista de orçamento.`,
  addFailed: 'Não foi possível guardar o item. Verifique se o navegador permite armazenamento local.',
  calculatorLabel: 'Calcular o peso deste perfil',
  quoteCtaHeading: 'Monte a lista e receba o orçamento',
  quoteCtaBody:
    'Junte as bitolas que o serviço pede e envie tudo de uma vez, com quantidade e observação.',
  quoteCtaLabel: 'Ver lista de orçamento',
  emptyTableHeading: 'Tabela ainda não disponível',
} as const;

export const categoryPage = {
  productsHeading: 'Produtos da categoria',
  emptyHeading: 'Nenhum produto publicado nesta categoria',
  emptyBody:
    'Os produtos desta categoria estão em conferência. Fale com a Aldifer para consultar a disponibilidade.',
} as const;

export const breadcrumb = {
  homeLabel: 'Início',
  catalogLabel: 'Catálogo',
  navLabel: 'Você está em',
} as const;
