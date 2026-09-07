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
- [x] **Os mesmos 117 seguidos em produção**, contra
      `https://aldifer.vercel.app`: **117/117 com 301 em um salto e destino
      200**, nenhum 404, nenhuma cadeia, nenhum loop. Refazer com
      `BASE=https://www.aldifer.com.br` depois do DNS, que é o host final

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
- [x] **Console limpo em produção** — `/`, `/orcamento` e
      `/calculadora-de-peso` abertas em `https://aldifer.vercel.app` com **zero
      erro de console**. A CSP não bloqueou nada: 1 folha de estilo com 130
      regras aplicadas, as três fontes carregadas, a Archivo em
      `font-stretch: 125%`
- [x] **Os oito cabeçalhos confirmados em produção** por `curl -sI`: HSTS
      com `max-age=63072000` e **sem** `includeSubDomains`, `nosniff`,
      `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`,
      `frame-ancestors 'none'`, COOP e `X-Permitted-Cross-Domain-Policies`.
      `/api/*`, `/admin` e `/keystatic` com `X-Robots-Tag: noindex, nofollow`
- [x] ⚠️ **A CSP do painel: resolvido, e o resultado foi o OPOSTO do local.**
      Em `/keystatic` a Vercel serve UMA linha de CSP — a resposta da função
      SUBSTITUI o cabeçalho da configuração, e o `frame-ancestors 'none'` do
      `vercel.json` desaparecia. No servidor local as duas chegavam e as duas
      valiam. Nada ficou aberto (o `X-Frame-Options: DENY` sobrevive), mas
      contar com o cabeçalho obsoleto num painel de edição é frágil: o
      `src/middleware.ts` passou a declarar `frame-ancestors 'none'` na própria
      política. Confirmado em produção

## 5. Só depois do deploy

Nenhum destes é verificável daqui. Exigem URL pública, DNS ou chave de terceiro.

- [x] **Site no ar em https://aldifer.vercel.app** — build da Vercel em 40s,
      a partir do repositório `armaggeddon975/Aldifer` conectado. **Sem
      variáveis de ambiente cadastradas** (ver o bloco 6), então o formulário,
      o painel e o analytics estão nas degradações documentadas
- [x] **A calculadora calcula em produção** — tubo quadrado 30×2mm devolveu
      1,758 kg/m, conferido contra a conta manual
      `(30−2) × 2 × 4 × 0,00785`. O link compartilhável sincronizou:
      `?perfil=tubo-quadrado&l=30&e=2&m=6`
- [x] **O canonical protege contra conteúdo duplicado** — as páginas servidas em
      `aldifer.vercel.app` apontam o canonical para `https://www.aldifer.com.br/`,
      então a URL da Vercel não disputa indexação com o domínio final
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
- [x] **O CSS voltou a ser LINKADO, medido em produção.** O
      `inlineStylesheets: 'always'` da Etapa 12 tinha sido decidido em http/1.1
      contra uma Archivo de 90 KB — duas condições que deixaram de existir.
      Remedido nas duas variantes publicadas: a folha linkada ganhou em TUDO
      (LCP da home 1,38s → 1,11s, do Orçamento 1,53s → 1,37s; FCP do Orçamento
      1,37s → 1,07s; pior CLS dele 0,052 → 0,018) e ainda economiza 6,6 KB gzip
      por página nas navegações seguintes, por ter cache compartilhado
- [ ] **Teclado e leitor de tela** — Tab por toda a página, Esc fechando menu e
      diálogo, NVDA ou VoiceOver na tabela de bitolas, zoom de texto a 200%.
      As teclas não chegam à página pelo ambiente de automação usado aqui; o
      roteiro está em [`ACESSIBILIDADE.md`](./ACESSIBILIDADE.md)

## 6. ⛔ Bloqueado na Aldifer

**Isto é o que impede o lançamento hoje**, e nada disso se resolve com código.
As perguntas completas estão na seção 12 do [`CONTEUDO.md`](./CONTEUDO.md) e no
topo do [README](../README.md).

- [⛔] **O TELEFONE DO SITE É DE TESTE.** `(11) 93230-7756` e o WhatsApp
      `5511932307756` são o celular do desenvolvedor, postos para as ligações de
      teste não caírem na Aldifer. Tem de voltar a `(11) 4344-1919` /
      `+551143441919`, e o **WhatsApp a VAZIO** — o número da Aldifer nunca foi
      confirmado, e vazio o site simplesmente não mostra o botão. O `phoneE164`
      é o mais importante: ele alimenta o `tel:` de 16 páginas e o `telephone`
      dos dados estruturados. Ver o item 0 do [README](../README.md)
- [⛔] **O destino dos pedidos é o e-mail do desenvolvedor.** `QUOTE_MAIL_TO` e
      `CONTACT_MAIL_TO` na Vercel apontam para
      `diego.alvite.moreira@gmail.com`, e o remetente é o
      `onboarding@resend.dev` de teste do Resend. Trocar pelo destino da Aldifer
      (pergunta 10) e pelo remetente do domínio verificado
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
