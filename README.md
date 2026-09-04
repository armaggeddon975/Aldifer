# Site Aldifer

Site novo da **Aldifer Distribuidora de Ferro e Aço**, São Bernardo do Campo / SP.
Substitui o site atual (`aldifer.com.br`, PHP de 2016).

Não é um site institucional: é uma ferramenta de trabalho para serralheiro e comprador
industrial. O sucesso se mede em pedidos de orçamento estruturados recebidos.

As regras do projeto estão em [`CLAUDE.md`](./CLAUDE.md). O conteúdo aprovado está em
[`docs/CONTEUDO.md`](./docs/CONTEUDO.md). O roteiro de construção está em
[`docs/PROMPTS.md`](./docs/PROMPTS.md).

---

## ⛔ BLOQUEANTE — antes de qualquer lançamento

### 1. A planilha de estoque real da Aldifer precisa ser solicitada

**Os 27 produtos deste repositório estão todos com `status: 'rascunho'`.**

As tabelas de bitola foram preenchidas com a **faixa comercial padrão de mercado**, que
NÃO é o estoque da Aldifer. Publicar bitola que a empresa não tem gera pedido que ela não
consegue atender — o que é pior do que não publicar nada.

Enquanto estiverem em rascunho:

- os produtos **não entram no build de produção** (`getVisibleProducts()` os filtra);
- em desenvolvimento cada um exibe o aviso `⚠ Tabela em conferência`;
- **o catálogo em produção está vazio.** Isso é intencional, não um defeito.

**O que precisa acontecer:** obter a planilha de bitolas em estoque, substituir as
tabelas em `src/content/products/`, conferir linha por linha e só então trocar
`status: 'rascunho'` por `status: 'publicado'`.

### 2. Tabelas de usina que ainda faltam

Quatro produtos têm `weightSource: 'tabela-usina'`, porque não existe fórmula de peso
simples para eles. A coluna de peso mostra "consultar" em vez de número inventado.

| Produto | O que falta | Por quê |
|---|---|---|
| `perfil-i` | tabela inteira | Aba cônica e raio de concordância — cálculo aproximado erra |
| `perfil-u` | tabela inteira | Idem |
| `chapa-xadrez` | coluna de peso | O relevo em losango acrescenta material que a fórmula da chapa plana não considera |
| `telha-galvanizada` | coluna de peso | A ondulação consome mais material por m² de área coberta |

Outros quatro (`degraus`, `fechaduras`, `tintas-e-solventes`, `acessorios`) estão sem
tabela porque as medidas dependem das linhas que a Aldifer trabalha.

### 3. Uma promessa de prazo não confirmada está na copy

A copy aprovada da home afirma, na seção "Por que a Aldifer":

> Você consulta a medida no site e confirma a retirada **no mesmo dia**.

O próprio `docs/CONTEUDO.md` marca esse bloco com `[CONFIRMAR: prazo e política de
retirada]`. Mantivemos o texto porque ele está aprovado e o `PROMPTS.md` proíbe
reescrever copy aprovada — mas é **promessa de prazo não verificada**, exatamente o
tipo de afirmação que o `CLAUDE.md` classifica como passivo jurídico.

Antes do lançamento: confirmar o prazo com a Aldifer, ou ajustar o texto.

---

## Pendências marcadas `[CONFIRMAR]`

Nada disso pode ser inventado. Dado falso em site corporativo é passivo jurídico e
destrói a confiança do cliente quando ele percebe. Onde o dado falta, a interface **omite
a seção** em vez de preencher.

### Perguntas para a Aldifer

1. Vocês fazem **corte sob medida**? Qual tolerância e prazo? *(se sim, é o maior
   diferencial do site)*
2. Qual o **horário de funcionamento**, incluindo sábado?
3. Qual o **número de WhatsApp** direto do comercial? *(o site atual manda para um
   `linktr.ee`)*
4. **CNPJ**, para o rodapé e para os dados estruturados.
5. Existe **pedido mínimo**, em valor ou em peso?
6. Vocês **entregam**? Em que cidades e com que prazo?
7. Qual a **planilha real de bitolas em estoque**? *(bloqueante — ver acima)*
8. Trabalham com **inox ou alumínio**, ou só aço carbono? *(muda a calculadora: inox usa
   densidade 7.900 e alumínio 2.700)*
9. Emitem **certificado de qualidade da usina** quando o cliente pede?
10. Onde os leads devem cair: **e-mail de quem**, e em qual planilha ou sistema?

Os campos correspondentes estão em [`src/content/site-config.json`](./src/content/site-config.json)
com valor `null`. Campo nulo não renderiza.

### Decisões técnicas pendentes

| Item | Situação | Etapa |
|---|---|---|
| **Arquivo do logotipo** | Não temos. A marca hoje é um logotipo tipográfico em Archivo Expanded — mais nítido e mais leve que um PNG, mas não é a identidade oficial. | 8 |
| **Onde persistir o lead** | E-mail sozinho perde lead. Ordem de preferência: Google Sheets → Notion → Supabase. Depende da pergunta 10. | 6 |
| **`www` ou apex** | Fixado em `https://www.aldifer.com.br` no `astro.config.mjs`, para casar com o JSON-LD. Se mudar, muda nos dois lugares. | 13 |
| **Fonte Archivo** | O arquivo com eixo de largura custa 88 KB contra 34 KB da versão só-peso. É o preço do "Expanded". Candidata nº 1 de otimização. | 12 |
| **Script inline** | O menu mobile sai como 372 B de JS inline. Ótimo para performance, mas a CSP restrita precisará de hash ou de forçar arquivo externo. | 9 |
| **Nova sessão fotográfica** | O site atual tem 4 fotos das instalações, pequenas e antigas. Aço bem fotografado é metade da credibilidade da página Empresa. | 8 |

---

## As ilhas são JS puro, não React

`@astrojs/react` foi **removido** na Etapa 3. Toda parte interativa deste site é um
custom element sobre markup renderizado no servidor pelo Astro.

O motivo é uma medição, não preferência. A busca rápida como ilha React:

| | JS da home (gzip) |
|---|---|
| Com ilha React | 62,7 KB — dos quais 57,2 KB só de runtime |
| Com custom element | **1,9 KB** |

A busca em si sempre pesou 1,8 KB. O restante era framework. Como a barra de orçamento
da Etapa 5 é global, esse custo passaria a valer em todas as páginas — e o público
acessa de Android de entrada em 4G de obra.

**Regra para as próximas ilhas** (filtro do catálogo, QuoteBar, formulário, calculadora):
o markup vem do servidor e funciona sem JS; o script apenas melhora. A busca é o modelo —
o `<form>` faz GET para `/produtos` e funciona com o script bloqueado; o custom element
só acrescenta as sugestões, e o índice de 22 KB é baixado no primeiro toque no campo.

A contrapartida aceita: código de formulário e de calculadora fica mais verboso.

O registro completo, com o motivo, está na nota de stack do [`CLAUDE.md`](./CLAUDE.md).

---

## Duas regras que valem para todo o site

Vieram de defeitos reais encontrados na verificação da Etapa 4, e valem para
qualquer componente novo.

### Conteúdo não depende de animação rodar para aparecer

A animação de entrada do hero animava `opacity` de 0 a 1. Parece inofensivo e não é:
o Chrome **não avança animações em aba oculta**, e com `animation-fill-mode: both` o
estado inicial fica fixo. Quem abrisse o site em aba de fundo — Ctrl+clique, ou link do
WhatsApp abrindo atrás — recebia o subtítulo, as duas CTAs e as provas do hero
**invisíveis** até trocar de aba. Era também a causa de uma violação de contraste
intermitente no axe, que amostrava a página no meio do fade.

A animação agora move **apenas `transform`**. Nunca `opacity`.

### Duas barras fixas não cabem num celular

Medido em 360×640: o header fixo tem 73px e a barra da lista 69px — 22% da altura da
tela, com os dois carregando CTA para o **mesmo** destino.

A solução: quando há medida na lista, a barra de baixo assume o CTA persistente e o
header **solta** no mobile (`html[data-quote="ativo"]`, só abaixo de 768px). Resultado
medido: a área de conteúdo vai de 567px sem lista para 571px com lista — a segunda barra
não custa nada.

A barra também reserva o próprio espaço com `padding-bottom` no `<body>`, que estende a
rolagem sem deslocar elemento visível — então o rodapé nunca fica atrás dela e não há CLS.

### Custom element precisa de `display: block`

Custom element nasce `display: inline`, e um pai inline esmaga a largura do filho de
bloco. A regra está declarada uma vez em `src/styles/global.css`, para a próxima ilha
não repetir o erro — acrescente o nome do novo elemento lá.

---

## Como rodar

Requer **Node >= 22.12.0** (exigência do Astro 7).

```bash
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:4321`. Mostra os rascunhos. |
| `npm run build` | Build de produção. **Exclui os rascunhos** e valida todos os schemas. |
| `npm run preview` | Serve o build de produção, para medir performance de verdade. |
| `npm run check` | Verificação de tipos, inclusive nos arquivos `.astro`. |
| `npm test` | 113 testes: fórmulas, rótulos, busca, legendas e lista de orçamento. |
| `npm run contrast` | Verifica os 19 contrastes e as 4 separações de matiz da paleta. |
| `npm run fonts` | Recopia as fontes de `node_modules` para `public/fonts/`. |

---

## Estrutura

```
CLAUDE.md                     regras do projeto, lidas em toda sessão
docs/CONTEUDO.md              conteúdo aprovado — consulte antes de escrever texto
docs/PROMPTS.md               roteiro das 14 etapas

src/content.config.ts         schemas Zod das coleções
src/content/
  site-config.json            dados da empresa (campo null = [CONFIRMAR])
  categories/*.md             6 categorias
  products/*.md               27 produtos, todos em rascunho

src/lib/steel.ts              fórmulas de peso teórico + registro
src/lib/dimension-label.ts    rótulo de bitola como o mercado a nomeia
src/lib/products.ts           consultas ao catálogo e montagem das tabelas
src/lib/search.ts             busca rápida, parte pura (roda no navegador)
src/lib/quote.ts              lista de orçamento sobre localStorage
src/lib/quote-content.ts      copy da lista de orçamento
src/lib/cross-section-legend.ts  liga as cotas do desenho às colunas da tabela
src/lib/catalog-content.ts    copy do catálogo
src/lib/home-content.ts       copy da home, das seções 2 e 3 do CONTEUDO.md
src/lib/navigation.ts         navegação e rota ativa
src/lib/*.test.ts             82 testes (fórmulas, rótulos, busca)

src/pages/produtos/           catálogo, categoria e produto
src/pages/orcamento.astro     lista de orçamento
src/pages/indice-de-busca.json.ts   índice da busca, gerado em build

src/components/
  CrossSection.astro          o elemento de assinatura
  cross-sections/             13 perfis + 3 auxiliares de cota
  ui/                         Button, Container, Section, Heading, Table
  home/                       as 8 seções da home, na ordem do CONTEUDO.md
  catalog/                    Breadcrumb, ProductCard, CatalogFilter, GaugeTable
  quote/QuoteList.astro       lista editável de /orcamento
  QuoteBar.astro              barra fixa, única ilha global
  QuickSearch.astro           busca rápida (custom element, sem framework)
  Header · MobileMenu · Footer · DraftNotice · Pending

src/layouts/Base.astro        layout raiz
src/styles/tokens.css         TODOS os tokens do design system
src/pages/styleguide.astro    rota temporária de revisão — REMOVER na Etapa 8
```

### Como editar conteúdo pelo código

Texto de produto e de categoria fica em `src/content/`, em Markdown com frontmatter. O
corpo do arquivo é a descrição longa; o frontmatter tem o resto.

A partir da Etapa 11 o mesmo arquivo também será editável pelo painel do Keystatic em
`/admin` — uma fonte de verdade, duas portas de entrada.

### A copy da home

Fica em `src/lib/home-content.ts`, tipada, e não dentro dos componentes — a regra do
`CLAUDE.md` é que o componente recebe dados, não os contém. O texto vem das seções 2 e
3 do `docs/CONTEUDO.md` e está aprovado: não reescrever.

Se a Aldifer quiser editar a home pelo painel, a Etapa 11 pode promover este módulo a
content collection. Hoje o escopo do Keystatic é produto, categoria, configuração e aviso.

### A coluna de peso nunca é digitada

O peso das tabelas de bitola é **calculado em build** por `src/lib/steel.ts`, a partir da
densidade do aço carbono (7.850 kg/m³).

O schema em `src/content.config.ts` recusa o build de qualquer produto marcado como
`calculado` cujas linhas não permitam o cálculo — se falta a espessura, ou se ela vem como
texto, o build para com a mensagem apontando a linha exata. É garantia do compilador, não
disciplina do editor.

Perfil I, U e chapa xadrez usam `weightSource: 'tabela-usina'` justamente porque não
admitem fórmula. Ver a seção bloqueante acima.

---

## Estado das etapas

| Etapa | Situação |
|---|---|
| 0 — Fundação | ✅ |
| 1 — Design system e primitivos | ✅ |
| 2 — Content collections | ✅ |
| 3 — Home | ✅ |
| 4 — Catálogo | ✅ |
| 5 — Lista de orçamento | ✅ |
| 6 — Formulário, servidor e LGPD | ⬜ bloqueada pela cor de feedback e pela pergunta 10 |
| 7 — Calculadora de peso | ⬜ |
| 8 — Páginas restantes | ⬜ |
| 9 — SEO técnico | ⬜ |
| 10 — Migração de URLs | ⬜ |
| 11 — CMS Keystatic | ⬜ |
| 12 — Portões de qualidade | ⬜ |
| 13 — Deploy e entrega | ⬜ |
