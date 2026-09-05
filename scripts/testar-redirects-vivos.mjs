// Segue os 117 redirects DE VERDADE, contra o servidor local que aplica o
// vercel.json, e confirma que cada URL antiga termina em 200.
//
// A diferença em relação ao check-redirects.ts: aquele confere a CONFIGURAÇÃO,
// este confere o COMPORTAMENTO. É a única forma de saber, antes do deploy, que
// nenhuma URL antiga vira 404 e que nenhum caminho passa por dois saltos.
//
//   npm run servir        (em outro terminal)
//   npm run testar-redirects
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4330';
const LISTA = 'docs/urls-antigas.txt';
const MAX_SALTOS = 5;

const antigas = readFileSync(LISTA, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

/** Segue a cadeia manualmente, contando saltos. */
const seguir = async (caminho) => {
  const trilha = [caminho];
  let atual = caminho;

  for (let salto = 0; salto < MAX_SALTOS; salto++) {
    const res = await fetch(new URL(atual, BASE), { redirect: 'manual' });

    if (res.status >= 300 && res.status < 400) {
      const local = res.headers.get('location');
      if (!local) return { trilha, status: res.status, erro: '  3xx sem Location' };
      if (trilha.includes(local)) return { trilha: [...trilha, local], erro: 'LOOP' };
      trilha.push(local);
      atual = local;
      continue;
    }

    return { trilha, status: res.status, saltos: trilha.length - 1, primeiroStatus: undefined };
  }

  return { trilha, erro: `mais de ${MAX_SALTOS} saltos` };
};

const falhas = [];
const saltosPorUrl = new Map();
let ok = 0;

for (const antiga of antigas) {
  // O primeiro status precisa ser 301 especificamente.
  const primeira = await fetch(new URL(antiga, BASE), { redirect: 'manual' });
  if (primeira.status !== 301) {
    falhas.push(`${antiga}: primeiro status ${primeira.status}, esperado 301`);
    continue;
  }

  const r = await seguir(antiga);

  if (r.erro) {
    falhas.push(`${antiga}: ${r.erro} — ${r.trilha.join(' → ')}`);
    continue;
  }
  if (r.status !== 200) {
    falhas.push(`${antiga}: termina em ${r.status} — ${r.trilha.join(' → ')}`);
    continue;
  }
  if (r.saltos > 1) {
    falhas.push(`${antiga}: ${r.saltos} saltos (cadeia) — ${r.trilha.join(' → ')}`);
    continue;
  }

  saltosPorUrl.set(antiga, r.saltos);
  ok++;
}

console.log(`${ok}/${antigas.length} URLs antigas: 301 em um salto, destino 200\n`);

const distribuicao = {};
for (const [, s] of saltosPorUrl) distribuicao[s] = (distribuicao[s] ?? 0) + 1;
console.log('saltos até o 200:', distribuicao);

if (falhas.length > 0) {
  console.error(`\n${falhas.length} FALHA(S):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  console.log('\nnenhum 404, nenhuma cadeia, nenhum loop — verificado seguindo cada URL.');
}
