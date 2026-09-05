/**
 * Testes do e-mail que chega para a Aldifer.
 *
 * Este módulo não tinha teste até a Etapa 8, e a Etapa 8 o fez atender DOIS
 * tipos de envio — pedido de orçamento e mensagem de contato. O risco que
 * estes testes cobrem é o do e-mail sair errado sem ninguém notar: nada no
 * build nem no type check acusa um assunto que diz "0 medidas" numa mensagem
 * de contato, ou uma tabela de material só com cabeçalho.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Lead } from './lead-store.ts';
import {
  buildHtmlBody,
  buildSubject,
  buildTextBody,
  buildWhatsappText,
} from './quote-email.ts';

const BASE = {
  name: 'João da Silva',
  email: 'joao@serralheria.com.br',
  phone: '(11) 94344-1919',
  consent: true as const,
  receivedAt: '2026-09-05T12:00:00.000Z',
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0',
  fillSeconds: 42,
};

const orcamento = (extra: Partial<Lead> = {}): Lead => ({
  ...BASE,
  kind: 'orcamento',
  items: [
    {
      productSlug: 'barra-chata',
      productName: 'Barra chata',
      dimension: '50 × 6 mm',
      length: '6 m',
      quantity: 10,
      unit: 'barra',
    },
  ],
  ...extra,
});

const contato = (extra: Partial<Lead> = {}): Lead => ({
  ...BASE,
  kind: 'contato',
  items: [],
  notes: 'Vocês fazem corte sob medida em chapa de 3 mm?',
  ...extra,
});

describe('assunto', () => {
  it('orçamento traz a contagem de medidas', () => {
    assert.equal(
      buildSubject(orcamento(), []),
      'Pedido de orçamento: João da Silva (1 medida)',
    );
  });

  it('pluraliza a contagem', () => {
    const lead = orcamento();
    const duas: Lead = { ...lead, items: [...lead.items, ...lead.items] };
    assert.match(buildSubject(duas, []), /\(2 medidas\)/);
  });

  it('empresa entra no assunto quando informada', () => {
    assert.match(buildSubject(orcamento({ company: 'Serralheria ABC' }), []), /— Serralheria ABC/);
  });

  it('contato NÃO diz "0 medidas" — não há lista para procurar', () => {
    const assunto = buildSubject(contato(), []);
    assert.equal(assunto, 'Mensagem de contato: João da Silva');
    assert.doesNotMatch(assunto, /medida/);
  });

  it('o aviso de degradação é carimbado na frente, onde não passa batido', () => {
    const assunto = buildSubject(orcamento(), ['sem-persistencia']);
    assert.ok(assunto.startsWith('[LEAD NÃO GRAVADO]'), assunto);
  });

  it('dois avisos aparecem juntos', () => {
    const assunto = buildSubject(contato(), ['sem-persistencia', 'sem-antispam']);
    assert.match(assunto, /LEAD NÃO GRAVADO · SEM VERIFICAÇÃO ANTI-SPAM/);
  });
});

describe('corpo em texto', () => {
  it('orçamento traz a tabela de material', () => {
    const texto = buildTextBody(orcamento(), []);
    assert.match(texto, /PEDIDO DE ORÇAMENTO/);
    assert.match(texto, /MATERIAL PEDIDO/);
    assert.match(texto, /PRODUTO {2,}MEDIDA/, 'a tabela alinha em colunas');
    assert.match(texto, /Barra chata/);
    assert.match(texto, /50 × 6 mm · 6 m/);
  });

  it('contato NÃO traz tabela de material', () => {
    const texto = buildTextBody(contato(), []);
    assert.match(texto, /MENSAGEM DE CONTATO/);
    assert.doesNotMatch(texto, /MATERIAL PEDIDO/);
    assert.doesNotMatch(texto, /PRODUTO/);
  });

  it('no contato o bloco de texto livre se chama MENSAGEM, não observações', () => {
    const texto = buildTextBody(contato(), []);
    assert.match(texto, /^MENSAGEM$/m);
    assert.match(texto, /corte sob medida/);
  });

  it('no orçamento continua sendo OBSERVAÇÕES DO CLIENTE', () => {
    const texto = buildTextBody(orcamento({ notes: 'Retiro no sábado.' }), []);
    assert.match(texto, /OBSERVAÇÕES DO CLIENTE/);
  });

  it('campos opcionais ausentes não deixam linha vazia', () => {
    const texto = buildTextBody(orcamento(), []);
    assert.doesNotMatch(texto, /Empresa:/);
    assert.doesNotMatch(texto, /Cidade:/);
  });

  it('tempo não medido não sai como "-1s"', () => {
    // -1 é a sentinela do envio sem JavaScript, onde ninguém cronometrou.
    // "-1s" no rodapé faria a Aldifer achar que o dado está corrompido.
    const semJs = buildTextBody(contato({ fillSeconds: -1 }), []);
    assert.doesNotMatch(semJs, /-1s/);
    assert.match(semJs, /não medido \(envio sem JavaScript\)/);

    const comJs = buildTextBody(contato({ fillSeconds: 42 }), []);
    assert.match(comJs, /Tempo de preenchimento: 42s/);
  });

  it('o rodapé diz que responder vai para o cliente', () => {
    assert.match(buildTextBody(contato(), []), /Responder a este e-mail vai direto para o cliente/);
  });
});

describe('corpo em HTML', () => {
  it('escapa HTML vindo do visitante', () => {
    const malicioso = contato({
      name: '<script>alert(1)</script>',
      notes: 'Chapa de 3" & cantoneira <25>',
    });
    const html = buildHtmlBody(malicioso, []);

    assert.doesNotMatch(html, /<script>alert/, 'o nome não pode sair como tag');
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /3&quot; &amp; cantoneira &lt;25&gt;/);
  });

  it('contato não gera a tabela de material', () => {
    const html = buildHtmlBody(contato(), []);
    assert.doesNotMatch(html, /Material pedido/);
    assert.doesNotMatch(html, /<thead>/);
  });

  it('orçamento gera uma linha de tabela por item', () => {
    const lead = orcamento();
    const tres: Lead = { ...lead, items: [...lead.items, ...lead.items, ...lead.items] };
    const html = buildHtmlBody(tres, []);
    assert.match(html, /Material pedido/);
    assert.equal(html.match(/<tbody>/g)?.length, 1);
    assert.equal(html.match(/Barra chata/g)?.length, 3);
  });

  it('o título do HTML acompanha o tipo', () => {
    assert.match(buildHtmlBody(orcamento(), []), /<h1[^>]*>Pedido de orçamento<\/h1>/);
    assert.match(buildHtmlBody(contato(), []), /<h1[^>]*>Mensagem de contato<\/h1>/);
  });

  it('o aviso de degradação aparece antes do título', () => {
    const html = buildHtmlBody(orcamento(), ['sem-persistencia']);
    assert.ok(html.indexOf('NÃO foi gravado') < html.indexOf('<h1'), 'aviso tem de vir primeiro');
  });
});

describe('texto do WhatsApp', () => {
  it('orçamento lista os itens em linhas', () => {
    const texto = buildWhatsappText(orcamento());
    assert.match(texto, /^Pedido de orçamento — João da Silva$/m);
    assert.match(texto, /• Barra chata · 50 × 6 mm · 6 m · 10 barra/);
  });

  it('contato não inventa item nenhum', () => {
    const texto = buildWhatsappText(contato());
    assert.match(texto, /^Mensagem de contato — João da Silva$/m);
    assert.doesNotMatch(texto, /•/);
    assert.match(texto, /corte sob medida/);
  });
});
