# CLAUDE.md — Site Aldifer

> Coloque este arquivo na **raiz do repositório**. O Claude Code lê ele automaticamente
> em toda sessão. Ele é a memória do projeto: regras que não podem ser esquecidas
> entre um prompt e outro.

---

## O projeto

Site novo da **Aldifer Distribuidora de Ferro e Aço**, São Bernardo do Campo / SP.
Substitui o site atual (`aldifer.com.br`, PHP de 2016, Bootstrap 2, rodapé com "© 2016").

**Não é um site institucional.** É uma ferramenta de trabalho para serralheiro e
comprador industrial. O sucesso se mede em pedidos de orçamento estruturados recebidos,
não em "ficou bonito".

### Ação primária (uma só)

**Pedido de orçamento por formulário estruturado.** O visitante monta uma lista de
materiais navegando pelo catálogo e envia tudo de uma vez.

Ações secundárias, sempre com peso visual menor: WhatsApp, telefone, e-mail.

### Público e objeção

| | |
|---|---|
| Público prioritário | Serralherias do Grande ABC |
| Público secundário | Indústria, construção civil, marcenaria/metalúrgica |
| Decisor | Dono da serralheria ou comprador |
| Objeção nº 1 | "Não sei se vocês têm essa bitola em estoque e vou perder tempo ligando" |
| Ticket | De uma barra avulsa a carga fechada — faixa larga, **sem preço no site** |

Todo o site existe para atacar a objeção nº 1: mostrar a linha completa, com medidas
reais, e deixar o pedido pronto em um clique.

---

## Stack (decidida, não renegociar sem motivo técnico)

| Camada | Escolha | Versão verificada em 03/09/2026 |
|---|---|---|
| Framework | Astro | `7.3.1` |
| Linguagem | TypeScript `strict` | `6.0.3` — ver nota abaixo |
| Estilo | Tailwind via `@tailwindcss/vite` | `4.3.3` |
| CMS | Keystatic (Git-based) | `@keystatic/astro 6.0.0` · `@keystatic/core 0.6.9` |
| Validação | Zod | `4.5.4` |
| Sitemap | `@astrojs/sitemap` | `3.7.4` |
| Ilhas interativas | custom elements em JS puro — ver nota abaixo | — |
| E-mail transacional | Resend | `6.26.0` |
| Imagens | `sharp` (embutido no Astro) | `0.35.4` |
| Hospedagem | Vercel (`@astrojs/vercel 11.0.10`) | — |
| Typecheck de `.astro` | `@astrojs/check` | `0.9.10` |

Node **>= 22.12.0** é obrigatório (requisito do Astro 7).

**Confirme as versões com `npm view <pacote> version` antes de instalar.** Se alguma
divergir do que está acima, use a atual e anote a mudança neste arquivo.

### Nota de versão — TypeScript 6, não 7 (registrado em 03/09/2026)

A tabela original pedia TypeScript `7.0.2`, que é mesmo a versão atual. Ele foi
**deliberadamente rebaixado para `6.0.3`** pelo seguinte motivo técnico:

O TypeScript 7 é a reescrita nativa em Go. O pacote npm virou um invólucro fino sobre
o binário — seu `lib/` contém apenas `tsc.js`, `getExePath.js` e `version.cjs`.
A **API JavaScript do compilador deixou de existir**, e toda a cadeia de ferramentas
baseada em Volar depende dela: `astro check`, os diagnósticos da extensão do Astro no
editor, `vue-tsc`, `svelte-check`. Com TS 7 instalado, `@astrojs/check` não instala
(conflito de peer) e, forçado, quebra em execução.

O que o TS 7 entrega é velocidade de compilação — irrelevante num site estático de
~15 páginas. O que ele custa é verificação de tipos em **todo componente `.astro`**,
que é justamente onde vivem as props tipadas exigidas por este arquivo, mais os
diagnósticos no editor. A troca não se paga.

O Astro 7 **não exige** TypeScript 7: não declara peer de `typescript` nenhum.

Revisitar quando `@astrojs/check` migrar para a nova API do TS 7.

### Nota de stack — ilhas em JS puro, não React (registrado em 04/09/2026)

A tabela original trazia `@astrojs/react` para as ilhas interativas. Ele foi
**removido** na Etapa 3, por decisão tomada diante de medição do build de produção.

A home com a busca rápida como ilha React carregava **62,7 KB de JS gzip**, dos quais
**57,2 KB eram o runtime do React e 1,8 KB a busca em si** — 91% do peso era framework.
Como a barra de orçamento da Etapa 5 é global, esse custo passaria a valer em todas as
páginas do site.

O princípio já está enunciado neste arquivo para dependências: "antes de instalar
pacote, pergunte: dá para fazer em 20 linhas? Se sim, faça." Vale igual para hidratação.
E a seção "Por que Astro e não Next" diz que o cliente acessa em 4G de obra, num Android
de entrada, e que cada KB conta.

**Toda ilha deste site é um custom element sobre markup renderizado no servidor pelo
Astro**, com o comportamento sem JS preservado. Vale para o filtro do catálogo
(Etapa 4), a QuoteBar (Etapa 5), o formulário de orçamento (Etapa 6) e a calculadora
(Etapa 7).

A contrapartida aceita: código de formulário e de calculadora fica mais verboso sem
framework.

### Por que Astro e não Next

O site é 95% conteúdo estático. Astro entrega HTML puro com zero JS por padrão.
Só três ilhas hidratam: filtro do catálogo, lista de orçamento e calculadora de peso.
O cliente acessa o site em 4G de obra, num Android de entrada. Cada KB conta.

### Por que Keystatic

O usuário quer **as duas coisas**: editar pelo código *e* deixar o cliente editar sozinho.
Keystatic é CMS baseado em Git — o painel em `/admin` salva commits no próprio repositório,
nos mesmos arquivos Markdown/JSON que o dev edita no editor. Uma fonte de verdade,
duas portas de entrada. Sem banco, sem mensalidade, sem divergência.

---

## Design system

### Paleta

Extraída dos **pixels reais do logo** (`images/logo.png` do site atual), não estimada.

```
MARCA (não alterar — vieram do logo)
--brand-navy      #123053   azul do logotipo
--brand-orange    #CD4116   laranja do arco do logotipo

BASE ESCURA (identidade do site)
--steel-950       #0B1B2E   fundo principal das seções escuras
--steel-900       #122A45   superfície, cards sobre fundo escuro
--steel-700       #1E4A7A   azul claro para hover e links
--border-dark     #24384F   divisores sobre fundo escuro

BASE CLARA
--paper           #FFFFFF   fundo das seções claras
--paper-alt       #F5F6F7   faixas alternadas, fundo de tabela
--border-light    #DDE2E8

TEXTO
--ink             #0B1B2E   texto sobre fundo claro
--ink-soft        #5A6472   apoio sobre fundo claro
--on-dark         #E8EBEF   texto sobre fundo escuro
--on-dark-soft    #9AA6B8   apoio sobre fundo escuro

ACENTO (um só, sem concorrente)
--accent          #CD4116   CTA sobre fundo claro
--accent-bright   #FF6A2B   CTA e destaque sobre fundo escuro

FEEDBACK DE FORMULÁRIO (acrescentado em 04/09/2026 — ver nota abaixo)
--danger          #9F1239   erro sobre fundo claro
--danger-bright   #FFB3C1   erro sobre fundo escuro
--success         #146C2E   sucesso sobre fundo claro
--success-bright  #A6F4B0   sucesso sobre fundo escuro
```

**Contrastes já verificados** (todos passam WCAG AA):

| Par | Ratio |
|---|---|
| `--on-dark` sobre `--steel-950` | 14,5:1 |
| branco sobre `--brand-navy` | 13,3:1 |
| `--ink-soft` sobre branco | 6,0:1 |
| branco sobre `--accent` | 4,81:1 |
| `--accent-bright` sobre `--steel-950` | 6,07:1 |
| `--on-dark-soft` sobre `--steel-950` | 7,04:1 |

Regra: `--accent` (#CD4116) **nunca** sobre fundo escuro — ratio cai para 3,6:1.
Sobre escuro use `--accent-bright`.

### Segunda regra do acento — não é cor de letra (registrado em 04/09/2026)

`--accent` como **cor de texto** dá 4,81:1 no branco. São 0,31 de folga sobre o mínimo
AA, e ela desaparece na primeira faixa alternada: sobre `--paper-alt` cai para
**4,45:1 e reprova**. Um link de acento passa ou reprova dependendo do `tone` que a
seção recebeu — e trocar o tom de uma seção é decisão de layout que ninguém associa a
contraste. O `axe` pegou exatamente isso na Etapa 7.

Para **link no corpo do texto use `--surface-link`**, token de contexto acrescentado em
04/09/2026. Ele resolve para:

| Tom da seção | Cor | Ratio |
|---|---|---|
| `tone-light` | `--steel-700` | 9,07:1 |
| `tone-alt` | `--steel-700` | 8,38:1 |
| `tone-dark` | `--accent-bright` | 6,07:1 |

**Precisa ser de contexto, e não a cor fixa `--steel-700`:** sobre `--steel-950` o
`--steel-700` dá **1,91:1**. Ele só serve em superfície clara — o que faz sentido, já que
na paleta ele pertence à "BASE ESCURA" e foi pensado para ser o azul que aparece *sobre*
o escuro, não em cima dele.

Cuidado com **ilha que fixa fundo claro dentro de seção escura**. `Table.astro` e o aviso
da calculadora declaram `--paper`/`--paper-alt` independente do tom em volta; os dois
também declaram `--surface-link: var(--steel-700)`, senão herdariam `--accent-bright` do
tom escuro e ficariam com laranja claro sobre branco.

O acento **no hover** continua valendo — a WCAG mede o estado de repouso, e o laranja no
hover é assinatura do site.

O `scripts/check-contrast.mjs` varre o código-fonte procurando `--accent` (e o
`--surface-hover`, que resolve para ele) usado como `color` em repouso, e reprova. Os
quatro lugares anteriores à Etapa 7 foram convertidos, e a lista de pendências está
vazia — é para continuar assim.

**Os contrastes desta tabela não são mais afirmação: são verificados.** Rode
`npm run contrast` — o script lê os tokens do próprio `tokens.css`, calcula 22 razões
de contraste e 4 separações de matiz, e falha se alguma reprovar. Ele existe porque na
Etapa 1 eu usei a cor de DIVISOR como contorno de CONTROLE, que dava 1,30:1 contra os
3:1 da WCAG 1.4.11, e nada no build acusou.

### Nota de paleta — cores de feedback (registrado em 04/09/2026)

A paleta original definia "um acento só, sem concorrente" e não previa cor de erro. O
formulário da Etapa 6 precisa de uma, e ela **não pode ser o laranja do CTA**: um campo
com erro ficaria visualmente idêntico ao botão de enviar.

As quatro cores foram escolhidas por MEDIÇÃO. O critério decisivo não é contraste — é
**distância de matiz** do acento, porque razão de contraste mede luminosidade e dois
matizes opostos de mesma luminosidade dão 1:1.

Em OKLCH o `--accent` está em 36°. O vermelho-tijolo #B3261E, que parecia a escolha
óbvia, está em 28,7° — a só **7,3°** de separação, e se confundiria com o botão. O
carmim #9F1239 está a 22,4°, com 8,02:1 no branco e 7,41:1 na faixa alternada.

Regra de uso, simétrica à do acento: `--danger` e `--success` só sobre fundo claro; sobre
escuro use as variantes `-bright`. As utilities `tone-light`, `tone-alt` e `tone-dark`
já trocam `--surface-danger` e `--surface-success` sozinhas, então o componente usa
`text-surface-danger` e não precisa saber em que tom está.

### Tipografia

```
Display: Archivo Expanded — pesos 600/700, tracking -0.02em
         Grotesca expandida. Lê como placa de identificação de máquina.
         O ARQUIVO É GERADO: ver a nota "Archivo instanciada" abaixo.
Texto:   Inter — peso 400/500, entrelinha 1.6
Mono:    JetBrains Mono — só em tabelas de bitola e resultado da calculadora.
         Números técnicos precisam alinhar em coluna.

Escala:  12 / 14 / 16 / 20 / 26 / 34 / 46 / 62  (razão ≈1.33)
```

Fontes **variáveis, auto-hospedadas** via `@fontsource-variable`, subset `latin`,
`font-display: swap`. `preload` **apenas** na fonte usada no LCP (Archivo do hero).
Nada de Google Fonts por CDN.

**As duas regras acima foram testadas contra a alternativa e CONFIRMADAS** na
Etapa 12 — não reabra. Eu propus `font-display: optional` na Inter e na
JetBrains Mono, mais um `preload` da Inter, com medição a favor: CLS 0,000 em
todas as páginas, contra 0,021 e 0,016 com `swap`. Foi recusado, e a razão é boa:
**0,021 contra uma meta de 0,100 é margem, não conformidade**, e `optional` não
troca a fonte depois da janela curta — um visitante em 4G de obra leria a
primeira visita inteira sem a tipografia da marca.

O que sobra de CLS com `swap` é reflow de texto, e é aceito. Se um número de
performance reprovar de verdade, **procure a causa fora da tipografia primeiro**
— na Etapa 12 o CLS de 0,304 da calculadora e o de 0,198 do /orcamento eram
markup escondido na hidratação, e o Lighthouse culpou as web fonts nos dois
casos.

### Archivo instanciada em wdth 125% (registrado na Etapa 13)

**"Archivo Expanded" não é família separada: é o eixo `wdth` em 125%.** Pedir
125% por CSS obriga o arquivo a CARREGAR o eixo inteiro, de 62% a 125%, e isso
custa 90.104 B contra 34.928 B da versão só-peso — que por sua vez não tem
Expanded nenhum.

Como a Archivo é a fonte do H1, que é o elemento de LCP, e por isso a única com
`preload`, esses 55 KB ficavam no CAMINHO CRÍTICO. Medido em /orcamento com 9
execuções: **7 de 9 acima da meta de LCP** com o eixo de largura, 0 de 9 sem.

A saída não foi abrir mão do Expanded: `npm run fonts` **instancia** a fonte com
`wdth` fixado em 125, aplicando o valor aos contornos. Fica em 34.648 B — menor
que a versão só-peso, porque perdeu também as tabelas de variação daquele eixo —
e o eixo de peso continua variável.

**O desenho é idêntico, e isso foi medido**, não afirmado: largura de texto em 4
pesos (400, 600, 700, 900) × 4 frases com todos os acentos do português, fonte
antiga em `font-stretch: 125%` contra a instanciada. Diferença de **0,0000 px**
em todas as 16 comparações. O controle negativo — a antiga em largura 100% — deu
1,2931× mais estreita, o que prova que a medição discrimina.

Duas coisas para lembrar:

> O arquivo gerado é **versionado**. Quem clona e roda `npm install && npm run
> build` não precisa de Python. O `npm run fonts` só é necessário ao trocar a
> versão da fonte, e exige `python -m pip install --user "fonttools[woff]"`.

> `font-stretch: 125%` no `@font-face` é DESCRIÇÃO, não pedido: aquela face É a
> de 125%. Não troque por `normal` — o `font-stretch: var(--display-stretch)` da
> utility `display-expanded` casa com ela.

### Espaçamento e raio

```
Espaçamento: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
Raio:        0    em blocos estruturais (seções, cards de produto, tabelas)
             4px  em controles (botão, input, select)
             999px  proibido, exceto no badge de contagem da lista de orçamento
```

Aço é reto. Canto arredondado em bloco estrutural contradiz o produto.

### Elemento de assinatura

**Desenho técnico de seção transversal.**

Cada categoria e cada produto tem sua seção transversal desenhada em **SVG de traço**,
no estilo de prancha de desenho técnico: linha fina contínua no contorno, linha de cota
com seta nas duas pontas, letra da dimensão (`A`, `e`, `Ø`) em mono.

Não são ícones genéricos. É o corte real do perfil I, do U, da cantoneira, do tubo
retangular. É o desenho que o serralheiro já lê no dia a dia.

Onde aparece:
- Card de cada categoria no catálogo.
- Topo da página de cada produto, com as cotas correspondendo às colunas da tabela.
- Dentro da calculadora, atualizando conforme o perfil escolhido.
- Como marca-d'água em traço muito sutil no hero (opacidade ≤ 0,06).

Este é o único lugar onde gastamos ousadia visual. O resto é disciplinado.

### O que está proibido

Vícios que denunciam página gerada por IA:

- Fundo creme (#F4F1EA) com serifada de alto contraste. **Nossa base é aço escuro.**
- Card idêntico repetido com a mesma sombra suave em toda seção.
- Eyebrow em CAIXA ALTA espaçada acima de todo título.
- Seta `→` colada no texto de todo botão.
- Numeração `01 / 02 / 03` em conteúdo que não é sequência real.
- Gradiente decorativo sem função.
- Emoji em qualquer lugar do site.
- Foto de banco de imagem com executivo de gravata apertando a mão. Se não houver
  foto real do galpão, use o desenho técnico em vez de foto genérica.

---

## Convenções de código

- `strict: true` no `tsconfig`. **Zero `any`.** `@ts-ignore` só com comentário justificando.
- Props sempre tipadas explicitamente. Componente sem tipo não passa.
- **Conteúdo nunca hardcoded no JSX.** Tudo em content collections ou JSON tipado.
  O componente recebe dados, não os contém.
- Componente com mais de ~150 linhas deve ser quebrado. **O limite conta apenas
  frontmatter e markup** — os blocos `<style>` e `<script>` co-localizados no `.astro`
  não entram na conta (decidido em 04/09/2026; ver nota abaixo).
- Nomes de arquivo, variável, classe e função em **inglês**.
  Strings visíveis ao usuário em **português do Brasil**.
- Comentários, commits, README e documentação em **português do Brasil**.
- Commit pequeno, mensagem no imperativo: `adiciona tabela de bitolas em chapas`.
- `.env` nunca versionado. `.env.example` sempre versionado.

### Nota — por que style e script não contam no limite de linhas

Decidido em 04/09/2026, quando nove arquivos passavam de 150 linhas no total mas nenhum
passava de 130 contando só markup: `QuoteList.astro` tinha 361 linhas, das quais 99 de
markup, 75 de estilo e 187 de script.

A classe de cada custom element consulta seletores definidos no markup imediatamente
acima dela (`[data-empty]`, `[data-row]`, `[data-quantity]`). Separar os dois em arquivos
diferentes faz o par sair de sincronia com o tempo, e nada no build acusa.

**Quando a lógica merecer teste isolado, extraia-a como módulo PURO em `src/lib/`** — sem
tocar em `astro:content` nem no DOM — e deixe no `.astro` apenas a ligação com a página.
É o que já se fez com `dimension-label.ts`, `search.ts`, `quote.ts` e
`cross-section-legend.ts`, que juntos respondem por boa parte dos 113 testes.

### HTML e acessibilidade (não negociável)

- `lang="pt-BR"` no `<html>`.
- Um `h1` por página. Hierarquia sem pular nível.
- Landmarks: `header`, `nav aria-label`, `main`, `footer`.
- Link "Pular para o conteúdo" como primeiro elemento focável.
- `button` para ação, `a[href]` para navegação. **Nunca `div` com `onClick`.**
- `<label for>` em todo campo. Placeholder não é label.
- Foco visível com contraste ≥ 3:1. `outline: none` só com substituto visível.
- Alvo de toque mínimo 44×44px no mobile.
- `prefers-reduced-motion: reduce` respeitado.

### Imagens

- Sempre `<Image>` do Astro, com `width` e `height` explícitos.
- AVIF com fallback WebP. JPEG só em último caso.
- LCP: `loading="eager"` + `fetchpriority="high"`. **O LCP nunca é lazy.**
- Todo o resto: `loading="lazy"`.
- Nenhum arquivo acima de **250KB**.
- `alt` descreve a função. Decorativa recebe `alt=""`.

---

## Portões de qualidade

Nenhuma entrega passa sem os quatro. Medir em **build de produção**, perfil **mobile
com throttling**. Medir em dev não conta.

Os quatro viraram scripts na Etapa 12. Rode `npm run servir` num terminal — que
sobe o build em `:4330` com gzip e os cabeçalhos do `vercel.json` — e no outro:

| Portão | Meta | Comando |
|---|---|---|
| Performance | LCP < 2,5s · CLS < 0,1 · INP < 200ms · JS inicial < 100KB gzip | `npm run lighthouse` |
| SEO | title/description únicos, canonical, sitemap, robots, JSON-LD válido | `npm run seo` (+ Rich Results Test no deploy) |
| Acessibilidade | WCAG 2.2 AA, zero violação crítica ou séria | `npm run axe` (todas as rotas) |
| Responsivo | 360 · 768 · 1280 · 1920px sem quebra nem scroll horizontal | `npm run responsivo` (todas as rotas × 4 larguras) |

Peso total da home: **< 1MB**.

`npm run cls -- /rota 4` quando o CLS reprovar: ele imprime o retângulo ANTES e
DEPOIS de cada elemento que se moveu. **Não confie na atribuição de causa do
Lighthouse** — ela nomeia a requisição que terminou perto do salto, e na Etapa 12
apontou "Web font loaded" para um defeito que era markup escondido na hidratação.

Os números medidos ficam em `docs/QUALIDADE.md`, e a parte manual de
acessibilidade em `docs/ACESSIBILIDADE.md`. `npm run meta`, `npm run js`,
`npm run contrast`, `npm test` e `npm run check` rodam sem servidor.

### CLS pelo PIOR caso, tempo pela mediana

Os portões de tempo rodam 3 a 5 vezes e tiram a **mediana**, porque LCP e FCP
variam por carga de máquina — o `/orcamento` já deu 2,56s numa execução e 1,95s
em cinco seguidas, sem mudança de código.

**Para CLS a mediana MENTE.** Em `/calculadora-de-peso` as cinco execuções deram
`0,000 · 0,016 · 0,016 · 0,304 · 0,304`: distribuição bimodal, conforme a fonte
chegar antes ou depois de uma pintura grande. A mediana é 0,016 e passava folgado,
escondendo que 40% das visitas levavam o triplo da meta. CLS não é ruído de
medição, é evento: se acontece em 2 de 5 execuções aqui, acontece com 2 de 5
visitantes lá.

### Nunca renderize dois estados e esconda um na hidratação

**É o defeito mais caro deste projeto, e ele apareceu três vezes na Etapa 12.**

O `QuoteList` renderizava lista vazia e lista cheia, as duas com `hidden`, e
desescondia uma ao hidratar: 292px inseridos, CLS 0,198. A `WeightCalculator`
renderizava os 12 grupos de campo e os 12 desenhos de seção transversal com
`hidden`: CLS 0,304 — e, de quebra, **a calculadora não funcionava sem
JavaScript**, mostrando o seletor de perfil e mais nada.

A saída é sempre a mesma: **o servidor renderiza o estado certo, visível**, e o
script só troca depois. Quando o estado depende do `localStorage`, um script de
boot síncrono no `<head>` escreve um atributo no `<html>` antes da primeira
pintura e o CSS decide a visibilidade — ver `src/lib/quote-boot.mjs`.

E se o padrão aparece em dois lugares, ele vira **constante compartilhada**: o
script da calculadora tinha `findProfile('tubo-quadrado')` enquanto o `<select>`,
sem `<option selected>`, começava no primeiro perfil do registro. Servidor e
cliente discordavam em toda visita, e ninguém via porque tudo estava escondido.

---

## Dados reais da empresa

Estes são confirmados (extraídos do site atual). **Pode usar.**

```
Razão      Aldifer Distribuidora de Ferro e Aço
Slogan     A Loja do Aço
Fundação   2002
Endereço   Estrada dos Alvarengas, 5338 — Núcleo São Jorge
           São Bernardo do Campo / SP — CEP 09850-550
Telefone   (11) 4344-1919
E-mail     contato@aldifer.com.br
LinkedIn   https://www.linkedin.com/company/aldifer/
Instagram  https://www.instagram.com/aldiferoficial/
Facebook   https://www.facebook.com/aldiferoficial/
```

### O que é PLACEHOLDER — não invente

Marcar visivelmente no código com `[CONFIRMAR]` e listar no README:

- **Horário de funcionamento** — não consta no site atual.
- **Número do WhatsApp** — o site atual manda para um `linktr.ee`. Precisa do número direto.
- **CNPJ** — necessário para o rodapé e para o JSON-LD.
- **Corte sob medida** — se a Aldifer faz, é o maior diferencial do site. Confirmar.
- **Prazo de entrega e raio de entrega** — ataca a objeção nº 1 diretamente.
- **Quantidade mínima de pedido** — se existir.
- **Qualquer número de escala** (m² de galpão, toneladas em estoque, nº de clientes).

**Regra dura:** nenhum número, depoimento, case ou certificação entra no site sem
confirmação da Aldifer. Dado inventado em site corporativo é passivo jurídico e
destrói a confiança do cliente quando ele percebe.

---

### Nota de segurança — a CSP é gerada pelo Astro (registrado em 05/09/2026)

O `astro.config.mjs` liga `security.csp`, e o Astro emite um `<meta http-equiv>`
por página **com o hash de cada script inline que ele mesmo embutiu**.

Isso tem uma consequência que precisa ser lembrada em toda etapa seguinte:

> **Nunca escreva `<script is:inline>` com CÓDIGO no corpo.** O Astro só hasheia os
> scripts que ele processa; um `is:inline` passa sem hash e a CSP o BLOQUEIA em
> produção — sem erro no build, sem erro no `astro check`, e sem erro no servidor de
> desenvolvimento, que não emite a CSP.

Foi exatamente o que aconteceu na Etapa 9 com o stub de fila do Plausible, escrito
como a documentação deles recomenda. Só apareceu ao servir o build em `npm run servir`.

Se um script precisa rodar cedo, ponha a lógica num módulo de `src/lib/` e chame de
dentro de um `<script>` normal — o Astro empacota, hasheia e a política acompanha.
`is:inline` **com `src`** de terceiro continua válido: quem o autoriza é o host em
`script-src-elem`, e script externo não usa hash.

Para testar a CSP: `npm run servir` sobe o build em `:4330`. O `astro preview` não
funciona com o adapter da Vercel, e `npm run dev` não emite a política.

---

### Nota de stack — o painel do Keystatic é React, e fica em /keystatic (05/09/2026)

A Etapa 3 removeu o React do site por peso. A Etapa 11 o trouxe de volta **apenas como
dependência do painel de edição**, e isso é compatível: o painel é ferramenta interna,
não é o site.

Medido com `npm run js` antes e depois: as 16 páginas públicas ficaram **idênticas**, e
nenhum bundle público contém vestígio de React. O portão reprova página pública acima de
40 KB gzip justamente para acusar se algum dia vazar.

Três coisas para lembrar em toda etapa seguinte:

> **`keystatic.config.ts` roda NO NAVEGADOR.** Não importe `src/content.config.ts` de lá
> (puxa `astro:content` e o painel abre em branco) e não use `process.env` (use
> `import.meta.env`). Valor compartilhado com o site vai em módulo PURO de `src/lib/`.

> **O Keystatic exige declarar TODO campo do frontmatter.** Ele não descarta campo não
> declarado: ele **não abre a entrada**. Campo que o painel não deve mostrar vai como
> `fields.ignored()`, que preserva o valor verbatim.

> **A rota é `/keystatic`, não `/admin`.** `/admin` é um stub que redireciona. As duas
> estão bloqueadas no robots.txt, fora do sitemap e com `noindex`.

O `src/middleware.ts` relaxa a CSP **só** nas rotas do painel, porque o `@keystar/ui`
injeta estilo em tempo de execução. E atenção a uma regra da CSP que eu aprendi errando:
`'unsafe-inline'` é **ignorado** quando há hash na mesma diretiva — é preciso substituir
a diretiva, não ampliá-la.

---

### Nota de segurança — a CSP também bloqueia atributo `style` (05/09/2026)

A nota acima vale para o `<script is:inline>`. **O espelho dela é o atributo
`style`**, e ele já mordeu: a página `/admin` foi ao build com três atributos
`style` inline e renderizava **sem estilo nenhum**.

A CSP gerada emite `style-src 'self'`. O `style-src-attr` — que é quem governa o
atributo — cai nesse fallback quando não é declarado, e `'self'` **não** libera
estilo em atributo. O navegador descarta os três, sem erro no build, sem erro no
`astro check` e sem erro no `npm run dev`.

> **Estilo vai em bloco `<style>`, nunca em atributo `style`.** O Astro hasheia o
> bloco e a política acompanha; atributo ele não processa. Manipular
> `element.style.foo` por CSSOM continua valendo — o que a CSP bloqueia é o
> ATRIBUTO vindo do markup.

Exceção legítima: o HTML de e-mail em `src/lib/quote-email.ts`. Cliente de e-mail
exige estilo inline e não tem CSP.

---

### Nota de performance — o CSS voltou a arquivo linkado (06/09/2026)

`build.inlineStylesheets: 'auto'` no `astro.config.mjs`, que é o padrão do
Astro. **Esta linha já foi `'always'`, e a reversão é a lição mais útil que este
projeto produziu sobre medição.**

Na Etapa 12 embutir a folha era mesmo melhor: `<link rel="stylesheet">` bloqueia
a pintura, e o `preload` da Archivo é escrito antes no `<head>` enquanto o Astro
injeta o `<link>` no fim — o navegador começava a fonte antes do CSS crítico. Em
9 execuções no `/orcamento`, a folha em arquivo ficava acima da meta de LCP em
**4 de 9**, e embutida em **0 de 9**.

Só que aquela medição valia num mundo que deixou de existir: ela foi feita em
**http/1.1**, no servidor de teste local, contra uma **Archivo de 90 KB**.
Depois disso a fonte passou a ser instanciada e caiu para 34,6 KB, e o site foi
para a Vercel, que serve **http/2** — onde a requisição da folha é multiplexada
na conexão já aberta em vez de custar um round-trip inteiro.

Remedido em produção, com as duas variantes publicadas e 3 execuções por página,
a folha linkada ganhou em TUDO:

```
             LCP embutido   LCP linkado
Home            1,38s          1,11s
Categoria       1,36s          1,22s
Calculadora     1,52s          1,37s
Orçamento       1,53s          1,37s
```

O FCP do `/orcamento` caiu de 1,37s para 1,07s e o pior CLS dele de 0,052 para
0,018. E a folha linkada ainda é melhor pelo que a medição de UMA página não
mostra: cache compartilhado, então cada página seguinte carrega 6,6 KB gzip a
menos — e o público navega várias páginas do catálogo, de 4G.

> **Número de performance tem prazo de validade.** Antes de confiar numa
> otimização antiga, olhe se as condições da medição ainda valem: protocolo,
> tamanho dos recursos, ambiente. Esta inverteu quando as três mudaram.

---

## Migração de SEO (crítico)

O site atual tem **~100 páginas-satélite** de keyword stuffing
(`viga-i-preco.php`, `barras-chata-no-abc.php`, `tubo-galvanizado-preco.php`...).

Elas não serão recriadas — são conteúdo raso e duplicado, penalizado pelo Google desde
o Helpful Content Update. Mas **têm histórico de indexação**.

Portanto: **redirect 301 de cada URL antiga para a página de produto real correspondente.**
Nunca 404. Perder esse histórico é a maior causa de queda de tráfego pós-redesenho.

O mapa completo de redirects está em `CONTEUDO.md`.

---

## Como o Claude Code deve trabalhar neste repo

1. Antes de criar componente, verifique se já existe em `src/components/`.
2. Antes de escrever cor, use o token. **Nenhum hex solto no código.**
3. Antes de instalar pacote, pergunte: dá para fazer em 20 linhas? Se sim, faça.
4. Depois de cada bloco de trabalho, rode `npm run build` e confirme que passa.
5. Ao terminar um prompt, faça o commit com mensagem em português no imperativo.
6. Se um requisito conflitar com este arquivo, **pare e pergunte**. Não decida sozinho.
