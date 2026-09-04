/**
 * Copy da lista de orçamento. Mesmo padrão de home-content.ts e
 * catalog-content.ts: o componente recebe dados, não os contém.
 *
 * Comportamento especificado na seção 6 do docs/CONTEUDO.md.
 */

export const quoteBar = {
  /** Rótulo da barra para o leitor de tela. */
  regionLabel: 'Lista de orçamento',
  itemsSingular: 'medida na lista',
  itemsPlural: 'medidas na lista',
  ctaLabel: 'Fechar pedido',
  /** Ação de esconder a barra sem apagar a lista. */
  dismissLabel: 'Recolher a barra da lista de orçamento',
} as const;

export const quotePage = {
  seoTitle: 'Pedir Orçamento de Ferro e Aço — Aldifer',
  seoDescription:
    'Envie sua lista de materiais com bitola e quantidade e receba o orçamento da Aldifer em até 1 dia útil. Atendimento no Grande ABC.',
  heading: 'Sua lista de orçamento',
  description:
    'Confira as medidas, ajuste a quantidade e escreva a observação que o pedido precisar. Depois é só enviar.',

  /** Lista vazia: caminho de saída, não mensagem de erro. */
  emptyHeading: 'Sua lista está vazia',
  emptyBody:
    'Navegue pelo catálogo e use o botão "Adicionar" na tabela de bitolas de cada produto. As medidas ficam guardadas neste navegador por 30 dias.',
  emptyCtaLabel: 'Ir para o catálogo',
  emptyCategoriesLabel: 'Ou comece por uma categoria',

  /**
   * A lista mora no localStorage do navegador, então não existe sem script.
   * Dizer isso é melhor que mostrar uma página vazia que parece defeito.
   */
  noScriptHeading: 'Esta página precisa de JavaScript',
  noScriptBody:
    'Sua lista de orçamento fica guardada no seu próprio navegador, e não em nosso servidor — por isso ela não aparece com o JavaScript desativado. Você pode pedir o orçamento pelo telefone, ou ativar o JavaScript e voltar.',

  tableCaption: 'Medidas na sua lista de orçamento',
  columnProduct: 'Produto',
  columnDimension: 'Medida',
  columnQuantity: 'Quantidade',
  columnNote: 'Observação',
  columnActions: 'Ação',

  quantityLabelTemplate: (product: string, dimension: string) =>
    `Quantidade de ${product.toLowerCase()} ${dimension}`,
  noteLabelTemplate: (product: string, dimension: string) =>
    `Observação para ${product.toLowerCase()} ${dimension}`,
  notePlaceholder: 'Corte, acabamento, prazo…',
  removeLabelTemplate: (product: string, dimension: string) =>
    `Remover ${product.toLowerCase()} ${dimension} da lista`,
  removeLabel: 'Remover',

  clearLabel: 'Limpar a lista',
  clearConfirm: 'Remover todas as medidas da lista?',

  /** Anúncios em aria-live. */
  announceRemoved: (product: string, dimension: string, total: number) =>
    `${product} ${dimension} removido. ${total} ${total === 1 ? 'medida' : 'medidas'} na lista.`,
  announceQuantity: (product: string, dimension: string, quantity: number, unit: string) =>
    `${product} ${dimension}: ${quantity} ${unit}.`,
  announceNoteSaved: 'Observação salva.',
  announceCleared: 'Lista esvaziada.',
  announceStorageFailed:
    'Não foi possível salvar a alteração. Verifique se o navegador permite armazenamento local.',

  /** O formulário de envio é a Etapa 6. */
  formPendingHeading: 'Envio do pedido',
  formPendingBody:
    'O formulário de envio entra na próxima etapa da construção. Até lá, use o telefone para fechar o pedido.',
} as const;
