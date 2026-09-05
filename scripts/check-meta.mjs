// Confere title, description, canonical e og:image de TODA rota gerada.
//
// Critério de aceite da Etapa 8: "todas as rotas com title e description
// únicos". Título repetido em duas páginas é o erro de SEO mais fácil de
// cometer e o mais difícil de notar — nada no build acusa, e no Search Console
// aparece semanas depois como "duplicate title".
//
//   npm run meta
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'dist/client';

/**
 * Rotas que NÃO são páginas de conteúdo e por isso não passam pelo portão.
 *
 * Só `/admin`, hoje: é um stub de redirecionamento para `/keystatic`, com
 * `<meta refresh>`, `noindex` e um link visível. Não tem h1 nem description de
 * propósito — description serve para o resultado de busca, e esta rota está
 * bloqueada no robots.txt e fora do sitemap. Exigir h1 dela levaria a
 * inventar um título só para calar o verificador.
 */
const FORA_DO_PORTAO = [/^\/admin\/?$/];

const paginas = readdirSync(RAIZ, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(e.parentPath, e.name).replaceAll('\\', '/'))
  .sort();

if (paginas.length === 0) {
  throw new Error(`nenhum HTML em ${RAIZ}. Rode "npm run build" antes.`);
}

const pegar = (html, re) => re.exec(html)?.[1]?.trim();

const linhas = [];
for (const arquivo of paginas) {
  const html = readFileSync(arquivo, 'utf8');
  linhas.push({
    rota: arquivo.replace(RAIZ, '').replace(/\/index\.html$/, '/').replace(/\.html$/, ''),
    title: pegar(html, /<title>([^<]*)<\/title>/),
    description: pegar(html, /<meta name="description" content="([^"]*)"/),
    canonical: pegar(html, /<link rel="canonical" href="([^"]*)"/),
    ogImage: pegar(html, /<meta property="og:image" content="([^"]*)"/),
    noindex: /name="robots" content="noindex/.test(html),
    isenta: false,
    h1: (html.match(/<h1[\s>]/g) ?? []).length,
  });
}

for (const l of linhas) {
  l.isenta = FORA_DO_PORTAO.some((re) => re.test(l.rota));
}

const falhas = [];
/** Não reprovam: só usam menos do espaço do snippet. */
const curtas = [];
const duplicado = (campo) => {
  const vistos = new Map();
  for (const l of linhas) {
    if (l.isenta) continue;
    const valor = l[campo];
    if (!valor) {
      falhas.push(`${l.rota} — sem ${campo}`);
      continue;
    }
    const antes = vistos.get(valor);
    if (antes) falhas.push(`${campo} repetido em ${antes} e ${l.rota}: "${valor.slice(0, 52)}…"`);
    else vistos.set(valor, l.rota);
  }
};

duplicado('title');
duplicado('description');

for (const l of linhas) {
  if (l.isenta) continue;

  if (!l.canonical) falhas.push(`${l.rota} — sem canonical`);
  if (!l.ogImage) falhas.push(`${l.rota} — sem og:image`);
  if (l.h1 !== 1) falhas.push(`${l.rota} — ${l.h1} elementos h1 (deve ser exatamente 1)`);
  // O CONTEUDO.md pede title até ~60 e description entre 140 e 160.
  //
  // Só o EXCESSO reprova. Passar do limite faz o Google truncar com "…", que é
  // defeito visível no resultado de busca; ficar abaixo apenas usa menos do
  // espaço disponível, e várias das descriptions APROVADAS no CONTEUDO.md têm
  // entre 127 e 145 caracteres. Um checker que reprova a própria fonte de
  // verdade seria descartado na primeira vez que atrapalhasse.
  if (l.title && l.title.length > 65) {
    falhas.push(`${l.rota} — title com ${l.title.length} caracteres (limite ~60)`);
  }
  if (l.description && l.description.length > 170) {
    falhas.push(
      `${l.rota} — description com ${l.description.length} caracteres, o Google trunca`,
    );
  }

  // Página noindex nunca aparece em busca: comprimento ali é irrelevante.
  if (!l.noindex && l.description && l.description.length < 120) {
    curtas.push(`${l.rota} — description com ${l.description.length} caracteres (alvo 140 a 160)`);
  }
}

console.log(`${linhas.length} rotas\n`);
console.log('  t   d   h1  noidx  rota');
console.log('  --- --- --- -----  ' + '-'.repeat(40));
for (const l of linhas) {
  console.log(
    `  ${String(l.title?.length ?? 0).padStart(3)} ${String(l.description?.length ?? 0).padStart(3)} ` +
      `${String(l.h1).padStart(3)} ${l.noindex ? '  sim' : '   - '}  ${l.rota}`,
  );
}

const isentas = linhas.filter((l) => l.isenta);
if (isentas.length > 0) {
  console.log('\nfora do portão (não é página de conteúdo):');
  for (const l of isentas) console.log(`  . ${l.rota}  —  "${l.title}"`);
}

console.log('');
if (curtas.length > 0) {
  console.log('description abaixo do alvo (não reprova):');
  for (const c of curtas) console.log('  . ' + c);
  console.log('');
}

if (falhas.length > 0) {
  console.log(`${falhas.length} problema(s):`);
  for (const f of falhas) console.log('  - ' + f);
  process.exitCode = 1;
} else {
  console.log('title e description únicos, canonical e og:image em todas, um h1 por página.');
}
