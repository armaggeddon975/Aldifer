/**
 * Testes da lista de orçamento.
 *
 * O store toca localStorage e document, que não existem no Node — então os dois
 * são simulados aqui. Vale o esforço porque três caminhos críticos são
 * praticamente impossíveis de exercitar no navegador: a expiração de 30 dias,
 * o descarte de dado corrompido de um schema antigo, e a falha de escrita
 * quando o armazenamento está bloqueado ou cheio (modo privativo do Safari).
 *
 * O import é dinâmico porque os globais precisam existir ANTES de o módulo ser
 * avaliado, e `import` estático é içado para o topo.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

// --- simulação do ambiente do navegador ------------------------------------

class MemoryStorage {
  #data = new Map<string, string>();
  /** Quando true, setItem lança — como no modo privativo ou cota cheia. */
  falharAoEscrever = false;
  /** Quando true, getItem lança — como quando o site é bloqueado por política. */
  falharAoLer = false;

  getItem(key: string): string | null {
    if (this.falharAoLer) throw new DOMException('bloqueado');
    return this.#data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.falharAoEscrever) throw new DOMException('cota excedida');
    this.#data.set(key, value);
  }

  removeItem(key: string): void {
    this.#data.delete(key);
  }

  /** Usado só pelos testes, para plantar estado bruto. */
  plantar(key: string, value: string): void {
    this.#data.set(key, value);
  }

  limpar(): void {
    this.#data.clear();
    this.falharAoEscrever = false;
    this.falharAoLer = false;
  }
}

const storage = new MemoryStorage();
const eventos: string[] = [];

Object.assign(globalThis, {
  localStorage: storage,
  document: {
    dispatchEvent(event: Event) {
      eventos.push(event.type);
      return true;
    },
  },
});

const CHAVE = 'aldifer:quote:v1';
const { QUOTE_CHANGED, add, clear, count, getAll, remove, updateNote, updateQuantity } =
  await import('./quote.ts');

// --- ajudantes -------------------------------------------------------------

const barra = (dimension = '50 × 6 mm') => ({
  productSlug: 'barra-chata',
  productName: 'Barra Chata',
  dimension,
  length: '6 m',
  quantity: 1,
  unit: 'barra' as const,
});

beforeEach(() => {
  storage.limpar();
  eventos.length = 0;
});

// --- testes ----------------------------------------------------------------

describe('lista vazia', () => {
  it('getAll devolve lista vazia, não null', () => {
    assert.deepEqual(getAll(), []);
    assert.equal(count(), 0);
  });
});

describe('add', () => {
  it('acrescenta a medida e devolve total e quantidade', () => {
    const resultado = add(barra());
    assert.deepEqual(resultado, { total: 1, quantity: 1 });
    assert.equal(count(), 1);
  });

  it('a MESMA medida clicada de novo soma quantidade, sem duplicar linha', () => {
    add(barra());
    const resultado = add(barra());
    assert.deepEqual(resultado, { total: 1, quantity: 2 });
    assert.equal(count(), 1);
    assert.equal(getAll()[0]?.quantity, 2);
  });

  it('medida diferente do mesmo produto é outra linha', () => {
    add(barra('50 × 6 mm'));
    const resultado = add(barra('25 × 3 mm'));
    assert.deepEqual(resultado, { total: 2, quantity: 1 });
    assert.equal(count(), 2);
  });

  it('dispara o evento de mudança', () => {
    add(barra());
    assert.deepEqual(eventos, [QUOTE_CHANGED]);
  });

  it('devolve null quando o armazenamento recusa a escrita', () => {
    storage.falharAoEscrever = true;
    assert.equal(add(barra()), null);
    // E não quebra: a leitura seguinte continua funcionando.
    assert.deepEqual(getAll(), []);
  });
});

describe('remove', () => {
  it('remove pelo índice', () => {
    add(barra('A'));
    add(barra('B'));
    assert.ok(remove(0));
    assert.equal(count(), 1);
    assert.equal(getAll()[0]?.dimension, 'B');
  });

  it('índice fora da faixa não faz nada e não lança', () => {
    add(barra());
    assert.equal(remove(5), false);
    assert.equal(remove(-1), false);
    assert.equal(count(), 1);
  });
});

describe('updateQuantity', () => {
  it('altera a quantidade', () => {
    add(barra());
    assert.ok(updateQuantity(0, 7));
    assert.equal(getAll()[0]?.quantity, 7);
  });

  it('trunca decimal: não existe meia barra', () => {
    add(barra());
    updateQuantity(0, 3.9);
    assert.equal(getAll()[0]?.quantity, 3);
  });

  it('zero ou negativo REMOVE a linha, em vez de guardar quantidade inválida', () => {
    add(barra());
    assert.ok(updateQuantity(0, 0));
    assert.equal(count(), 0);
  });

  it('recusa valor não numérico', () => {
    add(barra());
    assert.equal(updateQuantity(0, Number.NaN), false);
    assert.equal(getAll()[0]?.quantity, 1);
  });
});

describe('updateNote', () => {
  it('salva a observação', () => {
    add(barra());
    assert.ok(updateNote(0, 'cortar em 3 m'));
    assert.equal(getAll()[0]?.note, 'cortar em 3 m');
  });

  it('observação em branco vira ausente, não string vazia', () => {
    add(barra());
    updateNote(0, 'algo');
    updateNote(0, '   ');
    assert.equal(getAll()[0]?.note, undefined);
  });
});

describe('clear', () => {
  it('esvazia e avisa', () => {
    add(barra());
    eventos.length = 0;
    assert.ok(clear());
    assert.equal(count(), 0);
    assert.deepEqual(eventos, [QUOTE_CHANGED]);
  });
});

describe('expiração de 30 dias', () => {
  const DIA = 24 * 60 * 60 * 1000;

  it('lista de 29 dias atrás continua valendo', () => {
    storage.plantar(
      CHAVE,
      JSON.stringify({ savedAt: Date.now() - 29 * DIA, items: [barra()] }),
    );
    assert.equal(count(), 1);
  });

  it('lista de 31 dias atrás é descartada, sem avisar o usuário', () => {
    storage.plantar(
      CHAVE,
      JSON.stringify({ savedAt: Date.now() - 31 * DIA, items: [barra()] }),
    );
    assert.equal(count(), 0);
    // E o registro é apagado de fato, não só ignorado na leitura.
    assert.equal(storage.getItem(CHAVE), null);
  });
});

describe('dado corrompido é descartado em silêncio', () => {
  it('JSON inválido', () => {
    storage.plantar(CHAVE, '{isso não é json');
    assert.deepEqual(getAll(), []);
  });

  it('formato inesperado', () => {
    storage.plantar(CHAVE, JSON.stringify({ items: 'não é array' }));
    assert.deepEqual(getAll(), []);
    storage.plantar(CHAVE, JSON.stringify([1, 2, 3]));
    assert.deepEqual(getAll(), []);
  });

  it('item inválido é filtrado, e os válidos sobrevivem', () => {
    storage.plantar(
      CHAVE,
      JSON.stringify({
        savedAt: Date.now(),
        items: [
          barra('boa'),
          { productSlug: 'x' }, // faltam campos
          { ...barra('unidade errada'), unit: 'tonelada' },
          { ...barra('quantidade zero'), quantity: 0 },
          null,
        ],
      }),
    );
    const itens = getAll();
    assert.equal(itens.length, 1);
    assert.equal(itens[0]?.dimension, 'boa');
  });

  it('leitura bloqueada devolve lista vazia em vez de lançar', () => {
    add(barra());
    storage.falharAoLer = true;
    assert.deepEqual(getAll(), []);
    assert.equal(count(), 0);
  });
});
