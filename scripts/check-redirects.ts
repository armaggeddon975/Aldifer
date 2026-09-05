/**
 * Confere que TODA URL do site antigo tem destino 301, e que o destino existe.
 *
 * Aceite da Etapa 10: 100% de cobertura, nenhum redirect em cadeia (A→B→C),
 * nenhum loop, nenhuma URL antiga em 404.
 *
 * Este script lê as três fontes de verdade de forma INDEPENDENTE do gerador:
 * a lista extraída do site antigo, o vercel.json que será publicado, e as
 * rotas que o build gerou. Se o gerador tiver um bug, ele aparece aqui — um
 * verificador que reusasse a lógica do gerador confirmaria o próprio erro.
 *
 *   npm run check-redirects
 *
 * Roda em TypeScript direto, sem passo de compilação: o Node 24 tira os tipos
 * na carga, o mesmo mecanismo que a suíte de testes usa.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LISTA = 'docs/urls-antigas.txt';
const BUILD = 'dist/client';
const CONFIG = 'vercel.json';

type VercelRedirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
};

// --- as três fontes ---------------------------------------------------------

const antigas = readFileSync(LISTA, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const config = JSON.parse(readFileSync(CONFIG, 'utf8')) as { redirects?: VercelRedirect[] };
const redirects = config.redirects ?? [];

const rotas = new Set<string>(['/']);
for (const e of readdirSync(BUILD, { recursive: true, withFileTypes: true })) {
  if (!e.isFile() || e.name !== 'index.html') continue;
  // `parentPath`, e não o antigo `path`: ele substituiu `path` no Node 20.12 e
  // saiu dos tipos. O `astro check` confere SINTAXE nos .mjs mas não infere
  // tipos neles, então o `?? e.path` que eu tinha escrito passou lá e só
  // reprovou aqui, neste .ts.
  const caminho = join(e.parentPath, e.name).replaceAll('\\', '/');
  const rota = caminho.replace(BUILD, '').replace(/\/index\.html$/, '');
  rotas.add(rota === '' ? '/' : rota);
}

console.log(`${antigas.length} URLs antigas · ${redirects.length} redirects · ${rotas.size} rotas no build\n`);

const falhas: string[] = [];
const aviso: string[] = [];

if (antigas.length === 0) falhas.push(`${LISTA} está vazio — rode "npm run urls-antigas"`);
if (redirects.length === 0) falhas.push(`${CONFIG} sem redirects — rode "npm run redirects"`);
if (rotas.size < 5) falhas.push(`${BUILD} com ${rotas.size} rotas — rode "npm run build"`);

// --- 1. cobertura: toda URL antiga tem redirect -----------------------------

const porOrigem = new Map<string, VercelRedirect[]>();
for (const r of redirects) {
  const lista = porOrigem.get(r.source) ?? [];
  lista.push(r);
  porOrigem.set(r.source, lista);
}

const semRedirect = antigas.filter((u) => !porOrigem.has(u));
for (const u of semRedirect) falhas.push(`SEM REDIRECT: ${u} viraria 404`);

// --- 2. uma origem, um destino ---------------------------------------------

for (const [origem, lista] of porOrigem) {
  if (lista.length > 1) {
    falhas.push(
      `ORIGEM DUPLICADA: ${origem} tem ${lista.length} redirects (${lista
        .map((r) => r.destination)
        .join(', ')})`,
    );
  }
}

// --- 3. redirect que não aponta para nada -----------------------------------

for (const r of redirects) {
  if (!rotas.has(r.destination)) {
    falhas.push(`DESTINO INEXISTENTE: ${r.source} → ${r.destination} (não está no build)`);
  }
}

// --- 4. cadeia e loop -------------------------------------------------------
//
// Cadeia é o problema que passa desapercebido: bastaria uma URL antiga
// aparecer como DESTINO de outra. O Google segue poucos saltos e dilui
// autoridade em cada um.

for (const r of redirects) {
  if (r.source === r.destination) {
    falhas.push(`LOOP: ${r.source} aponta para si mesmo`);
    continue;
  }
  if (porOrigem.has(r.destination)) {
    falhas.push(
      `CADEIA: ${r.source} → ${r.destination}, e ${r.destination} também é origem`,
    );
  }
}

// --- 5. é 301, e não 302 ou 308 --------------------------------------------

for (const r of redirects) {
  if (r.statusCode !== 301) {
    falhas.push(`STATUS ERRADO: ${r.source} usa ${r.statusCode ?? '(padrão)'}, deveria ser 301`);
  }
}

// --- 6. redirect órfão: aponta origem que não está na lista antiga ---------
//
// Não reprova: pode ser uma URL que a Aldifer conheça e o rastreamento não
// tenha achado. Mas merece ser vista.

for (const origem of porOrigem.keys()) {
  if (!antigas.includes(origem)) aviso.push(`redirect para origem fora de ${LISTA}: ${origem}`);
}

// --- 7. destino que rebaixou -----------------------------------------------
//
// Também não reprova. É o estado esperado enquanto os 27 produtos estão em
// rascunho: a URL vai para a categoria em vez do produto.

const paraCategoria = redirects.filter(
  (r) => /^\/(barra|tubo|chapa|perfil|tela|degrau|disco|eletrodo|fechadura|tinta|acessorio)/.test(r.source) &&
    r.destination.split('/').length === 3,
);

// --- relatório --------------------------------------------------------------

const porDestino = new Map<string, number>();
for (const r of redirects) porDestino.set(r.destination, (porDestino.get(r.destination) ?? 0) + 1);

console.log('cobertura por destino:');
for (const [destino, n] of [...porDestino].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${destino}`);
}

console.log(
  `\ncobertura: ${antigas.length - semRedirect.length}/${antigas.length} ` +
    `(${(((antigas.length - semRedirect.length) / antigas.length) * 100).toFixed(1)}%)`,
);
console.log(`URLs que hoje param na categoria em vez do produto: ${paraCategoria.length}`);

if (aviso.length > 0) {
  console.log(`\n${aviso.length} aviso(s), não reprovam:`);
  for (const a of aviso) console.log(`  . ${a}`);
}

console.log('');
if (falhas.length > 0) {
  console.error(`${falhas.length} FALHA(S):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  console.log('100% de cobertura · sem origem duplicada · sem cadeia · sem loop ·');
  console.log('todos os destinos existem no build · todos com status 301.');
}
