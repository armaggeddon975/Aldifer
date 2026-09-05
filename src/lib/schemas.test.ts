/**
 * Testes do schema do pedido de orçamento.
 *
 * Este schema é a única defesa de integridade do endpoint, e ele roda nos dois
 * lados. Os casos de telefone são os que mais importam: o serralheiro digita
 * do jeito dele, e recusar um número válido por causa de máscara perde o lead
 * exatamente no último passo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { digitsOf, fieldErrors, quoteRequestSchema } from './schemas.ts';

const item = {
  productSlug: 'barra-chata',
  productName: 'Barra Chata',
  dimension: '50 × 6 mm',
  length: '6 m',
  quantity: 2,
  unit: 'barra' as const,
};

const valido = {
  name: 'Diego Alvite',
  company: 'Serralheria Alvarengas',
  email: 'diego@serralheria.com.br',
  phone: '(11) 94344-1919',
  city: 'São Bernardo do Campo',
  notes: 'Cortar em 3 m se possível',
  consent: true as const,
  website: '' as const,
  loadedAt: Date.now(),
  items: [item],
};

const erroDe = (patch: Record<string, unknown>) => {
  const result = quoteRequestSchema.safeParse({ ...valido, ...patch });
  assert.equal(result.success, false, 'esperava falha de validação');
  return fieldErrors(result.error!);
};

describe('pedido válido', () => {
  it('aceita o caso completo', () => {
    const result = quoteRequestSchema.safeParse(valido);
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  });

  it('aceita sem os campos opcionais', () => {
    const { company, city, notes, ...minimo } = valido;
    assert.equal(quoteRequestSchema.safeParse(minimo).success, true);
  });

  it('apara espaço em volta do nome', () => {
    const result = quoteRequestSchema.safeParse({ ...valido, name: '  Diego  ' });
    assert.equal(result.data?.name, 'Diego');
  });
});

describe('telefone — o serralheiro digita do jeito dele', () => {
  const aceitos = [
    '(11) 94344-1919',
    '11943441919',
    '11 94344 1919',
    '+55 11 94344-1919',
    '+5511943441919',
    '(11) 4344-1919',
    '1143441919',
  ];

  for (const numero of aceitos) {
    it(`aceita ${numero}`, () => {
      assert.equal(quoteRequestSchema.safeParse({ ...valido, phone: numero }).success, true);
    });
  }

  const recusados = ['4344-1919', '11 9434', '999999999999999', 'telefone'];

  for (const numero of recusados) {
    it(`recusa ${JSON.stringify(numero)}`, () => {
      const erros = erroDe({ phone: numero });
      assert.match(erros.phone ?? '', /DDD/);
    });
  }

  it('a mensagem diz o que fazer, não "campo inválido"', () => {
    const erros = erroDe({ phone: '123' });
    assert.match(erros.phone ?? '', /\(11\) 94344-1919/);
    assert.doesNotMatch(erros.phone ?? '', /inválido/i);
  });
});

describe('digitsOf', () => {
  it('deixa só os dígitos', () => {
    assert.equal(digitsOf('(11) 94344-1919'), '11943441919');
    assert.equal(digitsOf('+55 11 4344 1919'), '551143441919');
  });
});

describe('e-mail', () => {
  it('aceita endereço comum', () => {
    for (const email of ['a@b.co', 'nome.sobrenome@empresa.com.br', 'x+tag@dominio.io']) {
      assert.equal(quoteRequestSchema.safeParse({ ...valido, email }).success, true, email);
    }
  });

  it('recusa endereço sem arroba ou sem domínio', () => {
    for (const email of ['sem-arroba', 'a@', '@b.co', 'a b@c.co']) {
      const erros = erroDe({ email });
      assert.ok(erros.email, `deveria recusar ${email}`);
    }
  });

  it('a mensagem mostra um exemplo', () => {
    assert.match(erroDe({ email: 'x' }).email ?? '', /nome@empresa\.com\.br/);
  });
});

describe('nome', () => {
  it('recusa nome de uma letra', () => {
    assert.match(erroDe({ name: 'D' }).name ?? '', /nome/i);
  });

  it('recusa nome só de espaço', () => {
    assert.ok(erroDe({ name: '   ' }).name);
  });
});

describe('consentimento LGPD', () => {
  it('exige marcado', () => {
    assert.match(erroDe({ consent: false }).consent ?? '', /autoriza/i);
  });

  it('checkbox ausente também falha', () => {
    const { consent, ...semConsent } = valido;
    const result = quoteRequestSchema.safeParse(semConsent);
    assert.equal(result.success, false);
  });
});

describe('honeypot', () => {
  it('aceita vazio', () => {
    assert.equal(quoteRequestSchema.safeParse({ ...valido, website: '' }).success, true);
  });

  it('recusa qualquer conteúdo — é robô', () => {
    assert.equal(quoteRequestSchema.safeParse({ ...valido, website: 'http://spam' }).success, false);
  });
});

describe('lista de itens', () => {
  it('exige pelo menos uma medida', () => {
    assert.match(erroDe({ items: [] }).items ?? '', /vazia/i);
  });

  it('recusa quantidade zero ou negativa', () => {
    assert.equal(
      quoteRequestSchema.safeParse({ ...valido, items: [{ ...item, quantity: 0 }] }).success,
      false,
    );
    assert.equal(
      quoteRequestSchema.safeParse({ ...valido, items: [{ ...item, quantity: -1 }] }).success,
      false,
    );
  });

  it('recusa unidade fora da lista', () => {
    assert.equal(
      quoteRequestSchema.safeParse({ ...valido, items: [{ ...item, unit: 'tonelada' }] }).success,
      false,
    );
  });

  it('recusa lista absurdamente longa', () => {
    const muitos = Array.from({ length: 201 }, () => item);
    assert.equal(quoteRequestSchema.safeParse({ ...valido, items: muitos }).success, false);
  });
});

describe('loadedAt', () => {
  it('exige número positivo', () => {
    assert.equal(quoteRequestSchema.safeParse({ ...valido, loadedAt: 0 }).success, false);
    assert.equal(quoteRequestSchema.safeParse({ ...valido, loadedAt: 'agora' }).success, false);
  });
});

describe('fieldErrors', () => {
  it('devolve UMA mensagem por campo', () => {
    const result = quoteRequestSchema.safeParse({
      ...valido,
      name: '',
      email: 'x',
      phone: '1',
      consent: false,
    });
    const erros = fieldErrors(result.error!);

    assert.equal(Object.keys(erros).length, 4);
    for (const campo of ['name', 'email', 'phone', 'consent']) {
      assert.equal(typeof erros[campo], 'string', `faltou mensagem para ${campo}`);
    }
  });

  it('não inventa campo que passou', () => {
    const erros = erroDe({ email: 'x' });
    assert.equal(erros.name, undefined);
    assert.equal(erros.phone, undefined);
  });
});
