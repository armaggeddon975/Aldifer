/**
 * Testes do rótulo de bitola.
 *
 * O teste "não repete rótulo" existe por causa de um defeito real encontrado
 * na Etapa 3: a versão anterior recortava as colunas em três, e as duas linhas
 * de chapa xadrez 1/8" (formatos 1200×2000 e 1200×3000) saíam com rótulo
 * idêntico na busca. Duas sugestões iguais fazem o cliente pedir a medida
 * errada, e nada no build acusava.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeDimension, type LabelSource } from './dimension-label.ts';

const cols = (...keys: readonly [string, string][]): LabelSource['dimensionColumns'] =>
  keys.map(([key, label]) => ({ key, label }));

describe('produtos com fórmula — a fórmula é o discriminador', () => {
  it('barra chata: largura × espessura, sem o comprimento', () => {
    const source: LabelSource = {
      weightFormula: 'flat-bar',
      dimensionColumns: cols(['width', 'Largura (mm)'], ['thickness', 'Espessura (mm)'], ['length', 'Comprimento (m)']),
    };
    assert.equal(describeDimension(source, { width: 50, thickness: 6, length: 6 }), '50 × 6 mm');
  });

  it('chapa a quente tem as MESMAS colunas da barra chata e rótulo diferente', () => {
    // width, thickness e length nas duas. Só a fórmula distingue: na barra o
    // comprimento é em metros, na chapa é em milímetros.
    const barra: LabelSource = {
      weightFormula: 'flat-bar',
      dimensionColumns: cols(['width', 'Largura (mm)'], ['thickness', 'Espessura (mm)'], ['length', 'Comprimento (m)']),
    };
    const chapa: LabelSource = {
      weightFormula: 'plate-piece',
      dimensionColumns: cols(['thickness', 'Espessura (mm)'], ['width', 'Largura (mm)'], ['length', 'Comprimento (mm)']),
    };
    const linha = { width: 1200, thickness: 3, length: 2000 };
    assert.notEqual(describeDimension(barra, linha), describeDimension(chapa, linha));
    assert.equal(describeDimension(chapa, linha), '3 mm · 1200 × 2000 mm');
  });

  it('tubo quadrado repete o lado, como se pede no balcão', () => {
    const source: LabelSource = {
      weightFormula: 'square-tube',
      dimensionColumns: cols(['side', 'Lado (mm)'], ['wall', 'Parede (mm)']),
    };
    assert.equal(describeDimension(source, { side: 30, wall: 2 }), '30 × 30 × 2 mm');
  });

  it('tubo redondo usa o símbolo de diâmetro', () => {
    const source: LabelSource = {
      weightFormula: 'round-tube',
      dimensionColumns: cols(['outerDiameter', 'Ø externo (mm)'], ['wall', 'Parede (mm)']),
    };
    assert.equal(describeDimension(source, { outerDiameter: 25.4, wall: 1.2 }), 'Ø 25,4 × 1,2 mm');
  });

  it('cantoneira nomeia as duas abas mesmo quando são iguais', () => {
    const source: LabelSource = {
      weightFormula: 'angle',
      dimensionColumns: cols(['leg1', 'Aba 1 (mm)'], ['leg2', 'Aba 2 (mm)'], ['thickness', 'Espessura (mm)']),
    };
    assert.equal(describeDimension(source, { leg1: 25, leg2: 25, thickness: 3 }), '25 × 25 × 3 mm');
  });
});

describe('produtos sem fórmula — reconhecidos pelas colunas', () => {
  const semFormula = (...keys: readonly [string, string][]): LabelSource => ({
    dimensionColumns: cols(...keys),
  });

  it('chapa xadrez traz a bitola em polegada E o formato', () => {
    const source = semFormula(
      ['gauge', 'Bitola (pol)'],
      ['thickness', 'Espessura da base (mm)'],
      ['width', 'Largura (mm)'],
      ['length', 'Comprimento (mm)'],
    );
    assert.equal(
      describeDimension(source, { gauge: '1/8"', thickness: 3.17, width: 1200, length: 2000 }),
      '1/8" · 3,17 mm · 1200 × 2000 mm',
    );
  });

  it('perfil I rotula altura, aba e alma — três números soltos não dizem qual é qual', () => {
    const source = semFormula(
      ['height', 'Altura (mm)'],
      ['flange', 'Aba (mm)'],
      ['web', 'Alma (mm)'],
      ['length', 'Comprimento (m)'],
    );
    assert.equal(
      describeDimension(source, { height: 200, flange: 100, web: 8, length: 6 }),
      'altura 200 · aba 100 · alma 8 mm',
    );
  });

  it('tela usa malha e fio em BWG', () => {
    const source = semFormula(
      ['mesh', 'Malha (mm)'],
      ['wireBwg', 'Fio (BWG)'],
      ['wireMm', 'Fio (mm)'],
      ['rollHeight', 'Altura do rolo (m)'],
      ['rollLength', 'Comprimento do rolo (m)'],
    );
    assert.equal(
      describeDimension(source, { mesh: 50.8, wireBwg: 12, wireMm: 2.77, rollHeight: 1.5, rollLength: 25 }),
      'malha 50,8 mm · fio BWG 12',
    );
  });

  it('disco de corte destaca o furo, que é o que dá errado no pedido', () => {
    const source = semFormula(['diameter', 'Ø do disco (mm)'], ['thickness', 'Espessura (mm)'], ['bore', 'Furo (mm)']);
    assert.equal(
      describeDimension(source, { diameter: 115, thickness: 1, bore: 22.23 }),
      'Ø 115 × 1 mm · furo 22,23 mm',
    );
  });

  it('eletrodo põe a classificação AWS na frente', () => {
    const source = semFormula(['classification', 'Classificação AWS'], ['diameter', 'Ø (mm)'], ['length', 'Comprimento (mm)']);
    assert.equal(describeDimension(source, { classification: 'E7018', diameter: 3.25, length: 350 }), 'E7018 · Ø 3,25 mm');
  });

  it('sem regra conhecida, percorre TODAS as colunas', () => {
    const source = semFormula(['alfa', 'Alfa (mm)'], ['beta', 'Beta (kg)'], ['gama', 'Gama']);
    assert.equal(
      describeDimension(source, { alfa: 10, beta: 2.5, gama: 'X' }),
      'Alfa 10 mm · Beta 2,5 kg · Gama X',
    );
  });
});

describe('formatação de número', () => {
  it('usa vírgula decimal', () => {
    const source: LabelSource = {
      weightFormula: 'round-bar',
      dimensionColumns: cols(['diameter', 'Ø (mm)']),
    };
    assert.equal(describeDimension(source, { diameter: 4.75 }), 'Ø 4,75 mm');
  });

  it('NÃO usa separador de milhar em cota', () => {
    // "1.200 mm" se confunde com vírgula decimal na leitura rápida.
    const source: LabelSource = {
      weightFormula: 'plate-piece',
      dimensionColumns: cols(['thickness', 'Espessura (mm)'], ['width', 'Largura (mm)'], ['length', 'Comprimento (mm)']),
    };
    const rotulo = describeDimension(source, { thickness: 2, width: 1200, length: 3000 });
    assert.ok(!rotulo.includes('1.200'), `separador de milhar apareceu em "${rotulo}"`);
    assert.equal(rotulo, '2 mm · 1200 × 3000 mm');
  });
});

describe('rótulos precisam ser distintos entre linhas', () => {
  it('chapa xadrez 1/8 nos dois formatos NÃO sai com o mesmo rótulo', () => {
    // Este era o defeito: a versão antiga recortava em três colunas e perdia
    // o comprimento, que é justamente o que diferencia as duas linhas.
    const source: LabelSource = {
      dimensionColumns: cols(
        ['gauge', 'Bitola (pol)'],
        ['thickness', 'Espessura da base (mm)'],
        ['width', 'Largura (mm)'],
        ['length', 'Comprimento (mm)'],
      ),
    };
    const a = describeDimension(source, { gauge: '1/8"', thickness: 3.17, width: 1200, length: 2000 });
    const b = describeDimension(source, { gauge: '1/8"', thickness: 3.17, width: 1200, length: 3000 });
    assert.notEqual(a, b);
  });

  it('linhas que diferem em qualquer coluna produzem rótulos diferentes', () => {
    const source: LabelSource = {
      weightFormula: 'square-tube',
      dimensionColumns: cols(['side', 'Lado (mm)'], ['wall', 'Parede (mm)']),
    };
    const linhas = [
      { side: 30, wall: 1.2 },
      { side: 30, wall: 1.5 },
      { side: 30, wall: 2 },
      { side: 40, wall: 2 },
    ];
    const rotulos = linhas.map((linha) => describeDimension(source, linha));
    assert.equal(new Set(rotulos).size, rotulos.length, `rótulo repetido em ${JSON.stringify(rotulos)}`);
  });
});
