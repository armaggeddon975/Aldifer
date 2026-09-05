import type { Lead } from './lead-store';

/**
 * Monta o e-mail do pedido de orçamento.
 *
 * Duas versões, texto e HTML. O texto não é enfeite: melhora entrega, é o que
 * alguns clientes de e-mail mostram, e é o que se lê melhor num celular no
 * balcão. A lista vai em tabela nas duas.
 *
 * Módulo puro, sem dependência de rede — o envio fica no endpoint.
 */

/** Aviso de degradação a carimbar no assunto, para não passar em branco. */
export type EmailWarning = 'sem-persistencia' | 'sem-antispam';

const WARNING_LABEL: Record<EmailWarning, string> = {
  'sem-persistencia': 'LEAD NÃO GRAVADO',
  'sem-antispam': 'SEM VERIFICAÇÃO ANTI-SPAM',
};

export function buildSubject(lead: Lead, warnings: readonly EmailWarning[]): string {
  const who = lead.company ? `${lead.name} — ${lead.company}` : lead.name;
  const count = lead.items.length;
  const base = `Pedido de orçamento: ${who} (${count} ${count === 1 ? 'medida' : 'medidas'})`;

  if (warnings.length === 0) return base;
  return `[${warnings.map((w) => WARNING_LABEL[w]).join(' · ')}] ${base}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemLine(item: Lead['items'][number]): string {
  const parts = [
    item.productName,
    item.dimension,
    item.length ?? '',
    `${item.quantity} ${item.unit}`,
  ].filter(Boolean);
  return parts.join(' · ') + (item.note ? ` — ${item.note}` : '');
}

/** Alinha em colunas de largura fixa, para a tabela se ler em fonte mono. */
function textTable(items: Lead['items']): string {
  const rows = items.map((item) => [
    item.productName,
    item.dimension + (item.length ? ` · ${item.length}` : ''),
    `${item.quantity} ${item.unit}`,
    item.note ?? '',
  ]);

  const head = ['PRODUTO', 'MEDIDA', 'QTD', 'OBSERVAÇÃO'];
  const all = [head, ...rows];
  const widths = head.map((_, column) =>
    Math.max(...all.map((row) => (row[column] ?? '').length)),
  );

  const line = (row: readonly string[]) =>
    row.map((cell, i) => (cell ?? '').padEnd(widths[i] ?? 0)).join('  ').trimEnd();

  return [line(head), widths.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n');
}

export function buildTextBody(lead: Lead, warnings: readonly EmailWarning[]): string {
  const blocks: string[] = [];

  if (warnings.length > 0) {
    blocks.push(
      warnings
        .map((w) =>
          w === 'sem-persistencia'
            ? '! ATENÇÃO: este pedido NÃO foi gravado no destino de leads. Responda a partir deste e-mail e não perca o contato.'
            : '! ATENÇÃO: a verificação anti-spam estava desligada quando este pedido chegou.',
        )
        .join('\n'),
    );
  }

  blocks.push(
    [
      'PEDIDO DE ORÇAMENTO',
      '',
      `Nome:     ${lead.name}`,
      lead.company ? `Empresa:  ${lead.company}` : null,
      `E-mail:   ${lead.email}`,
      `Telefone: ${lead.phone}`,
      lead.city ? `Cidade:   ${lead.city}` : null,
      `Recebido: ${lead.receivedAt}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  blocks.push(['MATERIAL PEDIDO', '', textTable(lead.items)].join('\n'));

  if (lead.notes) blocks.push(['OBSERVAÇÕES DO CLIENTE', '', lead.notes].join('\n'));

  blocks.push(
    [
      '---',
      'Responder a este e-mail vai direto para o cliente.',
      `Tempo de preenchimento: ${lead.fillSeconds}s · IP: ${lead.ip ?? 'desconhecido'}`,
    ].join('\n'),
  );

  return blocks.join('\n\n');
}

export function buildHtmlBody(lead: Lead, warnings: readonly EmailWarning[]): string {
  const aviso =
    warnings.length === 0
      ? ''
      : `<p style="margin:0 0 16px;padding:12px;border-left:4px solid #9f1239;background:#f5f6f7;color:#0b1b2e;font-weight:600">
${warnings
  .map((w) =>
    w === 'sem-persistencia'
      ? 'ATENÇÃO: este pedido NÃO foi gravado no destino de leads. Responda a partir deste e-mail e não perca o contato.'
      : 'ATENÇÃO: a verificação anti-spam estava desligada quando este pedido chegou.',
  )
  .join('<br>')}
</p>`;

  const dado = (rotulo: string, valor: string | undefined) =>
    valor
      ? `<tr><th align="left" style="padding:4px 12px 4px 0;color:#5a6472;font-weight:400">${rotulo}</th><td style="padding:4px 0">${escapeHtml(valor)}</td></tr>`
      : '';

  const linhas = lead.items
    .map(
      (item) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #dde2e8">${escapeHtml(item.productName)}</td>
  <td style="padding:8px;border-bottom:1px solid #dde2e8;font-family:monospace">${escapeHtml(
    item.dimension + (item.length ? ` · ${item.length}` : ''),
  )}</td>
  <td style="padding:8px;border-bottom:1px solid #dde2e8;font-family:monospace;text-align:right">${item.quantity} ${escapeHtml(item.unit)}</td>
  <td style="padding:8px;border-bottom:1px solid #dde2e8;color:#5a6472">${escapeHtml(item.note ?? '')}</td>
</tr>`,
    )
    .join('\n');

  return `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0b1b2e">
${aviso}
<h1 style="margin:0 0 16px;font-size:20px">Pedido de orçamento</h1>

<table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
${dado('Nome', lead.name)}
${dado('Empresa', lead.company)}
${dado('E-mail', lead.email)}
${dado('Telefone', lead.phone)}
${dado('Cidade', lead.city)}
${dado('Recebido', lead.receivedAt)}
</table>

<h2 style="margin:0 0 8px;font-size:16px">Material pedido</h2>
<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:14px">
<thead><tr style="background:#f5f6f7">
  <th align="left" style="padding:8px">Produto</th>
  <th align="left" style="padding:8px">Medida</th>
  <th align="right" style="padding:8px">Qtd</th>
  <th align="left" style="padding:8px">Observação</th>
</tr></thead>
<tbody>
${linhas}
</tbody>
</table>

${
  lead.notes
    ? `<h2 style="margin:24px 0 8px;font-size:16px">Observações do cliente</h2>
<p style="margin:0;white-space:pre-wrap">${escapeHtml(lead.notes)}</p>`
    : ''
}

<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #dde2e8;font-size:13px;color:#5a6472">
Responder a este e-mail vai direto para o cliente.<br>
Tempo de preenchimento: ${lead.fillSeconds}s · IP: ${escapeHtml(lead.ip ?? 'desconhecido')}
</p>
</div>`;
}

/** Uma linha por item, para o botão de WhatsApp da tela de sucesso. */
export function buildWhatsappText(lead: Lead): string {
  return [
    `Pedido de orçamento — ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
    '',
    ...lead.items.map((item) => `• ${itemLine(item)}`),
    lead.notes ? `\nObservações: ${lead.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
