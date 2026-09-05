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

      res.writeHead(resposta.status, Object.fromEntries(resposta.headers));
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

  res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
  createReadStream(arquivo).pipe(res);
}).listen(PORTA, () => {
  console.log(`build de produção em http://localhost:${PORTA}`);
});
