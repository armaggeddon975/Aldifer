// Verifica os contrastes da paleta a partir de src/styles/tokens.css.
//
// Existe porque a tabela de contrastes do CLAUDE.md era afirmação, não
// verificação — e na Etapa 1 eu usei a cor de DIVISOR como contorno de
// CONTROLE, que dava 1,30:1 contra os 3:1 que a WCAG 1.4.11 exige. Um erro
// desses não aparece no build nem no type check.
//
// Rodar com `npm run contrast`. Sai com código 1 se algum par reprovar.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CSS = 'src/styles/tokens.css';

// --- leitura dos tokens ----------------------------------------------------

/**
 * Lê os tokens de cor do arquivo, resolvendo referências `var()`.
 *
 * Os COMENTÁRIOS são removidos antes de qualquer coisa. A primeira versão
 * deste script recortava o bloco por `indexOf(':root')` e `indexOf('@theme')`,
 * e as duas buscas caíam nas menções a esses nomes dentro do comentário de
 * cabeçalho do tokens.css — o recorte saía com 83 caracteres de prosa e nenhum
 * token era lido, sem erro nenhum.
 *
 * Também não tenta delimitar bloco: percorre todas as declarações do arquivo.
 * Só as do `:root` têm hex literal; as do `@theme` são referências, e resolvê-las
 * não faz mal.
 */
function readTokens(path) {
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  const raw = new Map();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    // A primeira definição ganha: o :root vem antes do @theme no arquivo.
    if (!raw.has(match[1])) raw.set(match[1], match[2].trim());
  }

  const resolve = (value, depth = 0) => {
    if (depth > 10) return value;
    const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);
    if (!ref) return value;
    const next = raw.get(ref[1]);
    return next === undefined ? value : resolve(next, depth + 1);
  };

  const tokens = new Map();
  for (const [name, value] of raw) {
    const resolved = resolve(value);
    if (/^#[0-9a-f]{3,8}$/i.test(resolved)) tokens.set(name, resolved);
  }

  // Falhar alto: um parser que lê zero token e segue adiante daria a impressão
  // de que a paleta está aprovada.
  if (tokens.size === 0) {
    throw new Error(`nenhum token de cor lido de ${path} — o parser está quebrado`);
  }

  return tokens;
}

// --- contraste WCAG --------------------------------------------------------

function toRgb(hex) {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255);
}

/** Luminância relativa, conforme a definição da WCAG 2. */
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- separação de matiz ----------------------------------------------------
//
// Razão de contraste NÃO serve para dizer se duas cores se confundem: ela mede
// diferença de luminosidade, e dois matizes opostos de mesma luminosidade dão
// 1:1. Para "o erro parece o botão de enviar?" o que vale é a distância de
// matiz num espaço perceptual.

/** sRGB -> OKLab, conforme a definição de Björn Ottosson. */
function oklab(hex) {
  const [r, g, b] = toRgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/** Matiz em graus, no espaço OKLCH. */
function hue(hex) {
  const { a, b } = oklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

function hueDistance(hexA, hexB) {
  const d = Math.abs(hue(hexA) - hue(hexB)) % 360;
  return d > 180 ? 360 - d : d;
}

// --- pares que o site realmente usa ---------------------------------------
//
// `min` é 4.5 para texto (WCAG 1.4.3 AA) e 3.0 para limite de componente de
// interface e anel de foco (WCAG 1.4.11).

const PAIRS = [
  // Texto sobre as superfícies
  { fg: '--on-dark', bg: '--steel-950', min: 4.5, what: 'texto sobre seção escura' },
  { fg: '--on-dark-soft', bg: '--steel-950', min: 4.5, what: 'texto de apoio sobre escuro' },
  { fg: '--ink', bg: '--paper', min: 4.5, what: 'texto sobre seção clara' },
  { fg: '--ink-soft', bg: '--paper', min: 4.5, what: 'texto de apoio sobre claro' },
  { fg: '--ink-soft', bg: '--paper-alt', min: 4.5, what: 'texto de apoio sobre faixa alternada' },
  { fg: '--paper', bg: '--brand-navy', min: 4.5, what: 'branco sobre o azul da marca' },

  // CTA: a regra dura da paleta
  { fg: '--paper', bg: '--accent', min: 4.5, what: 'texto do CTA sobre claro' },
  { fg: '--steel-950', bg: '--accent-bright', min: 4.5, what: 'texto do CTA sobre escuro' },
  { fg: '--accent-bright', bg: '--steel-950', min: 4.5, what: 'destaque sobre escuro' },

  // Link no corpo do texto. O CLAUDE.md designa --steel-700 para "hover e
  // links"; estes dois pares são a razão. O --accent, que parecia a escolha
  // óbvia, dá 4,81:1 no branco — 0,31 de folga — e DESPENCA para 4,45:1 sobre
  // --paper-alt, reprovando no AA. Um link de acento numa faixa alternada
  // passou pelo axe da Etapa 7. Ver também o guard de --accent como texto,
  // no fim deste arquivo.
  // Em seção escura o --steel-700 daria 1,91:1 — ele só serve em superfície
  // clara. Por isso `--surface-link` é token de CONTEXTO: os três tons de
  // global.css o apontam para a cor que passa em cada um.
  { fg: '--steel-700', bg: '--paper', min: 4.5, what: 'link no corpo, seção clara' },
  { fg: '--steel-700', bg: '--paper-alt', min: 4.5, what: 'link no corpo, faixa alternada' },
  { fg: '--accent-bright', bg: '--steel-950', min: 4.5, what: 'link no corpo, seção escura' },

  // Limite de componente e anel de foco — 3:1
  { fg: '--accent', bg: '--paper', min: 3, what: 'anel de foco no claro' },
  { fg: '--accent-bright', bg: '--steel-950', min: 3, what: 'anel de foco no escuro' },
  { fg: '--ink-soft', bg: '--paper', min: 3, what: 'contorno de controle no claro' },
  { fg: '--on-dark-soft', bg: '--steel-950', min: 3, what: 'contorno de controle no escuro' },

  // Feedback de formulário
  { fg: '--danger', bg: '--paper', min: 4.5, what: 'mensagem de erro no claro' },
  { fg: '--danger', bg: '--paper-alt', min: 4.5, what: 'mensagem de erro na faixa alternada' },
  { fg: '--danger-bright', bg: '--steel-950', min: 4.5, what: 'mensagem de erro no escuro' },
  { fg: '--danger', bg: '--paper', min: 3, what: 'borda de campo com erro no claro' },
  { fg: '--success', bg: '--paper', min: 4.5, what: 'mensagem de sucesso no claro' },
  { fg: '--success-bright', bg: '--steel-950', min: 4.5, what: 'mensagem de sucesso no escuro' },

];

// --- separações de matiz que o site depende --------------------------------
//
// 15° é o piso adotado: acima disso, dois tons de croma alto se leem como
// cores diferentes mesmo em campos pequenos. A primeira versão deste script
// tentava medir isto com razão de contraste, que é a métrica errada, e por
// pouco não deixou passar um vermelho a 7° do laranja do CTA.

const HUES = [
  {
    a: '--danger',
    b: '--accent',
    min: 15,
    what: 'erro não se confunde com o CTA (superfície clara)',
  },
  {
    a: '--danger-bright',
    b: '--accent-bright',
    min: 15,
    what: 'erro não se confunde com o CTA (superfície escura)',
  },
  { a: '--success', b: '--accent', min: 15, what: 'sucesso não se confunde com o CTA' },
  { a: '--success', b: '--danger', min: 60, what: 'sucesso não se confunde com erro' },
];

// --- execução --------------------------------------------------------------

const tokens = readTokens(CSS);
const falhas = [];

console.log(`Contrastes de ${CSS}\n`);
console.log('   razão   mínimo  par');
console.log('   ------  ------  ' + '-'.repeat(52));

for (const pair of PAIRS) {
  const fg = tokens.get(pair.fg);
  const bg = tokens.get(pair.bg);

  if (!fg || !bg) {
    falhas.push(`token ausente: ${!fg ? pair.fg : pair.bg}`);
    console.log(`?  ${' '.repeat(6)}  ${' '.repeat(6)}  ${pair.what} (token ausente)`);
    continue;
  }

  const r = ratio(fg, bg);
  const ok = r >= pair.min;
  if (!ok) {
    falhas.push(
      `${pair.what}: ${pair.fg} sobre ${pair.bg} dá ${r.toFixed(2)}:1, precisa de ${pair.min}:1`,
    );
  }

  const marca = ok ? 'ok' : 'X ';
  console.log(
    `${marca} ${r.toFixed(2).padStart(6)}  ${String(pair.min).padStart(6)}  ${pair.what}` +
      `  (${pair.fg} / ${pair.bg})`,
  );
}

console.log('');
console.log('   matiz   mínimo  separação');
console.log('   ------  ------  ' + '-'.repeat(52));

for (const pair of HUES) {
  const a = tokens.get(pair.a);
  const b = tokens.get(pair.b);
  if (!a || !b) {
    falhas.push(`token ausente: ${!a ? pair.a : pair.b}`);
    continue;
  }

  const d = hueDistance(a, b);
  const ok = d >= pair.min;
  if (!ok) {
    falhas.push(
      `${pair.what}: ${pair.a} e ${pair.b} estão a ${d.toFixed(1)}° de matiz, precisa de ${pair.min}°`,
    );
  }

  console.log(
    `${ok ? 'ok' : 'X '} ${d.toFixed(1).padStart(5)}°  ${String(pair.min).padStart(5)}°  ` +
      `${pair.what}  (${pair.a} / ${pair.b})`,
  );
}

// --- guard: --accent nunca como cor de TEXTO em repouso ---------------------
//
// A tabela acima verifica pares que alguém se lembrou de listar. Este bloco
// verifica o código: procura --accent (e o --surface-hover das superfícies
// claras, que resolve para ele) usado como `color` em estado de repouso.
//
// Por que existe: o --accent tem 4,81:1 no branco, folga de 0,31, e 4,45:1
// sobre --paper-alt. Ou seja, um link de acento passa ou reprova dependendo
// da FAIXA em que a seção caiu — e trocar o tom de uma seção é uma decisão de
// layout que ninguém associa a contraste. Em hover a regra não se aplica: a
// WCAG mede o estado de repouso, e o acento no hover é a assinatura do site.

const FILES = readdirSync('src', { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(astro|css)$/.test(e.name))
  .map((e) => join(e.parentPath, e.name));

/**
 * Vazio desde 04/09/2026, e é para continuar assim.
 *
 * Os quatro casos que moravam aqui — links do texto corrido, botão da tabela
 * de bitolas, "Ver medidas" da home e link do consentimento — passaram a usar
 * `--surface-link`, o token de contexto que resolve para --steel-700 em
 * superfície clara e --accent-bright em escura.
 *
 * Só entra aqui um caso que a Aldifer decida manter com o acento sabendo do
 * risco. Não é lugar para calar um achado novo.
 */
const PENDENTES = new Set([]);

/** Linhas como `color: var(--accent);` fora de um seletor de hover. */
const usos = [];
for (const file of FILES) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  let seletor = '';
  lines.forEach((line, i) => {
    if (line.includes('{')) seletor = line;
    // A fronteira antes de `color` é essencial: sem ela isto pega
    // `background-color`, `border-color` e `accent-color`, que usam o acento
    // com toda a razão — o problema é o acento como cor de LETRA.
    const texto = /(?<![-\w])color:\s*var\(--(accent|surface-hover)\)/.exec(line);
    const utilitario = /(?<!hover:)\btext-surface-hover\b/.exec(line);
    if ((texto || utilitario) && !/:hover|:focus|group-hover/.test(seletor + line)) {
      const local = `${file.replaceAll('\\', '/')}:${i + 1}`;
      usos.push({ local, linha: line.trim(), pendente: PENDENTES.has(local) });
    }
  });
}

const novos = usos.filter((u) => !u.pendente);
const pendentes = usos.filter((u) => u.pendente);

if (usos.length > 0) {
  console.log('--accent como cor de TEXTO em repouso:');
  for (const u of pendentes) console.log(`  . ${u.local}  ${u.linha}   [pendente de decisão]`);
  for (const u of novos) console.log(`  X ${u.local}  ${u.linha}`);
  console.log('');
}

if (novos.length > 0) {
  falhas.push(
    `--accent como cor de texto em repouso em ${novos.length} lugar(es) novo(s) — ` +
      'sobre --paper-alt dá 4,45:1 e reprova no AA. Use --steel-700, que o ' +
      'CLAUDE.md designa para links e dá 8,38:1.',
  );
}

console.log('');

if (falhas.length > 0) {
  console.log(`${falhas.length} par(es) REPROVADO(S):`);
  for (const f of falhas) console.log('  - ' + f);
  process.exitCode = 1;
} else {
  console.log(`${PAIRS.length} contrastes e ${HUES.length} separações de matiz verificados, todos aprovados.`);
}
