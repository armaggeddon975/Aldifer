/**
 * Mapa de redirects 301 do site antigo.
 *
 * Módulo PURO e testável. Não lê arquivo, não escreve nada: recebe a lista de
 * URLs antigas e a de rotas que EXISTEM, e devolve o mapa. Quem lê e escreve é
 * o script em scripts/gerar-redirects.mjs.
 *
 * Por que isso importa tanto: o site antigo tem 117 URLs `.php` indexadas, e o
 * CLAUDE.md chama a perda desse histórico de "maior causa de queda de tráfego
 * pós-redesenho". Uma URL esquecida vira 404 e o Google a tira do índice.
 *
 * REGRA DURA: nenhum destino pode ser uma rota que não existe. Um 301 para
 * 404 é PIOR que um 404 direto — o Google o registra como soft 404 e ainda
 * gasta orçamento de rastreamento no caminho.
 */

/**
 * Mapa explícito, da seção 9 do docs/CONTEUDO.md.
 *
 * Tem precedência sobre as regras por radical. Toda entrada aqui é uma decisão
 * de conteúdo, não uma dedução: a pessoa que escreveu o CONTEUDO.md sabia que
 * `/chapas-finas-a-frio.php` corresponde a `chapa-fina-a-frio`, no singular.
 */
export const EXPLICIT_MAP: Readonly<Record<string, string>> = {
  // Páginas principais
  '/index.php': '/',
  '/empresa.php': '/empresa',
  '/contato.php': '/contato',
  '/barras.php': '/produtos/barras',
  '/tubos.php': '/produtos/tubos',
  '/chapas.php': '/produtos/chapas',
  '/perfis.php': '/produtos/perfis',
  '/telas.php': '/produtos/telas',
  '/diversos.php': '/produtos/diversos',

  // Páginas de produto
  '/barra-chata.php': '/produtos/barras/barra-chata',
  '/barra-redonda.php': '/produtos/barras/barra-redonda',
  '/barra-quadrada.php': '/produtos/barras/barra-quadrada',
  '/tubo-redondo.php': '/produtos/tubos/tubo-redondo',
  '/tubo-quadrado.php': '/produtos/tubos/tubo-quadrado',
  '/tubo-retangular.php': '/produtos/tubos/tubo-retangular',
  '/chapas-finas-a-frio.php': '/produtos/chapas/chapa-fina-a-frio',
  '/chapas-finas-a-quente.php': '/produtos/chapas/chapa-fina-a-quente',
  '/chapas-xadrez.php': '/produtos/chapas/chapa-xadrez',
  '/chapas-galvanizadas.php': '/produtos/chapas/chapa-galvanizada',
  '/perfil-i.php': '/produtos/perfis/perfil-i',
  '/perfil-i-w.php': '/produtos/perfis/perfil-i',
  '/perfil-i-h-w.php': '/produtos/perfis/perfil-i',
  '/perfil-u.php': '/produtos/perfis/perfil-u',
  '/perfil-t.php': '/produtos/perfis/perfil-t',
  '/cantoneira.php': '/produtos/perfis/cantoneira',
  '/perfil-cantoneira.php': '/produtos/perfis/cantoneira',
  '/tela-ondulada.php': '/produtos/telas/tela-ondulada',
  '/tela-hexagonal.php': '/produtos/telas/tela-hexagonal',
  '/tela-hexagonais.php': '/produtos/telas/tela-hexagonal',
  '/telas-hexagonais.php': '/produtos/telas/tela-hexagonal',
  '/tela-alambrado.php': '/produtos/telas/tela-alambrado',
  '/tela-alambrados.php': '/produtos/telas/tela-alambrado',
  '/telha-galvanizada.php': '/produtos/diversos/telha-galvanizada',
  '/degraus.php': '/produtos/diversos/degraus',
  '/discos-de-corte.php': '/produtos/diversos/discos-de-corte',
  '/eletrodos.php': '/produtos/diversos/eletrodos',
  '/fechaduras.php': '/produtos/diversos/fechaduras',
  '/tintas-e-solventes.php': '/produtos/diversos/tintas-e-solventes',
  '/acessorios.php': '/produtos/diversos/acessorios',

  /**
   * Acrescentadas na Etapa 10, depois de rastrear o site antigo e LER o título
   * de cada página ambígua. Não estavam no CONTEUDO.md porque a lista dele era
   * uma estimativa de ~100 URLs; o rastreamento achou 117.
   */

  // "Chapa Antiderrapante" é o nome comercial da chapa xadrez. A regra por
  // radical a mandaria para /produtos/chapas, que é certo mas menos preciso.
  '/chapa-antiderrapante.php': '/produtos/chapas/chapa-xadrez',

  // "Perfil de Ferro em U" é o perfil U, não a categoria toda.
  '/perfil-de-ferro-em-u.php': '/produtos/perfis/perfil-u',

  // "Viga U Preço" idem. "Viga I" e "Viga H" caem no perfil I, como o
  // CONTEUDO.md já decide para /perfil-i-h-w.php.
  '/viga-u-preco.php': '/produtos/perfis/perfil-u',
  '/viga-i-preco.php': '/produtos/perfis/perfil-i',
  '/viga-h-preco.php': '/produtos/perfis/perfil-i',

  /**
   * `/responsivo.php` NÃO é página de conteúdo: o título vem vazio
   * (`<title> - Aldifer</title>`) e o único h2 está com `display:none`. É
   * sobra de desenvolvimento que entrou no sitemap antigo.
   *
   * Vai para a home, e não para /produtos: mandar uma página vazia para o
   * catálogo daria a ela um destino comercial que ela nunca teve.
   */
  '/responsivo.php': '/',
};

/**
 * Regras por radical, para as ~70 páginas-satélite de keyword.
 *
 * ORDEM ALTERADA em relação ao CONTEUDO.md, de propósito: lá "viga ou perfil"
 * vem antes de "cantoneira", mas o próprio mapa explícito de lá manda
 * `/perfil-cantoneira.php` para a cantoneira. As duas coisas se contradizem, e
 * a leitura que resolve é a do mais específico primeiro — senão qualquer
 * `perfil-cantoneira-*.php` futuro cairia na categoria em vez do produto.
 *
 * Cuidado que a ordem também resolve: "telha" NÃO contém "tela" como
 * substring (t-e-l-h-a contra t-e-l-a), então as duas regras não competem.
 */
export const RADICAL_RULES: readonly { readonly match: string; readonly to: string }[] = [
  { match: 'cantoneira', to: '/produtos/perfis/cantoneira' },
  { match: 'viga', to: '/produtos/perfis' },
  { match: 'perfil', to: '/produtos/perfis' },
  { match: 'chapa', to: '/produtos/chapas' },
  { match: 'tubo', to: '/produtos/tubos' },
  { match: 'barra', to: '/produtos/barras' },
  { match: 'telha', to: '/produtos/diversos/telha-galvanizada' },
  { match: 'tela', to: '/produtos/telas' },
  { match: 'degrau', to: '/produtos/diversos/degraus' },
];

/** Destino de quem não casa com radical nenhum: distribuidor, comercio, ferro-e-aco. */
export const FALLBACK = '/produtos';

export type Redirect = {
  readonly from: string;
  readonly to: string;
  /** Como o destino foi decidido, para o relatório. */
  readonly source: 'explicito' | 'radical' | 'fallback';
  /** Destino que a regra pedia, quando ele não existe e houve rebaixamento. */
  readonly intended?: string;
};

/**
 * Sobe na hierarquia até achar uma rota que EXISTE.
 *
 * `/produtos/chapas/chapa-xadrez` → `/produtos/chapas` → `/produtos` → `/`.
 *
 * Existe por causa de um problema real e temporário: os 27 produtos estão em
 * rascunho, então nenhuma página de produto é gerada em produção. Sem este
 * rebaixamento, 40 URLs antigas apontariam 301 para 404 — que é pior que 404
 * direto, porque o Google registra soft 404 e ainda segue o redirecionamento.
 *
 * Quando a planilha da Aldifer chegar e os produtos saírem do rascunho, rodar
 * o gerador de novo faz cada URL voltar ao destino preciso. Trocar o destino
 * de um 301 não cria cadeia: a URL antiga passa a apontar direto para o novo.
 */
function degrade(target: string, existing: ReadonlySet<string>): string {
  let atual = target;
  while (!existing.has(atual)) {
    const corte = atual.lastIndexOf('/');
    if (corte <= 0) return '/';
    atual = atual.slice(0, corte);
  }
  return atual;
}

/** Decide o destino de uma URL antiga, antes de conferir se ele existe. */
export function intendedTarget(oldUrl: string): { to: string; source: Redirect['source'] } {
  const explicito = EXPLICIT_MAP[oldUrl];
  if (explicito) return { to: explicito, source: 'explicito' };

  const semExtensao = oldUrl.replace(/\.php$/i, '');
  for (const regra of RADICAL_RULES) {
    if (semExtensao.includes(regra.match)) return { to: regra.to, source: 'radical' };
  }

  return { to: FALLBACK, source: 'fallback' };
}

/**
 * Monta o mapa completo.
 *
 * @param oldUrls URLs `.php` extraídas do site antigo.
 * @param existingRoutes Rotas que o build REALMENTE gerou.
 */
export function buildRedirects(
  oldUrls: readonly string[],
  existingRoutes: ReadonlySet<string>,
): Redirect[] {
  const vistos = new Set<string>();
  const saida: Redirect[] = [];

  for (const from of oldUrls) {
    // Uma URL só pode ter um destino: entrada duplicada na lista seria dois
    // redirects para a mesma origem, e a Vercel aplicaria o primeiro.
    if (vistos.has(from)) continue;
    vistos.add(from);

    const { to: intended, source } = intendedTarget(from);
    const to = degrade(intended, existingRoutes);

    saida.push(to === intended ? { from, to, source } : { from, to, source, intended });
  }

  return saida;
}

export type RedirectProblem = {
  readonly kind: 'cadeia' | 'loop' | 'destino-inexistente' | 'origem-duplicada';
  readonly detail: string;
};

/**
 * Confere as três coisas que o aceite da Etapa 10 exige.
 *
 * CADEIA (A→B→C) é o problema mais fácil de criar sem perceber: bastaria uma
 * URL antiga aparecer como DESTINO de outra. O Google segue no máximo umas
 * poucas saltos e dilui autoridade em cada um.
 */
export function findProblems(
  redirects: readonly Redirect[],
  existingRoutes: ReadonlySet<string>,
): RedirectProblem[] {
  const problemas: RedirectProblem[] = [];
  const origens = new Map<string, number>();

  for (const r of redirects) {
    origens.set(r.from, (origens.get(r.from) ?? 0) + 1);
  }

  for (const [from, quantas] of origens) {
    if (quantas > 1) {
      problemas.push({ kind: 'origem-duplicada', detail: `${from} aparece ${quantas} vezes` });
    }
  }

  const conjuntoDeOrigens = new Set(redirects.map((r) => r.from));

  for (const r of redirects) {
    if (r.to === r.from) {
      problemas.push({ kind: 'loop', detail: `${r.from} aponta para si mesmo` });
      continue;
    }

    if (conjuntoDeOrigens.has(r.to)) {
      problemas.push({
        kind: 'cadeia',
        detail: `${r.from} → ${r.to}, e ${r.to} também é origem de redirect`,
      });
    }

    if (!existingRoutes.has(r.to)) {
      problemas.push({
        kind: 'destino-inexistente',
        detail: `${r.from} → ${r.to}, que não existe no build`,
      });
    }
  }

  return problemas;
}
