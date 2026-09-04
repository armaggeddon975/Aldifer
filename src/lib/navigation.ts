/**
 * Navegação do site. As rotas seguem o sitemap da seção 1 do docs/CONTEUDO.md.
 * Regra de URL: minúscula, hífen, sem acento, sem parâmetro, em português.
 */

export type NavItem = {
  readonly label: string;
  readonly href: string;
};

/** Navegação principal do header. */
export const mainNav: readonly NavItem[] = [
  { label: 'Produtos', href: '/produtos' },
  { label: 'Calculadora de peso', href: '/calculadora-de-peso' },
  { label: 'A empresa', href: '/empresa' },
  { label: 'Contato', href: '/contato' },
];

/** As 6 categorias do catálogo. Seção 4 do docs/CONTEUDO.md. */
export const categoryNav: readonly NavItem[] = [
  { label: 'Barras', href: '/produtos/barras' },
  { label: 'Tubos', href: '/produtos/tubos' },
  { label: 'Chapas', href: '/produtos/chapas' },
  { label: 'Perfis', href: '/produtos/perfis' },
  { label: 'Telas', href: '/produtos/telas' },
  { label: 'Diversos', href: '/produtos/diversos' },
];

/**
 * Diz se `href` corresponde à rota atual, para o aria-current.
 * A home casa só de forma exata; as demais casam também com as subrotas,
 * para que /produtos/barras/barra-chata marque "Produtos" como ativo.
 */
export function isActiveRoute(href: string, pathname: string): boolean {
  const current = pathname.replace(/\/+$/, '') || '/';
  const target = href.replace(/\/+$/, '') || '/';

  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
}
