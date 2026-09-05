/**
 * Copy da página Empresa.
 *
 * TODO O TEXTO É DA PRÓPRIA ALDIFER, transcrito da seção 8 do
 * docs/CONTEUDO.md, que por sua vez o extraiu do site atual. Não é redação
 * nossa e não deve ser reescrito: é a única página do site onde a empresa fala
 * de si mesma, e a regra dura do CLAUDE.md — nada entra sem confirmação da
 * Aldifer — se aplica com força máxima aqui.
 *
 * Uma única correção foi aplicada, e o CONTEUDO.md a pede explicitamente: o
 * site atual escreve "Torna-se referência" na visão, que é erro de conjugação.
 * O correto é "Tornar-se".
 */

export const companyPage = {
  seoTitle: 'A Aldifer — Distribuidora de Ferro e Aço desde 2002',
  seoDescription:
    'Empresa familiar de São Bernardo do Campo que fornece produtos siderúrgicos para serralherias e indústrias do Grande ABC há mais de 20 anos.',
  heading: 'A Aldifer',
  /** Transcrito. Não reescrever. */
  about:
    'Fundada em 2002, a Aldifer Distribuidora de Ferro e Aço é uma empresa de base familiar que começou suas atividades em São Bernardo do Campo com a comercialização de tubos e laminados para indústrias e serralherias. Ao longo dos anos a empresa expandiu seu mercado de atuação, passando a comercializar diversos produtos siderúrgicos com foco em qualidade e preço baixo, se tornando uma das principais distribuidoras das usinas e serralherias do Grande ABC.',
} as const;

export const companyPurpose = {
  heading: 'Missão, visão e valores',
  mission: {
    label: 'Missão',
    body: 'Comercializar e oferecer soluções em ferro e aço com foco em qualidade e baixo custo, gerando valor a clientes, colaboradores e fornecedores.',
  },
  vision: {
    label: 'Visão',
    /** "Tornar-se", e não "Torna-se" como no site atual. */
    body: 'Tornar-se referência em qualidade e baixo custo no segmento de mercado em que atua na região do Grande ABC, por meio da geração de valor ao público estratégico.',
  },
  values: {
    label: 'Valores',
    items: [
      'Satisfação dos grupos de interesse',
      'Melhoria contínua dos processos',
      'Valorização e respeito às pessoas',
      'Integridade e comportamento ético',
    ],
  },
} as const;

/**
 * Galeria das instalações.
 *
 * As quatro fotos são do site atual da Aldifer, baixadas com autorização em
 * 04/09/2026 e guardadas em src/assets/aldifer/. São de 2016, 900×540, tiradas
 * de celular — servem porque mostram ESTOQUE REAL etiquetado por bitola, que é
 * a prova que ataca a objeção nº 1 do projeto. Uma foto de banco de imagem com
 * aço genérico não provaria nada, e o CLAUDE.md a proíbe.
 *
 * O `alt` descreve o que a foto prova, não "foto do galpão": para quem usa
 * leitor de tela, saber que as prateleiras são separadas e etiquetadas por
 * bitola é a informação útil.
 */
export const companyFacilities = {
  heading: 'O galpão',
  description:
    'A linha completa fica separada por bitola e etiquetada por posição, na Estrada dos Alvarengas. É o que permite confirmar a medida por telefone e carregar no mesmo dia.',
  photos: [
    {
      file: 'empresa-02.jpg',
      alt: 'Prateleiras em cantiléver com cantoneiras, tubos quadrados e perfis U separados por bitola, cada posição com etiqueta de código.',
    },
    {
      file: 'empresa-03.jpg',
      alt: 'Tubos redondos, quadrados e retangulares empilhados por bitola, com barras chatas e cantoneiras nas prateleiras ao lado.',
    },
    {
      file: 'empresa-04.jpg',
      alt: 'Vista do comprimento do galpão, com as prateleiras de tubos e perfis ocupando toda a extensão sob a cobertura.',
    },
    {
      file: 'empresa-05.jpg',
      alt: 'Caminhão carregando no galpão, ao lado de perfis e tubos galvanizados prontos para sair.',
    },
  ],
} as const;

/** Fim da página: leva à ação primária do site, não a um "fale conosco" vago. */
export const companyClosing = {
  heading: 'Precisa de uma medida?',
  body: 'O catálogo traz a linha completa com bitola, comprimento e peso por metro. Monte a lista e envie de uma vez.',
  ctaLabel: 'Ver o catálogo',
  ctaHref: '/produtos',
  secondaryLabel: 'Falar com a Aldifer',
  secondaryHref: '/contato',
} as const;
