# Portões de qualidade — números medidos

O `CLAUDE.md` define quatro portões e diz: "Nenhuma entrega passa sem os quatro.
Medir em **build de produção**, perfil **mobile com throttling**. Medir em dev
não conta."

Este arquivo registra os números da Etapa 12. Não é resumo: é o que os comandos
imprimiram.

## Como rodar

```bash
npm run build
npm run servir        # sobe o build em :4330, com gzip e os cabeçalhos do vercel.json
```

Depois, em outro terminal:

| Portão | Comando | O que reprova |
|---|---|---|
| Performance | `npm run lighthouse` | perf < 90 · LCP > 2,50s · CLS > 0,100 · TBT > 200ms · home > 1 MB |
| SEO | `npm run seo` | nota SEO < 100 · JSON-LD inválido |
| Acessibilidade | `npm run axe` | qualquer violação `critical` ou `serious` |
| Responsivo | `npm run responsivo` | scroll horizontal · conteúdo cortado sem rolagem · tabela inalcançável |

E os verificadores estáticos, que não precisam de servidor:

```bash
npm test          # 243 testes
npm run check     # astro check: 133 arquivos, 0 erro
npm run contrast  # 22 contrastes e 4 separações de matiz
npm run meta      # title/description únicos, canonical, og:image, um h1
npm run js        # peso de JS por página
npm run cls -- /rota 4   # diagnóstico, quando o CLS reprovar
```

`npm run servir` e não `astro preview`: o preview não funciona com o adapter da
Vercel, e o `dev` não emite a CSP. Sem o gzip do `servir` a medição mente — foi o
primeiro erro desta etapa, com o HTML indo a 44 KB em vez de 11.

## Dois builds, porque o catálogo ainda é rascunho

Os 27 produtos estão com `status: 'rascunho'`, porque a planilha de estoque da
Aldifer não chegou (ver README, seção BLOQUEANTE). Em produção `SHOW_DRAFTS` é
`import.meta.env.DEV`, então **nenhuma página de produto é gerada**: o build tem
17 rotas em vez de 44.

Os dois foram medidos. O segundo é o que vai ao ar hoje; o primeiro é o que vai
ao ar quando a planilha chegar, e por isso não podia ficar sem medição.

### Performance — 5 execuções por página

Perfil mobile, `--throttling-method=simulate`. **Tempo pela mediana, CLS pelo
pior caso** — o porquê está na seção "O que o portão aprendeu".

Catálogo completo (44 rotas, `SHOW_DRAFTS` ligado):

```
  perf    LCP    CLS pior  CLS med   TBT     FCP     peso   LCP min-max     página
    98    2.26s     0.000    0.000     0ms   1.58s    218KB     2.26-2.41s  Home
    99    2.11s     0.021    0.021     0ms   1.43s    214KB     2.10-2.26s  Categoria
    98    2.26s     0.016    0.016     0ms   1.58s    223KB     2.26-2.41s  Calculadora
    97    2.41s     0.059    0.018     0ms   1.73s    241KB     2.41-2.56s  Orçamento
    98    2.26s     0.001    0.001     0ms   1.58s    216KB     2.26-2.41s  /produtos/barras/barra-chata
    97    2.26s     0.075    0.075     0ms   1.58s    216KB     2.11-2.26s  /produtos/chapas/chapa-xadrez
```

Build de produção (17 rotas):

```
  perf    LCP    CLS pior  CLS med   TBT     FCP     peso   LCP min-max     página
    98    2.26s     0.000    0.000     0ms   1.58s    218KB     2.26-2.46s  Home
    99    2.11s     0.021    0.021     0ms   1.43s    213KB     2.10-2.11s  Categoria
    98    2.26s     0.016    0.016     0ms   1.58s    223KB     2.25-2.26s  Calculadora
    97    2.41s     0.052    0.018     0ms   1.73s    241KB     2.41-2.71s  Orçamento
```

Peso da home: **218 KB** contra o limite de 1 MB do `CLAUDE.md`. TBT **0ms** em
todas — o site quase não tem JavaScript de inicialização.

O número mais apertado é o **LCP do Orçamento, 2,41s contra a meta de 2,50s**. É
a página mais pesada (241 KB) e a que carrega mais script (26,9 KB gzip). É o
número a observar em qualquer mudança futura.

O segundo mais apertado é o **CLS de `/produtos/chapas/chapa-xadrez`, 0,075
contra 0,100** — reflow do `swap` da Archivo e da Inter na página de tabela mais
larga. É consequência aceita da decisão de tipografia; ver `src/styles/fonts.css`.

### SEO

```
JSON-LD: 89 blocos em 44 rotas          (29 blocos em 17 rotas, em produção)
   43 HardwareStore
   39 BreadcrumbList
    7 ItemList

  nota  auditorias reprovadas   página
   100  —                       Home · Catálogo · Categoria · Produto
   100  —                       Calculadora · Orçamento · Empresa · Contato · Privacidade
```

Nove moldes de página com **SEO 100**, e o JSON-LD validado em TODAS as rotas —
JSON parseável, `@context` correto, `@type` previsto, campo obrigatório
presente, nenhum campo vazio, posições do breadcrumb em 1..n.

`npm run meta` confere separadamente, nas 44 rotas: title e description únicos,
canonical, og:image e exatamente um `h1`.

**O que falta:** o Rich Results Test do Google, que exige URL pública. Está em
`docs/POS-DEPLOY.md` para rodar no dia do deploy.

### Acessibilidade

```
43 rotas sem violação crítica nem séria     (16 rotas em produção)
```

Zero violação `critical` ou `serious`, e zero `moderate`/`minor` também. O axe
cobre de 20% a 50% do que existe; o resto é o teste manual de
`docs/ACESSIBILIDADE.md`.

### Responsivo

360 · 768 · 1280 · 1920px em toda rota do build:

```
172 medições sem quebra, sem scroll horizontal e sem corte    (64 em produção)
```

A tabela de bitola em 360px, que é o ponto de atenção do `CLAUDE.md`:

```
  /calculadora-de-peso/                  3 col × 11 lin  723px em 326px  rola
  /produtos/barras/barra-chata/          5 col × 16 lin  633px em 326px  rola
  /produtos/barras/barra-quadrada/       4 col × 11 lin  476px em 326px  rola
  /produtos/telas/tela-alambrado/        5 col ×  8 lin  782px em 326px  rola
  ... 23 rotas com tabela, todas rolando dentro do <table-scroller>
```

Mais um cenário com estado, porque a varredura pega a página como ela chega ao
visitante novo — e a tabela da lista de orçamento SÓ EXISTE com itens:

```
  lista de orçamento com 3 itens   360:ok(tab 954/326 rola)  768:ok(tab 954/703 rola)  1280:ok  1920:ok
```

## O que o portão aprendeu nesta etapa

Quatro correções no INSTRUMENTO, todas porque ele estava passando algo que não
devia — ou reprovando algo que não era defeito.

### 1. Mediana esconde falha bimodal

O portão de performance passou a rodar 3 a 5 vezes e tirar a mediana, porque o
`/orcamento` reprovou com LCP 2,56s numa execução e mediu 1,95s em cinco
execuções seguidas. Isso está certo para TEMPO.

Está errado para CLS. Em `/calculadora-de-peso` as cinco execuções deram
`0,000 · 0,016 · 0,016 · 0,304 · 0,304` — **bimodal**, conforme a fonte chegar
antes ou depois de uma pintura grande. A mediana disso é 0,016 e passava folgado,
escondendo que 40% das visitas levavam o TRIPLO da meta.

CLS não é ruído de medição, é evento: se acontece em 2 de 5 execuções aqui,
acontece com 2 de 5 visitantes lá. **Tempo pela mediana, CLS pelo pior caso.**

### 2. O portão responsivo confundia sangria decorativa com quebra

A primeira versão isentava só o elemento dentro de contêiner que ROLA, e acusava
todo o resto. Reprovava a marca-d'água do hero, que é `aria-hidden` com opacidade
0,06 e sangra de propósito. E, pior, punha no mesmo balde o caso GRAVE: conteúdo
real cortado por `overflow: hidden` sem poder rolar, que o usuário não alcança.
Agora são três baldes, com decoratividade testada ANTES da contenção — o
honeypot de 1×1px em `left: -9999px` reprovava as quatro larguras.

E `scrollWidth > clientWidth` não prova que rola: `overflow: hidden` também cria
contêiner de rolagem. Uma tabela de 2000px dentro de um `hidden` de 200px
reportava "rola" e passava.

O medidor agora **se autoverifica em toda execução**: oito provas injetam a
quebra que cada balde existe para pegar e exigem que ele dispare. Se o medidor
ficar vacuoso numa correção futura, o portão para em vez de passar calado.

### 3. Medir a página errada, sem perceber

O `/admin` tem `<meta refresh>` de 0s para o painel do Keystatic. O portão
esperava 350ms e media o PAINEL, reprovando com o overflow do `@keystar/ui` — num
painel que o portão nem cobre. Agora a medição informa em que URL ela aconteceu,
e divergir da rota pedida é falha.

O portão de SEO tinha o espelho disso: com os produtos em rascunho, ele auditava
o 404 de `/produtos/barras/barra-chata` e reportava "SEO 0". Não havia página
reprovando, havia página ausente. Portão que mente sobre a causa é pior que
portão que falha.

### 4. Um verificador com `try/catch` silencioso

Já corrigido antes desta etapa, mas vale o registro porque é o mesmo padrão: o
`servir-build.mjs` engolia um `readFileSync` ausente. O catch ficou explícito.

## O que foi CONSERTADO no site, e não no portão

Três defeitos reais, todos da mesma família: **markup renderizado em dois estados,
com um escondido na hidratação.**

1. **`/orcamento`, CLS 0,198.** O `QuoteList` renderizava os dois estados com
   `hidden` e desescondia um ao hidratar, inserindo ~292px. Passou a decidir por
   CSS, a partir de um `data-quote` que um script de boot escreve antes da
   primeira pintura. CLS 0,198 → 0,034.

2. **`/calculadora-de-peso`, CLS 0,304.** Os 12 grupos de campo e os 12 desenhos
   de seção transversal saíam do servidor com `hidden`, e o script desescondia um
   depois de hidratar. Além do salto, **a calculadora não funcionava sem
   JavaScript** — mostrava o seletor de perfil e mais nada, contra o "comportamento
   sem JS preservado" do `CLAUDE.md`. Agora o perfil padrão vem visível, com
   `<option selected>`, e o padrão mora numa constante única
   (`DEFAULT_PROFILE_SLUG`) que markup e script compartilham: o script tinha
   `'tubo-quadrado'` enquanto o `<select>` começava na barra redonda, e servidor
   e cliente discordavam em toda visita. CLS pior 0,304 → 0,062.

   Nesse caso o Lighthouse atribuiu o salto às web fonts, e eu persegui **três
   configurações de `font-display`** antes de ler o `previousRect` de cada
   deslocamento. A atribuição dele nomeia a requisição que terminou perto do
   salto, não a causa. Daí o `npm run cls` existir.

3. **`/orcamento` com itens, +285px de scroll horizontal a 360px.** Os
   `<label class="sr-only">` das células são `position: absolute`, e sem ancestral
   posicionado o bloco contentor deles é o ICB — então **`overflow` não os
   recorta**: eles ficavam na coordenada de layout da célula, a 954px, e
   empurravam o documento, arrastando a `quote-bar` fixa. `position: relative` no
   `<table-scroller>` resolveu. Só apareceu porque o portão responsivo passou a
   testar a lista COM itens.

E dois que não eram de layout:

4. **`/admin` ia ao ar sem estilo nenhum.** A página usava três atributos
   `style` inline, e a CSP gerada emite `style-src 'self'` — o `style-src-attr`
   cai nesse fallback, que não libera estilo em atributo. O navegador descartava
   os três, sem erro no build nem no `astro check`. É a nota do `CLAUDE.md` sobre
   `<script is:inline>`, do lado do estilo: o Astro hasheia o que ele processa, e
   atributo ele não processa. Virou bloco `<style>` com tokens — de passagem,
   saíram três hexes soltos.

5. **O CSS passou a ser embutido no HTML.** `<link rel="stylesheet">` bloqueia a
   pintura, e o `preload` da Archivo (88 KB) é descoberto ANTES dele no `<head>`,
   porque o Astro injeta a folha no fim. O navegador começava a fonte antes do CSS
   crítico. Em 9 execuções no `/orcamento`: CSS em arquivo dava LCP 2,41–2,56s com
   **4 de 9 acima da meta**; embutido dá 2,40–2,41s com **0 de 9**. O raciocínio
   completo, incluindo a alternativa medida e recusada, está em `astro.config.mjs`.

## O que NÃO foi possível verificar aqui

- **Rich Results Test do Google** — exige URL pública. Em `docs/POS-DEPLOY.md`.
- **Tecla Tab e Esc** não chegam à página pelo ambiente de automação usado. Foi
  contornado medindo a ordem do DOM contra a posição visual, e exercitando a API
  do `<dialog>` diretamente. O roteiro manual está em `docs/ACESSIBILIDADE.md`.
- **`size-adjust` de fallback de fonte por plataforma.** A técnica que elimina o
  reflow do `swap` exige um fator por fonte de sistema, e o fator depende da
  plataforma: medi que a Inter é 109,14% da Segoe UI e a Archivo 112,25% da
  Roboto, mas a Roboto é a fonte do Android — que é o público — e não pode ser
  medida nesta máquina. Calibrar às cegas seria pior que não calibrar.
- **INP** é métrica de campo e não existe em laboratório. O portão usa TBT, com o
  limiar de 200ms que o próprio Lighthouse trata como "bom".
