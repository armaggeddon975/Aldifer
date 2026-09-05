import { WEIGHT_FORMULAS } from './steel.ts';

/**
 * Copy da calculadora de peso.
 *
 * As fórmulas exibidas na página vêm de WEIGHT_FORMULAS, não de texto
 * digitado: a página mostra exatamente a expressão que o código executa.
 */

export const calculatorPage = {
  seoTitle: 'Calculadora de Peso de Aço por Metro — Aldifer',
  seoDescription:
    'Calcule o peso teórico de barras, tubos, chapas e cantoneiras. Informe a bitola e receba o peso em kg/m para orçar seu serviço.',
  heading: 'Calculadora de peso de aço',
  intro:
    'Informe a bitola e receba o peso em quilos por metro, por peça e do lote. O cálculo é imediato, sem botão de calcular, e o link da página guarda o resultado — dá para mandar direto pelo WhatsApp.',
} as const;

export const calculatorUi = {
  profileLabel: 'Perfil',
  profileHint: 'A seção transversal muda conforme a escolha.',
  dimensionsHeading: 'Medidas',
  lengthLabel: 'Comprimento da peça',
  lengthUnit: 'm',
  quantityLabel: 'Quantidade de peças',
  quantityUnit: 'peças',

  resultHeading: 'Resultado',
  perMeterLabel: 'Peso por metro',
  perPieceLabel: 'Peso por peça',
  totalLabel: 'Peso total do lote',
  perSquareMeterLabel: 'Peso por metro quadrado',

  /** Estado inicial: o campo de resultado não pode parecer resposta. */
  emptyResult: 'Preencha as medidas',
  emptyHint: 'O resultado aparece sozinho conforme você digita.',

  formulaLabel: 'Fórmula usada',
  addToQuoteLabel: 'Adicionar à lista de orçamento',
  addedTemplate: (dimension: string, total: number) =>
    `${dimension} adicionado. ${total} ${total === 1 ? 'medida' : 'medidas'} na lista de orçamento.`,
  addFailed: 'Não foi possível guardar. Verifique se o navegador permite armazenamento local.',
  copyLinkLabel: 'Copiar link deste cálculo',
  copyLinkDone: 'Link copiado.',
  copyLinkFailed: 'Não foi possível copiar. Use a barra de endereço do navegador.',

  /** Anunciado em aria-live a cada recálculo. */
  announceTemplate: (dimension: string, perMeter: string) =>
    `${dimension}: ${perMeter} quilos por metro.`,
} as const;

/** Avisos visíveis na interface, sem tom de letra miúda. */
export const calculatorWarnings = {
  theoreticalHeading: 'É peso teórico',
  theoreticalBody:
    'O cálculo trata a seção como geometria perfeita. Tubo e cantoneira têm raio de canto, e a laminação tem tolerância dimensional — o peso real varia cerca de ±3%. Para fechar carga ou faturar por peso, confirme na balança.',

  noFormulaHeading: 'Perfil I, U e H não entram no cálculo',
  noFormulaBody:
    'Nesses perfis a aba é CÔNICA — mais grossa junto à alma e mais fina na ponta — e há raio de concordância entre aba e alma. Não existe fórmula simples que acerte, e qualquer aproximação erra. O peso deles vem da tabela da usina.',
  noFormulaCta: 'Ver a tabela deste perfil',
} as const;

/** Bloco de texto para busca orgânica, com as fórmulas do código. */
export const calculatorExplainer = {
  heading: 'Como o cálculo funciona',
  paragraphs: [
    'Todo peso teórico de aço sai da mesma conta: área da seção transversal multiplicada pelo comprimento e pela densidade do material. Para o aço carbono a densidade é 7.850 kg/m³, o que equivale a 0,00785 kg por milímetro quadrado de seção, por metro linear.',
    'A partir disso, cada perfil tem uma fórmula fechada que sai da geometria da sua seção. Um tubo, por exemplo, é a diferença entre dois retângulos ou dois círculos — e essa diferença simplifica para uma expressão que só depende da parede e da medida externa.',
    'São essas as fórmulas que esta calculadora executa. Não são aproximações nossas: são as mesmas usadas nas tabelas de bitola de cada produto do catálogo.',
  ],
  formulasHeading: 'As fórmulas, uma a uma',
  /** Da fonte, não digitadas: a página mostra o que o código roda. */
  formulas: Object.values(WEIGHT_FORMULAS).map((spec) => ({
    label: spec.label,
    expression: spec.expression,
    unit: spec.unit,
  })),
  legendHeading: 'O que cada símbolo significa',
  /**
   * Só entram símbolos que APARECEM de fato — nas expressões acima ou nas
   * cotas dos desenhos. As fórmulas escrevem as medidas por extenso (parede,
   * lado, aba) justamente para não depender de legenda; as letras vivem no
   * desenho, e o que cada uma mede muda de perfil para perfil, então a
   * correspondência exata fica ao lado do desenho, dentro da calculadora.
   */
  legend: [
    'P — o peso, na unidade indicada à direita de cada fórmula',
    'Ø — diâmetro, em milímetros',
    'e — espessura; no tubo, a parede. Em milímetros',
    'A e B — as medidas externas da seção, cotadas no desenho. Qual é qual muda com o perfil: no tubo retangular são base e altura, na cantoneira são as duas abas, no tubo quadrado A é o lado. A calculadora mostra a correspondência ao lado do desenho de cada perfil.',
    'Na barra sextavada a bitola é a medida ENTRE FACES opostas, não entre pontas.',
  ],
} as const;
