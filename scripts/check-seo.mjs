// Portão de SEO: nota 100 do Lighthouse e JSON-LD válido em toda rota.
//
//   npm run servir     (em outro terminal)
//   npm run seo
//
// O portão do CLAUDE.md é "title/description únicos, canonical, sitemap,
// robots, JSON-LD válido", medido com "Lighthouse + Rich Results Test".
//
// DIVISÃO DE TRABALHO COM OS OUTROS SCRIPTS
//
// Unicidade de title e description, canonical, og:image e h1 único já são
// verificados em TODAS as 44 rotas por `npm run meta`, lendo o HTML do build.
// Este script cobre o que falta:
//
//   1. A nota da categoria SEO do Lighthouse, que audita coisas que não se
//      leem no HTML — link rastreável, tamanho de fonte, robots.txt válido,
//      status HTTP.
//   2. A ESTRUTURA do JSON-LD, em toda rota, e não por amostragem.
//
// O QUE ESTE SCRIPT NÃO FAZ: o Rich Results Test do Google. Ele exige URL
// pública e resiste a automação; fica como item de docs/POS-DEPLOY.md, para
// rodar quando o site estiver no ar. O que se pode verificar sem ele — JSON
// parseável, `@type` conhecido, campo obrigatório presente, nenhum campo vazio
// — está aqui.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4330';
const RAIZ = 'dist/client';
const SAIDA = '.lighthouse/seo';

/**
 * Rotas auditadas pelo Lighthouse.
 *
 * Uma de cada MOLDE, e não todas as 44: as 23 páginas de produto saem do mesmo
 * template, e o Lighthouse leva ~8s por rota. O que varia entre rotas do mesmo
 * molde é o conteúdo, e conteúdo é o que `npm run meta` já confere em todas.
 */
const PAGINAS = [
  { rota: '/', nome: 'Home' },
  { rota: '/produtos', nome: 'Catálogo' },
  { rota: '/produtos/barras', nome: 'Categoria' },
  { rota: '/produtos/barras/barra-chata', nome: 'Produto' },
  { rota: '/calculadora-de-peso', nome: 'Calculadora' },
  { rota: '/orcamento', nome: 'Orçamento' },
  { rota: '/empresa', nome: 'Empresa' },
  { rota: '/contato', nome: 'Contato' },
  { rota: '/politica-de-privacidade', nome: 'Privacidade' },
];

// Rota extra pela linha de comando. Serve para auditar uma página fora da
// lista — e foi assim que este portão se provou não-vacuoso: apontado para uma
// página sem <title>, sem meta description e com <img> sem alt, ele deu
//
//   75  document-title, image-alt, meta-description   Extra /_teste-seo-ruim
//
// em vez de passar calado. No Git Bash o argumento precisa de
// `MSYS_NO_PATHCONV=1`, senão `/_rota` é convertido em caminho do Windows.
for (const extra of process.argv.slice(2)) {
  PAGINAS.push({ rota: extra, nome: `Extra ${extra}` });
}

const falhas = [];

// ---------------------------------------------------------------------------
// 1. JSON-LD, em toda rota do build
// ---------------------------------------------------------------------------

/**
 * Campos obrigatórios por tipo.
 *
 * Deliberadamente CURTO. A tentação é exigir `openingHours`, `geo`,
 * `priceRange` e `aggregateRating`, que é o que os artigos de SEO recomendam —
 * mas o CLAUDE.md proíbe: "nenhum número, depoimento, case ou certificação
 * entra no site sem confirmação da Aldifer". Horário de funcionamento é
 * PLACEHOLDER declarado, e nota de avaliação sem avaliação real é dado
 * inventado. Um portão que exigisse esses campos empurraria para inventá-los.
 */
const OBRIGATORIOS = {
  HardwareStore: ['name', 'address', 'telephone', 'url'],
  BreadcrumbList: ['itemListElement'],
  ItemList: ['itemListElement'],
};

/** Percorre o JSON procurando string vazia ou nula, que suja o rich result. */
function vazios(valor, caminho = '') {
  if (valor === null || valor === undefined) return [caminho || '(raiz)'];
  if (typeof valor === 'string') return valor.trim() === '' ? [caminho] : [];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => vazios(v, `${caminho}[${i}]`));
  if (typeof valor === 'object') {
    return Object.entries(valor).flatMap(([k, v]) => vazios(v, caminho ? `${caminho}.${k}` : k));
  }
  return [];
}

const paginas = readdirSync(RAIZ, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(e.parentPath, e.name).replaceAll('\\', '/'))
  .sort();

if (paginas.length === 0) throw new Error(`nenhum HTML em ${RAIZ}. Rode "npm run build".`);

let blocos = 0;
const porTipo = new Map();

for (const arquivo of paginas) {
  const rota = arquivo
    .replace(RAIZ, '')
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '');
  const html = readFileSync(arquivo, 'utf8');

  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    blocos++;

    let dado;
    try {
      dado = JSON.parse(m[1]);
    } catch (erro) {
      falhas.push(`${rota} — JSON-LD ilegível: ${erro.message}`);
      continue;
    }

    for (const item of Array.isArray(dado) ? dado : [dado]) {
      const tipo = item['@type'];
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);

      if (item['@context'] !== 'https://schema.org') {
        falhas.push(`${rota} — @context é "${item['@context']}", esperado https://schema.org`);
      }
      if (!tipo) {
        falhas.push(`${rota} — bloco JSON-LD sem @type`);
        continue;
      }
      if (!(tipo in OBRIGATORIOS)) {
        falhas.push(`${rota} — @type "${tipo}" não é um dos previstos`);
        continue;
      }
      for (const campo of OBRIGATORIOS[tipo]) {
        if (item[campo] === undefined) falhas.push(`${rota} — ${tipo} sem "${campo}"`);
      }

      const brancos = vazios(item);
      if (brancos.length > 0) {
        falhas.push(`${rota} — ${tipo} com campo vazio: ${brancos.join(', ')}`);
      }

      // A posição do breadcrumb precisa ser 1..n em ordem, senão o Google
      // desenha a trilha errada.
      if (tipo === 'BreadcrumbList') {
        const posicoes = (item.itemListElement ?? []).map((e) => e.position);
        const esperado = posicoes.map((_, i) => i + 1);
        if (JSON.stringify(posicoes) !== JSON.stringify(esperado)) {
          falhas.push(`${rota} — BreadcrumbList com posições ${posicoes.join(',')}`);
        }
      }
    }
  }
}

console.log(`JSON-LD: ${blocos} blocos em ${paginas.length} rotas`);
for (const [tipo, n] of [...porTipo].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)} ${tipo}`);
}

// A verificação acima não vale nada se o HTML não tivesse JSON-LD nenhum.
if (blocos === 0) throw new Error('nenhum bloco JSON-LD encontrado — o portão seria vacuoso');

// ---------------------------------------------------------------------------
// 2. Categoria SEO do Lighthouse
// ---------------------------------------------------------------------------

/**
 * Rotas que EXISTEM no build, para não auditar 404.
 *
 * Necessário porque a lista de páginas é escrita à mão, e as 27 páginas de
 * produto só existem quando `SHOW_DRAFTS` está ligado — no build de produção
 * elas não são geradas, porque as bitolas ainda não foram confirmadas pela
 * Aldifer. Sem esta checagem o Lighthouse auditava a página de 404 e reportava
 * "Produto: SEO 0", que é um número FALSO: não há página reprovando, há página
 * ausente. Portão que mente sobre a causa é pior que portão que falha.
 */
const ROTAS_DO_BUILD = new Set(
  paginas.map(
    (a) =>
      a
        .replace(RAIZ, '')
        .replace(/\/index\.html$/, '')
        .replace(/\.html$/, '') || '/',
  ),
);

const existeNoBuild = (rota) => ROTAS_DO_BUILD.has(rota.replace(/\/$/, '') || '/');

/** Páginas da lista que este build não gerou. */
const ausentes = PAGINAS.filter((p) => !existeNoBuild(p.rota));

/** Audita a categoria SEO de cada página da lista. */
function auditarLighthouse() {
  if (existsSync(SAIDA)) rmSync(SAIDA, { recursive: true, force: true });
  mkdirSync(SAIDA, { recursive: true });

  console.log('\n  nota  auditorias reprovadas                        página');
  console.log('  ----  ' + '-'.repeat(44) + '  ' + '-'.repeat(12));

  for (const pagina of PAGINAS) {
    if (!existeNoBuild(pagina.rota)) {
      console.log(`     -  (ausente deste build)                        ${pagina.nome}`);
      continue;
    }

    const arquivo = `${SAIDA}/${pagina.rota.replace(/[^a-z0-9]/gi, '_') || 'raiz'}.json`;

    try {
      execFileSync(
        'npx',
        [
          'lighthouse',
          BASE + pagina.rota,
          '--only-categories=seo',
          '--form-factor=mobile',
          '--output=json',
          `--output-path=${arquivo}`,
          '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
          '--quiet',
        ],
        { stdio: 'pipe', shell: true },
      );
    } catch {
      // EPERM na limpeza do perfil do Chrome no Windows, DEPOIS de o relatório
      // ser escrito. O que vale é o JSON existir — verificado logo abaixo.
    }

    if (!existsSync(arquivo)) {
      falhas.push(`${pagina.nome}: o Lighthouse não gerou relatório`);
      console.log(`     -  (sem relatório)                                ${pagina.nome}`);
      continue;
    }

    const r = JSON.parse(readFileSync(arquivo, 'utf8'));
    const nota = Math.round((r.categories.seo?.score ?? 0) * 100);

    // "notApplicable" e "manual" não são reprovação: o Lighthouse marca assim
    // a auditoria que não se aplica à página.
    const reprovadas = Object.values(r.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === 'binary')
      .map((a) => a.id);

    console.log(
      `  ${String(nota).padStart(4)}  ${(reprovadas.join(', ') || '—').padEnd(44)}  ${pagina.nome}`,
    );

    if (nota < 100) falhas.push(`${pagina.nome}: SEO ${nota}, meta 100 (${reprovadas.join(', ')})`);
  }
}

// SEM_LIGHTHOUSE=1 roda só a parte estática. Existe para conferir o JSON-LD em
// segundos durante o desenvolvimento, em vez de esperar 9 auditorias — e foi
// como as provas de JSON-LD abaixo foram feitas.
if (process.env.SEM_LIGHTHOUSE === '1') {
  console.log('\n(SEM_LIGHTHOUSE=1: categoria SEO do Lighthouse não medida)');
} else {
  auditarLighthouse();
}

console.log('');
if (falhas.length > 0) {
  console.error(`${falhas.length} REPROVAÇÃO(ÕES):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  const auditadas = PAGINAS.length - ausentes.length;
  console.log(`${auditadas} páginas com SEO 100 e ${blocos} blocos JSON-LD válidos.`);
  if (ausentes.length > 0) {
    console.log(
      `${ausentes.length} página(s) da lista não existem neste build — os produtos são ` +
        'rascunho enquanto a planilha de estoque da Aldifer não chega. Ligue SHOW_DRAFTS ' +
        `em src/lib/products.ts para auditá-las: ${ausentes.map((p) => p.rota).join(', ')}`,
    );
  }
  console.log('Falta o Rich Results Test do Google — exige URL pública. Ver docs/POS-DEPLOY.md.');
}
