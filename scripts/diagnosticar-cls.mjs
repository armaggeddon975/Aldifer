// Diagnostico de CLS: reproduz os deslocamentos de layout de uma rota e mostra
// o retangulo ANTES e DEPOIS de cada elemento que se moveu.
//
//   npm run servir                                   (em outro terminal)
//   npm run cls -- /calculadora-de-peso 4
//   SEM_REDE_LENTA=1 npm run cls -- /orcamento 6     (sem throttling de rede)
//
// POR QUE ESTE SCRIPT EXISTE
//
// A atribuicao de causa do Lighthouse e HEURISTICA: ela nomeia a requisicao que
// terminou perto do salto, e nao o que empurrou o layout. Na Etapa 12 ele
// reportou "Web font loaded" para um CLS de 0,304 em /calculadora-de-peso, e eu
// persegui tres configuracoes de font-display atras disso. A causa real era
// outra: o componente renderizava os 12 desenhos de perfil com `hidden` e o
// script desescondia um depois de hidratar.
//
// O que resolveu foi ler `previousRect` e `currentRect` de cada
// PerformanceObserver source — que e o que este script imprime. Ali o desenho
// aparecendo tarde e visivel como um bloco que muda de altura, e nao como uma
// fonte que chegou.
//
// LEIA A SAIDA ASSIM: `y` que muda sem `h` mudar = o elemento foi EMPURRADO por
// algo acima. `h` que muda = o proprio elemento cresceu ou encolheu, e e ele o
// culpado.
//
// O throttling de rede e opcional porque o preset do Lighthouse carrega a
// pagina em velocidade real e simula a rede depois: alguns saltos so aparecem
// com a rede lenta de verdade, outros so sem ela.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROTA = process.argv[2] ?? '/calculadora-de-peso';
const VEZES = Number(process.argv[3] ?? 4);
const BASE = 'http://localhost:4330';
const PORTA = 9444;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));

const perfil = mkdtempSync(join(tmpdir(), 'shift-'));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    '--headless=new',
    '--no-first-run',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const alvo = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const abas = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
      const p = abas.find((a) => a.type === 'page');
      if (p) return p;
    } catch {
      // porta ainda fechada
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome nao abriu a porta');
})();

const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((ok, err) => {
  ws.addEventListener('open', ok, { once: true });
  ws.addEventListener('error', () => err(new Error('CDP recusado')), { once: true });
});

let seq = 0;
const pend = new Map();
const evs = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id !== undefined) {
    const p = pend.get(m.id);
    pend.delete(m.id);
    if (m.error) p.err(new Error(m.error.message));
    else p.ok(m.result);
  } else for (const f of evs.get(m.method) ?? []) f(m.params);
});
const cdp = (method, params = {}) =>
  new Promise((ok, err) => {
    const id = ++seq;
    pend.set(id, { ok, err });
    ws.send(JSON.stringify({ id, method, params }));
  });
const esperar = (method, ms = 30000) =>
  new Promise((ok, err) => {
    const f = () => {
      clearTimeout(t);
      evs.set(method, (evs.get(method) ?? []).filter((x) => x !== f));
      ok();
    };
    const t = setTimeout(() => err(new Error(method + ' nao veio')), ms);
    evs.set(method, [...(evs.get(method) ?? []), f]);
  });

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Network.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 412,
  height: 823,
  deviceScaleFactor: 1.75,
  mobile: true,
});

// O observer precisa existir ANTES da primeira pintura.
await cdp('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__saltos = [];
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__saltos.push({
          valor: e.value,
          quando: Math.round(e.startTime),
          fontes: (e.sources ?? []).map((s) => ({
            no: s.node
              ? s.node.tagName.toLowerCase() +
                (s.node.className ? '.' + String(s.node.className).split(' ')[0] : '')
              : '(sem no)',
            de: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)],
            para: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)],
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  `,
});

for (let i = 1; i <= VEZES; i++) {
  await cdp('Network.setCacheDisabled', { cacheDisabled: true });
  // Slow 4G, como o preset mobile do Lighthouse.
  if (process.env.SEM_REDE_LENTA !== '1') {
    await cdp('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  }
  await cdp('Emulation.setCPUThrottlingRate', { rate: 4 });

  const carregou = esperar('Page.loadEventFired');
  await cdp('Page.navigate', { url: BASE + ROTA });
  await carregou;
  await new Promise((r) => setTimeout(r, 2500));

  const { result } = await cdp('Runtime.evaluate', {
    expression: 'JSON.stringify({ saltos: window.__saltos, total: window.__saltos.reduce((s, x) => s + x.valor, 0) })',
    returnByValue: true,
  });
  const d = JSON.parse(result.value);

  console.log(`\nrun ${i}: CLS total ${d.total.toFixed(4)} em ${d.saltos.length} salto(s)`);
  for (const s of d.saltos) {
    console.log(`  ${s.valor.toFixed(4)} @${s.quando}ms`);
    for (const f of s.fontes) {
      const dy = f.para[0] - f.de[0];
      const dh = f.para[1] - f.de[1];
      console.log(
        `     ${f.no.padEnd(26)} y ${String(f.de[0]).padStart(5)}->${String(f.para[0]).padStart(5)} (${dy >= 0 ? '+' : ''}${dy})  ` +
          `h ${String(f.de[1]).padStart(5)}->${String(f.para[1]).padStart(5)} (${dh >= 0 ? '+' : ''}${dh})`,
      );
    }
  }
}

ws.close();
chrome.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch {
  // perfil preso no Windows
}
