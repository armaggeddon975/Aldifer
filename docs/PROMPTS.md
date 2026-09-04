# Pacote de prompts — Site Aldifer

> **Como usar:** crie a pasta do projeto, coloque `CLAUDE.md` na raiz e `CONTEUDO.md`
> em `docs/`. Abra o Claude Code nessa pasta. Cole **um prompt por vez**, na ordem.
> Não pule etapa e não cole dois juntos — o contexto degrada e a qualidade cai junto.
>
> Ao fim de cada etapa, confira os **critérios de aceite**. Se algum falhar, use o
> prompt de correção do final do arquivo em vez de seguir adiante. Erro carregado
> para a etapa seguinte custa cinco vezes mais para consertar.

---

## Etapa 0 — Fundação

```
Leia CLAUDE.md e docs/CONTEUDO.md por completo antes de escrever qualquer código.

Crie o projeto base:

1. Scaffold Astro com template minimal e TypeScript strict.
2. Antes de instalar QUALQUER pacote, rode `npm view <pacote> version` e compare
   com a tabela de versões do CLAUDE.md. Se divergir, use a atual e atualize a
   tabela no CLAUDE.md com a data de hoje.
3. Instale e configure: Tailwind v4 via @tailwindcss/vite (NÃO use @astrojs/tailwind,
   que é o caminho da v3), @astrojs/sitemap, @astrojs/react, zod.
4. Fontes auto-hospedadas via @fontsource-variable: Archivo, Inter e JetBrains Mono.
   Subset latin. Nada de Google Fonts por CDN.
5. Crie src/styles/tokens.css com TODOS os tokens do CLAUDE.md como custom properties
   no :root, e conecte ao tema do Tailwind v4 usando @theme.
6. Crie a estrutura de pastas: src/{components,layouts,pages,content,styles,lib},
   public/, docs/.
7. Configure tsconfig com strict: true e paths com alias @/ apontando para src/.
8. Crie .env.example com as chaves que vamos precisar (Resend, Turnstile, destino
   de persistência) e adicione .env ao .gitignore.
9. Inicialize o git e faça o primeiro commit.

Regras: nenhum hex solto no código, tudo por token. Nenhuma dependência além das
listadas. Não crie nenhuma página ainda além da index vazia.

Ao terminar, rode `npm run build` e me mostre a saída.
```

**Aceite:** build passa · `tokens.css` tem todos os tokens do CLAUDE.md ·
`npm ls` sem pacote não previsto · nenhuma fonte carregada de domínio externo.

---

## Etapa 1 — Design system e primitivos

```
Crie o design system em código. Componentes pequenos, tipados, sem conteúdo hardcoded.

1. src/layouts/Base.astro
   - lang="pt-BR", meta viewport, charset
   - props tipadas: title, description, canonical, ogImage, noindex?
   - link "Pular para o conteúdo" como PRIMEIRO elemento focável
   - landmarks: header, main, footer
   - preload SÓ da fonte Archivo (usada no LCP)
   - slot para JSON-LD

2. src/components/ui/
   - Button.astro — variantes: primary, secondary, ghost. Tamanhos: md, lg.
     Renderiza <button> ou <a> conforme receber href. Foco visível com ring de
     contraste >= 3:1. Alvo mínimo 44px de altura no mobile.
   - Container.astro — largura máxima e padding lateral consistentes
   - Section.astro — props: tone ("dark" | "light" | "alt"), spacing
   - Heading.astro — níveis 1 a 4, respeitando a escala tipográfica
   - Table.astro — tabela responsiva com scroll horizontal em mobile,
     <caption>, <th scope>, números em JetBrains Mono alinhados à direita

3. src/components/Header.astro
   - Logo, navegação principal, telefone visível, CTA de orçamento
   - Menu mobile com <dialog> nativo: abre, fecha no Esc, devolve o foco,
     sem armadilha de foco. NÃO instale biblioteca para isso.
   - aria-current na rota ativa

4. src/components/Footer.astro
   - Endereço, telefone, e-mail, redes sociais, links do catálogo
   - Link para a política de privacidade
   - Ano do copyright dinâmico. NUNCA fixo. (O site atual está com "© 2016" e é
     o erro mais visível dele.)

5. src/components/CrossSection.astro — o elemento de assinatura.
   SVG de seção transversal em estilo desenho técnico: contorno em linha fina,
   linha de cota com seta nas duas pontas, letra da dimensão em mono.
   Variantes: round-bar, square-bar, flat-bar, round-tube, square-tube,
   rect-tube, plate, i-beam, u-channel, angle, tee.
   Traço via currentColor para herdar a cor do contexto. Sem preenchimento sólido.
   role="img" com <title> descritivo em português.

CRÍTICO no CrossSection: são desenhos técnicos reais, não ícones decorativos.
O perfil I tem aba, alma e raio de concordância. A cantoneira tem duas abas em
ângulo reto com espessura visível. O serralheiro precisa reconhecer a peça.

Crie uma rota temporária /styleguide mostrando todos os componentes e todas as
variantes de CrossSection, para eu revisar. Ela será removida antes do deploy.
```

**Aceite:** `/styleguide` renderiza tudo · menu mobile fecha no Esc e devolve o foco ·
foco visível em todos os controles com Tab · seções transversais reconhecíveis ·
zero JS carregado na página (confira na aba Network).

---

## Etapa 2 — Content collections

```
Modele o conteúdo. Nenhum texto de negócio pode ficar hardcoded em componente.

1. src/content.config.ts com collections tipadas por Zod:

   - products: schema completo conforme a seção 4 do docs/CONTEUDO.md.
     Inclua um campo `status: z.enum(["rascunho", "publicado"])`.
   - categories: slug, name, description, crossSection, order
   - siteConfig (JSON único): dados de contato, redes, horário, CNPJ

2. Crie o arquivo de TODAS as 6 categorias com o texto do docs/CONTEUDO.md.

3. Crie os arquivos de produto de todos os itens listados na seção 4 do CONTEUDO.md.

   ATENÇÃO — leia a caixa de aviso da seção 4 antes de preencher bitola:
   - Estruture as tabelas com a faixa comercial padrão de mercado.
   - Marque TODOS eles com status: "rascunho".
   - Todo produto em rascunho renderiza um aviso visível em dev:
     "⚠ Tabela em conferência — validar com a Aldifer antes de publicar"
   - Produto em rascunho NÃO entra no build de produção.

4. src/lib/steel.ts — as fórmulas de peso teórico da seção 5 do CONTEUDO.md.
   Funções puras, tipadas, uma por perfil. Cada uma com comentário em português
   citando a fórmula. Escreva testes com node:test cobrindo pelo menos 3 casos
   conhecidos por fórmula.

5. O peso nas tabelas é CALCULADO por essas funções em build, nunca digitado.
   Perfil I, U e H não têm fórmula simples (aba cônica e raio de concordância):
   esses consultam a tabela de usina. Deixe o campo explícito e documentado.

6. Adicione ao README, em destaque, que a planilha real de estoque da Aldifer
   precisa ser solicitada e substituir os rascunhos antes do lançamento.
```

**Aceite:** `npm run build` valida os schemas sem erro · testes de `steel.ts` passam ·
todo produto marcado como rascunho · nenhum peso digitado à mão.

---

## Etapa 3 — Home

```
Construa a home seguindo EXATAMENTE a ordem de seções da seção 3 do docs/CONTEUDO.md
e a copy da seção 2. Não reescreva a copy aprovada.

Detalhes por seção:

1. Hero — fundo --steel-950. H1 em Archivo Expanded. Marca-d'água de CrossSection
   em traço, opacidade <= 0,06, aria-hidden. CTA primária em --accent-bright,
   secundária como link discreto. As três provas em linha com divisor vertical fino,
   SEM card e SEM ícone.

2. Busca rápida — input único, aceita "chapa 1/8" ou "tubo 30x30". Ilha React com
   client:idle. Busca client-side sobre um índice JSON gerado em build (não instale
   biblioteca de busca; normalizar acento e fazer match por substring resolve).

3. Categorias — 6 blocos com CrossSection, nome e descrição curta. Grade de 1 coluna
   em 360px, 2 em tablet, 3 em desktop. Blocos com raio 0, borda em vez de sombra.

4. Por que a Aldifer — 3 blocos de texto com o conteúdo do CONTEUDO.md.
   Sem ícone decorativo. Hierarquia por espaço e tamanho, não por cor e borda.

5. Calculadora em destaque — faixa escura, resultado exemplo visível, CTA para a
   ferramenta completa.

6. Para quem atendemos — 3 blocos com o texto do CONTEUDO.md.

7. Onde estamos — endereço, horário [CONFIRMAR], botão de rota no Google Maps.
   NÃO embuta iframe do Google Maps: custa ~900KB e destrói o LCP. Use imagem
   estática do mapa com link, ou carregue o iframe sob clique.

8. Fechamento — CTA de orçamento sobre fundo escuro.

Movimento: UMA orquestração só, na entrada do hero. Nada de fade-and-slide em cada
card ao rolar — é o padrão genérico que quero evitar. Respeite prefers-reduced-motion.

Meta tags da home conforme a seção 10 do CONTEUDO.md.

Escreva o layout base para 360px e só depois adicione breakpoints.
```

**Aceite:** 360px sem scroll horizontal · JS da home < 100KB gzip ·
nenhum iframe do Google Maps carregando de imediato · headline não serve para
nenhum concorrente · rodapé com ano dinâmico.

---

## Etapa 4 — Catálogo

```
Construa o catálogo. É o coração do site.

1. /produtos — listagem com filtro
   - Filtro por categoria e por acabamento, como ilha React client:visible
   - Filtro reflete na URL (?categoria=chapas) para o estado ser compartilhável
   - Sem JS o conteúdo ainda aparece completo: renderize tudo em HTML e o JS só
     esconde. Progressive enhancement de verdade.

2. /produtos/[categoria] — página de categoria
   - Descrição, produtos da categoria, breadcrumb

3. /produtos/[categoria]/[produto] — página de produto. A mais importante do site.
   Ordem:
   - Breadcrumb
   - H1 com o nome do produto
   - CrossSection grande, com as cotas correspondendo às colunas da tabela
   - Descrição e aplicações
   - TABELA DE BITOLAS — o motivo de a pessoa estar aqui.
     Cada linha com um botão "Adicionar" que joga a medida na lista de orçamento.
     Coluna de peso calculada por src/lib/steel.ts.
     Números em JetBrains Mono, alinhados à direita.
     Em mobile: scroll horizontal com sombra indicando que há mais coluna,
     e a primeira coluna fixa.
   - Acabamentos disponíveis
   - CTA de orçamento
   - Link para a calculadora já pré-selecionada nesse perfil

4. Todas as páginas com title/description da seção 10 do CONTEUDO.md e
   JSON-LD de BreadcrumbList.

Acessibilidade da tabela: <caption>, <th scope="col">, e o botão "Adicionar" com
aria-label completo ("Adicionar barra chata 50 × 6 mm à lista de orçamento") —
"Adicionar" sozinho não diz nada para leitor de tela.
```

**Aceite:** filtro funciona sem JS · tabela navegável por teclado ·
`aria-label` dos botões descreve a medida · axe sem violação séria ·
peso batendo com cálculo manual em 3 amostras.

---

## Etapa 5 — Lista de orçamento

```
Implemente a lista de orçamento conforme a seção 6 do docs/CONTEUDO.md.

1. src/lib/quote.ts — store tipado sobre localStorage, chave "aldifer:quote:v1"
   - add, remove, updateQuantity, updateNote, clear, getAll
   - expiração em 30 dias
   - try/catch em tudo: localStorage falha em modo privativo do Safari e o site
     não pode quebrar por causa disso
   - eventos customizados para os componentes reagirem

2. src/components/QuoteBar.tsx — barra fixa no rodapé, ilha client:idle
   - aparece com 1 item ou mais
   - mostra a contagem e "Fechar pedido"
   - em mobile reserve o espaço para ela não cobrir conteúdo
   - respeita safe-area-inset-bottom no iOS

3. Botão "Adicionar" nas tabelas
   - confirmação discreta via região aria-live="polite"
   - SEM modal, sem tirar o usuário da navegação

4. /orcamento — página da lista
   - itens editáveis: quantidade, observação, remover
   - lista vazia mostra caminho para o catálogo, não mensagem de erro
   - abaixo da lista, o formulário (próxima etapa)

Hidratação: a QuoteBar é a única ilha global. Não hidrate nada além do necessário.
```

**Aceite:** adicionar item não recarrega a página · lista sobrevive ao refresh ·
site não quebra com localStorage bloqueado · anúncio no leitor de tela ao adicionar ·
barra não cobre conteúdo em 360px.

---

## Etapa 6 — Formulário, servidor e LGPD

```
Implemente o formulário de orçamento conforme a seção 7 do docs/CONTEUDO.md.
Este é o ponto onde o site vira receita. Falha silenciosa aqui custa mais que
qualquer detalhe visual.

1. src/lib/schemas.ts — schema Zod ÚNICO, usado no cliente e no servidor.
   Campos exatamente conforme a tabela da seção 7. Mensagens de erro em português
   dizendo o que fazer, não "campo inválido".

2. src/components/QuoteForm.tsx — ilha client:visible
   - <label for> em todo campo. Placeholder NÃO é label.
   - autocomplete e inputmode corretos
   - erro por campo, associado por aria-describedby, anunciado em aria-live
   - estados: idle / enviando / sucesso / erro
   - em caso de erro, PRESERVE tudo que foi digitado
   - honeypot "website": escondido por CSS (não type="hidden"),
     tabindex="-1", autocomplete="off"
   - timestamp de carregamento para checar tempo de preenchimento
   - consentimento LGPD NÃO pré-marcado

3. src/pages/api/orcamento.ts — export const prerender = false
   Na ordem:
   a) revalida com o MESMO schema Zod
   b) honeypot vazio
   c) tempo de preenchimento > 3s
   d) Turnstile validado server-side
   e) rate limit 5/hora por IP
   f) PERSISTE o lead  ← obrigatório, não pule
   g) envia e-mail via Resend, reply-to = e-mail do lead,
      corpo com a lista formatada em tabela legível
   h) 200 com mensagem de sucesso

   E-mail sozinho perde lead: cai em spam e a empresa nunca fica sabendo.
   Se o destino de persistência ainda não estiver decidido, implemente a interface
   `LeadStore` com uma implementação em arquivo JSON e deixe o TODO explícito.

4. /politica-de-privacidade — página real, não placeholder. Deve cobrir:
   dados coletados, finalidade, base legal (legítimo interesse e consentimento),
   compartilhamento, tempo de retenção, direitos do titular pela LGPD, e canal
   de contato do controlador. Escreva em português claro, não em juridiquês.

5. Sem banner de cookies: vamos usar analytics sem cookie. Se em algum momento
   entrar GA4, aí sim o banner passa a ser obrigatório.

Teste o envio de ponta a ponta e me mostre o resultado.
```

**Aceite:** envio real testado · e-mail chegou e não caiu em spam · lead persistido ·
honeypot bloqueia · rate limit funciona · erro preserva os dados digitados ·
consentimento não pré-marcado · política de privacidade completa.

---

## Etapa 7 — Calculadora de peso

```
Implemente /calculadora-de-peso conforme a seção 5 do docs/CONTEUDO.md.
É o elemento de assinatura funcional: a ferramenta que faz o serralheiro salvar
o site nos favoritos.

1. Ilha React client:visible reutilizando src/lib/steel.ts. NÃO duplique fórmula.

2. Interface:
   - seleção de perfil, com o CrossSection atualizando conforme a escolha
   - campos de dimensão mudam conforme o perfil (Ø e parede para tubo redondo,
     largura e espessura para barra chata, e assim por diante)
   - campo de comprimento e de quantidade
   - resultado: peso por metro, peso por peça e peso total, em JetBrains Mono
   - cálculo em tempo real, sem botão "calcular"

3. Avisos visíveis na interface, sem tom de letra miúda:
   - "Peso teórico. A laminação tem tolerância — o peso real varia cerca de ±3%."
   - Perfil I, U e H consultam tabela de usina em vez de calcular, porque a aba
     é cônica e há raio de concordância. Explique isso na tela.

4. Botão "Adicionar à lista de orçamento" com a medida já preenchida.
   É assim que a ferramenta vira lead.

5. Estado na URL (?perfil=tubo-redondo&d=30&e=2) para o cálculo ser compartilhável
   por WhatsApp. Serralheiro manda link para o cliente dele.

6. SEO: esta página tem potencial real de busca orgânica ("calcular peso de tubo
   de aço", "peso da barra chata por metro"). Title e description conforme a
   seção 10 do CONTEUDO.md, mais um bloco de texto explicando como o cálculo
   funciona, com as fórmulas visíveis.

Acessibilidade: cada campo com label, resultado em região aria-live="polite",
navegação completa por teclado.
```

**Aceite:** resultados conferem com cálculo manual · CrossSection troca com o perfil ·
URL compartilhável restaura o estado · resultado anunciado no leitor de tela ·
zero duplicação de fórmula.

---

## Etapa 8 — Páginas restantes

```
1. /empresa — use o texto da seção 8 do docs/CONTEUDO.md, que é confirmado pela
   Aldifer. Corrija "Torna-se referência" para "Tornar-se referência".
   Galeria das instalações com as 4 fotos do site antigo, otimizadas.
   Registre no README a recomendação de nova sessão fotográfica.

2. /contato — endereço, telefone clicável (tel:), e-mail, WhatsApp [CONFIRMAR],
   horário [CONFIRMAR], botão de rota. Mapa estático com link, sem iframe pesado.
   Formulário de contato simples, reaproveitando o schema Zod (sem a lista de itens).

3. /404 — personalizada, com busca e caminhos de saída para as 6 categorias.
   Nada de "Página não encontrada" e ponto final.

4. Assets:
   - favicon em todos os tamanhos, a partir do logo
   - og-image 1200×630 REAL, com a marca e a proposta. Não placeholder.
   - apple-touch-icon, manifest

5. Remova a rota /styleguide.
```

**Aceite:** todas as rotas com title e description únicos · og-image real ·
404 com saída útil · telefone clicável no mobile · styleguide removida.

---

## Etapa 9 — SEO técnico

```
1. Sitemap com @astrojs/sitemap. robots.txt apontando para ele.
   /admin com noindex.

2. Canonical absoluto em toda página.

3. JSON-LD:
   - LocalBusiness no layout base, conforme a seção 11 do docs/CONTEUDO.md.
     APENAS com dado confirmado. Sem openingHours até a Aldifer confirmar —
     JSON-LD com dado inventado é pior que ausente.
   - BreadcrumbList nas internas
   - ItemList no catálogo

4. Open Graph e Twitter Card em todas as páginas, com imagem real.

5. Cabeçalhos de segurança no vercel.json: Content-Security-Policy,
   X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS.

6. Analytics sem cookie: Plausible ou Umami. Configure o evento de conversão
   "orcamento_enviado".

7. Rode `npm audit --production` e resolva o que aparecer.

Valide o JSON-LD no Rich Results Test e me mostre o resultado.
```

**Aceite:** sitemap com todas as rotas · JSON-LD válido sem dado inventado ·
title e description únicos em 100% das páginas · CSP sem bloquear o próprio site ·
`npm audit` limpo.

---

## Etapa 10 — Migração de URLs

```
A parte que mais gente esquece e que mais derruba tráfego depois do lançamento.

1. Extraia a lista COMPLETA de URLs do site antigo. Não confie na lista do
   CONTEUDO.md — pode estar incompleta:

   curl -s https://www.aldifer.com.br/ | grep -oE 'href="[^"]*\.php"' \
     | sed 's/href="//;s/"//' | sort -u > docs/urls-antigas.txt

   Repita para /empresa.php, /barras.php e /contato.php, e una os resultados.
   Confira também se existe sitemap.xml antigo.

2. Gere o mapa de redirects aplicando as regras da seção 9 do docs/CONTEUDO.md.

3. Escreva os redirects 301 no vercel.json com CADA URL LISTADA EXPLICITAMENTE.
   Nada de regex genérico: é fonte de loop e de destino errado.

4. Nenhuma URL antiga pode virar 404.

5. Escreva um script em scripts/check-redirects.ts que percorre urls-antigas.txt
   e confirma que cada uma tem destino 301 mapeado. Rode e me mostre o resultado.

6. Documente no README que, depois do deploy, é preciso:
   - enviar o novo sitemap no Search Console
   - acompanhar a cobertura por 30 dias
```

**Aceite:** script confirma 100% de cobertura · nenhum redirect em cadeia
(A→B→C) · nenhum loop · nenhuma URL antiga em 404.

---

## Etapa 11 — CMS Keystatic

```
Configure o Keystatic para que o pessoal da Aldifer edite sem depender de mim,
sem perder a possibilidade de eu editar direto no código.

1. Instale @keystatic/core e @keystatic/astro. Confira as versões antes.
   O Astro precisa de adapter para a rota do admin funcionar.

2. keystatic.config.ts com coleções apontando para OS MESMOS arquivos das content
   collections. Uma fonte de verdade, duas portas de entrada.

   - Produtos: nome, descrição, aplicações, acabamentos, TABELA DE BITOLAS
     editável em campo de matriz, status rascunho/publicado
   - Categorias
   - Configurações do site: telefone, WhatsApp, e-mail, endereço, horário, redes
   - Avisos: banner temporário para recesso, feriado, mudança de horário
     (o site antigo tinha um "banner-aviso.jpg" — isso vira campo editável)

3. Rótulos e textos de ajuda do painel EM PORTUGUÊS. Quem vai usar não é dev.
   Cada campo com descrição explicando o que é e onde aparece no site.

4. /admin com noindex e fora do sitemap.

5. Storage em modo GitHub, para o salvamento virar commit.

6. Escreva docs/COMO-EDITAR.md: guia com passo a passo de como trocar um texto,
   adicionar produto, publicar um aviso e subir foto. Linguagem simples,
   sem jargão técnico, com o caminho de cliques descrito.

Teste: edite um texto pelo painel, confirme que virou commit, e que o site
reconstruiu com a mudança.
```

**Aceite:** painel abre e salva · edição vira commit · dev e painel editam o mesmo
arquivo sem conflito · painel todo em português · `COMO-EDITAR.md` entendível por
quem nunca usou Git.

---

## Etapa 12 — Portões de qualidade

```
Rode os quatro portões do CLAUDE.md em BUILD DE PRODUÇÃO. Medição em dev não conta.

npm run build && npm run preview

1. PERFORMANCE
   npx lighthouse http://localhost:4321 --preset=perf --form-factor=mobile --view
   Rode na home, numa página de produto e na calculadora.
   Metas: LCP < 2,5s · CLS < 0,1 · INP < 200ms · JS inicial < 100KB gzip ·
   home < 1MB no total.
   Se falhar, diagnostique pela causa (imagem do LCP pesada ou lazy, fonte
   bloqueante, ilha hidratada sem necessidade) e corrija. Não me entregue
   número ruim com explicação.

2. ACESSIBILIDADE
   npx @axe-core/cli http://localhost:4321 --exit
   Rode em todas as rotas. Zero violação crítica ou séria.
   Depois faça o teste manual e me relate:
   - página inteira só com Tab, foco sempre visível e na ordem visual
   - menu mobile fecha no Esc e devolve o foco
   - zoom 200% sem quebra e sem scroll horizontal
   - com imagens desativadas o conteúdo ainda faz sentido

3. RESPONSIVO
   360 · 768 · 1280 · 1920px. Sem quebra, sem scroll horizontal.
   Atenção especial nas tabelas de bitola em 360px.

4. SEO
   Lighthouse SEO 100. Todo title e description único. Rich Results Test válido.

Me mostre os NÚMEROS de cada portão, não um resumo. Se algum reprovar, corrija
e meça de novo antes de seguir.
```

**Aceite:** Lighthouse mobile ≥ 90 em performance nas três páginas · axe limpo ·
sem scroll horizontal em 360px · SEO 100.

---

## Etapa 13 — Deploy e entrega

```
1. Deploy na Vercel com o adapter @astrojs/vercel. Variáveis de ambiente
   configuradas no painel, nunca no repositório.

2. Domínio: documente no README o passo a passo do DNS para aldifer.com.br,
   incluindo o redirect de www para apex (ou o contrário, escolha um e seja
   consistente). HTTPS e HSTS ativos.

3. Resend: documente a configuração de SPF, DKIM e DMARC no domínio.
   Sem isso o e-mail de orçamento cai em spam e a Aldifer perde lead sem saber.

4. README.md em português, cobrindo:
   - o que é o projeto e qual a stack
   - como rodar localmente (com a versão de Node exigida)
   - como editar conteúdo pelo código
   - como editar pelo painel (aponta para COMO-EDITAR.md)
   - como publicar
   - onde ficam as chaves e o que cada uma faz
   - LISTA DE PENDÊNCIAS: todos os [CONFIRMAR] do projeto, em destaque no topo,
     com as 10 perguntas da seção 12 do docs/CONTEUDO.md

5. docs/CHECKLIST-LANCAMENTO.md com todos os itens dos portões, para marcar
   um a um antes de apontar o domínio.

6. Search Console: documente como adicionar a propriedade e enviar o sitemap.

7. Documente a transferência de acessos: repositório, Vercel, Resend, analytics,
   Search Console.

Me diga explicitamente quais itens do checklist AINDA NÃO podem ser marcados e
por quê — quero saber o que depende da Aldifer antes de apontar o domínio.
```

**Aceite:** site no ar em URL de preview · e-mail chegando fora do spam ·
README suficiente para outra pessoa assumir o projeto · lista de pendências
explícita e honesta.

---

## Prompts de correção

Use quando algo não passar, em vez de seguir adiante.

### Quando o visual ficar genérico

```
Critique o design que você acabou de fazer, com honestidade:

1. Se eu trocasse o logo da Aldifer pelo de um concorrente, alguém notaria
   a diferença? Se não, o design é genérico.
2. Existe um elemento que a pessoa vai lembrar depois de fechar a aba?
3. Tem card idêntico com a mesma sombra repetido em toda seção?
4. Tem eyebrow em caixa alta acima de todo título?
5. Tem seta → colada em todo botão?
6. A hierarquia está por espaço e tamanho, ou você resolveu tudo com cor e borda?

Liste o que encontrou, corrija, e me diga o que mudou. Se a resposta da 1 for
"não notaria", refaça a direção visual — não ajuste detalhe.
```

### Quando a performance reprovar

```
Diagnostique pela causa, não por sintoma:

- LCP alto → imagem do hero pesada ou com lazy, fonte bloqueante, ilha hidratada
  antes do conteúdo. Verifique fetchpriority="high" e preload.
- CLS → imagem sem width/height, fonte com métrica diferente, conteúdo injetado
  acima da dobra. Verifique a QuoteBar.
- INP → JS demais na thread principal, ilha hidratada sem necessidade.
  client:visible antes de client:load. client:idle antes de client:visible.
- Bundle grande → rode o analisador e me mostre o que está pesando.

Corrija a causa e meça de novo. Me mostre o antes e o depois em números.
```

### Quando aparecer conteúdo inventado

```
Varra o projeto inteiro procurando dado de negócio que não veio da Aldifer:
número, porcentagem, quantidade de clientes, tonelada em estoque, ano, prazo,
depoimento, nome de cliente, certificação, área do galpão.

Para cada um: ou veio do docs/CONTEUDO.md como confirmado, ou vira [CONFIRMAR]
e entra na lista de pendências do README.

Dado inventado em site corporativo é passivo jurídico e destrói a confiança do
cliente quando ele percebe. Prefiro seção vazia a número falso.

Me liste tudo que você encontrou e o que fez com cada item.
```

---

## Ordem de dependência

```
0 Fundação
└─ 1 Design system
   ├─ 2 Content collections
   │  ├─ 3 Home
   │  ├─ 4 Catálogo
   │  │  └─ 5 Lista de orçamento
   │  │     └─ 6 Formulário e LGPD
   │  ├─ 7 Calculadora
   │  └─ 8 Páginas restantes
   │     ├─ 9 SEO técnico
   │     ├─ 10 Migração de URLs
   │     └─ 11 CMS Keystatic
   └─ 12 Portões de qualidade
      └─ 13 Deploy e entrega
```

As etapas 3, 4, 7 e 8 podem sair de ordem entre si. As demais, não.

**A etapa 6 é a que mais dá errado em silêncio.** Teste o envio de verdade,
com e-mail real, antes de considerar concluída.
