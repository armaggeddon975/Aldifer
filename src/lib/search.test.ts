/**
 * Testes da busca rápida.
 *
 * O teste de acentuação existe por um motivo concreto: a regra que remove
 * diacríticos usa o intervalo U+0300–U+036F escrito com os próprios caracteres
 * combinantes no fonte. Se o arquivo for salvo em outra codificação, o
 * intervalo se corrompe em silêncio e a busca passa a ignorar acento errado.
 * Este teste quebra nesse caso.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalize, search, type SearchIndex } from './search.ts';

describe('normalize', () => {
  it('remove acento', () => {
    assert.equal(normalize('Cantoneira'), 'cantoneira');
    assert.equal(normalize('CHAPA GALVANIZADA'), 'chapa galvanizada');
    assert.equal(normalize('Perfil Ú'), 'perfil u');
    assert.equal(normalize('São Bernardo'), 'sao bernardo');
    assert.equal(normalize('ação inspeção'), 'acao inspecao');
  });

  it('unifica as três formas de escrever multiplicação', () => {
    const esperado = 'tubo 30x30';
    for (const forma of ['tubo 30x30', 'tubo 30 x 30', 'tubo 30 × 30', 'tubo 30×30']) {
      assert.equal(normalize(forma), esperado, `falhou em ${forma}`);
    }
  });

  it('trata vírgula decimal como ponto', () => {
    assert.equal(normalize('4,75'), '4.75');
    assert.equal(normalize('Parede 1,20 mm'), 'parede 1.20 mm');
  });

  it('preserva a barra da fração polegada', () => {
    assert.ok(normalize('Chapa 1/8"').includes('1/8'));
    assert.ok(normalize('3/16 pol').includes('3/16'));
  });

  it('colapsa espaço e apara as pontas', () => {
    assert.equal(normalize('  barra   chata  '), 'barra chata');
  });
});

const INDICE: SearchIndex = {
  produtos: [
    {
      nome: 'Tubo Quadrado',
      href: '/produtos/tubos/tubo-quadrado',
      categoria: 'Tubos',
      termos: normalize('Tubo Quadrado Tubos metalon portões grades'),
    },
    {
      nome: 'Chapa Xadrez',
      href: '/produtos/chapas/chapa-xadrez',
      categoria: 'Chapas',
      termos: normalize('Chapa Xadrez Chapas piso degrau antiderrapante'),
    },
    {
      nome: 'Cantoneira',
      href: '/produtos/perfis/cantoneira',
      categoria: 'Perfis',
      termos: normalize('Cantoneira Perfis moldura suporte'),
    },
  ],
  bitolas: [
    { p: 0, rotulo: '30 × 30 × 2 mm', termos: normalize('30 × 30 × 2 mm 30 2 6') },
    { p: 0, rotulo: '50 × 50 × 3 mm', termos: normalize('50 × 50 × 3 mm 50 3 6') },
    { p: 1, rotulo: '3,17 mm · 1200 × 2000 mm', termos: normalize('1/8" 3.17 1200 2000') },
    { p: 2, rotulo: '25 × 25 × 3 mm', termos: normalize('25 × 25 × 3 mm 25 3 6') },
  ],
};

describe('search', () => {
  it('ignora consulta curta demais', () => {
    assert.deepEqual(search(INDICE, ''), []);
    assert.deepEqual(search(INDICE, 'a'), []);
  });

  it('acha o produto pelo nome, sem acento', () => {
    const r = search(INDICE, 'cantoneira');
    assert.equal(r[0]?.titulo, 'Cantoneira');
    assert.equal(r[0]?.href, '/produtos/perfis/cantoneira');
  });

  it('"tubo 30x30" acha a bitola, e não só o produto', () => {
    const r = search(INDICE, 'tubo 30x30');
    assert.equal(r[0]?.titulo, 'Tubo Quadrado');
    assert.equal(r[0]?.detalhe, '30 × 30 × 2 mm');
  });

  it('as três grafias de 30x30 dão o mesmo resultado', () => {
    const esperado = JSON.stringify(search(INDICE, 'tubo 30x30'));
    for (const forma of ['tubo 30 x 30', 'tubo 30 × 30', 'TUBO 30X30']) {
      assert.equal(JSON.stringify(search(INDICE, forma)), esperado, `falhou em ${forma}`);
    }
  });

  it('"chapa 1/8" acha a chapa xadrez pela fração', () => {
    const r = search(INDICE, 'chapa 1/8');
    assert.equal(r[0]?.titulo, 'Chapa Xadrez');
  });

  it('exige TODOS os termos, não qualquer um', () => {
    // "chapa" casa com Chapa Xadrez; "cantoneira" com Cantoneira.
    // Juntos não devem casar com nenhum dos dois.
    assert.deepEqual(search(INDICE, 'chapa cantoneira'), []);
  });

  it('consulta sem número prioriza o produto sobre a bitola', () => {
    const r = search(INDICE, 'tubo');
    assert.equal(r[0]?.detalhe, null, 'o primeiro resultado deveria ser a página do produto');
  });

  it('respeita o limite', () => {
    assert.ok(search(INDICE, 'mm', 2).length <= 2);
  });

  it('não devolve resultado para consulta sem correspondência', () => {
    assert.deepEqual(search(INDICE, 'parafuso sextavado'), []);
  });
});
