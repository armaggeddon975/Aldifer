/**
 * Testes das fórmulas de peso teórico.
 *
 * Rodar com `npm test`. Node executa TypeScript direto, por remoção de tipos,
 * então o import precisa da extensão .ts explícita.
 *
 * Cada fórmula tem no mínimo 3 casos com valor conferido à mão. Os casos usam
 * bitolas comerciais reais, para que um erro de constante apareça como número
 * que o serralheiro reconheceria como errado.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STEEL_DENSITY,
  STEEL_DENSITY_FACTOR,
  WEIGHT_FORMULAS,
  WEIGHT_FORMULA_IDS,
  angleWeight,
  computeRowWeight,
  flatBarWeight,
  formatWeight,
  hexBarWeight,
  plateWeightPerPiece,
  plateWeightPerSquareMeter,
  rectTubeWeight,
  roundBarWeight,
  roundTubeWeight,
  squareBarWeight,
  squareTubeWeight,
  teeWeight,
} from './steel.ts';

/** Compara com tolerância, para não brigar com ponto flutuante binário. */
function near(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `esperado ${expected}, recebido ${actual} (diferença ${Math.abs(actual - expected)})`,
  );
}

describe('constantes de densidade', () => {
  it('o fator vem da densidade do aço carbono', () => {
    // 7.850 kg/m³ = 0,00785 kg por mm² de seção por metro linear
    near(STEEL_DENSITY_FACTOR, STEEL_DENSITY / 1_000_000);
  });
});

describe('barra redonda', () => {
  it('Ø 10 mm', () => near(roundBarWeight(10), 0.6165));
  it('Ø 20 mm', () => near(roundBarWeight(20), 2.466));
  it('Ø 25 mm', () => near(roundBarWeight(25), 3.853125));
  it('Ø 1/2" = 12,7 mm', () => near(roundBarWeight(12.7), 0.99435285));

  it('cresce com o quadrado do diâmetro', () => {
    near(roundBarWeight(20) / roundBarWeight(10), 4);
  });
});

describe('barra quadrada', () => {
  it('lado 10 mm', () => near(squareBarWeight(10), 0.785));
  it('lado 20 mm', () => near(squareBarWeight(20), 3.14));
  it('lado 25 mm', () => near(squareBarWeight(25), 4.90625));

  it('é mais pesada que a redonda de mesma medida, na razão 4/π', () => {
    near(squareBarWeight(20) / roundBarWeight(20), 4 / Math.PI, 1e-4);
  });
});

describe('barra chata', () => {
  it('50 × 6 mm', () => near(flatBarWeight(50, 6), 2.355));
  it('25 × 3 mm', () => near(flatBarWeight(25, 3), 0.58875));
  it('100 × 12 mm', () => near(flatBarWeight(100, 12), 9.42));
  it('20 × 4,75 mm', () => near(flatBarWeight(20, 4.75), 0.74575));

  it('é simétrica: 50 × 6 pesa igual a 6 × 50', () => {
    near(flatBarWeight(50, 6), flatBarWeight(6, 50));
  });
});

describe('barra sextavada', () => {
  it('entre-faces 10 mm', () => near(hexBarWeight(10), 0.68));
  it('entre-faces 20 mm', () => near(hexBarWeight(20), 2.72));
  it('entre-faces 25 mm', () => near(hexBarWeight(25), 4.25));

  it('fica entre a redonda e a quadrada de mesma medida', () => {
    assert.ok(hexBarWeight(20) > roundBarWeight(20));
    assert.ok(hexBarWeight(20) < squareBarWeight(20));
  });
});

describe('tubo redondo', () => {
  it('Ø 30 × 2,00 mm', () => near(roundTubeWeight(30, 2), 1.38096));
  it('Ø 50 × 3,00 mm', () => near(roundTubeWeight(50, 3), 3.47706));
  it('Ø 1" × 1,20 mm', () => near(roundTubeWeight(25.4, 1.2), 0.7161264));
  it('Ø 76,2 × 3,00 mm', () => near(roundTubeWeight(76.2, 3), 5.415336));

  it('tubo de parede igual ao raio pesa como barra maciça', () => {
    // Com e = D/2 o tubo fecha no centro: 0,02466 × (D/2) × (D/2)
    // = 0,006165 × D², que é exatamente a fórmula da barra redonda.
    near(roundTubeWeight(20, 10), roundBarWeight(20), 1e-6);
  });
});

describe('tubo quadrado', () => {
  it('30 × 30 × 2,00 mm', () => near(squareTubeWeight(30, 2), 1.7584));
  it('20 × 20 × 1,20 mm', () => near(squareTubeWeight(20, 1.2), 0.708384));
  it('50 × 50 × 3,00 mm', () => near(squareTubeWeight(50, 3), 4.4274));

  it('parede igual à metade do lado equivale à barra quadrada maciça', () => {
    near(squareTubeWeight(20, 10), squareBarWeight(20), 1e-6);
  });
});

describe('tubo retangular', () => {
  it('40 × 20 × 1,50 mm', () => near(rectTubeWeight(40, 20, 1.5), 1.34235));
  it('50 × 30 × 2,00 mm', () => near(rectTubeWeight(50, 30, 2), 2.3864));
  it('30 × 20 × 1,20 mm', () => near(rectTubeWeight(30, 20, 1.2), 0.896784));

  it('de lados iguais, coincide com o tubo quadrado', () => {
    near(rectTubeWeight(30, 30, 2), squareTubeWeight(30, 2), 1e-9);
  });
});

describe('cantoneira', () => {
  it('25 × 25 × 3,00 mm', () => near(angleWeight(25, 25, 3), 1.10685));
  it('50 × 50 × 5,00 mm', () => near(angleWeight(50, 50, 5), 3.72875));
  it('30 × 30 × 3,00 mm', () => near(angleWeight(30, 30, 3), 1.34235));

  it('abas desiguais somam corretamente', () => {
    // 50 × 30 × 4: 0,00785 × 4 × (80 − 4) = 2,3864
    near(angleWeight(50, 30, 4), 2.3864);
  });
});

describe('perfil T', () => {
  it('40 × 40 × 4,00 mm', () => near(teeWeight(40, 40, 4), 2.3864));
  it('30 × 30 × 3,00 mm', () => near(teeWeight(30, 30, 3), 1.34235));
  it('50 × 50 × 5,00 mm', () => near(teeWeight(50, 50, 5), 3.72875));

  it('tem a mesma geometria da cantoneira', () => {
    near(teeWeight(40, 25, 3), angleWeight(40, 25, 3));
  });
});

describe('chapa', () => {
  it('2,00 mm em 1200 × 2000 mm', () => near(plateWeightPerPiece(2, 1200, 2000), 37.68));
  it('3,00 mm em 1000 × 2000 mm', () => near(plateWeightPerPiece(3, 1000, 2000), 47.1, 1e-8));
  it('1,00 mm em 1200 × 3000 mm', () => near(plateWeightPerPiece(1, 1200, 3000), 28.26));
  it('6,00 mm em 1200 × 2000 mm', () => near(plateWeightPerPiece(6, 1200, 2000), 113.04, 1e-8));

  it('2,00 mm por m²', () => near(plateWeightPerSquareMeter(2), 15.7));
  it('3,00 mm por m²', () => near(plateWeightPerSquareMeter(3), 23.55));
  it('6,00 mm por m²', () => near(plateWeightPerSquareMeter(6), 47.1));

  it('as duas fórmulas concordam entre si', () => {
    // peso da peça = peso por m² × área da peça em m²
    for (const [t, w, l] of [
      [2, 1200, 2000],
      [3, 1000, 2000],
      [4.75, 1500, 3000],
    ] as const) {
      const porArea = plateWeightPerSquareMeter(t) * (w / 1000) * (l / 1000);
      near(plateWeightPerPiece(t, w, l), porArea, 1e-8);
    }
  });
});

describe('registro de fórmulas', () => {
  it('toda fórmula declara params, unidade, rótulo e expressão', () => {
    for (const id of WEIGHT_FORMULA_IDS) {
      const spec = WEIGHT_FORMULAS[id];
      assert.ok(spec.params.length > 0, `${id} sem params`);
      assert.ok(spec.label.length > 0, `${id} sem rótulo`);
      assert.ok(spec.expression.includes('P ='), `${id} sem expressão`);
      assert.ok(['kg/m', 'kg/peça', 'kg/m²'].includes(spec.unit), `${id} com unidade inválida`);
    }
  });

  it('computeRowWeight bate com a chamada direta da função', () => {
    near(computeRowWeight('flat-bar', { width: 50, thickness: 6 })!, flatBarWeight(50, 6));
    near(computeRowWeight('round-tube', { outerDiameter: 30, wall: 2 })!, roundTubeWeight(30, 2));
    near(computeRowWeight('angle', { leg1: 25, leg2: 25, thickness: 3 })!, angleWeight(25, 25, 3));
  });

  it('computeRowWeight devolve null em vez de NaN quando falta campo', () => {
    assert.equal(computeRowWeight('flat-bar', { width: 50 }), null);
    assert.equal(computeRowWeight('flat-bar', {}), null);
    assert.equal(computeRowWeight('flat-bar', { width: 50, thickness: '6' }), null);
    assert.equal(computeRowWeight('round-bar', { diameter: Number.NaN }), null);
  });
});

describe('formatWeight', () => {
  it('usa vírgula decimal e 3 casas', () => {
    assert.equal(formatWeight(2.355), '2,355');
    assert.equal(formatWeight(0.6165), '0,617');
    assert.equal(formatWeight(9.42), '9,420');
  });

  it('aceita outra precisão', () => {
    assert.equal(formatWeight(15.7, 2), '15,70');
  });
});
