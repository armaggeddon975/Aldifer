/**
 * Testes do limite de envios.
 *
 * A janela é de uma hora, então os testes passam o `now` à mão em vez de
 * esperar — um teste que dorme uma hora não roda.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { checkRateLimit, clientIp, resetRateLimit } from './rate-limit.ts';

const HORA = 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

beforeEach(resetRateLimit);

describe('checkRateLimit', () => {
  it('aceita os 5 primeiros e recusa o 6º', () => {
    for (let i = 1; i <= 5; i += 1) {
      const r = checkRateLimit('1.1.1.1', T0 + i);
      assert.equal(r.allowed, true, `envio ${i} deveria passar`);
      assert.equal(r.remaining, 5 - i);
    }

    const sexto = checkRateLimit('1.1.1.1', T0 + 6);
    assert.equal(sexto.allowed, false);
    assert.equal(sexto.remaining, 0);
    assert.ok(sexto.retryAfterSeconds > 0, 'deveria dizer quando tentar de novo');
  });

  it('o tempo de espera cabe na janela de uma hora', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('2.2.2.2', T0);
    const r = checkRateLimit('2.2.2.2', T0);
    assert.ok(r.retryAfterSeconds <= 3600, `esperava <= 3600, veio ${r.retryAfterSeconds}`);
  });

  it('libera depois da janela', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('3.3.3.3', T0);
    assert.equal(checkRateLimit('3.3.3.3', T0).allowed, false);

    // Uma hora e um milissegundo depois, os 5 antigos saíram da janela.
    assert.equal(checkRateLimit('3.3.3.3', T0 + HORA + 1).allowed, true);
  });

  it('a janela é deslizante, não fixa', () => {
    // 5 envios espalhados na primeira meia hora
    for (let i = 0; i < 5; i += 1) checkRateLimit('4.4.4.4', T0 + i * 60_000);
    // Aos 40 minutos ainda está bloqueado: o primeiro envio não completou 1h.
    assert.equal(checkRateLimit('4.4.4.4', T0 + 40 * 60_000).allowed, false);
    // Passada 1h do PRIMEIRO, abre uma vaga.
    assert.equal(checkRateLimit('4.4.4.4', T0 + HORA + 1).allowed, true);
  });

  it('IPs diferentes não interferem entre si', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('5.5.5.5', T0);
    assert.equal(checkRateLimit('5.5.5.5', T0).allowed, false);
    assert.equal(checkRateLimit('6.6.6.6', T0).allowed, true);
  });

  it('IP desconhecido é tratado como um IP qualquer, não liberado', () => {
    for (let i = 0; i < 5; i += 1) checkRateLimit('desconhecido', T0);
    assert.equal(checkRateLimit('desconhecido', T0).allowed, false);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://exemplo.com/api/orcamento', { headers });

  it('pega o PRIMEIRO da cadeia de x-forwarded-for', () => {
    // O primeiro é o cliente; os seguintes são proxies.
    assert.equal(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' })), '203.0.113.7');
  });

  it('apara o espaço', () => {
    assert.equal(clientIp(req({ 'x-forwarded-for': '  203.0.113.7  ' })), '203.0.113.7');
  });

  it('cai em x-real-ip quando não há forwarded', () => {
    assert.equal(clientIp(req({ 'x-real-ip': '198.51.100.9' })), '198.51.100.9');
  });

  it('sem cabeçalho nenhum, devolve marcador em vez de string vazia', () => {
    // String vazia colidiria todos os clientes sem cabeçalho no mesmo balde
    // de forma silenciosa; o marcador deixa isso explícito no log.
    assert.equal(clientIp(req({})), 'desconhecido');
  });
});
