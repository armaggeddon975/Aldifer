# Checklist de lançamento

Percorra antes de apontar o domínio. Depois de apontado, o site antigo sai do ar
para o mundo — e o que estiver errado fica errado em produção.

Três marcações, e a diferença entre elas importa:

- **`[x]`** — verificado, com o número ao lado. Não é opinião.
- **`[ ]`** — só é possível verificar **depois do deploy**, porque exige URL
  pública, DNS ou chave de terceiro.
- **`[⛔]`** — **bloqueado na Aldifer.** Não depende de código.

O passo a passo do deploy está em [`DEPLOY.md`](./DEPLOY.md). Os números dos
portões, em [`QUALIDADE.md`](./QUALIDADE.md).

---

## 1. Portões de qualidade — verificados

Medidos em build de produção servido por `npm run servir`, perfil mobile com
throttling. Detalhe e método em [`QUALIDADE.md`](./QUALIDADE.md).

- [x] **Performance** — 98 a 99 nas quatro páginas medidas
- [x] **LCP** — 1,66s a 2,11s, contra a meta de 2,50s. O mais apertado é o
      `/orcamento` com 2,11s
- [x] **CLS** — 0,000 a 0,075 no PIOR caso de 5 execuções válidas, contra a meta
      de 0,100. O mais apertado é `/produtos/chapas/chapa-xadrez` com 0,075 —
      reflow do `swap` das fontes, consequência aceita da tipografia
- [x] **TBT** — 0ms em todas (o substituto de laboratório para o INP)
- [x] **Peso da home** — 169 KB, contra o limite de 1 MB
- [x] **JS por página** — a mais pesada é `/orcamento` com 26,9 KB gzip, contra
      o portão de 100 KB
- [x] **SEO 100** — nos 9 moldes de página
- [x] **JSON-LD** — 89 blocos validados em todas as rotas: JSON parseável,
      `@context` correto, `@type` previsto, nenhum campo vazio, breadcrumb com
      posições em 1..n
- [x] **title e description únicos** — nas 44 rotas, com canonical, og:image e
      um `h1` por página
- [x] **Acessibilidade** — 43 rotas sem violação `critical` nem `serious`, e
      nenhuma `moderate` ou `minor`
- [x] **Responsivo** — 172 medições em 360 · 768 · 1280 · 1920px, sem quebra,
      sem scroll horizontal e sem conteúdo cortado
- [x] **Tabela de bitola em 360px** — 23 rotas, todas rolando dentro do
      `<table-scroller>`
- [x] **Contraste** — 22 razões e 4 separações de matiz, calculadas dos tokens
- [x] **Tipos** — `astro check` em 133 arquivos, 0 erro
- [x] **Testes** — 243 passando

## 2. Conteúdo e dados — verificados

- [x] **Nenhum dado inventado.** Campo sem confirmação da Aldifer é `null` em
      `src/content/site-config.json`, e campo nulo não renderiza
- [x] **JSON-LD sem dado não confirmado** — sem `openingHours`, sem `geo`, sem
      `priceRange`, sem `aggregateRating`. O portão de SEO reprova `@type`
      imprevisto, então uma nota de avaliação inventada quebraria o build
- [x] **Zero hex solto no código** — só tokens. `npm run contrast` varre o fonte
- [x] **Os dados reais da empresa** conferem com o site atual: razão social,
      endereço, CEP, telefone, e-mail, fundação em 2002, redes sociais

## 3. Migração de URLs — verificada localmente

- [x] **117 redirects 301** gerados no `vercel.json`, cobrindo as 128 URLs
      rastreadas do site antigo
- [x] **Todo destino existe** no build — conferido contra as rotas geradas, não
      presumido
- [x] **Sem cadeia, sem loop, todos 301** — `npm run check-redirects`
- [x] **Seguidos de verdade** contra `npm run servir`: 301 em um salto, destino
      200 — `npm run testar-redirects`
- [ ] **Os mesmos 117 seguidos em produção** —
      `BASE=https://www.aldifer.com.br npm run testar-redirects`. Só depois do
      DNS

## 4. Segurança — verificada, exceto onde marcado

- [x] **CSP gerada pelo Astro**, com hash de cada script e estilo inline.
      Verificada servindo o build em `:4330`, que é onde a política roda — o
      `npm run dev` não a emite
- [x] **Os nove cabeçalhos de segurança SERVIDOS e conferidos**, e não apenas
      escritos no `vercel.json`: HSTS, `nosniff`, `Referrer-Policy`,
      `Permissions-Policy`, `X-Frame-Options`, `frame-ancestors 'none'`, COOP,
      `X-Permitted-Cross-Domain-Policies`. O `npm run servir` passou a ler as
      regras do próprio `vercel.json`, então `curl -sI` mostra o que a Vercel
      vai mandar — antes disso eles nunca haviam sido vistos responder
- [x] **Cache** conferido em comportamento: `immutable` de um ano em `/_astro/`
      e `/fonts/`, `no-store` e `noindex` em `/api/`
- [x] **HSTS sem `includeSubDomains` e sem `preload`** — decidido por medição: o
      certificado de `webmail.aldifer.com.br` é de `*.webmail-seguro.com.br`, e
      a diretiva tornaria o aviso do navegador inignorável, derrubando o webmail
      da Aldifer. Ver [`CABECALHOS.md`](./CABECALHOS.md)
- [x] **`.env` fora do versionamento**, `.env.example` versionado
- [x] **`/admin`, `/keystatic` e `/api`** com `noindex, nofollow` no cabeçalho,
      bloqueados no `robots.txt` e fora do sitemap
- [x] **LGPD** — consentimento não pré-marcado, honeypot, limite por IP e
      Turnstile no formulário
- [ ] **Console limpo em produção** — abrir `/`, `/orcamento`,
      `/calculadora-de-peso` e `/keystatic` na URL de preview e confirmar que a
      CSP não bloqueou nada. É o primeiro lugar onde ela roda fora do
      `npm run servir`
- [ ] **`curl -sI` na preview** confirmando que a Vercel aplica a mesma configuração
- [ ] ⚠️ **Duas linhas de CSP em `/keystatic`** na preview:
      `curl -sI <preview>/keystatic | grep -ci content-security-policy` deve dar
      **2** — a política do painel mais o `frame-ancestors` da configuração. Se
      der 1, a Vercel substituiu em vez de somar e uma das duas se perdeu. É o
      único ponto que não dá para verificar fora da Vercel; o que fazer está no
      passo 4 do [`DEPLOY.md`](./DEPLOY.md)

## 5. Só depois do deploy

Nenhum destes é verificável daqui. Exigem URL pública, DNS ou chave de terceiro.

- [ ] **Site no ar na URL de preview**, com todas as variáveis cadastradas
- [ ] **O e-mail de orçamento chega** — e chega **fora do spam**, com SPF, DKIM e
      DMARC como `pass` no cabeçalho da mensagem recebida. Passo 6 do
      [`DEPLOY.md`](./DEPLOY.md). Sem isto a Aldifer perde lead em silêncio, que
      é o pior modo de falha deste site
- [ ] **O lead é persistido**, e não só enviado por e-mail
- [ ] **O painel do Keystatic salva** — em modo GitHub, um Save vira commit.
      Requer as quatro variáveis e o repositório remoto
- [ ] **Rich Results Test** do Google. O JSON-LD já passou no validador do
      schema.org (3 tipos, 0 erro, 0 aviso), mas o do Google precisa de URL
      pública
- [ ] **Sitemap enviado** no Search Console — ver [`POS-DEPLOY.md`](./POS-DEPLOY.md)
- [ ] **Analytics ligado** — `PUBLIC_PLAUSIBLE_DOMAIN` cadastrada **e** redeploy
      feito, porque ela é lida em tempo de build. É como se mede a métrica que o
      `CLAUDE.md` define como sucesso do projeto
- [ ] **Certificado emitido** para `www.aldifer.com.br` e para o apex
- [ ] **Apex redirecionando para `www`**, e não servindo os dois
- [ ] **Remedir se o CSS ainda precisa ser embutido.** `inlineStylesheets:
      'always'` foi decidido quando a Archivo tinha 90 KB e disputava banda com
      a folha, e medindo em **http/1.1** no servidor local. Duas coisas mudaram
      a favor da folha LINKADA: a fonte caiu para 34,6 KB, e a Vercel serve
      **http/2**, onde a requisição da folha é multiplexada e custa bem menos
      que um round-trip. Se passar linkada, é melhor: 6,6 KB gzip a menos por
      página, com cache compartilhado entre elas — e o público navega várias
      páginas do catálogo. Medir na URL de preview, com
      `BASE=<preview> npm run lighthouse`
- [ ] **Teclado e leitor de tela** — Tab por toda a página, Esc fechando menu e
      diálogo, NVDA ou VoiceOver na tabela de bitolas, zoom de texto a 200%.
      As teclas não chegam à página pelo ambiente de automação usado aqui; o
      roteiro está em [`ACESSIBILIDADE.md`](./ACESSIBILIDADE.md)

## 6. ⛔ Bloqueado na Aldifer

**Isto é o que impede o lançamento hoje**, e nada disso se resolve com código.
As perguntas completas estão na seção 12 do [`CONTEUDO.md`](./CONTEUDO.md) e no
topo do [README](../README.md).

- [⛔] **A planilha de bitolas em estoque** (pergunta 7). É o bloqueio maior: os
      **27 produtos estão como `rascunho`** e não são gerados em produção. O
      build de hoje tem 17 rotas e **nenhuma página de produto** — um catálogo
      com as categorias vazias. As bitolas que estão nas tabelas são faixa
      comercial de mercado, não o estoque da Aldifer, e publicar bitola que a
      empresa não tem gera pedido que ela não consegue atender. Pior que não
      publicar
- [⛔] **Onde os leads caem** (pergunta 10) — define `QUOTE_MAIL_TO` e
      `LEAD_STORE_DRIVER`. Enquanto o driver for `json`, o lead **não persiste**
      em serverless: o código detecta, recusa a gravação e carimba o aviso no
      assunto do e-mail
- [⛔] **Horário de funcionamento** (pergunta 2) — a seção não renderiza, e o
      `openingHours` fica fora do JSON-LD
- [⛔] **WhatsApp direto** (pergunta 3) — o site atual manda para um `linktr.ee`
- [⛔] **CNPJ** (pergunta 4) — falta no rodapé, no JSON-LD e na Política de
      Privacidade
- [⛔] **Corte sob medida** (pergunta 1) — se a Aldifer faz, é o maior
      diferencial do site e merece destaque próprio
- [⛔] **Prazo, raio de entrega e pedido mínimo** (perguntas 5 e 6) — atacam
      diretamente a objeção nº 1 do `CLAUDE.md`
- [⛔] **Inox ou alumínio** (pergunta 8) — muda a calculadora: inox usa densidade
      7.900 e alumínio 2.700, contra 7.850 do aço carbono
- [⛔] **Certificado de qualidade da usina** (pergunta 9)
- [⛔] **Revisão da Política de Privacidade.** O texto é MINUTA: descreve com
      precisão o que o site faz tecnicamente, mas documento legal precisa de
      revisão de quem responde por ele. Faltam o CNPJ do controlador e o prazo
      de retenção do lead
- [⛔] **Contas de terceiro:** Resend, Cloudflare Turnstile, Plausible e a conta
      do GitHub e da Vercel. Todas devem nascer no nome da Aldifer — ver a
      tabela de transferência de acessos no [`DEPLOY.md`](./DEPLOY.md)

---

## Pode lançar sem resolver o bloco 6?

**Tecnicamente sim, e não é recomendado.** O site sobe, é rápido, acessível,
seguro e migra as URLs antigas. Mas ele subiria assim:

- Catálogo com **as seis categorias vazias**, sem uma página de produto. É
  exatamente o contrário do que o `CLAUDE.md` define como razão de existir do
  site: "mostrar a linha completa, com medidas reais, e deixar o pedido pronto
  em um clique"
- Pedido de orçamento chegando **só por e-mail**, sem persistência
- Sem horário, sem WhatsApp e sem CNPJ
- Sem analytics, portanto sem saber se algum pedido chegou por causa do site

A ordem que faz sentido: **planilha de bitolas (7) e destino do lead (10)
primeiro** — sem esses dois o site não faz o que foi construído para fazer. O
resto pode entrar depois pelo painel, sem novo deploy.
