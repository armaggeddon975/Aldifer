// Roda o axe em TODAS as rotas do build e reprova em violação crítica ou séria.
//
//   npm run servir     (em outro terminal)
//   npm run axe
//
// O portão do CLAUDE.md é "WCAG 2.2 AA, zero violação crítica ou séria". O axe
// detecta de 20% a 50% do que existe — o resto é o teste manual descrito em
// docs/ACESSIBILIDADE.md. Este script cobre a parte automatizável, em todas as
// rotas em vez de só na home.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4330';
const RAIZ = 'dist/client';

/** Rotas do build, derivadas dos arquivos gerados. */
const rotas = readdirSync(RAIZ, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(e.parentPath, e.name).replaceAll('\\', '/'))
  .map((p) => p.replace(RAIZ, '').replace(/\/index\.html$/, '/').replace(/\.html$/, ''))
  .filter((r) => !r.startsWith('/admin'))
  .sort();

if (rotas.length === 0) throw new Error(`nenhuma rota em ${RAIZ}. Rode "npm run build".`);

const GRAVES = new Set(['critical', 'serious']);

const falhas = [];
const leves = [];

console.log(`${rotas.length} rotas\n`);

for (const rota of rotas) {
  let saida = '';
  try {
    saida = execFileSync(
      'npx',
      ['@axe-core/cli', BASE + rota, '--exit', '--stdout'],
      { stdio: 'pipe', shell: true, encoding: 'utf8' },
    );
  } catch (erro) {
    // O CLI sai com código 1 quando ACHA violação. A saída é o que importa.
    saida = String(erro.stdout ?? '') + String(erro.stderr ?? '');
  }

  const limpa = saida.replace(/\[[0-9;]*m/g, '');

  let violacoes = [];
  try {
    const json = JSON.parse(limpa.slice(limpa.indexOf('[')));
    violacoes = json.flatMap((p) => p.violations ?? []);
  } catch {
    // Sem --stdout utilizável: cai na leitura do texto.
    for (const m of limpa.matchAll(/Violation of "([a-z0-9-]+)" with (\d+) occurrence/gi)) {
      violacoes.push({ id: m[1], impact: 'serious', nodes: Array(Number(m[2])).fill({}) });
    }
  }

  const graves = violacoes.filter((v) => GRAVES.has(v.impact));
  const brandas = violacoes.filter((v) => !GRAVES.has(v.impact));

  const marca = graves.length > 0 ? 'X ' : '  ';
  console.log(
    `${marca}${String(graves.length).padStart(2)} graves  ` +
      `${String(brandas.length).padStart(2)} brandas   ${rota}`,
  );

  for (const v of graves) {
    falhas.push(`${rota}: [${v.impact}] ${v.id} — ${v.nodes?.length ?? '?'} ocorrência(s)`);
  }
  for (const v of brandas) {
    leves.push(`${rota}: [${v.impact}] ${v.id}`);
  }
}

if (leves.length > 0) {
  console.log(`\n${leves.length} violação(ões) leve(s) — não reprovam o portão:`);
  for (const l of leves) console.log(`  . ${l}`);
}

console.log('');
if (falhas.length > 0) {
  console.error(`${falhas.length} VIOLAÇÃO(ÕES) CRÍTICA(S) OU SÉRIA(S):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  console.log(`${rotas.length} rotas sem violação crítica nem séria.`);
}
