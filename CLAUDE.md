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
| Ilhas interativas | `@astrojs/react` | `6.0.5` |
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

### Tipografia

```
Display: Archivo Expanded — pesos 600/700, tracking -0.02em
         Grotesca expandida. Lê como placa de identificação de máquina.
Texto:   Inter — peso 400/500, entrelinha 1.6
Mono:    JetBrains Mono — só em tabelas de bitola e resultado da calculadora.
         Números técnicos precisam alinhar em coluna.

Escala:  12 / 14 / 16 / 20 / 26 / 34 / 46 / 62  (razão ≈1.33)
```

Fontes **variáveis, auto-hospedadas** via `@fontsource-variable`, subset `latin`,
`font-display: swap`. `preload` **apenas** na fonte usada no LCP (Archivo do hero).
Nada de Google Fonts por CDN.

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
- Componente com mais de ~150 linhas deve ser quebrado.
- Nomes de arquivo, variável, classe e função em **inglês**.
  Strings visíveis ao usuário em **português do Brasil**.
- Comentários, commits, README e documentação em **português do Brasil**.
- Commit pequeno, mensagem no imperativo: `adiciona tabela de bitolas em chapas`.
- `.env` nunca versionado. `.env.example` sempre versionado.

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

| Portão | Meta | Comando |
|---|---|---|
| Performance | LCP < 2,5s · CLS < 0,1 · INP < 200ms · JS inicial < 100KB gzip | `npx lighthouse http://localhost:4321 --preset=perf --form-factor=mobile` |
| SEO | title/description únicos, canonical, sitemap, robots, JSON-LD válido | Lighthouse + Rich Results Test |
| Acessibilidade | WCAG 2.2 AA, zero violação crítica ou séria | `npx @axe-core/cli http://localhost:4321 --exit` |
| Responsivo | 360 · 768 · 1280 · 1920px sem quebra nem scroll horizontal | Inspeção manual, **360px primeiro** |

Peso total da home: **< 1MB**.

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
