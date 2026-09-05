// Extrai a lista COMPLETA de URLs do site antigo.
//
// O PROMPTS.md manda não confiar na lista do CONTEUDO.md, e está certo: uma URL
// esquecida vira 404 depois do lançamento, e o CLAUDE.md chama a perda do
// histórico de indexação de "maior causa de queda de tráfego pós-redesenho".
//
// Por que um RASTREAMENTO e não os quatro `curl` do PROMPTS.md: as ~70 páginas
// -satélite se linkam entre si, e algumas só aparecem a partir de outra
// satélite. Partir de quatro páginas e não seguir os links acharia parte delas.
// Este script segue tudo o que for `.php` do próprio domínio, até esgotar.
//
//   npm run urls-antigas
import { writeFileSync } from 'node:fs';

const ORIGEM = 'https://www.aldifer.com.br';
const SEMENTES = ['/', '/index.php', '/empresa.php', '/contato.php', '/barras.php'];
const DESTINO = 'docs/urls-antigas.txt';

/** Pausa entre requisições: é o site do cliente, não um alvo de carga. */
const PAUSA_MS = 120;
const LIMITE = 400;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Normaliza para caminho absoluto do próprio domínio, ou null se externo. */
const normalizar = (href, deOnde) => {
  try {
    const u = new URL(href, new URL(deOnde, ORIGEM));
    if (u.origin !== new URL(ORIGEM).origin) return null;
    // Sem query e sem fragmento: o site antigo não usa, e mantê-los
    // multiplicaria a lista sem acrescentar destino novo.
    return u.pathname;
  } catch {
    return null;
  }
};

const visitados = new Map(); // caminho -> status
const fila = [...SEMENTES];
const naFila = new Set(SEMENTES);
const encontradas = new Set();
const linkPara = new Map(); // caminho -> quem apontou para ele primeiro

while (fila.length > 0 && visitados.size < LIMITE) {
  const caminho = fila.shift();
  naFila.delete(caminho);

  let res;
  try {
    res = await fetch(new URL(caminho, ORIGEM), { redirect: 'manual' });
  } catch (erro) {
    visitados.set(caminho, `FALHA ${String(erro).slice(0, 40)}`);
    continue;
  }

  visitados.set(caminho, res.status);
  if (caminho.endsWith('.php')) encontradas.add(caminho);

  // 3xx: registra o destino como URL a visitar, para detectar cadeia já no
  // site antigo.
  const local = res.headers.get('location');
  if (local) {
    const destino = normalizar(local, caminho);
    if (destino && !visitados.has(destino) && !naFila.has(destino)) {
      fila.push(destino);
      naFila.add(destino);
      linkPara.set(destino, `${caminho} (3xx)`);
    }
    await pausa(PAUSA_MS);
    continue;
  }

  if (!res.ok) {
    await pausa(PAUSA_MS);
    continue;
  }

  const html = await res.text();

  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const alvo = normalizar(m[1], caminho);
    if (!alvo) continue;
    if (!/\.php$/i.test(alvo) && alvo !== '/') continue;

    if (/\.php$/i.test(alvo)) encontradas.add(alvo);
    if (!visitados.has(alvo) && !naFila.has(alvo)) {
      fila.push(alvo);
      naFila.add(alvo);
      linkPara.set(alvo, caminho);
    }
  }

  await pausa(PAUSA_MS);
}

// --- sitemap antigo, se existir --------------------------------------------
for (const nome of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml']) {
  try {
    const res = await fetch(new URL(nome, ORIGEM));
    if (!res.ok) {
      console.log(`${nome}: ${res.status}`);
      continue;
    }
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    console.log(`${nome}: ${res.status}, ${locs.length} <loc>`);
    for (const loc of locs) {
      const alvo = normalizar(loc, '/');
      if (alvo && /\.php$/i.test(alvo)) {
        if (!encontradas.has(alvo)) {
          console.log(`  ! só no sitemap, não linkada: ${alvo}`);
          linkPara.set(alvo, nome);
        }
        encontradas.add(alvo);
      }
    }
  } catch (erro) {
    console.log(`${nome}: falhou (${String(erro).slice(0, 40)})`);
  }
}

// --- relatório --------------------------------------------------------------

const lista = [...encontradas].sort();

const cabecalho = [
  '# URLs .php do site antigo (aldifer.com.br)',
  '#',
  `# Extraídas por rastreamento em ${new Date().toISOString().slice(0, 10)}.`,
  '# Gerado por scripts/extrair-urls-antigas.mjs — NÃO editar à mão.',
  '#',
  `# ${lista.length} URLs · ${visitados.size} páginas visitadas.`,
  '#',
  '# Toda linha aqui precisa de destino 301 no vercel.json. Nenhuma pode',
  '# virar 404: o CLAUDE.md trata a perda do histórico de indexação como a',
  '# maior causa de queda de tráfego pós-redesenho.',
  '',
];

writeFileSync(DESTINO, [...cabecalho, ...lista, ''].join('\n'), 'utf8');

const porStatus = {};
for (const [, status] of visitados) porStatus[status] = (porStatus[status] ?? 0) + 1;

console.log(`\n${lista.length} URLs .php encontradas`);
console.log(`${visitados.size} páginas visitadas:`, porStatus);
console.log(`escrito em ${DESTINO}`);

const problemas = [...visitados].filter(([, s]) => typeof s !== 'number' || s >= 400);
if (problemas.length > 0) {
  console.log('\nURLs que o PRÓPRIO site antigo já não serve:');
  for (const [c, s] of problemas) console.log(`  ${s}  ${c}  (linkada de ${linkPara.get(c) ?? 'semente'})`);
}

if (fila.length > 0) {
  console.error(`\nATENÇÃO: o limite de ${LIMITE} páginas foi atingido e ${fila.length} ficaram na fila.`);
  process.exitCode = 1;
}
