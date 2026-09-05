/**
 * Testes do mapa de redirects.
 *
 * O risco: o CLAUDE.md chama a perda do histórico de indexação de "maior causa
 * de queda de tráfego pós-redesenho". São 117 URLs `.php` indexadas, e um erro
 * aqui não aparece em build nem em type check — aparece semanas depois, no
 * Search Console, como queda de cobertura.
 *
 * O script scripts/check-redirects.ts confere o RESULTADO no vercel.json. Estes
 * testes conferem as REGRAS, incluindo os casos que ninguém repara.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EXPLICIT_MAP,
  FALLBACK,
  RADICAL_RULES,
  buildRedirects,
  findProblems,
  intendedTarget,
} from './redirects.ts';

/** As rotas que o build gera hoje, com os 27 produtos em rascunho. */
const ROTAS_HOJE = new Set([
  '/',
  '/empresa',
  '/contato',
  '/orcamento',
  '/produtos',
  '/produtos/barras',
  '/produtos/tubos',
  '/produtos/chapas',
  '/produtos/perfis',
  '/produtos/telas',
  '/produtos/diversos',
  '/calculadora-de-peso',
]);

/** As rotas depois de a planilha da Aldifer chegar e os produtos saírem. */
const ROTAS_COM_PRODUTOS = new Set([
  ...ROTAS_HOJE,
  '/produtos/barras/barra-chata',
  '/produtos/perfis/cantoneira',
  '/produtos/perfis/perfil-u',
  '/produtos/chapas/chapa-xadrez',
  '/produtos/diversos/telha-galvanizada',
]);

describe('ordem das regras por radical', () => {
  it('cantoneira vem ANTES de perfil, senão perfil-cantoneira erra o destino', () => {
    // O CONTEUDO.md lista "viga ou perfil" antes de "cantoneira", mas o mapa
    // explícito DELE MESMO manda /perfil-cantoneira.php para a cantoneira.
    // As duas coisas se contradizem; a leitura que resolve é mais específico
    // primeiro. Este teste é o que impede alguém de "corrigir" a ordem de
    // volta para o que está escrito lá.
    const iCantoneira = RADICAL_RULES.findIndex((r) => r.match === 'cantoneira');
    const iPerfil = RADICAL_RULES.findIndex((r) => r.match === 'perfil');
    const iViga = RADICAL_RULES.findIndex((r) => r.match === 'viga');

    assert.ok(iCantoneira < iPerfil, 'cantoneira tem de vir antes de perfil');
    assert.ok(iCantoneira < iViga, 'cantoneira tem de vir antes de viga');

    assert.equal(
      intendedTarget('/perfil-cantoneira-preco.php').to,
      '/produtos/perfis/cantoneira',
    );
  });

  it('"telha" NÃO cai na regra de "tela"', () => {
    // t-e-l-h-a não contém t-e-l-a como substring, mas é o tipo de coincidência
    // que parece bug e alguém "consertaria" com uma regex frouxa.
    assert.equal(
      intendedTarget('/telhas-galvanizadas-no-abc.php').to,
      '/produtos/diversos/telha-galvanizada',
    );
    assert.equal(intendedTarget('/tela-galvanizada.php').to, '/produtos/telas');
  });

  it('a extensão .php não interfere no casamento do radical', () => {
    assert.equal(intendedTarget('/tubos-de-aco-no-abc.php').to, '/produtos/tubos');
  });

  it('quem não casa com radical nenhum vai para o catálogo', () => {
    for (const url of [
      '/distribuidora-de-ferro-e-aco.php',
      '/comercio-de-ferro-e-aco-em-sao-bernardo.php',
      '/empresa-de-ferro-e-aco-no-abc.php',
      '/ferro-e-aco-em-sp.php',
      '/ferro-galvanizado-preco.php',
    ]) {
      const r = intendedTarget(url);
      assert.equal(r.to, FALLBACK, url);
      assert.equal(r.source, 'fallback');
    }
  });

  it('o mapa explícito tem precedência sobre o radical', () => {
    // /barras.php contém "barra" e iria para /produtos/barras pelo radical —
    // que por acaso é o mesmo destino. Um caso onde a precedência MUDA o
    // resultado: /chapa-antiderrapante.php.
    assert.equal(intendedTarget('/chapa-antiderrapante.php').source, 'explicito');
    assert.equal(intendedTarget('/chapa-antiderrapante.php').to, '/produtos/chapas/chapa-xadrez');
    assert.equal(intendedTarget('/chapa-de-ferro-preco.php').source, 'radical');
  });

  it('/responsivo.php vai para a home, não para o catálogo', () => {
    // Página vazia do site antigo: título vazio e o único h2 com display:none.
    // Mandá-la para /produtos daria a ela um destino comercial que nunca teve.
    assert.equal(intendedTarget('/responsivo.php').to, '/');
  });
});

describe('rebaixamento quando o destino não existe', () => {
  it('produto em rascunho cai na CATEGORIA, não em 404', () => {
    const [r] = buildRedirects(['/barra-chata.php'], ROTAS_HOJE);

    assert.equal(r?.to, '/produtos/barras');
    assert.equal(r?.intended, '/produtos/barras/barra-chata');
  });

  it('com os produtos publicados, o destino é o produto', () => {
    const [r] = buildRedirects(['/barra-chata.php'], ROTAS_COM_PRODUTOS);

    assert.equal(r?.to, '/produtos/barras/barra-chata');
    assert.equal(r?.intended, undefined, 'sem rebaixamento, sem campo intended');
  });

  it('desce até a home se nem a categoria existir', () => {
    const [r] = buildRedirects(['/barra-chata.php'], new Set(['/']));
    assert.equal(r?.to, '/');
  });

  it('NUNCA devolve destino fora das rotas existentes', () => {
    // É a garantia que importa: 301 para 404 é pior que 404 direto, porque o
    // Google registra soft 404 e ainda segue o redirecionamento.
    const todas = Object.keys(EXPLICIT_MAP);
    for (const r of buildRedirects(todas, ROTAS_HOJE)) {
      assert.ok(ROTAS_HOJE.has(r.to), `${r.from} → ${r.to}, que não existe`);
    }
  });
});

describe('cobertura', () => {
  it('toda URL da lista recebe exatamente um redirect', () => {
    const entrada = ['/barras.php', '/tubos.php', '/algo-desconhecido.php'];
    const saida = buildRedirects(entrada, ROTAS_HOJE);

    assert.equal(saida.length, 3);
    assert.deepEqual(
      saida.map((r) => r.from),
      entrada,
    );
  });

  it('entrada duplicada gera um redirect só', () => {
    const saida = buildRedirects(['/barras.php', '/barras.php'], ROTAS_HOJE);
    assert.equal(saida.length, 1);
  });

  it('todo destino do mapa explícito é rota do site novo, nunca .php', () => {
    for (const [de, para] of Object.entries(EXPLICIT_MAP)) {
      assert.match(de, /\.php$/, `origem ${de} deveria terminar em .php`);
      assert.doesNotMatch(para, /\.php$/, `destino ${para} não pode ser .php`);
      assert.match(para, /^\//, `destino ${para} tem de ser caminho absoluto`);
    }
  });
});

describe('problemas que o aceite proíbe', () => {
  it('não acha problema onde não há', () => {
    const saida = buildRedirects(['/barras.php', '/tubos.php'], ROTAS_HOJE);
    assert.deepEqual(findProblems(saida, ROTAS_HOJE), []);
  });

  it('detecta CADEIA (A→B→C)', () => {
    const cadeia = [
      { from: '/a.php', to: '/b.php', source: 'explicito' as const },
      { from: '/b.php', to: '/produtos', source: 'explicito' as const },
    ];
    const rotas = new Set(['/produtos', '/b.php']);

    const problemas = findProblems(cadeia, rotas);
    assert.ok(
      problemas.some((p) => p.kind === 'cadeia'),
      `esperava cadeia, veio ${JSON.stringify(problemas)}`,
    );
  });

  it('detecta LOOP', () => {
    const loop = [{ from: '/a.php', to: '/a.php', source: 'explicito' as const }];
    const problemas = findProblems(loop, new Set(['/a.php']));
    assert.ok(problemas.some((p) => p.kind === 'loop'));
  });

  it('detecta destino inexistente', () => {
    const ruim = [{ from: '/a.php', to: '/nao-existe', source: 'explicito' as const }];
    const problemas = findProblems(ruim, ROTAS_HOJE);
    assert.ok(problemas.some((p) => p.kind === 'destino-inexistente'));
  });

  it('detecta origem duplicada', () => {
    const dup = [
      { from: '/a.php', to: '/produtos', source: 'explicito' as const },
      { from: '/a.php', to: '/produtos/barras', source: 'radical' as const },
    ];
    const problemas = findProblems(dup, ROTAS_HOJE);
    assert.ok(problemas.some((p) => p.kind === 'origem-duplicada'));
  });
});
