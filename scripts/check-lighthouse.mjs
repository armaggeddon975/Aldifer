// Roda o Lighthouse em perfil MOBILE com throttling nas páginas que importam,
// e reprova contra as metas do CLAUDE.md.
//
//   npm run servir        (em outro terminal)
//   npm run lighthouse
//
// POR QUE CONTRA `npm run servir` E NÃO `astro preview`: o preview não funciona
// com o adapter da Vercel. O `servir` entrega o build de produção com GZIP e os
// cabeçalhos de cache do vercel.json — sem a compressão a medição mente, e foi
// o primeiro erro desta etapa: o HTML ia com 44 KB em vez de 11 e a nota saía
// pessimista por defeito do servidor de teste.
//
// SOBRE O ERRO DE SAÍDA: no Windows o chrome-launcher falha ao apagar o perfil
// temporário (EPERM) DEPOIS da auditoria. O relatório já está escrito nessa
// hora, então o código de saída do Lighthouse é ignorado de propósito — o que
// vale é o JSON existir.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4330';
const SAIDA = '.lighthouse';

/** Metas do CLAUDE.md. */
const METAS = {
  performance: 90,
  lcp: 2500,
  cls: 0.1,
  /**
   * O CLAUDE.md pede INP < 200ms. O Lighthouse de laboratório não mede INP —
   * ele é métrica de campo, de interação real. O substituto é o TBT, e o
   * limiar equivalente que o próprio Lighthouse usa para "bom" é 200ms.
   */
  tbt: 200,
};

const PAGINAS = [
  { rota: '/', nome: 'Home', pesoMaximoKb: 1024 },
  { rota: '/produtos/barras', nome: 'Categoria' },
  { rota: '/calculadora-de-peso', nome: 'Calculadora' },
  { rota: '/orcamento', nome: 'Orçamento' },
];

// Rota extra passada na linha de comando, para medir página de produto quando
// os rascunhos estiverem publicados.
for (const extra of process.argv.slice(2)) {
  PAGINAS.push({ rota: extra, nome: `Extra ${extra}` });
}

if (existsSync(SAIDA)) rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });

/**
 * MEDIANA DE TRÊS EXECUÇÕES, e não uma medição só.
 *
 * Medido nesta etapa: o /orcamento deu LCP 2,56s numa execução — reprovando a
 * meta de 2,50s — e 1,95s · 1,95s · 2,04s · 1,95s · 1,97s em cinco execuções
 * seguidas logo depois, sem nenhuma mudança de código. A diferença é a máquina
 * estar ocupada, não o site.
 *
 * Um portão que reprova por 2% de ruído ensina a ignorá-lo, que é pior do que
 * não ter portão. Três execuções e a mediana é o que a própria documentação do
 * Lighthouse recomenda para número de laboratório.
 */
const EXECUCOES = Number(process.env.EXECUCOES ?? 3);

/** Mediana, e não média: um outlier alto não deve arrastar o resultado. */
const mediana = (valores) => {
  const ordenados = [...valores].sort((x, y) => x - y);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1
    ? ordenados[meio]
    : (ordenados[meio - 1] + ordenados[meio]) / 2;
};

/*
  CLS É JULGADO PELO PIOR CASO, E NÃO PELA MEDIANA.

  LCP, FCP e TBT são medidas de TEMPO num ambiente simulado: variam de execução
  para execução por carga de máquina, e a mediana é o jeito certo de tirar o
  ruído — foi por isso que este script passou a rodar três vezes.

  CLS não é ruído: é EVENTO. Uma execução com CLS 0,304 significa que o layout
  saltou 0,304 de verdade, naquela condição de rede e CPU. Se acontece em 2 de 5
  execuções aqui, acontece com 2 de 5 visitantes lá.

  Medido nesta etapa, em /calculadora-de-peso: as cinco execuções deram
  0,000 · 0,016 · 0,016 · 0,304 · 0,304 — distribuição BIMODAL, conforme a
  fonte chegar antes ou depois de uma pintura grande. A mediana dessa lista é
  0,016 e passava o portão folgado, escondendo que 40% das visitas levavam o
  triplo da meta. Foi o portão mentindo, não a página melhorando.
*/

const linhas = [];
const falhas = [];

for (const pagina of PAGINAS) {
  const base = `${SAIDA}/${pagina.rota.replace(/[^a-z0-9]/gi, '_') || 'raiz'}`;
  const execucoes = [];

  for (let i = 1; i <= EXECUCOES; i++) {
    const arquivo = `${base}-${i}.json`;

    try {
      execFileSync(
        'npx',
        [
          'lighthouse',
          BASE + pagina.rota,
          '--preset=perf',
          '--form-factor=mobile',
          '--throttling-method=simulate',
          '--output=json',
          `--output-path=${arquivo}`,
          '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
          '--quiet',
        ],
        { stdio: 'pipe', shell: true },
      );
    } catch {
      // EPERM na limpeza do perfil do Chrome. O relatório já foi escrito.
    }

    if (!existsSync(arquivo)) continue;

    const r = JSON.parse(readFileSync(arquivo, 'utf8'));
    const num = (id) => r.audits[id]?.numericValue ?? Number.NaN;
    execucoes.push({
      performance: Math.round((r.categories.performance?.score ?? 0) * 100),
      lcp: num('largest-contentful-paint'),
      cls: num('cumulative-layout-shift'),
      tbt: num('total-blocking-time'),
      fcp: num('first-contentful-paint'),
      pesoKb: num('total-byte-weight') / 1024,
    });
  }

  if (execucoes.length === 0) {
    falhas.push(`${pagina.nome}: o Lighthouse não gerou relatório em ${EXECUCOES} tentativas`);
    continue;
  }

  const dados = {
    nome: pagina.nome,
    rota: pagina.rota,
    execucoes: execucoes.length,
    performance: mediana(execucoes.map((e) => e.performance)),
    lcp: mediana(execucoes.map((e) => e.lcp)),
    // Pior caso, pelo motivo explicado acima.
    cls: Math.max(...execucoes.map((e) => e.cls)),
    clsMediana: mediana(execucoes.map((e) => e.cls)),
    tbt: mediana(execucoes.map((e) => e.tbt)),
    fcp: mediana(execucoes.map((e) => e.fcp)),
    pesoKb: mediana(execucoes.map((e) => e.pesoKb)),
    // A dispersão fica no relatório: se o pior caso passar longe da meta, o
    // número da mediana estava escondendo instabilidade real.
    lcpMin: Math.min(...execucoes.map((e) => e.lcp)),
    lcpMax: Math.max(...execucoes.map((e) => e.lcp)),
  };

  linhas.push(dados);

  if (dados.performance < METAS.performance) {
    falhas.push(`${pagina.nome}: performance ${dados.performance}, meta ${METAS.performance}`);
  }
  if (dados.lcp > METAS.lcp) {
    falhas.push(`${pagina.nome}: LCP ${(dados.lcp / 1000).toFixed(2)}s, meta 2,50s`);
  }
  if (dados.cls > METAS.cls) {
    falhas.push(
      `${pagina.nome}: CLS ${dados.cls.toFixed(3)} no pior de ${dados.execucoes} execuções ` +
        `(mediana ${dados.clsMediana.toFixed(3)}), meta 0,100`,
    );
  }
  if (dados.tbt > METAS.tbt) {
    falhas.push(`${pagina.nome}: TBT ${Math.round(dados.tbt)}ms, meta ${METAS.tbt}ms`);
  }
  if (pagina.pesoMaximoKb && dados.pesoKb > pagina.pesoMaximoKb) {
    falhas.push(
      `${pagina.nome}: ${Math.round(dados.pesoKb)} KB, limite ${pagina.pesoMaximoKb} KB`,
    );
  }
}

console.log(
  '  perf    LCP    CLS pior  CLS med   TBT     FCP     peso   LCP min-max     página',
);
console.log(
  '  ----  -------  --------  -------  ------  ------  -------  -------------  ' + '-'.repeat(24),
);
for (const l of linhas) {
  console.log(
    `  ${String(l.performance).padStart(4)}  ` +
      `${(l.lcp / 1000).toFixed(2).padStart(6)}s  ` +
      `${l.cls.toFixed(3).padStart(8)}  ` +
      `${l.clsMediana.toFixed(3).padStart(7)}  ` +
      `${String(Math.round(l.tbt)).padStart(4)}ms  ` +
      `${(l.fcp / 1000).toFixed(2).padStart(5)}s  ` +
      `${String(Math.round(l.pesoKb)).padStart(5)}KB  ` +
      `${(l.lcpMin / 1000).toFixed(2)}-${(l.lcpMax / 1000).toFixed(2)}s`.padStart(13) +
      `  ${l.nome}`,
  );
}

console.log('');
console.log(
  `${EXECUCOES} execução(ões) por página: tempo pela MEDIANA, CLS pelo PIOR caso. ` +
    'metas: performance ≥ 90 · LCP ≤ 2,50s · CLS ≤ 0,100 · TBT ≤ 200ms',
);
console.log('       (TBT no lugar do INP: laboratório não mede INP, que é métrica de campo)');

console.log('');
if (falhas.length > 0) {
  console.error(`${falhas.length} REPROVAÇÃO(ÕES):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  console.log(`${linhas.length} páginas dentro de todas as metas.`);
}
