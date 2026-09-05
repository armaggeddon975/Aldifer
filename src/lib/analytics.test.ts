/**
 * Testes do disparo de evento de conversão.
 *
 * O risco que cobrem: `orcamento_enviado` é O contador do site — o CLAUDE.md
 * define o sucesso do projeto como "pedidos de orçamento estruturados
 * recebidos". Se `track` lançar exceção, ela sobe pelo caminho de SUCESSO do
 * formulário e a confirmação do pedido nunca aparece na tela: o cliente veria
 * o botão travado em "Enviando…" e um pedido que de fato chegou pareceria
 * perdido. Uma métrica jamais pode custar isso.
 *
 * A fila é testada porque ela mudou de lugar na Etapa 9: era um <script>
 * inline no HTML, como a documentação do Plausible sugere, e a CSP a
 * BLOQUEAVA — o Astro só hasheia os scripts que ele processa.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { EVENTS, track } from './analytics.ts';

/** O módulo fala com `window`, que não existe no Node. */
const comWindow = (inicial?: unknown) => {
  const w = { plausible: inicial } as Record<string, unknown>;
  (globalThis as Record<string, unknown>).window = w;
  return w;
};

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe('nomes de evento', () => {
  it('a conversão do site tem o nome que o PROMPTS.md fixou', () => {
    // Renomear isto quebra a métrica em silêncio: o Plausible passa a contar
    // um evento novo e o painel mostra zero no antigo, sem erro nenhum.
    assert.equal(EVENTS.quoteSent, 'orcamento_enviado');
    assert.equal(EVENTS.contactSent, 'contato_enviado');
  });
});

describe('track sem analytics carregado', () => {
  it('cria a fila e enfileira o evento', () => {
    const w = comWindow(undefined);

    track(EVENTS.quoteSent, { medidas: 3 });

    const fila = w.plausible as { q?: unknown[] };
    assert.equal(typeof w.plausible, 'function');
    assert.deepEqual(fila.q, [['orcamento_enviado', { props: { medidas: 3 } }]]);
  });

  it('acumula mais de um evento na mesma fila', () => {
    const w = comWindow(undefined);

    track(EVENTS.quoteSent);
    track(EVENTS.contactSent);

    assert.equal((w.plausible as { q: unknown[] }).q.length, 2);
  });

  it('sem props, não manda a chave props vazia', () => {
    const w = comWindow(undefined);

    track(EVENTS.contactSent);

    assert.deepEqual((w.plausible as { q: unknown[] }).q, [['contato_enviado', undefined]]);
  });
});

describe('track com o script do Plausible já carregado', () => {
  it('chama a função real em vez de enfileirar', () => {
    const recebidos: unknown[][] = [];
    const w = comWindow((...args: unknown[]) => recebidos.push(args));

    track(EVENTS.quoteSent, { medidas: 12 });

    assert.deepEqual(recebidos, [['orcamento_enviado', { props: { medidas: 12 } }]]);
    // Não substituiu a função real por uma fila.
    assert.equal((w.plausible as { q?: unknown[] }).q, undefined);
  });
});

describe('track NUNCA lança', () => {
  it('sobrevive a window inexistente', () => {
    delete (globalThis as Record<string, unknown>).window;
    assert.doesNotThrow(() => track(EVENTS.quoteSent));
  });

  it('sobrevive a um plausible que lança', () => {
    comWindow(() => {
      throw new Error('bloqueador de anúncio quebrou o script');
    });

    // É este o caso que justifica o try/catch: se a exceção subisse, ela
    // subiria pelo caminho de sucesso do formulário e esconderia a
    // confirmação de um pedido que JÁ foi recebido pelo servidor.
    assert.doesNotThrow(() => track(EVENTS.quoteSent));
  });

  it('sobrevive a um plausible que não é função', () => {
    comWindow('isto não é função');
    assert.doesNotThrow(() => track(EVENTS.contactSent));
  });
});
