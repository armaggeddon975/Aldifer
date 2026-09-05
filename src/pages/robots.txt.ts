import type { APIRoute } from 'astro';

/**
 * robots.txt gerado, não escrito à mão em public/.
 *
 * A URL do sitemap vem do `site` do astro.config, que é a MESMA fonte do
 * canonical e do sitemap. Um robots.txt estático teria o domínio digitado, e
 * na hora de decidir www x apex (Etapa 13) alguém trocaria em dois lugares e
 * esqueceria o terceiro — apontando o Google para um sitemap que redireciona.
 */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://www.aldifer.com.br');

  const linhas = [
    '# https://www.robotstxt.org/robotstxt.html',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Painel do Keystatic. Não é conteúdo e exige login no GitHub — indexá-lo',
    '# levaria gente a uma tela de autenticação vinda da busca.',
    '#',
    '# /admin é o endereço que as pessoas decoram e só redireciona para',
    '# /keystatic, que é onde a integração monta o painel de verdade.',
    'Disallow: /admin',
    'Disallow: /keystatic',
    'Disallow: /keystatic/',
    '',
    '# Endpoints de formulário. Não há nada para rastrear e um GET neles',
    '# só gasta orçamento de rastreamento.',
    'Disallow: /api/',
    '',
    '# Telas de resultado do formulário de contato. Também têm noindex no',
    '# HTML; aqui só se evita o rastreamento inútil.',
    'Disallow: /mensagem-enviada',
    'Disallow: /mensagem-nao-enviada',
    '',
    `Sitemap: ${new URL('sitemap-index.xml', base).href}`,
    '',
  ];

  return new Response(linhas.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
