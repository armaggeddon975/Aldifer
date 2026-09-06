/**
 * Testes da calculadora de peso.
 *
 * Dois propósitos. O primeiro é conferir que os resultados batem com cálculo
 * manual, que é critério de aceite da Etapa 7. O segundo é provar que não há
 * fórmula duplicada: cada caso compara o resultado da calculadora com a
 * chamada DIRETA da função de src/lib/steel.ts. Se alguém reimplementar uma
 * fórmula aqui, a comparação quebra.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CALCULATOR_PROFILES,
  DEFAULT_PROFILE_SLUG,
  URL_PROFILE_KEY,
  buildQuoteItem,
  calculate,
  findProfile,
  fromSearchParams,
  legendFor,
  profileForFormula,
  toSearchParams,
} from './calculator.ts';
import {
  WEIGHT_FORMULAS,
  angleWeight,
  flatBarWeight,
  plateWeightPerPiece,
  plateWeightPerSquareMeter,
  rectTubeWeight,
  roundBarWeight,
  roundTubeWeight,
  squareTubeWeight,
} from './steel.ts';

const perfil = (slug: string) => {
  const p = findProfile(slug);
  assert.ok(p, `perfil ${slug} não existe`);
  return p;
};

const near = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `esperado ${b}, recebido ${a}`);

describe('catálogo de perfis', () => {
  it('todo perfil com fórmula declara os params que a fórmula lê', () => {
    for (const profile of CALCULATOR_PROFILES) {
      if (!profile.formula) continue;
      const spec = WEIGHT_FORMULAS[profile.formula];
      const declarados = new Set(profile.params.map((param) => param.name));
      for (const necessario of spec.params) {
        assert.ok(
          declarados.has(necessario),
          `${profile.slug} não pede "${necessario}", que a fórmula ${profile.formula} lê`,
        );
      }
    }
  });

  it('as chaves de URL não colidem dentro do mesmo perfil', () => {
    for (const profile of CALCULATOR_PROFILES) {
      const chaves = profile.params.map((param) => param.urlKey);
      assert.equal(
        new Set(chaves).size,
        chaves.length,
        `${profile.slug} repete chave de URL: ${chaves}`,
      );
    }
  });

  it('nenhuma chave de parâmetro colide com as globais m e q', () => {
    for (const profile of CALCULATOR_PROFILES) {
      for (const param of profile.params) {
        assert.ok(
          param.urlKey !== 'm' && param.urlKey !== 'q',
          `${profile.slug}.${param.name} usa a chave global "${param.urlKey}"`,
        );
      }
    }
  });

  it('perfil I e U NÃO têm fórmula e apontam para a tabela', () => {
    for (const slug of ['perfil-i', 'perfil-u']) {
      const p = perfil(slug);
      assert.equal(p.formula, undefined, `${slug} não deveria ter fórmula`);
      assert.ok(p.tableHref, `${slug} deveria apontar para a tabela`);
    }
  });

  it('todo perfil tem desenho de seção transversal', () => {
    for (const profile of CALCULATOR_PROFILES) {
      assert.ok(profile.crossSection, `${profile.slug} sem desenho`);
    }
  });
});

describe('legenda das cotas', () => {
  it('todo perfil com fórmula tem ao menos uma cota explicada', () => {
    for (const profile of CALCULATOR_PROFILES) {
      if (!profile.formula) continue;
      assert.ok(
        legendFor(profile).length > 0,
        `${profile.slug} mostra o desenho com letras que ninguém explica`,
      );
    }
  });

  it('a legenda nomeia os campos com o MESMO rótulo do <label>', () => {
    // Se a legenda dissesse "A — largura" e o campo ao lado dissesse
    // "Largura da chapa", o cliente casaria a letra com o campo errado.
    for (const profile of CALCULATOR_PROFILES) {
      const rotulos = new Set(profile.params.map((param) => param.label));
      for (const entry of legendFor(profile)) {
        assert.ok(
          rotulos.has(entry.label),
          `${profile.slug}: legenda diz "${entry.label}", que não é rótulo de campo nenhum`,
        );
      }
    }
  });

  it('barra sextavada NÃO empresta o desenho da barra redonda', () => {
    // Um círculo no lugar de um hexágono contradiz o único motivo de estes
    // desenhos existirem: ser o corte real do perfil.
    assert.equal(perfil('barra-sextavada').crossSection, 'hex-bar');
    assert.notEqual(perfil('barra-sextavada').crossSection, perfil('barra-redonda').crossSection);
  });

  it('a cota do sextavado é a medida entre faces, que é o que a fórmula usa', () => {
    const legenda = legendFor(perfil('barra-sextavada'));
    assert.deepEqual(
      legenda.map((entry) => entry.label),
      ['Entre faces'],
    );
  });
});

describe('as expressões só usam símbolos que a legenda explica', () => {
  it('nenhuma expressão traz letra solta fora de P e Ø', () => {
    // As fórmulas escrevem as medidas por extenso justamente para não
    // depender de legenda. Uma letra isolada nova ali passaria a exigir
    // uma linha na legenda da página — e ninguém lembraria de acrescentar.
    const permitidos = new Set(['P', 'Ø']);
    for (const [id, spec] of Object.entries(WEIGHT_FORMULAS)) {
      const soltas = spec.expression.match(/(?<![\p{L}₀-₉])\p{L}(?![\p{L}₀-₉])/gu) ?? [];
      for (const letra of soltas) {
        assert.ok(
          permitidos.has(letra),
          `${id}: a expressão "${spec.expression}" usa a letra solta "${letra}"`,
        );
      }
    }
  });
});

describe('cálculo — bate com a chamada direta de steel.ts', () => {
  it('tubo redondo Ø 30 × 2,00 mm', () => {
    const r = calculate(perfil('tubo-redondo'), {
      values: { outerDiameter: 30, wall: 2 },
      lengthMeters: 6,
      quantity: 10,
    });
    near(r.perMeter!, roundTubeWeight(30, 2));
    near(r.perMeter!, 1.38096);
    near(r.perPiece!, 1.38096 * 6);
    near(r.total!, 1.38096 * 6 * 10);
    assert.equal(r.dimension, 'Ø 30 × 2 mm');
  });

  it('barra chata 50 × 6 mm', () => {
    const r = calculate(perfil('barra-chata'), {
      values: { width: 50, thickness: 6 },
      lengthMeters: 6,
    });
    near(r.perMeter!, flatBarWeight(50, 6));
    near(r.perMeter!, 2.355);
    near(r.perPiece!, 14.13);
    assert.equal(r.dimension, '50 × 6 mm');
  });

  it('tubo quadrado repete o lado no rótulo, como no catálogo', () => {
    const r = calculate(perfil('tubo-quadrado'), {
      values: { side: 30, wall: 2 },
      lengthMeters: 6,
    });
    near(r.perMeter!, squareTubeWeight(30, 2));
    assert.equal(r.dimension, '30 × 30 × 2 mm');
  });

  it('tubo retangular 50 × 30 × 2,00 mm', () => {
    const r = calculate(perfil('tubo-retangular'), {
      values: { base: 50, height: 30, wall: 2 },
      lengthMeters: 6,
    });
    near(r.perMeter!, rectTubeWeight(50, 30, 2));
    near(r.perMeter!, 2.3864);
  });

  it('cantoneira 25 × 25 × 3,00 mm', () => {
    const r = calculate(perfil('cantoneira'), {
      values: { leg1: 25, leg2: 25, thickness: 3 },
      lengthMeters: 6,
    });
    near(r.perMeter!, angleWeight(25, 25, 3));
    near(r.perMeter!, 1.10685);
  });

  it('barra redonda cresce com o quadrado do diâmetro', () => {
    const dez = calculate(perfil('barra-redonda'), { values: { diameter: 10 } });
    const vinte = calculate(perfil('barra-redonda'), { values: { diameter: 20 } });
    near(dez.perMeter!, roundBarWeight(10));
    near(vinte.perMeter! / dez.perMeter!, 4);
  });
});

describe('chapa — fórmula por peça, não por metro', () => {
  it('2,00 mm em 1200 × 2000 mm', () => {
    const r = calculate(perfil('chapa'), {
      values: { thickness: 2, width: 1200, length: 2000 },
      quantity: 5,
    });
    assert.equal(r.perMeter, null, 'chapa não tem peso por metro linear');
    near(r.perPiece!, plateWeightPerPiece(2, 1200, 2000));
    near(r.perPiece!, 37.68);
    near(r.total!, 37.68 * 5);
    near(r.perSquareMeter!, plateWeightPerSquareMeter(2));
    near(r.perSquareMeter!, 15.7);
  });

  it('o comprimento em metros é IGNORADO na chapa', () => {
    // O comprimento da chapa é um parâmetro em mm; o campo de metros não se
    // aplica e não pode alterar o resultado.
    const semMetros = calculate(perfil('chapa'), {
      values: { thickness: 3, width: 1000, length: 2000 },
    });
    const comMetros = calculate(perfil('chapa'), {
      values: { thickness: 3, width: 1000, length: 2000 },
      lengthMeters: 99,
    });
    assert.deepEqual(semMetros, comMetros);
  });
});

describe('resultado incompleto', () => {
  it('falta parâmetro: devolve incompleto, NÃO zero', () => {
    const r = calculate(perfil('tubo-redondo'), { values: { outerDiameter: 30 } });
    assert.equal(r.incomplete, true);
    assert.equal(r.perMeter, null, 'zero pareceria resultado e poderia ser anotado como tal');
  });

  it('valor zero ou negativo é incompleto', () => {
    for (const wall of [0, -2]) {
      const r = calculate(perfil('tubo-redondo'), { values: { outerDiameter: 30, wall } });
      assert.equal(r.incomplete, true, `parede ${wall} deveria ser incompleta`);
    }
  });

  it('perfil sem fórmula nunca calcula', () => {
    const r = calculate(perfil('perfil-i'), { values: { height: 200 }, lengthMeters: 6 });
    assert.equal(r.incomplete, true);
    assert.equal(r.perMeter, null);
  });

  it('sem comprimento, há peso por metro mas não por peça', () => {
    const r = calculate(perfil('barra-chata'), { values: { width: 50, thickness: 6 } });
    assert.equal(r.incomplete, false);
    near(r.perMeter!, 2.355);
    assert.equal(r.perPiece, null);
    assert.equal(r.total, null);
  });

  it('quantidade ausente conta como 1', () => {
    const r = calculate(perfil('barra-chata'), {
      values: { width: 50, thickness: 6 },
      lengthMeters: 6,
    });
    near(r.total!, r.perPiece!);
  });

  it('quantidade decimal é truncada — não existe meia barra', () => {
    const r = calculate(perfil('barra-chata'), {
      values: { width: 50, thickness: 6 },
      lengthMeters: 1,
      quantity: 3.9,
    });
    near(r.total!, 2.355 * 3);
  });
});

describe('estado na URL', () => {
  it('ida e volta preserva perfil, medidas, comprimento e quantidade', () => {
    const p = perfil('tubo-retangular');
    const input = {
      values: { base: 50, height: 30, wall: 2 },
      lengthMeters: 6,
      quantity: 12,
    };

    const params = toSearchParams(p, input);
    const volta = fromSearchParams(params);

    assert.equal(volta.profile?.slug, 'tubo-retangular');
    assert.deepEqual(volta.input.values, input.values);
    assert.equal(volta.input.lengthMeters, 6);
    assert.equal(volta.input.quantity, 12);
  });

  it('as chaves ficam curtas, para o link caber numa mensagem', () => {
    const params = toSearchParams(perfil('tubo-redondo'), {
      values: { outerDiameter: 30, wall: 2 },
      lengthMeters: 6,
    });
    assert.equal(params.toString(), 'perfil=tubo-redondo&d=30&e=2&m=6');
  });

  it('quantidade 1 não vai para a URL, para não poluir', () => {
    const params = toSearchParams(perfil('barra-redonda'), {
      values: { diameter: 20 },
      quantity: 1,
    });
    assert.equal(params.has('q'), false);
  });

  it('aceita vírgula decimal — quem digita no celular usa vírgula', () => {
    const volta = fromSearchParams(new URLSearchParams('perfil=tubo-redondo&d=25,4&e=1,2'));
    assert.equal(volta.input.values.outerDiameter, 25.4);
    assert.equal(volta.input.values.wall, 1.2);
  });

  it('perfil desconhecido não quebra: devolve undefined', () => {
    const volta = fromSearchParams(new URLSearchParams(`${URL_PROFILE_KEY}=nao-existe&d=30`));
    assert.equal(volta.profile, undefined);
    assert.deepEqual(volta.input.values, {});
  });

  it('valor inválido é descartado em vez de virar NaN', () => {
    const volta = fromSearchParams(new URLSearchParams('perfil=tubo-redondo&d=abc&e=-5'));
    assert.deepEqual(volta.input.values, {});
  });

  it('URL de um cálculo compartilhado reproduz o mesmo resultado', () => {
    const original = calculate(perfil('cantoneira'), {
      values: { leg1: 50, leg2: 50, thickness: 5 },
      lengthMeters: 6,
      quantity: 4,
    });

    const params = toSearchParams(perfil('cantoneira'), {
      values: { leg1: 50, leg2: 50, thickness: 5 },
      lengthMeters: 6,
      quantity: 4,
    });
    const volta = fromSearchParams(params);
    const reproduzido = calculate(volta.profile!, volta.input);

    assert.deepEqual(reproduzido, original);
  });
});

describe('item da lista de orçamento', () => {
  it('quem veio da página do produto pede o PRODUTO, não o perfil genérico', () => {
    // Sem isto a Aldifer recebe "Chapa" e tem de ligar para saber se é fina a
    // frio, fina a quente ou grossa — a objeção nº 1 recriada no formulário.
    const item = buildQuoteItem(
      perfil('chapa'),
      { values: { thickness: 2, width: 1200, length: 2000 }, quantity: 5 },
      { slug: 'chapa-fina-a-frio', name: 'Chapa Fina a Frio' },
    );

    assert.equal(item?.productSlug, 'chapa-fina-a-frio');
    assert.equal(item?.productName, 'Chapa Fina a Frio');
    assert.equal(item?.dimension, '2 mm · 1200 × 2000 mm');
    assert.equal(item?.quantity, 5);
    assert.equal(item?.unit, 'chapa');
  });

  it('sem produto de origem, cai no nome do perfil', () => {
    const item = buildQuoteItem(perfil('barra-chata'), {
      values: { width: 50, thickness: 6 },
      lengthMeters: 6,
    });

    assert.equal(item?.productSlug, 'barra-chata');
    assert.equal(item?.productName, 'Barra chata');
    assert.equal(item?.length, '6 m');
    assert.equal(item?.unit, 'barra');
  });

  it('chapa NÃO leva comprimento em metros — ele já está na medida', () => {
    // O campo de metros fica escondido no perfil chapa. Mandar o valor dele
    // resultaria em "Comprimento: 6 m" numa chapa de 2000 mm.
    const item = buildQuoteItem(perfil('chapa'), {
      values: { thickness: 2, width: 1200, length: 2000 },
      lengthMeters: 6,
    });

    assert.equal(item?.length, undefined);
    assert.ok(item?.dimension.includes('2000'), 'a medida da chapa traz o comprimento em mm');
  });

  it('cálculo incompleto não gera item', () => {
    assert.equal(buildQuoteItem(perfil('tubo-redondo'), { values: { outerDiameter: 30 } }), null);
  });

  it('perfil sem fórmula não gera item', () => {
    const item = buildQuoteItem(perfil('perfil-i'), { values: {}, lengthMeters: 6, quantity: 3 });
    assert.equal(item, null);
  });

  it('quantidade decimal é truncada — não se pede meia barra', () => {
    const item = buildQuoteItem(perfil('barra-redonda'), {
      values: { diameter: 20 },
      lengthMeters: 6,
      quantity: 2.7,
    });
    assert.equal(item?.quantity, 2);
  });

  it('a medida sai idêntica à do catálogo, para o pedido ficar indistinguível', () => {
    const item = buildQuoteItem(perfil('tubo-quadrado'), {
      values: { side: 30, wall: 2 },
      lengthMeters: 6,
    });
    const doCalculo = calculate(perfil('tubo-quadrado'), {
      values: { side: 30, wall: 2 },
      lengthMeters: 6,
    });
    assert.equal(item?.dimension, doCalculo.dimension);
  });
});

describe('DEFAULT_PROFILE_SLUG', () => {
  it('aponta para um perfil que existe no registro', () => {
    const perfilPadrao = findProfile(DEFAULT_PROFILE_SLUG);
    assert.ok(perfilPadrao, `DEFAULT_PROFILE_SLUG "${DEFAULT_PROFILE_SLUG}" nao esta no registro`);
    assert.equal(perfilPadrao.slug, DEFAULT_PROFILE_SLUG);
  });

  it('o perfil padrao tem formula e campos, para a pagina abrir util sem JS', () => {
    // O WeightCalculator renderiza VISIVEL o grupo de campos e o desenho deste
    // perfil. Se o padrao fosse um perfil sem formula, quem chega sem
    // JavaScript veria a explicacao de "nao ha calculo" em vez da calculadora.
    const perfilPadrao = findProfile(DEFAULT_PROFILE_SLUG);
    assert.ok(perfilPadrao?.formula, 'o perfil padrao precisa ter formula');
    assert.ok(perfilPadrao.params.length > 0, 'o perfil padrao precisa ter campos');
  });
});

describe('profileForFormula', () => {
  it('liga a fórmula de um produto ao perfil da calculadora', () => {
    assert.equal(profileForFormula('square-tube')?.slug, 'tubo-quadrado');
    assert.equal(profileForFormula('plate-piece')?.slug, 'chapa');
  });

  it('fórmula ausente devolve undefined', () => {
    assert.equal(profileForFormula(undefined), undefined);
  });
});
