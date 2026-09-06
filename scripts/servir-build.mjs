// Serve dist/client como arquivo estático, só para VERIFICAR a CSP num
// navegador de verdade.
//
// Existe porque a CSP do Astro é um <meta> gerado no BUILD: o servidor de
// desenvolvimento não a emite, e `astro preview` não funciona com o adapter da
// Vercel. Sem isto, a única forma de testar a política seria em produção.
//
// As rotas SOB DEMANDA — /api/orcamento, /api/contato e o painel em
// /keystatic — são atendidas pelo HANDLER DE PRODUÇÃO da Vercel, importado de
// .vercel/output. Não é imitação: é o mesmo código que a Vercel executa.
//
// Isso importa porque a CSP dessas rotas vem como CABEÇALHO, montado em tempo
// de execução, e não no <meta> das páginas estáticas. Sem isto, a única forma
// de testar a política do painel seria em produção — e foi assim que descobri
// que ela bloqueava o estilo do Keystatic.
//
//   npm run servir
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const RAIZ = 'dist/client';
const PORTA = Number(process.env.PORT ?? 4330);
const HANDLER = '../.vercel/output/functions/_render.func/.vercel/output/server/entry.mjs';

/**
 * Handler de produção, para as rotas renderizadas sob demanda.
 *
 * Carregado com tolerância: sem `npm run build` ele não existe, e o servidor
 * ainda serve o estático. Mas diz o que faltou, em vez de responder 404 e
 * deixar quem testa procurando o motivo.
 */
let ondemand = null;
try {
  const mod = await import(HANDLER);
  ondemand = mod.default;
  console.log('handler de produção carregado: /api/* e /keystatic respondem de verdade');
} catch (erro) {
  console.error(`handler de produção NÃO carregado: ${String(erro).slice(0, 100)}`);
  console.error('rode "npm run build"; sem ele /api/* e /keystatic dão 404.');
}

/** Rotas que o build marca como `prerender = false`. */
const SOB_DEMANDA = /^\/(api\/|keystatic(\/|$))/;

/**
 * Tipos que a Vercel comprime e que este servidor precisa comprimir também.
 *
 * SEM ISSO A MEDIÇÃO MENTE. Descoberto rodando o Lighthouse da Etapa 12: sem
 * compressão, `transferSize` era igual a `resourceSize` em todo recurso — o
 * HTML da home ia com 44 KB em vez de ~9 KB e o CSS com 31,5 em vez de ~6. Com
 * throttling simulado isso infla FCP e LCP, e a nota saía pessimista por
 * defeito do servidor de teste, não do site.
 *
 * woff2, avif, webp, jpeg e png ficam fora: já são comprimidos, e gzipá-los
 * gastaria CPU para aumentar o tamanho.
 */
const COMPRIMIR = /^(text\/|application\/(json|javascript|xml|manifest))/;

/**
 * TODOS os cabeçalhos do vercel.json, lidos do próprio arquivo.
 *
 * POR QUE LER O ARQUIVO EM VEZ DE REPETIR OS VALORES AQUI (Etapa 13)
 *
 * Antes, este servidor só reproduzia o `Cache-Control` imutável, com a regra
 * escrita à mão — porque o Lighthouse audita política de cache e sem ela o
 * relatório acusava um problema que a produção não tem.
 *
 * O efeito colateral é que os NOVE cabeçalhos de segurança do `vercel.json`
 * nunca eram servidos aqui, e portanto nunca foram verificados em
 * COMPORTAMENTO — só lidos do arquivo. HSTS, `X-Frame-Options`,
 * `Referrer-Policy`, `Permissions-Policy`, COOP e o `frame-ancestors` viviam
 * numa configuração que ninguém tinha visto responder. Um erro de digitação em
 * qualquer um deles só apareceria em produção.
 *
 * Agora as regras vêm do arquivo, então `curl -sI http://localhost:4330/`
 * mostra o que a Vercel vai mandar. Valor errado no `vercel.json` é valor
 * errado aqui — que é exatamente o que se quer de um servidor de verificação.
 */
const REGRAS_DE_CABECALHO = (() => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));

  /**
   * Converte o `source` do Vercel em expressão regular.
   *
   * Só o necessário para os padrões que este projeto usa — `/(.*)`,
   * `/fonts/(.*)`, `/admin`. Escapa tudo e devolve `(.*)` ao seu papel de
   * curinga. Um padrão mais exótico no vercel.json exigiria path-to-regexp, e
   * aí é melhor falhar visível do que casar errado em silêncio.
   */
  const paraRegex = (source) => {
    if (/[:?+{}[\]]/.test(source)) {
      throw new Error(
        `padrão de cabeçalho não suportado por este servidor de teste: "${source}". ` +
          'Ele reconhece caminho literal e "(.*)".',
      );
    }
    // Escapa tudo, e só então devolve `(.*)` ao papel de curinga.
    const escapado = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const corpo = escapado.replaceAll('\\(\\.\\*\\)', '(.*)');
    return new RegExp(`^${corpo}$`);
  };

  /*
    TODOS os cabeçalhos vão, o HSTS INCLUSO — e isso foi uma decisão testada.

    Sobre transporte inseguro o navegador DEVE ignorar
    `Strict-Transport-Security`, então em http://localhost ele é inerte. Cheguei
    a filtrá-lo daqui suspeitando que fosse a causa das falhas de gravação de
    trace do Lighthouse (`NO_NAVSTART`), que aconteceram em 22 de 42 execuções.

    A HIPÓTESE FOI MEDIDA E REFUTADA. Mesma rota, mesma build, 6 execuções em
    cada servidor:

      com HSTS     2 de 6 falharam
      sem HSTS     4 de 6 falharam

    Ou seja: o cabeçalho não tem relação com a falha, que é instabilidade do
    Chrome headless nesta máquina. O portão lida com ela repetindo a execução
    que não mediu — ver scripts/check-lighthouse.mjs.

    Então o cabeçalho fica, porque o objetivo deste servidor é reproduzir a
    resposta da produção. Filtrar um cabeçalho reduziria a fidelidade em troca
    de nada.
  */
  return (config.headers ?? []).map((bloco) => ({
    padrao: paraRegex(bloco.source),
    cabecalhos: bloco.headers.map((h) => [h.key.toLowerCase(), h.value]),
  }));
})();

/**
 * Cabeçalhos do vercel.json que casam com um caminho.
 *
 * A Vercel aplica TODAS as regras que casam, e um cabeçalho repetido vira duas
 * linhas na resposta. Isso importa para a CSP: a regra global manda
 * `frame-ancestors 'none'`, e o middleware do painel manda a política dele —
 * duas linhas de CSP significam que AS DUAS valem, o que é o comportamento
 * seguro. Daí o valor ser acumulado em array em vez de sobrescrito.
 */
function cabecalhosDoVercel(caminho, base = {}) {
  const saida = { ...base };
  for (const regra of REGRAS_DE_CABECALHO) {
    if (!regra.padrao.test(caminho)) continue;
    for (const [chave, valor] of regra.cabecalhos) {
      const atual = saida[chave];
      if (atual === undefined) saida[chave] = valor;
      else if (Array.isArray(atual)) saida[chave] = [...atual, valor];
      else if (atual !== valor) saida[chave] = [atual, valor];
    }
  }
  return saida;
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Junta o corpo da requisição, para repassar POST ao handler. */
const lerCorpo = (req) =>
  new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });

const resolver = (url) => {
  // normalize + a checagem de prefixo barram travessia por "..".
  const limpo = normalize(decodeURIComponent(url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const base = join(RAIZ, limpo);
  if (!base.startsWith(normalize(RAIZ))) return null;

  for (const tentativa of [base, join(base, 'index.html'), `${base}.html`]) {
    if (existsSync(tentativa) && statSync(tentativa).isFile()) return tentativa;
  }
  return null;
};

/**
 * Redirects do vercel.json, aplicados aqui também.
 *
 * A Vercel só os aplica em produção, e sem isto os 117 redirects da Etapa 10
 * seriam verificados apenas como CONFIGURAÇÃO — nunca como comportamento.
 * Aqui dá para pedir /barra-chata.php e ver o 301 chegar, seguir o Location e
 * confirmar que o destino responde 200. É o que o aceite chama de "nenhuma URL
 * antiga em 404".
 *
 * NÃO é uma reimplementação da Vercel: só o casamento exato de caminho, que é
 * tudo o que este vercel.json usa — nenhum redirect dele tem regex.
 */
const redirects = new Map();
try {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  for (const r of config.redirects ?? []) {
    redirects.set(r.source, { to: r.destination, status: r.statusCode ?? 308 });
  }
  console.log(`${redirects.size} redirects carregados do vercel.json`);
} catch (erro) {
  // Diz QUAL foi o erro. A primeira versão engolia em silêncio e eu perdi
  // tempo achando que os 117 redirects estavam errados quando o problema era
  // um import faltando — exatamente o defeito que o parser de contraste da
  // Etapa 1 tinha.
  console.error(`vercel.json não lido: ${String(erro).slice(0, 120)}`);
  console.error('servindo SEM redirects — o teste de redirects vai reprovar.');
}

createServer(async (req, res) => {
  const caminhoPedido = (req.url ?? '/').split('?')[0];
  const redirect = redirects.get(caminhoPedido);
  if (redirect) {
    res.writeHead(redirect.status, { location: redirect.to }).end();
    return;
  }

  // Sob demanda ANTES do estático: /keystatic não tem arquivo em dist/client.
  if (SOB_DEMANDA.test(caminhoPedido)) {
    if (!ondemand) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('handler de produção não carregado — rode "npm run build"');
      return;
    }

    try {
      const corpo =
        req.method === 'GET' || req.method === 'HEAD' ? undefined : await lerCorpo(req);

      const resposta = await ondemand.fetch(
        new Request(`http://localhost:${PORTA}${req.url}`, {
          method: req.method,
          headers: Object.entries(req.headers).flatMap(([k, v]) =>
            typeof v === 'string' ? [[k, v]] : (v ?? []).map((x) => [k, x]),
          ),
          body: corpo,
        }),
      );

      // Os cabeçalhos da configuração valem também para a rota sob demanda.
      res.writeHead(
        resposta.status,
        cabecalhosDoVercel(caminhoPedido, Object.fromEntries(resposta.headers)),
      );
      res.end(Buffer.from(await resposta.arrayBuffer()));
    } catch (erro) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`handler falhou: ${String(erro).slice(0, 300)}`);
    }
    return;
  }

  const arquivo = resolver(req.url ?? '/');

  if (!arquivo) {
    const erro = join(RAIZ, '404.html');
    if (existsSync(erro)) {
      res.writeHead(404, { 'content-type': TIPOS['.html'] });
      createReadStream(erro).pipe(res);
      return;
    }
    res.writeHead(404).end('404');
    return;
  }

  const tipo = TIPOS[extname(arquivo)] ?? 'application/octet-stream';
  const cabecalhos = cabecalhosDoVercel(caminhoPedido, { 'content-type': tipo });

  const aceitaGzip = (req.headers['accept-encoding'] ?? '').includes('gzip');

  if (aceitaGzip && COMPRIMIR.test(tipo)) {
    const comprimido = gzipSync(readFileSync(arquivo));
    res.writeHead(200, {
      ...cabecalhos,
      'content-encoding': 'gzip',
      'content-length': comprimido.length,
      vary: 'accept-encoding',
    });
    res.end(comprimido);
    return;
  }

  res.writeHead(200, cabecalhos);
  createReadStream(arquivo).pipe(res);
}).listen(PORTA, () => {
  console.log(`build de produção em http://localhost:${PORTA}`);
});
