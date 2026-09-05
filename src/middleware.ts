import { defineMiddleware } from 'astro:middleware';

/**
 * Ajusta a Content-Security-Policy nas rotas do painel de edição.
 *
 * O PROBLEMA, descoberto renderizando o handler de produção da Vercel:
 * `security.csp` do Astro entrega a política como CABEÇALHO nas rotas
 * renderizadas sob demanda, e `/keystatic` é uma delas. A política do site é
 * `default-src 'none'` com `style-src` liberado apenas por HASH.
 *
 * O painel do Keystatic é uma aplicação React sobre `@keystar/ui`, que injeta
 * estilo em tempo de execução. Estilo injetado não tem hash calculável no
 * build, então a política do site o bloqueava: o painel abria com
 * `font-family: "Times New Roman"` e sem fundo — texto cru empilhado.
 *
 * O ERRO QUE EU COMETI NA PRIMEIRA TENTATIVA, e que o navegador explicou:
 *
 *   "Note that 'unsafe-inline' is ignored if either a hash or nonce value is
 *    present in the source list."
 *
 * Acrescentar `'unsafe-inline'` ao lado dos hashes NÃO FAZ NADA. É preciso
 * SUBSTITUIR a diretiva de estilo, tirando os hashes. Só nas rotas do painel.
 *
 * O que continua protegido, e é o que mais vale:
 *
 * - `script-src` fica travado nos hashes que o Astro calculou. O painel não
 *   precisa de script inline, e é por script que se executa código.
 * - `default-src 'none'` continua valendo para tudo que não é liberado.
 * - As 16 páginas públicas NÃO são afetadas: são HTML pré-gerado e levam a
 *   política num `<meta>`, que middleware nenhum alcança. Verificado.
 */

/** Rotas do painel e da API dele. */
const PAINEL = /^\/(keystatic|api\/keystatic)(\/|$)/;

/**
 * Estilo do painel: injetado em tempo de execução, sem hash possível.
 *
 * SEM `https://fonts.googleapis.com`, de propósito. O painel tenta carregar a
 * Inter do Google e essa folha é bloqueada — de caso pensado. O CLAUDE.md
 * decide "nada de Google Fonts por CDN", e liberar aqui faria o navegador da
 * Aldifer falar com o Google a cada abertura do painel. O que se perde é a
 * fonte de uma ferramenta interna: o painel usa a fonte do sistema e continua
 * inteiramente estilizado, porque cor, espaçamento e layout vêm do CSS
 * injetado, que está liberado.
 */
const ESTILO_DO_PAINEL = "'self' 'unsafe-inline'";

/** Endereços que o modo GitHub do Keystatic precisa alcançar. */
const GITHUB_API = 'https://api.github.com';
const GITHUB_WEB = 'https://github.com';
const GITHUB_AVATARS = 'https://avatars.githubusercontent.com';

/** Separa a política em diretivas, preservando a ordem. */
const separar = (politica: string) =>
  politica
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);

const nomeDa = (diretiva: string) => diretiva.split(/\s+/)[0] ?? '';

/**
 * SUBSTITUI a diretiva por outra lista de fontes.
 *
 * É diferente de ampliar: aqui os hashes são REMOVIDOS, porque a presença de
 * um hash faz o navegador ignorar `'unsafe-inline'`.
 */
function substituirDiretiva(partes: string[], nome: string, fontes: string): string[] {
  const indice = partes.findIndex((p) => nomeDa(p) === nome);
  if (indice === -1) return [...partes, `${nome} ${fontes}`];

  const copia = [...partes];
  copia[indice] = `${nome} ${fontes}`;
  return copia;
}

/** Acrescenta fontes a uma diretiva, sem tocar no que já está lá. */
function ampliarDiretiva(partes: string[], nome: string, novas: string[]): string[] {
  const indice = partes.findIndex((p) => nomeDa(p) === nome);
  if (indice === -1) return [...partes, `${nome} ${novas.join(' ')}`];

  const atual = partes[indice]!;
  const jaTem = new Set(atual.split(/\s+/).slice(1));
  const faltando = novas.filter((f) => !jaTem.has(f));

  if (faltando.length === 0) return partes;

  const copia = [...partes];
  copia[indice] = `${atual} ${faltando.join(' ')}`;
  return copia;
}

/**
 * Serve ao painel a MESMA Inter que o site já auto-hospeda.
 *
 * O Keystatic pede a Inter ao `fonts.googleapis.com`, que a política bloqueia
 * — e a pilha de fontes dele não tem alternativa razoável: o painel caía em
 * **Times New Roman**, verificado no handler de produção. Serifada num painel
 * de administração parece defeito, e é o que a Aldifer veria ao abrir.
 *
 * Em vez de liberar o Google, declara-se a mesma família apontando para o
 * arquivo que o site já serve de `/fonts`. O Keystatic pede `Inter`, o
 * navegador acha `Inter` na nossa origem, e nada sai para fora.
 *
 * `font-display: swap` para o painel não ficar com texto invisível enquanto a
 * fonte carrega, e `size-adjust` fora: é fonte variável no mesmo arquivo que a
 * home usa, então provavelmente já está em cache.
 */
const FONTE_DO_PAINEL = `<style>
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/inter-latin-wght-normal.woff2') format('woff2-variations');
}
</style>`;

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  if (!PAINEL.test(context.url.pathname)) return response;

  // O painel nunca deve ser indexado, mesmo que o robots.txt seja ignorado.
  response.headers.set('x-robots-tag', 'noindex, nofollow');

  const original = response.headers.get('content-security-policy');
  if (!original) return response;

  let partes = separar(original);

  // Estilo: SUBSTITUI, tirando os hashes — com hash presente o navegador
  // ignora o 'unsafe-inline' e o painel abre sem estilo.
  for (const nome of ['style-src', 'style-src-elem', 'style-src-attr']) {
    partes = substituirDiretiva(partes, nome, ESTILO_DO_PAINEL);
  }

  // Fonte embutida como data: URI pelo pacote da interface.
  partes = ampliarDiretiva(partes, 'font-src', ["'self'", 'data:']);

  // O modo GitHub: a API para ler e gravar arquivos, o site para o login.
  partes = ampliarDiretiva(partes, 'connect-src', ["'self'", GITHUB_API]);
  partes = ampliarDiretiva(partes, 'form-action', ["'self'", GITHUB_WEB]);
  partes = ampliarDiretiva(partes, 'img-src', ["'self'", 'data:', GITHUB_AVATARS]);

  response.headers.set('content-security-policy', partes.join('; '));

  // Injeta o @font-face da Inter local na página HTML do painel.
  //
  // Só em HTML: as respostas de /api/keystatic são JSON, e mexer nelas
  // corromperia o payload. O `<style>` entra antes de `</head>`, onde o
  // 'unsafe-inline' liberado acima o autoriza.
  const tipo = response.headers.get('content-type') ?? '';
  if (!tipo.includes('text/html')) return response;

  const html = await response.text();

  // A página do painel NÃO tem <head>: é um shell mínimo que começa em
  // `<!DOCTYPE html>` e emenda direto nos scripts da ilha, deixando o
  // navegador criar o head implícito. Ancorar em `</head>` não achava nada.
  const ancora = '<!DOCTYPE html>';
  const comFonte = html.startsWith(ancora)
    ? ancora + FONTE_DO_PAINEL + html.slice(ancora.length)
    : FONTE_DO_PAINEL + html;

  const cabecalhos = new Headers(response.headers);
  // O corpo mudou de tamanho; um content-length antigo truncaria a resposta.
  cabecalhos.delete('content-length');

  return new Response(comFonte, {
    status: response.status,
    statusText: response.statusText,
    headers: cabecalhos,
  });
});
