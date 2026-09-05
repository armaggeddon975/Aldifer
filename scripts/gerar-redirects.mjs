// Escreve os redirects 301 no vercel.json, a partir de:
//
//   docs/urls-antigas.txt  — as 117 URLs .php extraídas do site antigo
//   src/lib/redirects.ts   — o mapa explícito e as regras por radical
//   dist/client/           — as rotas que o build REALMENTE gerou
//
// A terceira fonte é a que evita o pior erro possível aqui: um 301 apontando
// para uma página que não existe. Isso é PIOR que um 404 direto — o Google
// registra soft 404, segue o redirecionamento e ainda gasta rastreamento nele.
// Hoje os 27 produtos estão em rascunho, então nenhuma página de produto é
// gerada, e 69 destinos precisam ser rebaixados para a categoria.
//
// CADA URL É LISTADA EXPLICITAMENTE. Nada de regex: o PROMPTS.md e o
// CONTEUDO.md são os dois enfáticos sobre isso, e com razão — um `(.*)` em
// redirect é a receita clássica de loop e de destino errado.
//
//   npm run redirects
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildRedirects, findProblems } from '../src/lib/redirects.ts';

const LISTA = 'docs/urls-antigas.txt';
const BUILD = 'dist/client';
const CONFIG = 'vercel.json';

// --- 1. as URLs antigas -----------------------------------------------------

const antigas = readFileSync(LISTA, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

if (antigas.length === 0) {
  throw new Error(`${LISTA} está vazio. Rode "npm run urls-antigas" antes.`);
}

// --- 2. as rotas que existem ------------------------------------------------

let arquivos;
try {
  arquivos = readdirSync(BUILD, { recursive: true, withFileTypes: true });
} catch {
  throw new Error(`${BUILD} não existe. Rode "npm run build" antes.`);
}

const existentes = new Set(['/']);
for (const e of arquivos) {
  if (!e.isFile() || e.name !== 'index.html') continue;
  const dir = join(e.parentPath, e.name).replaceAll('\\', '/');
  const rota = dir.replace(`${BUILD}`, '').replace(/\/index\.html$/, '');
  existentes.add(rota === '' ? '/' : rota);
}

if (existentes.size < 5) {
  throw new Error(`só ${existentes.size} rotas lidas de ${BUILD} — o build parece incompleto.`);
}

// --- 3. o mapa --------------------------------------------------------------

const redirects = buildRedirects(antigas, existentes);
const problemas = findProblems(redirects, existentes);

// --- 4. grava no vercel.json, preservando os cabeçalhos ---------------------

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));

config.redirects = redirects.map((r) => ({
  source: r.from,
  destination: r.to,
  // 301 e não 308: o Google trata os dois como permanentes, mas 301 é o que
  // toda ferramenta de SEO reconhece, e a Vercel usa 308 por padrão.
  permanent: true,
  statusCode: 301,
}));

writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

// --- 5. relatório -----------------------------------------------------------

const porFonte = {};
for (const r of redirects) porFonte[r.source] = (porFonte[r.source] ?? 0) + 1;

const rebaixados = redirects.filter((r) => r.intended);

console.log(`${redirects.length} redirects escritos em ${CONFIG}`);
console.log(`${existentes.size} rotas existentes lidas de ${BUILD}\n`);

console.log('por origem da decisão:');
for (const [fonte, n] of Object.entries(porFonte)) console.log(`  ${String(n).padStart(3)}  ${fonte}`);

const porDestino = {};
for (const r of redirects) porDestino[r.to] = (porDestino[r.to] ?? 0) + 1;
console.log('\npor destino:');
for (const [destino, n] of Object.entries(porDestino).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${destino}`);
}

if (rebaixados.length > 0) {
  console.log(
    `\n${rebaixados.length} destino(s) REBAIXADOS porque a página não existe no build.`,
  );
  console.log('É o caso dos 27 produtos em rascunho. Rode este script de novo');
  console.log('depois de publicá-los, e cada URL volta ao destino preciso.\n');
  const porIntencao = {};
  for (const r of rebaixados) {
    porIntencao[r.intended] = porIntencao[r.intended] ?? [];
    porIntencao[r.intended].push(r.from);
  }
  for (const [intencao, origens] of Object.entries(porIntencao).sort()) {
    console.log(`  ${intencao}  (não existe)`);
    console.log(`    ← ${origens.join(', ')}`);
  }
}

if (problemas.length > 0) {
  console.error(`\n${problemas.length} PROBLEMA(S):`);
  for (const p of problemas) console.error(`  [${p.kind}] ${p.detail}`);
  process.exitCode = 1;
} else {
  console.log('\nsem cadeia, sem loop, sem destino inexistente.');
}
