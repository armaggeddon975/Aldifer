// Portão RESPONSIVO: 360 · 768 · 1280 · 1920px, em toda rota do build.
//
//   npm run servir      (em outro terminal)
//   npm run responsivo
//
// O portão do CLAUDE.md é "360 · 768 · 1280 · 1920px sem quebra nem scroll
// horizontal", com atenção especial na tabela de bitola em 360px.
//
// POR QUE UM RUNNER, E NÃO INSPEÇÃO MANUAL
//
// A primeira versão deste arquivo só IMPRIMIA o código para eu colar no console
// do navegador, uma largura por vez. São 43 rotas × 4 larguras = 172 medições:
// à mão eu media meia dúzia e afirmava o resto. Aqui o Chrome roda headless,
// com o viewport emulado de verdade pelo CDP, e cada medição fica no relatório.
//
// Sem puppeteer: o Chrome sobe com --remote-debugging-port e o CDP é falado
// direto pelo WebSocket nativo do Node. "Antes de instalar pacote, pergunte:
// dá para fazer em 20 linhas?" — deu em ~80.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4330';
const RAIZ = 'dist/client';
const LARGURAS = [360, 768, 1280, 1920];
const PORTA = 9333;

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
].find((p) => p && existsSync(p));

if (!CHROME) throw new Error('Chrome não encontrado. Defina CHROME_PATH.');

/**
 * O que o navegador mede em cada rota e largura.
 *
 * TRÊS BALDES, E NÃO UMA LISTA DE "VAZANDO" (corrigido na Etapa 12)
 *
 * A versão anterior isentava apenas o elemento dentro de contêiner que ROLA, e
 * acusava todo o resto. Isso reprovava a marca-d'água do hero — `aria-hidden`,
 * opacidade 0,06 — que sangra de propósito para fora da borda dentro de uma
 * seção com `overflow-x: hidden`, sem causar scroll e sem esconder nada.
 *
 * Pior: num balde só, esse caso inofensivo ficava misturado com o caso GRAVE,
 * que é conteúdo real cortado por `overflow: hidden` sem poder rolar — texto ou
 * tabela que o usuário não alcança. Os dois têm a mesma geometria e
 * consequências opostas.
 *
 * E `scrollWidth > clientWidth` NÃO prova que rola: `overflow: hidden` também
 * cria contêiner de rolagem, só que sem barra e sem gesto que chegue lá.
 * Medido: uma tabela de 2000px dentro de um `overflow-x: hidden` de 200px
 * reportava "rola", e o portão passava numa tabela inalcançável. Daí o
 * `overflowX` ter de ser `auto` ou `scroll`.
 */
export const CODIGO = `(() => {
  const de = document.documentElement;

  /** Ancestral mais próximo que não deixa o conteúdo transbordar. */
  const contencao = (el) => {
    let n = el.parentElement;
    while (n && n !== de) {
      const ov = getComputedStyle(n).overflowX;
      if (ov !== 'visible') {
        const rola = (ov === 'auto' || ov === 'scroll') && n.scrollWidth > n.clientWidth;
        return {
          por: n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(' ')[0] : ''),
          overflowX: ov,
          alcancavel: rola,
        };
      }
      n = n.parentElement;
    }
    return null;
  };

  /** Decorativo: escondido da acessibilidade, ou quase transparente. */
  const decorativo = (el) =>
    Boolean(el.closest('[aria-hidden="true"]')) || Number(getComputedStyle(el).opacity) <= 0.1;

  const estouraViewport = [];
  const conteudoCortado = [];
  const sangriaDecorativa = [];
  const passamDaBorda = [];

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= de.clientWidth + 1 && r.left >= -1) continue;

    const nome =
      el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '');

    // Só quem passa da borda DIREITA pode empurrar a página. Deslocamento
    // negativo não gera scroll em LTR — é assim que se esconde conteúdo fora
    // da tela.
    if (r.right > de.clientWidth + 1) passamDaBorda.push(nome);

    // DECORATIVO É TESTADO PRIMEIRO, e não depois da contenção.
    //
    // Na ordem anterior o honeypot do formulário de contato reprovava o portão
    // nas quatro larguras: ele é 1×1px em \`left: -9999px\`, com
    // \`aria-hidden="true"\` e \`tabindex="-1"\`, e nenhum ancestral o recorta —
    // então caía em "estoura o viewport" sem ter empurrado nada. Esconder
    // conteúdo fora da tela pela esquerda é técnica padrão, não quebra.
    //
    // Isso NÃO abre brecha: se um decorativo empurrar a página de verdade,
    // \`scrollHorizontal\` acusa, e \`passamDaBorda\` nomeia o culpado.
    if (decorativo(el)) {
      sangriaDecorativa.push(nome);
      continue;
    }

    const lado = r.right > de.clientWidth + 1 ? 'passa da borda direita' : 'fora da tela à esquerda';

    const c = contencao(el);
    if (c === null) estouraViewport.push(nome + ' (' + lado + ')');
    else if (c.alcancavel) continue;
    else conteudoCortado.push(nome + ' cortado por ' + c.por + ' (' + c.overflowX + ')');
  }

  const tabelas = [...document.querySelectorAll('table')].map((t) => {
    const cont = t.closest('table-scroller') ?? t.parentElement;
    const ov = cont ? getComputedStyle(cont).overflowX : 'visible';
    const podeRolar = ov === 'auto' || ov === 'scroll';
    return {
      colunas: t.querySelectorAll('thead th').length,
      linhas: t.querySelectorAll('tbody tr').length,
      largura: Math.round(t.scrollWidth),
      visivel: cont ? cont.clientWidth : 0,
      overflowX: ov,
      rolaNoContainer: podeRolar && cont.scrollWidth > cont.clientWidth,
      cabe: cont ? t.scrollWidth <= cont.clientWidth + 1 : false,
    };
  });

  const unico = (a) => [...new Set(a)];

  return {
    // Onde a medição REALMENTE aconteceu. Ver a checagem de desvio no runner.
    urlMedida: location.pathname,
    largura: window.innerWidth,
    scrollHorizontal: de.scrollWidth > de.clientWidth ? de.scrollWidth - de.clientWidth : 0,
    estouraViewport: unico(estouraViewport),
    conteudoCortado: unico(conteudoCortado),
    sangriaDecorativa: unico(sangriaDecorativa).length,
    // Só serve quando scrollHorizontal > 0: aí é a lista de suspeitos.
    passamDaBorda: unico(passamDaBorda),
    tabelas,
    // A tabela precisa CABER ou ROLAR. Nunca ficar cortada sem saída.
    tabelaInalcancavel: tabelas.some((t) => !t.cabe && !t.rolaNoContainer),
  };
})()`;

// Só imprime o código, para colar no console do navegador:
//   node scripts/check-responsivo.mjs --codigo
if (process.argv.includes('--codigo')) {
  console.log(CODIGO);
  process.exit(0);
}

/**
 * Rotas do build.
 *
 * FORA: `/keystatic` e `/admin`. O painel é ferramenta interna de edição, não é
 * o site — o CLAUDE.md diz isso na nota da Etapa 11 — e seu layout é do
 * `@keystar/ui`, que não passa por nenhuma decisão deste repositório. O
 * `/admin` sai junto porque é só um <meta refresh> de 0s para o painel: medi-lo
 * é medir o painel.
 */
const rotas = readdirSync(RAIZ, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(e.parentPath, e.name).replaceAll('\\', '/'))
  .map((p) =>
    p
      .replace(RAIZ, '')
      .replace(/\/index\.html$/, '/')
      .replace(/\.html$/, ''),
  )
  .filter((r) => !r.startsWith('/keystatic') && !r.startsWith('/admin'))
  .sort();

if (rotas.length === 0) throw new Error(`nenhuma rota em ${RAIZ}. Rode "npm run build".`);

const perfil = mkdtempSync(join(tmpdir(), 'resp-'));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

/** Espera o CDP responder. O Chrome demora ~1s para abrir a porta. */
const alvo = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/json/list`);
      const abas = await r.json();
      const pagina = abas.find((a) => a.type === 'page');
      if (pagina) return pagina;
    } catch {
      // Porta ainda fechada. Aqui o catch silencioso é honesto: a espera é
      // limitada, e quando ela acaba o erro abaixo é explícito.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('o Chrome não abriu a porta de depuração');
})();

const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((ok, erro) => {
  ws.addEventListener('open', ok, { once: true });
  ws.addEventListener('error', () => erro(new Error('WebSocket do CDP recusado')), { once: true });
});

let seq = 0;
const pendentes = new Map();
const eventos = new Map();

ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id !== undefined) {
    const p = pendentes.get(m.id);
    pendentes.delete(m.id);
    if (m.error) p.erro(new Error(`${m.error.message} (CDP)`));
    else p.ok(m.result);
  } else {
    for (const f of eventos.get(m.method) ?? []) f(m.params);
  }
});

/** Uma chamada do CDP. */
const cdp = (method, params = {}) =>
  new Promise((ok, erro) => {
    const id = ++seq;
    pendentes.set(id, { ok, erro });
    ws.send(JSON.stringify({ id, method, params }));
  });

/** Espera um evento do CDP, com prazo. */
const esperar = (method, ms = 20000) =>
  new Promise((ok, erro) => {
    const f = () => {
      clearTimeout(t);
      eventos.set(
        method,
        (eventos.get(method) ?? []).filter((x) => x !== f),
      );
      ok();
    };
    const t = setTimeout(() => erro(new Error(`${method} não veio em ${ms}ms`)), ms);
    eventos.set(method, [...(eventos.get(method) ?? []), f]);
  });

await cdp('Page.enable');
await cdp('Runtime.enable');

/** Roda o medidor na página que estiver aberta. */
const medir = async () => {
  const { result, exceptionDetails } = await cdp('Runtime.evaluate', {
    expression: CODIGO,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

/** Monta markup de teste e devolve a medição, desfazendo tudo depois. */
const medirCom = async (montagem) => {
  // MARKUP POR CSSOM, NUNCA POR ATRIBUTO `style`: a CSP do site emite
  // `style-src 'self'`, e o `style-src-attr` cai nesse fallback — o navegador
  // DESCARTA todo atributo `style`. A primeira versão destas provas usava
  // `innerHTML` com `style="width:3000px"` e media 200px, o que fez as provas
  // passarem por vacuidade em vez de por acerto.
  const { result, exceptionDetails } = await cdp('Runtime.evaluate', {
    expression: `(() => {
      const div = (css, pai) => {
        const d = document.createElement('div');
        d.style.cssText = css;
        (pai ?? document.body).append(d);
        return d;
      };
      const raiz = ${montagem};
      const medida = ${CODIGO};
      raiz.remove();
      return medida;
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

/**
 * AUTOVERIFICAÇÃO, EM TODA EXECUÇÃO.
 *
 * Um portão que não reprova nada não é um portão — é uma frase. Estas provas
 * injetam a quebra que cada balde existe para pegar e exigem que ele dispare.
 * Rodam sempre, e não sob uma flag, porque o risco não é o portão nascer
 * vacuoso: é ele FICAR vacuoso numa correção futura, silenciosamente. Já
 * aconteceu duas vezes neste arquivo — o `overflow: hidden` passando por "rola",
 * e a ordem de testes que reprovava o honeypot.
 */
const PROVAS = [
  {
    nome: 'largura sem contenção reprova, e nomeia o culpado',
    montagem: `(() => { const d = div('width:4000px;height:20px'); d.className = 'quebra'; return d; })()`,
    exige: (m) =>
      m.estouraViewport.length > 0 && m.scrollHorizontal > 0 && m.passamDaBorda.length > 0,
  },
  {
    nome: 'conteúdo real cortado por overflow:hidden reprova',
    montagem: `(() => {
      const c = div('overflow-x:hidden;width:200px');
      const a = div('width:3000px;max-width:none;height:20px', c);
      a.className = 'inalcancavel';
      a.textContent = 'conteudo que ninguem alcanca';
      return c;
    })()`,
    exige: (m) => m.conteudoCortado.length > 0 && m.estouraViewport.length === 0,
  },
  {
    nome: 'mesma geometria, mas aria-hidden, NÃO reprova',
    montagem: `(() => {
      const c = div('overflow-x:hidden;width:200px');
      c.setAttribute('aria-hidden', 'true');
      div('width:3000px;max-width:none;height:20px', c);
      return c;
    })()`,
    exige: (m) =>
      m.conteudoCortado.length === 0 && m.estouraViewport.length === 0 && m.sangriaDecorativa > 0,
  },
  {
    nome: 'honeypot 1×1 em left:-9999px NÃO reprova',
    montagem: `(() => {
      const c = div('position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden');
      c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<label>isca</label><input tabindex="-1">';
      return c;
    })()`,
    exige: (m) =>
      m.estouraViewport.length === 0 && m.conteudoCortado.length === 0 && m.scrollHorizontal === 0,
  },
  {
    // ESTA PROVA GUARDA O BACKSTOP.
    //
    // `contencao()` percorre ANCESTRAIS e presume que `overflow` recorta. Isso
    // é falso para um `position: absolute` cujo bloco contentor fica FORA do
    // contêiner de rolagem: sem ancestral posicionado, o bloco contentor dele é
    // o ICB, e o recorte não se aplica. Foi o defeito real do /orcamento a
    // 360px — os `<label class="sr-only">` das células punham o documento em
    // 645px contra 360px de viewport, e os baldes por elemento davam o
    // scroller como contenção suficiente.
    //
    // Quem pegou foi a medida de DOCUMENTO, `scrollHorizontal`. Ela não pode
    // ser removida em nome de "os baldes já cobrem", e é isto que esta prova
    // impede.
    nome: 'absoluto que escapa do scroller é pego pela medida de documento',
    montagem: `(() => {
      const c = div('overflow-x:auto;width:200px');
      // O padding empurra a POSIÇÃO ESTÁTICA do absoluto para longe da borda,
      // como a largura da tabela fazia com o rótulo da última coluna. Sem isso
      // o fugitivo nasce em x≈0 e não estoura nada — a prova passava por
      // acidente de montagem, e não por acerto.
      const largo = div('width:3000px;height:20px;max-width:none;padding-left:2500px', c);
      const fugitivo = div('position:absolute;width:1px;height:1px;overflow:hidden', largo);
      fugitivo.textContent = 'rotulo de leitor de tela';
      return c;
    })()`,
    exige: (m) => m.scrollHorizontal > 0 && m.passamDaBorda.length > 0,
  },
  {
    nome: 'contêiner que ROLA não reprova',
    montagem: `(() => {
      const c = div('overflow-x:auto;width:200px');
      div('width:3000px;max-width:none;height:20px', c);
      return c;
    })()`,
    exige: (m) => m.estouraViewport.length === 0 && m.conteudoCortado.length === 0,
  },
  {
    nome: 'tabela larga em overflow:hidden é reprovada como inalcançável',
    montagem: `(() => {
      const c = div('overflow-x:hidden;width:200px');
      const t = document.createElement('table');
      t.style.cssText = 'min-width:2000px;max-width:none';
      t.innerHTML = '<thead><tr><th>a</th></tr></thead><tbody><tr><td>x</td></tr></tbody>';
      c.append(t);
      return c;
    })()`,
    exige: (m) => m.tabelaInalcancavel === true,
  },
  {
    nome: 'a MESMA tabela em overflow:auto passa',
    montagem: `(() => {
      const c = div('overflow-x:auto;width:200px');
      const t = document.createElement('table');
      t.style.cssText = 'min-width:2000px;max-width:none';
      t.innerHTML = '<thead><tr><th>a</th></tr></thead><tbody><tr><td>x</td></tr></tbody>';
      c.append(t);
      return c;
    })()`,
    exige: (m) => m.tabelaInalcancavel === false && m.tabelas[0].rolaNoContainer === true,
  },
];

await cdp('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
const carregouProva = esperar('Page.loadEventFired');
await cdp('Page.navigate', { url: `${BASE}/` });
await carregouProva;

const limpo = await medir();
if (limpo.estouraViewport.length > 0 || limpo.conteudoCortado.length > 0) {
  throw new Error(`a home já reprova antes das provas: ${JSON.stringify(limpo)}`);
}

console.log('Autoverificação do medidor:');
const provasQuebradas = [];
for (const p of PROVAS) {
  const m = await medirCom(p.montagem);
  const passou = p.exige(m);
  console.log(`  ${passou ? 'ok' : 'X '} ${p.nome}`);
  if (!passou) provasQuebradas.push(`${p.nome} — medido: ${JSON.stringify(m)}`);
}
if (provasQuebradas.length > 0) {
  console.error('\nO MEDIDOR ESTÁ QUEBRADO. O portão não vale nada assim:');
  for (const q of provasQuebradas) console.error(`  X ${q}`);
  ws.close();
  chrome.kill();
  process.exit(1);
}
console.log('');

const falhas = [];
const relatorio = [];

console.log(
  `${rotas.length} rotas × ${LARGURAS.join(' · ')}px = ` +
    `${rotas.length * LARGURAS.length} medições\n`,
);

for (const rota of rotas) {
  const linha = [];
  let reprovou = false;

  for (const largura of LARGURAS) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: largura,
      height: largura < 768 ? 780 : 1000,
      deviceScaleFactor: 1,
      mobile: largura < 768,
    });

    const carregou = esperar('Page.loadEventFired');
    await cdp('Page.navigate', { url: BASE + rota });
    await carregou;
    // A fonte e o script de ilha ainda podem mexer no layout depois do load.
    await new Promise((r) => setTimeout(r, 350));

    const m = await medir().catch((e) => {
      throw new Error(`${rota} @${largura}: ${e.message}`);
    });

    const problemas = [];

    // MEDIU A PÁGINA CERTA? Uma rota pode escapar por baixo do medidor: o
    // `/admin` tem <meta refresh> de 0s para o painel, e nos 350ms de espera o
    // navegador já estava em /keystatic — eu reprovava o portão com o overflow
    // do @keystar/ui, num painel que este portão nem cobre. Sem esta checagem o
    // erro é invisível, porque o relatório imprime o nome da rota PEDIDA.
    if (m.urlMedida !== rota && m.urlMedida !== rota.replace(/\/$/, '')) {
      problemas.push(`a medição caiu em ${m.urlMedida}, não em ${rota}`);
    }

    if (m.scrollHorizontal > 0) {
      problemas.push(
        `scroll horizontal +${m.scrollHorizontal}px ` +
          `(passam da borda: ${m.passamDaBorda.join(', ') || 'nenhum elemento — é margem ou padding'})`,
      );
    }
    for (const e of m.estouraViewport) problemas.push(`estoura: ${e}`);
    for (const c of m.conteudoCortado) problemas.push(c);
    if (m.tabelaInalcancavel) problemas.push('tabela cortada sem poder rolar');

    if (problemas.length > 0) {
      reprovou = true;
      falhas.push(`${rota} @${largura}px — ${problemas.join('; ')}`);
    }

    const t = m.tabelas[0];
    linha.push(
      `${largura}:${problemas.length === 0 ? 'ok' : 'X'}` +
        (t ? `(tab ${t.largura}/${t.visivel}${t.rolaNoContainer ? ' rola' : ''})` : ''),
    );
    relatorio.push({ rota, largura, ...m });
  }

  console.log(`${reprovou ? 'X ' : '  '}${rota.padEnd(44)} ${linha.join('  ')}`);
}

/**
 * CENÁRIOS DE ESTADO.
 *
 * A varredura acima pega a página como ela chega ao visitante novo, e por isso
 * mediu o `/orcamento` com `tab 0/0`: a tabela da lista SÓ EXISTE com itens, e
 * um localStorage vazio a deixa em `display: none`. A tabela mais importante do
 * site — a que o serralheiro edita antes de enviar o pedido — estava fora do
 * portão.
 *
 * Aqui a lista é semeada e a página recarregada, para o script de boot achar o
 * estado "ativo" antes da primeira pintura. Os nomes e medidas são longos de
 * propósito: é o pior caso de largura de coluna.
 */
const ITENS_DE_TESTE = [
  {
    productSlug: 'chapa-fina-a-frio',
    productName: 'Chapa Fina a Frio',
    dimension: '2000 × 1000 mm — 1,20 mm',
    quantity: 12,
    unit: 'chapa',
    note: 'Cortar ao meio no sentido do comprimento, se possível',
  },
  {
    productSlug: 'barra-chata-galvanizada',
    productName: 'Barra Chata Galvanizada',
    dimension: '50 × 6 mm',
    length: '6 m',
    quantity: 40,
    unit: 'barra',
  },
  {
    productSlug: 'tela-alambrado',
    productName: 'Tela Alambrado Galvanizada',
    dimension: '2 m × 25 m — fio 12',
    quantity: 3,
    unit: 'rolo',
    note: '',
  },
];

const CENARIOS = [
  {
    rota: '/orcamento/',
    nome: 'lista de orçamento com 3 itens',
    preparo: `localStorage.setItem(
      'aldifer:quote:v1',
      JSON.stringify({ savedAt: Date.now(), items: ${JSON.stringify(ITENS_DE_TESTE)} })
    )`,
  },
];

console.log('');
for (const cenario of CENARIOS) {
  const linha = [];
  let reprovou = false;

  for (const largura of LARGURAS) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: largura,
      height: largura < 768 ? 780 : 1000,
      deviceScaleFactor: 1,
      mobile: largura < 768,
    });

    let carregou = esperar('Page.loadEventFired');
    await cdp('Page.navigate', { url: BASE + cenario.rota });
    await carregou;

    const { exceptionDetails } = await cdp('Runtime.evaluate', { expression: cenario.preparo });
    if (exceptionDetails) throw new Error(`preparo de ${cenario.nome}: ${exceptionDetails.text}`);

    // Recarrega para o script de boot ler o localStorage já semeado.
    carregou = esperar('Page.loadEventFired');
    await cdp('Page.reload', { ignoreCache: true });
    await carregou;
    await new Promise((r) => setTimeout(r, 350));

    const m = await medir();
    const problemas = [];
    if (m.scrollHorizontal > 0) {
      problemas.push(
        `scroll horizontal +${m.scrollHorizontal}px (${m.passamDaBorda.join(', ') || 'margem/padding'})`,
      );
    }
    for (const e of m.estouraViewport) problemas.push(`estoura: ${e}`);
    for (const c of m.conteudoCortado) problemas.push(c);
    if (m.tabelaInalcancavel) problemas.push('tabela cortada sem poder rolar');

    // O cenário só vale se o estado realmente entrou. Sem isto ele passaria
    // medindo a mesma página vazia da varredura, e eu não saberia.
    const t = m.tabelas[0];
    if (!t || t.linhas !== ITENS_DE_TESTE.length) {
      problemas.push(`a lista não foi semeada: ${t ? t.linhas : 0} linha(s) na tabela`);
    }

    if (problemas.length > 0) {
      reprovou = true;
      falhas.push(`${cenario.nome} @${largura}px — ${problemas.join('; ')}`);
    }

    linha.push(
      `${largura}:${problemas.length === 0 ? 'ok' : 'X'}` +
        (t ? `(tab ${t.largura}/${t.visivel}${t.rolaNoContainer ? ' rola' : ''})` : '(sem tabela)'),
    );
  }

  console.log(`${reprovou ? 'X ' : '  '}${cenario.nome.padEnd(44)} ${linha.join('  ')}`);
}

ws.close();
chrome.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch (erro) {
  // O Chrome ainda pode estar soltando o perfil no Windows. Avisa e segue: é
  // lixo em %TEMP%, não é resultado do portão.
  console.log(`\n(perfil temporário não removido: ${erro.code ?? erro.message})`);
}

const comTabela = relatorio.filter((r) => r.tabelas.length > 0 && r.largura === 360);
console.log(`\nTabela de bitola em 360px — ${comTabela.length} rota(s):`);
for (const r of comTabela.slice(0, 6)) {
  const t = r.tabelas[0];
  console.log(
    `  ${r.rota.padEnd(38)} ${t.colunas} col × ${String(t.linhas).padStart(2)} lin  ` +
      `${t.largura}px em ${t.visivel}px  ${t.rolaNoContainer ? 'rola' : 'CABE'}`,
  );
}
if (comTabela.length > 6) console.log(`  ... e ${comTabela.length - 6} outras, mesma medida`);

const decorativas = relatorio.reduce((n, r) => n + r.sangriaDecorativa, 0);
console.log(`\nSangrias decorativas ignoradas: ${decorativas} (marca-d'água do hero)`);

console.log('');
if (falhas.length > 0) {
  console.error(`${falhas.length} FALHA(S):`);
  for (const f of falhas) console.error(`  X ${f}`);
  process.exitCode = 1;
} else {
  console.log(`${relatorio.length} medições sem quebra, sem scroll horizontal e sem corte.`);
}
