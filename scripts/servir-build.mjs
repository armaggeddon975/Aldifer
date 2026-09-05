// Serve dist/client como arquivo estático, só para VERIFICAR a CSP num
// navegador de verdade.
//
// Existe porque a CSP do Astro é um <meta> gerado no BUILD: o servidor de
// desenvolvimento não a emite, e `astro preview` não funciona com o adapter da
// Vercel. Sem isto, a única forma de testar a política seria em produção.
//
// As rotas /api/* não existem aqui — são renderizadas sob demanda. O que este
// servidor exercita é script, estilo, fonte, imagem e iframe, que é onde a CSP
// quebra o site quando está errada.
//
//   npm run servir
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const RAIZ = 'dist/client';
const PORTA = Number(process.env.PORT ?? 4330);

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

createServer((req, res) => {
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
