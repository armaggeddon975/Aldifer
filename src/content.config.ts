import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'zod';

import { CROSS_SECTION_VARIANTS } from './components/cross-sections/types';
import { WEIGHT_FORMULAS, WEIGHT_FORMULA_IDS } from './lib/steel';

/**
 * Modelagem do conteúdo. Nenhum texto de negócio vive em componente.
 *
 * O `slug` de cada produto e categoria é o NOME DO ARQUIVO, não um campo do
 * frontmatter. Ter os dois abriria espaço para divergirem, e o Keystatic da
 * Etapa 11 também usa o nome do arquivo como slug.
 *
 * A `description` de 2 a 4 parágrafos é o CORPO do markdown, não frontmatter.
 */

export const PRODUCT_CATEGORIES = ['barras', 'tubos', 'chapas', 'perfis', 'telas', 'diversos'] as const;

const crossSection = z.enum(CROSS_SECTION_VARIANTS);

/**
 * Coluna da tabela de bitolas.
 *
 * `key` fica em inglês porque nos produtos com fórmula ela precisa casar com
 * o nome do parâmetro em src/lib/steel.ts. `label` é o que o cliente lê.
 */
const dimensionColumn = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][A-Za-z0-9]*$/, 'use camelCase em inglês, sem acento nem espaço'),
  label: z.string().min(1),
  numeric: z.boolean().default(true),
});

const dimensionRow = z.record(z.string(), z.union([z.string(), z.number()]));

/**
 * De onde sai o peso de cada linha.
 *
 * - `calculado`: o build chama src/lib/steel.ts. Nenhum peso digitado à mão.
 * - `tabela-usina`: perfil I, U e H têm aba cônica e raio de concordância, e
 *   chapa xadrez tem o relevo do desenho — nenhum dos dois tem fórmula simples.
 *   A coluna aparece com "consultar" até a tabela da usina chegar.
 * - `nao-se-aplica`: acessório, eletrodo, disco, fechadura, tinta. Sem coluna.
 */
const weightSource = z.enum(['calculado', 'tabela-usina', 'nao-se-aplica']);

const productSchema = z
  .object({
    name: z.string().min(1),
    category: z.enum(PRODUCT_CATEGORIES),
    /** Ausente em produtos sem seção transversal própria (tinta, eletrodo). */
    crossSection: crossSection.optional(),
    /** Ordem dentro da categoria. Menor primeiro. */
    order: z.number().int().nonnegative().default(0),

    /** Uma linha. Aparece no card do catálogo. */
    shortDescription: z.string().min(1).max(180),
    applications: z.array(z.string().min(1)).default([]),
    finishes: z.array(z.string().min(1)).default([]),

    dimensionColumns: z.array(dimensionColumn).default([]),
    dimensions: z.array(dimensionRow).default([]),

    weightSource,
    weightFormula: z.enum(WEIGHT_FORMULA_IDS).optional(),

    /**
     * Avisos técnicos exibidos abaixo da tabela. Use para o que o cliente
     * precisa saber antes de pedir, não para nota de rodapé decorativa.
     */
    notes: z.array(z.string().min(1)).default([]),

    /**
     * `rascunho` NÃO entra no build de produção e mostra alerta em dev.
     * Todo produto nasce em rascunho: as bitolas são faixa comercial padrão
     * de mercado, não o estoque da Aldifer.
     */
    status: z.enum(['rascunho', 'publicado']),

    seoTitle: z.string().min(1).max(70),
    seoDescription: z.string().min(120).max(170),
  })
  .superRefine((product, ctx) => {
    const columnKeys = product.dimensionColumns.map((column) => column.key);
    const numericKeys = new Set(
      product.dimensionColumns.filter((column) => column.numeric).map((column) => column.key),
    );

    // Chave de coluna duplicada silenciaria uma das colunas.
    const duplicated = columnKeys.filter((key, index) => columnKeys.indexOf(key) !== index);
    if (duplicated.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['dimensionColumns'],
        message: `chave de coluna repetida: ${[...new Set(duplicated)].join(', ')}`,
      });
    }

    // Tabela não pode ser irregular: toda linha tem exatamente as colunas
    // declaradas. Sem isto, um erro de digitação numa chave viraria célula
    // vazia em produção sem ninguém notar.
    const expected = new Set(columnKeys);
    product.dimensions.forEach((row, index) => {
      const rowKeys = Object.keys(row);
      const missing = columnKeys.filter((key) => !(key in row));
      const extra = rowKeys.filter((key) => !expected.has(key));
      if (missing.length > 0 || extra.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['dimensions', index],
          message: [
            missing.length > 0 ? `faltam: ${missing.join(', ')}` : '',
            extra.length > 0 ? `não declaradas: ${extra.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        });
      }
    });

    if (product.weightSource === 'calculado') {
      if (!product.weightFormula) {
        ctx.addIssue({
          code: 'custom',
          path: ['weightFormula'],
          message: 'weightSource "calculado" exige weightFormula',
        });
        return;
      }

      // O contrato que garante "peso nunca digitado à mão": cada parâmetro da
      // fórmula precisa existir como coluna numérica, e cada linha precisa
      // trazer número nele. Falhando aqui, o build para — em vez de a tabela
      // sair com NaN na coluna de peso.
      const spec = WEIGHT_FORMULAS[product.weightFormula];
      for (const param of spec.params) {
        if (!numericKeys.has(param)) {
          ctx.addIssue({
            code: 'custom',
            path: ['dimensionColumns'],
            message: `a fórmula "${product.weightFormula}" lê "${param}", que não é coluna numérica declarada`,
          });
        }
      }

      product.dimensions.forEach((row, index) => {
        for (const param of spec.params) {
          if (typeof row[param] !== 'number') {
            ctx.addIssue({
              code: 'custom',
              path: ['dimensions', index, param],
              message: `precisa ser número para a fórmula "${product.weightFormula}" calcular o peso`,
            });
          }
        }
      });
    } else if (product.weightFormula) {
      ctx.addIssue({
        code: 'custom',
        path: ['weightFormula'],
        message: `weightFormula só faz sentido com weightSource "calculado", não "${product.weightSource}"`,
      });
    }
  });

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: productSchema,
});

const categories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/categories' }),
  schema: z.object({
    name: z.string().min(1),
    crossSection: crossSection.optional(),
    order: z.number().int().nonnegative(),
    shortDescription: z.string().min(1).max(180),
    seoTitle: z.string().min(1).max(70),
    seoDescription: z.string().min(120).max(170),
  }),
});

/**
 * Configuração do site, arquivo único.
 *
 * Campo nulo significa "não confirmado pela Aldifer" e NÃO renderiza — seção
 * vazia é melhor que informação inventada. O parser embrulha o objeto do JSON
 * sob um id fixo porque o loader `file` espera coleção; o JSON em si mantém os
 * dados no nível de cima, que é o formato que o Keystatic escreve num singleton.
 */
export const SITE_CONFIG_ID = 'aldifer';

const siteConfig = defineCollection({
  loader: file('src/content/site-config.json', {
    parser: (text) => ({ [SITE_CONFIG_ID]: JSON.parse(text) as Record<string, unknown> }),
  }),
  schema: z.object({
    legalName: z.string().min(1),
    shortName: z.string().min(1),
    slogan: z.string().min(1),
    foundedYear: z.number().int(),
    address: z.object({
      street: z.string().min(1),
      district: z.string().min(1),
      city: z.string().min(1),
      state: z.string().length(2),
      postalCode: z.string().min(1),
    }),
    phone: z.string().min(1),
    phoneE164: z.string().regex(/^\+\d{8,15}$/),
    email: z.email(),
    social: z
      .array(z.object({ label: z.string().min(1), href: z.url() }))
      .default([]),

    // --- Tudo abaixo é [CONFIRMAR] com a Aldifer -------------------------
    /** O site atual manda para um linktr.ee. Falta o número direto. */
    whatsapp: z.string().nullable().default(null),
    /** Não consta no site atual. Precisa incluir sábado. */
    openingHours: z.array(z.string().min(1)).nullable().default(null),
    /** Necessário para o rodapé e para o JSON-LD. */
    cnpj: z.string().nullable().default(null),
    /** Se a Aldifer faz corte sob medida, é o maior diferencial do site. */
    customCutting: z.boolean().nullable().default(null),
  }),
});

export const collections = { products, categories, siteConfig };
