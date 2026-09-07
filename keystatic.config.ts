import { collection, config, fields, singleton } from '@keystatic/core';

// De `src/lib/categories.ts`, que é módulo PURO — e não de
// `src/content.config.ts`. Este arquivo é carregado NO NAVEGADOR, e importar o
// content.config puxaria `astro:content`, que não existe lá: o painel abria em
// branco com 500 no módulo.
import { CATEGORY_LABELS, PRODUCT_CATEGORIES } from './src/lib/categories';

/**
 * Painel de edição da Aldifer.
 *
 * UMA FONTE DE VERDADE, DUAS PORTAS DE ENTRADA: as coleções abaixo apontam
 * para OS MESMOS arquivos que `src/content.config.ts` valida. O que o painel
 * salva é exatamente o que eu editaria no editor de código, e o build valida
 * as duas origens com o mesmo schema Zod.
 *
 * TODO RÓTULO E TODA AJUDA ESTÃO EM PORTUGUÊS, e cada campo diz onde aparece
 * no site. Quem vai usar isto não é desenvolvedor: um rótulo `shortDescription`
 * sem explicação obriga a pessoa a adivinhar, e adivinhar em campo de SEO
 * significa texto errado no Google por meses.
 *
 * ---
 *
 * SOBRE `fields.ignored()`: o Keystatic exige que o schema declare TODO campo
 * do frontmatter — testado, ele nem ABRE a entrada se faltar um
 * ("Field validation failed: Key on object value ... is not allowed").
 *
 * Mas ele não sabe expressar a tabela de bitolas: as colunas mudam de produto
 * para produto (largura/espessura numa barra chata, diâmetro/parede num tubo),
 * e não existe campo de matriz com colunas variáveis.
 *
 * `fields.ignored()` resolve sem mudar nada: ele lê e reescreve o valor
 * VERBATIM e não aparece no painel. A tabela fica preservada, a garantia de
 * build "peso nunca digitado à mão" fica intocada, e o painel só mostra o que
 * um não-desenvolvedor deve mesmo mexer.
 *
 * A tabela continua vindo da planilha da Aldifer, importada no código. Quem
 * mexer nela por engano quebraria o build — e é bom que quebre.
 */

/**
 * Modo GitHub em produção; local em desenvolvimento. Ver README.
 *
 * `import.meta.env` e NÃO `process.env`: este arquivo é carregado no
 * NAVEGADOR, onde `process` não existe — o painel abria em branco com
 * "process is not defined". O prefixo `PUBLIC_` é o que faz o Vite substituir
 * o valor no bundle do cliente.
 */
const repo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO?.trim();

const storage = repo
  ? ({ kind: 'github', repo: repo as `${string}/${string}` } as const)
  : ({ kind: 'local' } as const);

/**
 * Opções de seção transversal, com o nome que o serralheiro usa.
 *
 * A chave é a mesma de `src/components/cross-sections/types.ts` — mudar aqui
 * sem mudar lá faz o desenho desaparecer da página.
 */
const CROSS_SECTIONS = [
  { label: 'Barra redonda', value: 'round-bar' },
  { label: 'Barra quadrada', value: 'square-bar' },
  { label: 'Barra sextavada', value: 'hex-bar' },
  { label: 'Barra chata', value: 'flat-bar' },
  { label: 'Tubo redondo', value: 'round-tube' },
  { label: 'Tubo quadrado', value: 'square-tube' },
  { label: 'Tubo retangular', value: 'rect-tube' },
  { label: 'Chapa', value: 'plate' },
  { label: 'Perfil I', value: 'i-beam' },
  { label: 'Perfil U', value: 'u-channel' },
  { label: 'Cantoneira', value: 'angle' },
  { label: 'Perfil T', value: 'tee' },
  { label: 'Tela', value: 'mesh' },
  { label: 'Telha ondulada', value: 'corrugated-sheet' },
] as const;

/**
 * Derivado da lista, não digitado de novo: categoria acrescentada em
 * `src/lib/categories.ts` aparece aqui automaticamente, na mesma ordem do
 * menu do site.
 */
const CATEGORIAS = PRODUCT_CATEGORIES.map((value) => ({
  label: CATEGORY_LABELS[value],
  value,
}));

export default config({
  storage,

  ui: {
    brand: { name: 'Aldifer — A Loja do Aço' },
    navigation: {
      'O site': ['siteConfig', 'aviso'],
      Catálogo: ['products', 'categories'],
    },
  },

  singletons: {
    siteConfig: singleton({
      label: 'Dados da empresa',
      path: 'src/content/site-config',
      format: 'json',
      schema: {
        legalName: fields.text({
          label: 'Razão social',
          description: 'Nome completo da empresa. Aparece no rodapé e nos dados que o Google lê.',
          validation: { isRequired: true },
        }),
        shortName: fields.text({
          label: 'Nome curto',
          description: 'Como a empresa é chamada no dia a dia. Aparece no cabeçalho.',
          validation: { isRequired: true },
        }),
        slogan: fields.text({
          label: 'Slogan',
          description: 'Aparece embaixo do nome, no cabeçalho.',
          validation: { isRequired: true },
        }),
        foundedYear: fields.integer({
          label: 'Ano de fundação',
          description:
            'A página A Empresa calcula os anos de mercado a partir daqui, então o número nunca fica velho.',
          validation: { isRequired: true, min: 1900, max: 2100 },
        }),

        address: fields.object(
          {
            street: fields.text({ label: 'Rua e número', validation: { isRequired: true } }),
            district: fields.text({ label: 'Bairro', validation: { isRequired: true } }),
            city: fields.text({ label: 'Cidade', validation: { isRequired: true } }),
            state: fields.text({
              label: 'Estado (2 letras)',
              validation: { isRequired: true, length: { min: 2, max: 2 } },
            }),
            postalCode: fields.text({ label: 'CEP', validation: { isRequired: true } }),
          },
          {
            label: 'Endereço',
            description:
              'Aparece no rodapé, na página Contato, no botão de rota e nos dados que o Google lê. Mudar aqui muda em todos.',
          },
        ),

        phone: fields.text({
          label: 'Telefone (como se escreve)',
          description:
            '⛔ VALOR DE TESTE AGORA — (11) 93230-7756 é o celular do desenvolvedor, ' +
            'posto de propósito para as ligações de teste não caírem na Aldifer. ' +
            'O REAL da Aldifer é (11) 4344-1919, e é ele que tem de voltar antes de ' +
            'apontar o domínio. Ver docs/CHECKLIST-LANCAMENTO.md.',
          validation: { isRequired: true },
        }),
        phoneE164: fields.text({
          label: 'Telefone (para discar)',
          description:
            '⛔ VALOR DE TESTE AGORA — +5511932307756. O REAL da Aldifer é ' +
            '+551143441919. Este campo vai para o `tel:` de 16 páginas E para o ' +
            '`telephone` dos dados estruturados que o Google lê, então é o que mais ' +
            'importa reverter. É o MESMO número do campo acima, sem espaço nem ' +
            'parêntese, começando com +55.',
          validation: { isRequired: true, pattern: { regex: /^\+\d{8,15}$/ } },
        }),
        email: fields.text({
          label: 'E-mail',
          description: 'Aparece no rodapé e na página Contato.',
          validation: { isRequired: true },
        }),

        social: fields.array(
          fields.object({
            label: fields.text({ label: 'Nome da rede', validation: { isRequired: true } }),
            href: fields.url({ label: 'Endereço', validation: { isRequired: true } }),
          }),
          {
            label: 'Redes sociais',
            description: 'Aparecem no rodapé.',
            itemLabel: (props) => props.fields.label.value || 'Rede',
          },
        ),

        /**
         * Daqui para baixo é tudo o que a Aldifer ainda não confirmou.
         *
         * Campo vazio NÃO renderiza: o site mostra um aviso de pendência em
         * desenvolvimento e simplesmente omite a seção em produção. É a regra
         * dura do CLAUDE.md — seção vazia é melhor que informação inventada.
         */
        whatsapp: fields.text({
          label: 'WhatsApp — só números, com DDI',
          description:
            '⛔ VALOR DE TESTE AGORA — 5511932307756, o celular do desenvolvedor. ' +
            'O número da Aldifer NUNCA FOI CONFIRMADO (o site antigo manda para um ' +
            'linktr.ee), então este campo precisa VOLTAR A VAZIO antes de apontar o ' +
            'domínio, e não ser trocado por um chute. Vazio, o site não mostra botão ' +
            'de WhatsApp em lugar nenhum e o botão do hero cai no telefone. ' +
            'Formato: só números com DDI, exemplo 5511943441919.',
        }),
        openingHours: fields.array(fields.text({ label: 'Linha' }), {
          label: 'Horário de funcionamento',
          description:
            'PENDENTE. Uma linha por faixa, como "Segunda a sexta, 8h às 18h" e "Sábado, 8h às 12h". Enquanto estiver vazio o site não mostra horário — e é a informação que mais falta numa página de contato, porque sem ela o cliente não sabe se vale sair de casa.',
          itemLabel: (props) => props.value || 'Linha',
        }),
        cnpj: fields.text({
          label: 'CNPJ',
          description:
            'PENDENTE. Aparece no rodapé e nos dados que o Google lê. Formato 00.000.000/0000-00.',
        }),
        customCutting: fields.select({
          label: 'A Aldifer faz corte sob medida?',
          description:
            'Se faz, é o maior diferencial do site. Deixe em "Ainda não confirmado" até ter certeza: responder "Não" quando na verdade faz custa venda, e responder "Sim" quando não faz gera reclamação no balcão.',
          options: [
            { label: 'Ainda não confirmado', value: 'nao-confirmado' },
            { label: 'Sim, fazemos corte sob medida', value: 'sim' },
            { label: 'Não fazemos', value: 'nao' },
          ],
          defaultValue: 'nao-confirmado',
        }),
      },
    }),

    aviso: singleton({
      label: 'Aviso no topo do site',
      path: 'src/content/aviso',
      format: 'json',
      schema: {
        ativo: fields.checkbox({
          label: 'Mostrar o aviso agora',
          description:
            'Desmarcado, o aviso não aparece e nem vai para a página. Marque só quando a mensagem estiver escrita.',
          defaultValue: false,
        }),
        mensagem: fields.text({
          label: 'Mensagem',
          description:
            'Uma frase, no máximo duas. Aparece numa faixa no topo de TODAS as páginas. Exemplo: "Recesso de fim de ano: fechados de 24/12 a 02/01."',
          multiline: true,
        }),
        linkTexto: fields.text({
          label: 'Texto do link (opcional)',
          description:
            'Se o aviso precisar levar a algum lugar. Exemplo: "Ver horário de janeiro". Deixe vazio se não precisar — mas se preencher este, preencha o endereço também.',
        }),
        linkHref: fields.text({
          label: 'Endereço do link (opcional)',
          description: 'Para uma página do próprio site use o caminho, como /contato.',
        }),
        validoAte: fields.date({
          label: 'Some sozinho depois de',
          description:
            'O MAIS IMPORTANTE deste formulário. Depois desta data o aviso desaparece do site sem ninguém precisar voltar aqui. Sem data, ele fica no ar até alguém desmarcar — e um aviso de recesso esquecido em março passa a impressão de site abandonado.',
        }),
      },
    }),
  },

  collections: {
    products: collection({
      label: 'Produtos',
      slugField: 'name',
      path: 'src/content/products/*',
      format: { contentField: 'description', data: 'yaml' },
      columns: ['name', 'category', 'status'],
      entryLayout: 'form',
      schema: {
        name: fields.slug({
          name: {
            label: 'Nome do produto',
            description: 'Como aparece no título da página e nos cards do catálogo.',
            validation: { isRequired: true },
          },
          slug: {
            label: 'Endereço da página',
            description:
              'A parte final do endereço, como "barra-chata" em aldifer.com.br/produtos/barras/barra-chata. NÃO MUDE depois de o produto estar no ar: o endereço antigo passa a dar erro e o Google perde a página.',
          },
        }),

        category: fields.select({
          label: 'Categoria',
          description: 'Define em que parte do catálogo o produto aparece e o endereço da página.',
          options: CATEGORIAS,
          defaultValue: 'barras',
        }),

        order: fields.integer({
          label: 'Ordem na categoria',
          description: 'Menor aparece primeiro. Use 1, 2, 3… Empate deixa a ordem imprevisível.',
          defaultValue: 0,
          validation: { min: 0 },
        }),

        crossSection: fields.select({
          label: 'Desenho da seção transversal',
          description:
            'O corte do perfil, desenhado em traço técnico. Aparece no topo da página do produto e no card do catálogo. Escolha o que corresponde ao FORMATO, não ao nome: uma barra chata galvanizada usa o desenho de barra chata.',
          options: CROSS_SECTIONS,
          defaultValue: 'flat-bar',
        }),

        shortDescription: fields.text({
          label: 'Descrição de uma linha',
          description:
            'Aparece no card do catálogo, embaixo do nome. Até 180 caracteres. Diga para que serve, não que é "de alta qualidade".',
          multiline: true,
          validation: { isRequired: true, length: { max: 180 } },
        }),

        applications: fields.array(fields.text({ label: 'Aplicação' }), {
          label: 'Onde se usa',
          description:
            'Uma por linha, curtas: "Portões", "Grades", "Corrimãos". Aparecem como lista na página do produto.',
          itemLabel: (props) => props.value || 'Aplicação',
        }),

        finishes: fields.array(fields.text({ label: 'Acabamento' }), {
          label: 'Acabamentos disponíveis',
          description:
            'Exemplo: "Laminado a quente", "Galvanizado a fogo". Só o que a Aldifer realmente tem.',
          itemLabel: (props) => props.value || 'Acabamento',
        }),

        notes: fields.array(fields.text({ label: 'Aviso', multiline: true }), {
          label: 'Avisos técnicos',
          description:
            'Aparecem abaixo da tabela de bitolas. Use para o que o cliente precisa saber ANTES de pedir — tolerância, variação de peso, medida sob consulta. Não use para nota decorativa.',
          itemLabel: (props) => props.value?.slice(0, 40) || 'Aviso',
        }),

        status: fields.select({
          label: 'Situação',
          description:
            'O BOTÃO QUE PÕE O PRODUTO NO AR. "Rascunho" não aparece no site publicado — nem a página, nem o card, nem a busca. Só marque "Publicado" depois de conferir a tabela de bitolas com o estoque real.',
          options: [
            { label: 'Rascunho — não aparece no site', value: 'rascunho' },
            { label: 'Publicado — no ar', value: 'publicado' },
          ],
          defaultValue: 'rascunho',
        }),

        seoTitle: fields.text({
          label: 'Título para o Google',
          description:
            'O que aparece como título azul no resultado de busca. Até 70 caracteres, senão o Google corta com "…". Termine com "| Aldifer".',
          validation: { isRequired: true, length: { max: 70 } },
        }),
        seoDescription: fields.text({
          label: 'Descrição para o Google',
          description:
            'O parágrafo cinza embaixo do título no resultado de busca. Entre 120 e 170 caracteres — mais curto desperdiça espaço, mais longo é cortado.',
          multiline: true,
          validation: { isRequired: true, length: { min: 120, max: 170 } },
        }),

        /**
         * A partir daqui, campos que o painel PRESERVA sem mostrar.
         *
         * Ver a explicação de `fields.ignored()` no topo deste arquivo. Em
         * resumo: as colunas da tabela mudam de produto para produto, o
         * Keystatic não tem campo de matriz com colunas variáveis, e a chave
         * de cada coluna precisa casar com o nome do parâmetro em
         * `src/lib/steel.ts` — um erro de digitação ali quebraria o cálculo do
         * peso. Editar isso é trabalho de código, com o build validando.
         */
        dimensionColumns: fields.ignored(),
        dimensions: fields.ignored(),
        weightSource: fields.ignored(),
        weightFormula: fields.ignored(),

        description: fields.markdoc({
          label: 'Texto da página',
          description:
            'De dois a quatro parágrafos, escritos para quem trabalha com o material. Explique onde se usa, o que muda entre as bitolas e o que costuma dar errado. Aparece abaixo da tabela.',
          extension: 'md',
        }),
      },
    }),

    categories: collection({
      label: 'Categorias',
      slugField: 'name',
      path: 'src/content/categories/*',
      format: { contentField: 'description', data: 'yaml' },
      columns: ['name'],
      entryLayout: 'form',
      schema: {
        name: fields.slug({
          name: {
            label: 'Nome da categoria',
            description: 'Aparece no menu, no card da home e no título da página.',
            validation: { isRequired: true },
          },
          slug: {
            label: 'Endereço da página',
            description:
              'NÃO MUDE: as seis categorias são o destino dos redirecionamentos do site antigo. Mudar aqui derruba tráfego que vem do Google.',
          },
        }),
        crossSection: fields.select({
          label: 'Desenho da seção transversal',
          description: 'Aparece no card da categoria. Escolha o formato mais representativo dela.',
          options: CROSS_SECTIONS,
          defaultValue: 'flat-bar',
        }),
        order: fields.integer({
          label: 'Ordem no menu',
          description: 'Menor aparece primeiro.',
          defaultValue: 0,
          validation: { isRequired: true, min: 0 },
        }),
        shortDescription: fields.text({
          label: 'Descrição de uma linha',
          description: 'Aparece no card da categoria, na home e no catálogo. Até 180 caracteres.',
          multiline: true,
          validation: { isRequired: true, length: { max: 180 } },
        }),
        seoTitle: fields.text({
          label: 'Título para o Google',
          description: 'Até 70 caracteres.',
          validation: { isRequired: true, length: { max: 70 } },
        }),
        seoDescription: fields.text({
          label: 'Descrição para o Google',
          description: 'Entre 120 e 170 caracteres.',
          multiline: true,
          validation: { isRequired: true, length: { min: 120, max: 170 } },
        }),
        description: fields.markdoc({
          label: 'Texto da página',
          description:
            'Dois ou três parágrafos apresentando a categoria. Aparece acima da lista de produtos.',
          extension: 'md',
        }),
      },
    }),
  },
});
