/**
 * Lista de orçamento — store sobre localStorage. Módulo PURO, roda no
 * navegador, sem dependência de `astro:content`.
 *
 * Esquema e comportamento vêm da seção 6 do docs/CONTEUDO.md.
 *
 * A Etapa 4 usa apenas `add`, para o botão "Adicionar" das tabelas de bitola
 * não nascer morto. A Etapa 5 acrescenta a barra fixa, a página /orcamento e
 * a edição de itens — as funções já estão aqui.
 *
 * TUDO em try/catch: o localStorage lança exceção no modo privativo do Safari
 * e quando o usuário bloqueia armazenamento. O site não pode quebrar por isso,
 * e o botão "Adicionar" degrada para "não consegui guardar" em vez de derrubar
 * a página.
 */

/** Versão no nome da chave, para permitir migração de schema. */
const STORAGE_KEY = 'aldifer:quote:v1';

/** Persistir por 30 dias. Ao expirar, limpar sem avisar. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Evento disparado a cada mudança, para os componentes reagirem. */
export const QUOTE_CHANGED = 'aldifer:quote:changed';

export const QUOTE_UNITS = ['peça', 'barra', 'chapa', 'rolo', 'kg', 'm'] as const;
export type QuoteUnit = (typeof QUOTE_UNITS)[number];

export type QuoteItem = {
  readonly productSlug: string;
  readonly productName: string;
  /** Como o mercado nomeia a medida: "50 × 6 mm". */
  readonly dimension: string;
  readonly length?: string;
  quantity: number;
  readonly unit: QuoteUnit;
  note?: string;
};

type StoredQuote = {
  readonly savedAt: number;
  readonly items: QuoteItem[];
};

function isUnit(value: unknown): value is QuoteUnit {
  return typeof value === 'string' && (QUOTE_UNITS as readonly string[]).includes(value);
}

/**
 * Lê e valida o que está guardado. Conteúdo inválido ou expirado é descartado
 * em silêncio: um schema antigo no localStorage de um visitante não pode
 * quebrar a página dele.
 */
function read(): StoredQuote | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { savedAt, items } = parsed as Partial<StoredQuote>;
    if (typeof savedAt !== 'number' || !Array.isArray(items)) return null;
    if (Date.now() - savedAt > TTL_MS) {
      clear();
      return null;
    }

    const valid = items.filter(
      (item): item is QuoteItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.productSlug === 'string' &&
        typeof item.productName === 'string' &&
        typeof item.dimension === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        isUnit(item.unit),
    );

    return { savedAt, items: valid };
  } catch {
    return null;
  }
}

function write(items: readonly QuoteItem[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
    document.dispatchEvent(new CustomEvent(QUOTE_CHANGED, { detail: { count: items.length } }));
    return true;
  } catch {
    return false;
  }
}

export function getAll(): QuoteItem[] {
  return read()?.items ?? [];
}

export function count(): number {
  return getAll().length;
}

/** Duas linhas do mesmo produto com a mesma medida são o MESMO item. */
function sameItem(a: QuoteItem, b: QuoteItem): boolean {
  return (
    a.productSlug === b.productSlug && a.dimension === b.dimension && a.length === b.length
  );
}

export type AddResult = {
  /** Quantas linhas a lista tem agora. */
  readonly total: number;
  /** Quantidade acumulada DESTA medida. */
  readonly quantity: number;
};

/**
 * Acrescenta um item. Se a mesma medida do mesmo produto já estiver na lista,
 * soma a quantidade em vez de duplicar a linha — quem clica duas vezes quer
 * dois, não duas linhas iguais.
 *
 * Devolve o total de linhas E a quantidade acumulada da medida, porque o
 * anúncio para leitor de tela precisa das duas: no segundo clique o total não
 * muda, e dizer só "1 item" faria parecer que nada aconteceu.
 *
 * Devolve null se o armazenamento falhou.
 */
export function add(item: QuoteItem): AddResult | null {
  const items = getAll();
  const existing = items.find((current) => sameItem(current, item));

  if (existing) existing.quantity += item.quantity;
  else items.push(item);

  if (!write(items)) return null;
  return { total: items.length, quantity: existing?.quantity ?? item.quantity };
}

export function remove(index: number): boolean {
  const items = getAll();
  if (index < 0 || index >= items.length) return false;
  items.splice(index, 1);
  return write(items);
}

export function updateQuantity(index: number, quantity: number): boolean {
  const items = getAll();
  const item = items[index];
  if (!item || !Number.isFinite(quantity)) return false;

  if (quantity <= 0) return remove(index);
  item.quantity = Math.floor(quantity);
  return write(items);
}

export function updateNote(index: number, note: string): boolean {
  const items = getAll();
  const item = items[index];
  if (!item) return false;

  item.note = note.trim() || undefined;
  return write(items);
}

export function clear(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    document.dispatchEvent(new CustomEvent(QUOTE_CHANGED, { detail: { count: 0 } }));
    return true;
  } catch {
    return false;
  }
}
