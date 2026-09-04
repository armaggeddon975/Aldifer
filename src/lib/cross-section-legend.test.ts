/**
 * Testes da legenda que liga as cotas do desenho às colunas da tabela.
 *
 * O risco que estes testes cobrem: as letras vivem nos componentes SVG de
 * src/components/cross-sections/ e o mapa vive aqui. Se um desenho trocar de
 * letra e o mapa não acompanhar, a página passa a dizer que "A" é a largura
 * quando o desenho cota a espessura — erro que nenhum type check pega e que
 * manda o cliente pedir a medida errada.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CROSS_SECTION_VARIANTS } from '../components/cross-sections/types.ts';
import { buildLegend } from './cross-section-legend.ts';

const col = (...keys: readonly string[]) => keys.map((key) => ({ key, label: `Rótulo de ${key}` }));

describe('buildLegend', () => {
  it('sem variante, não há legenda', () => {
    assert.deepEqual(buildLegend(undefined, col('width', 'thickness')), []);
  });

  it('barra chata: A é a largura e e é a espessura', () => {
    const legend = buildLegend('flat-bar', col('width', 'thickness', 'length'));
    assert.deepEqual(
      legend.map((entry) => [entry.letter, entry.label]),
      [
        ['A', 'Rótulo de width'],
        ['e', 'Rótulo de thickness'],
      ],
    );
  });

  it('tubo redondo usa Ø para o diâmetro externo', () => {
    const legend = buildLegend('round-tube', col('outerDiameter', 'wall', 'length'));
    assert.deepEqual(legend.map((e) => e.letter), ['Ø', 'e']);
    assert.equal(legend[0]?.label, 'Rótulo de outerDiameter');
  });

  it('perfil I liga A, B e e a altura, aba e alma', () => {
    const legend = buildLegend('i-beam', col('height', 'flange', 'web', 'length'));
    assert.deepEqual(
      legend.map((entry) => [entry.letter, entry.label]),
      [
        ['A', 'Rótulo de height'],
        ['B', 'Rótulo de flange'],
        ['e', 'Rótulo de web'],
      ],
    );
  });

  it('cantoneira nomeia as duas abas separadamente', () => {
    const legend = buildLegend('angle', col('leg1', 'leg2', 'thickness', 'length'));
    assert.deepEqual(legend.map((e) => e.label), [
      'Rótulo de leg1',
      'Rótulo de leg2',
      'Rótulo de thickness',
    ]);
  });

  it('OMITE a letra quando a coluna não existe no produto', () => {
    // A telha desenha passo e altura de onda, mas a tabela dela só tem
    // espessura, largura útil e comprimento. Mostrar "B = ?" seria pior que
    // não mostrar.
    const legend = buildLegend('corrugated-sheet', col('thickness', 'usefulWidth', 'length'));
    assert.deepEqual(legend.map((e) => e.letter), ['e']);
  });

  it('produto sem nenhuma coluna correspondente não gera legenda', () => {
    assert.deepEqual(buildLegend('flat-bar', col('alfa', 'beta')), []);
  });

  it('toda letra devolvida é uma das quatro do desenho técnico', () => {
    const permitidas = new Set(['A', 'B', 'e', 'Ø']);
    const todasAsColunas = col(
      'diameter', 'side', 'width', 'thickness', 'outerDiameter', 'wall',
      'base', 'height', 'leg1', 'leg2', 'flange', 'web', 'mesh', 'wireMm',
      'acrossFlats', 'usefulWidth', 'length',
    );

    for (const variant of CROSS_SECTION_VARIANTS) {
      for (const entry of buildLegend(variant, todasAsColunas)) {
        assert.ok(permitidas.has(entry.letter), `${variant} usou a letra "${entry.letter}"`);
      }
    }
  });

  it('nenhuma variante repete a mesma letra duas vezes', () => {
    const todasAsColunas = col(
      'diameter', 'side', 'width', 'thickness', 'outerDiameter', 'wall',
      'base', 'height', 'leg1', 'leg2', 'flange', 'web', 'mesh', 'wireMm',
      'acrossFlats', 'usefulWidth', 'length',
    );

    for (const variant of CROSS_SECTION_VARIANTS) {
      const letters = buildLegend(variant, todasAsColunas).map((entry) => entry.letter);
      assert.equal(new Set(letters).size, letters.length, `${variant} repetiu letra: ${letters}`);
    }
  });

  it('os 11 perfis com tabela têm legenda; os 2 sem coluna própria podem não ter', () => {
    const todasAsColunas = col(
      'diameter', 'side', 'width', 'thickness', 'outerDiameter', 'wall',
      'base', 'height', 'leg1', 'leg2', 'flange', 'web', 'mesh', 'wireMm',
      'acrossFlats', 'usefulWidth', 'length',
    );
    const semLegenda = CROSS_SECTION_VARIANTS.filter(
      (variant) => buildLegend(variant, todasAsColunas).length === 0,
    );
    assert.deepEqual(semLegenda, [], `variantes sem legenda: ${semLegenda}`);
  });
});
