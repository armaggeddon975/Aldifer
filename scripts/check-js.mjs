// Mede o JavaScript que cada página REALMENTE entrega, em gzip.
//
// É o portão do CLAUDE.md: "JS inicial < 100KB gzip". Ele existe porque a
// decisão central de performance deste site foi remover o React na Etapa 3 —
// a home com a busca como ilha React carregava 62,7 KB, dos quais 57,2 KB
// eram só o runtime. O público acessa de Android de entrada em 4G de obra.
//
// A Etapa 11 traz o Keystatic, que É uma aplicação React. Este script é o que
// prova que ele fica confinado em /admin e não vaza para as 16 páginas
// públicas — e é o que vai acusar se algum dia vazar.
//
//   npm run js
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'dist/client';
const LIMITE_KB = 100;

/** Rotas que não são páginas públicas e por isso não entram no portão. */
const FORA_DO_PORTAO = [/^\/admin/];

const paginas = readdirSync(RAIZ, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(e.parentPath, e.name).replaceAll('\\', '/'))
  .sort();

if (paginas.length === 0) {
  throw new Error(`nenhum HTML em ${RAIZ}. Rode "npm run build" antes.`);
}

const linhas = [];

for (const arquivo of paginas) {
  const html = readFileSync(arquivo, 'utf8');

  const externos = new Set(
    [...html.matchAll(/<script[^>]+src="(\/[^"]+\.js)"/g)].map((m) => m[1]),
  );

  // ld+json não é código executável e não conta como JS de página.
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter((m) => !/ld\+json/.test(m[1]))
    .map((m) => m[2]);

  let bytes = 0;
  const faltando = [];

  for (const src of externos) {
    try {
      bytes += gzipSync(readFileSync(RAIZ + src)).length;
    } catch {
      faltando.push(src);
    }
  }
  for (const corpo of inline) bytes += gzipSync(Buffer.from(corpo, 'utf8')).length;

  const rota =
    arquivo.replace(RAIZ, '').replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';

  linhas.push({
    rota,
    kb: bytes / 1024,
    arquivos: externos.size,
    inline: inline.length,
    faltando,
    isenta: FORA_DO_PORTAO.some((re) => re.test(rota)),
  });
}

const publicas = linhas.filter((l) => !l.isenta);
const isentas = linhas.filter((l) => l.isenta);

console.log('   gzip  arq  inl  rota');
console.log('  -----  ---  ---  ' + '-'.repeat(44));
for (const l of [...publicas].sort((a, b) => b.kb - a.kb)) {
  const marca = l.kb > LIMITE_KB ? 'X' : ' ';
  console.log(
    `${marca} ${l.kb.toFixed(1).padStart(6)}  ${String(l.arquivos).padStart(3)}  ` +
      `${String(l.inline).padStart(3)}  ${l.rota}`,
  );
}

if (isentas.length > 0) {
  console.log('\nfora do portão (não é página pública):');
  for (const l of isentas.sort((a, b) => b.kb - a.kb)) {
    console.log(`  ${l.kb.toFixed(1).padStart(6)} KB  ${l.rota}`);
  }
}

const pior = publicas.reduce((a, b) => (a.kb > b.kb ? a : b));
console.log(
  `\npágina pública mais pesada: ${pior.rota} com ${pior.kb.toFixed(1)} KB gzip ` +
    `(limite ${LIMITE_KB} KB)`,
);

const falhas = [];
for (const l of linhas) {
  if (l.faltando.length > 0) {
    falhas.push(`${l.rota}: script referenciado e ausente — ${l.faltando.join(', ')}`);
  }
}
for (const l of publicas) {
  if (l.kb > LIMITE_KB) falhas.push(`${l.rota}: ${l.kb.toFixed(1)} KB passa dos ${LIMITE_KB} KB`);
}

// O React confinado no admin é o invariante que a Etapa 11 precisa manter.
const comReact = publicas.filter((l) => l.kb > 40);
if (comReact.length > 0) {
  falhas.push(
    `página pública acima de 40 KB — suspeita de runtime de framework: ${comReact
      .map((l) => l.rota)
      .join(', ')}`,
  );
}

console.log('');
if (falhas.length > 0) {
  console.error(`${falhas.length} FALHA(S):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  console.log(`${publicas.length} páginas públicas dentro do portão de JS.`);
}
