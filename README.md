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

### 3. O formulário está pronto, mas o e-mail não sai

Tudo do pedido de orçamento está implementado e verificado: validação por campo,
honeypot, tempo de preenchimento, limite por IP, persistência do lead e a política de
privacidade. **O que não consegui provar é que o e-mail chega**, porque não tenho as
chaves.

Sem elas o endpoint aceita o pedido, grava o lead e **carimba o aviso no assunto do
e-mail** — mas o e-mail não é enviado. Cada degradação vai para o log com o nome exato
da variável que falta.

Faltam, todas cadastradas na Vercel e nunca no repositório:

```
RESEND_API_KEY              resend.com/api-keys
QUOTE_MAIL_FROM             remetente de domínio verificado no Resend
QUOTE_MAIL_TO               quem recebe os pedidos na Aldifer (pergunta 10)
PUBLIC_TURNSTILE_SITE_KEY   Cloudflare Turnstile
TURNSTILE_SECRET_KEY        Cloudflare Turnstile
```

E o SPF, o DKIM e o DMARC do domínio precisam estar configurados, senão o e-mail cai em
spam e a Aldifer perde lead sem saber. Isso é a Etapa 13.

### 4. O destino do lead ainda é provisório

`LEAD_STORE_DRIVER` está em `json`, que grava num arquivo local. **Esse driver NÃO
funciona na Vercel**: o disco é efêmero e o lead desaparece com a instância.

Ele sabe disso — detecta o ambiente serverless, recusa a gravação e o aviso "LEAD NÃO
GRAVADO" aparece no assunto do e-mail, para o problema não passar em silêncio.

Depende da pergunta 10: descobrir se a Aldifer usa Google Sheets, Notion ou outra coisa,
e implementar o driver. A interface `LeadStore` está pronta em `src/lib/lead-store.ts`.

### 5. Uma promessa de prazo não confirmada está na copy

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
| **Logotipo em vetor** | O `logo.png` do site atual foi baixado na Etapa 8 e é o logotipo REAL: dele saem o favicon, o apple-touch-icon, os ícones do manifest e a marca da og-image. Mas ele tem 240×60, e o marco circular dentro dele só 58×58 — o `apple-touch-icon` de 180px é ampliação de 3×. Fica levemente macio. Um SVG ou um PNG grande resolveria de vez. **Não redesenhei o marco em SVG de propósito:** um logotipo traçado a olho de um raster de 58px sai *quase* igual, e quase igual em identidade de marca é pior que macio. | 8 · 12 |
| **Onde persistir o lead** | E-mail sozinho perde lead. Ordem de preferência: Google Sheets → Notion → Supabase. Depende da pergunta 10. | 6 |
| **`www` ou apex** | Fixado em `https://www.aldifer.com.br` no `astro.config.mjs`, para casar com o JSON-LD. Se mudar, muda nos dois lugares. | 13 |
| **Fonte Archivo** | O arquivo com eixo de largura custa 88 KB contra 34 KB da versão só-peso. É o preço do "Expanded". Candidata nº 1 de otimização. | 12 |
| **Script inline** | O menu mobile sai como 372 B de JS inline. Ótimo para performance, mas a CSP restrita precisará de hash ou de forçar arquivo externo. | 9 |
| **Revisão da Política de Privacidade** | É MINUTA. O texto descreve com precisão o que o site tecnicamente faz, mas documento legal precisa de revisão de quem responde por ele. Faltam o CNPJ do controlador e a definição do prazo de retenção do lead. | 6 · 13 |
| **Limite por IP é por instância** | O contador vive na memória do processo. Em serverless cada instância tem a sua, então o limite real é 5/hora **por instância**. Contra abuso distribuído o portão é o Turnstile. Um limite global exige Vercel KV ou Upstash Redis — decidir se vale a dependência. | 13 |
| **Nova sessão fotográfica** | As 5 fotos hoje no site são de 2016, 900×540, tiradas de celular, baixadas do site antigo com autorização. Servem porque mostram ESTOQUE REAL etiquetado por bitola — prova, não decoração. Mas 900px é o limite: em tela de 1280 a galeria já exibe a 587px, quase 1:1. Aço bem fotografado é metade da credibilidade da página Empresa. Vale notar que a placa do caminhão aparece legível na `empresa-05`. | 8 |
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

## Um pipeline de recebimento, duas rotas

A Etapa 8 acrescentou `/api/contato`, e ele **não** é uma segunda implementação do
`/api/orcamento`. Tudo o que os dois fazem — honeypot antes da validação, tempo de
preenchimento, Turnstile, limite por IP contado só sobre envio bem formado,
persistência obrigatória e a política de nunca perder um lead — vive em
[`src/lib/submission.ts`](./src/lib/submission.ts). As duas rotas são finas.

O motivo é concreto: na Etapa 6 eu errei a ORDEM dessas checagens. O honeypot vinha
depois do Zod, e a resposta de erro saía com `fieldErrors.website` — dizendo ao robô
exatamente qual campo o pegou. Um erro desses corrigido em duas cópias é um erro
corrigido pela metade.

O que difere entre os dois é só o schema. No contato a mensagem é **obrigatória**: no
orçamento a lista de material já diz o que a pessoa quer, mas no contato a mensagem *é*
o pedido, e recebê-la vazia daria à Aldifer um nome e um telefone sem assunto.

### O formulário de contato funciona sem JavaScript

O `<form>` tem `method`, `action` e validação nativa (`required`, `type=email`,
`minlength`, `pattern`). Com o script bloqueado o navegador barra o que está errado e
faz um POST comum; `/api/contato` responde **303** para uma página estática de
resultado — `/mensagem-enviada` ou `/mensagem-nao-enviada`.

O atributo `novalidate` **não está no HTML**: o script o acrescenta quando roda. Assim
as mensagens que dizem o que fazer substituem as bolhas genéricas do navegador apenas
quando existe script para mostrá-las.

Duas consequências que valem registro:

- **`loadedAt` chega como `0`** no caminho sem script, porque ninguém preenche o campo
  oculto. O servidor trata 0 como "não cronometrado" e pula a checagem de tempo, em vez
  de recusar justamente quem está sem JavaScript. O e-mail mostra "não medido (envio sem
  JavaScript)" e não `-1s`.
- **A página de falha não diz qual campo errou.** Nesse caminho os erros de
  preenchimento já foram barrados pelo navegador; o que chega lá é envio rápido demais,
  limite por IP ou falha de entrega. Em nenhum desses casos a pessoa resolve algo com um
  nome de campo — o que resolve é o telefone, e é ele que está em destaque.

O POST nativo passa pela checagem de origem do Astro, que recusa com 403 quando falta o
header `Origin`. Navegador sempre o manda; script de fora, não. É proteção contra CSRF
e fica.

### Sem Zod no cliente, ao contrário do orçamento

No formulário de orçamento o schema no cliente custa 25 KB gzip e se paga: a lista de
material tem regra que o HTML não expressa. No contato os campos são cinco e a validação
nativa cobre todos, então o peso seria só peso. A autoridade sobre o que é válido
continua sendo o mesmo `contactMessageSchema` do servidor — as mensagens dele chegam na
resposta e o script as coloca no campo certo.

---

## Alvo de toque: um defeito que estava em todas as páginas

Verificando a Etapa 8 a 360px, o conteúdo das páginas novas passou sem um alvo abaixo
de 44px. O **rodapé**, não: seus 17 links mediam **17px de altura** — e o rodapé está em
todas as páginas desde a Etapa 3.

Isso reprova os 44×44 que o `CLAUDE.md` exige e também os 24×24 da WCAG 2.5.8, que
isenta apenas link *inline dentro de frase*. Link empilhado em lista não é isento. O
`axe` não pegou porque ele não implementa a checagem de tamanho de alvo.

A correção criou duas utilities em `global.css`:

- **`touch-row`** para link de lista empilhada. `min-height` sozinho não resolve num
  `<a>`: âncora é caixa inline, e `min-height` não tem efeito nela — daí o `inline-flex`.
  O `gap` das listas saiu, senão o alvo de 44px somado ao gap abriria um vão de 60px.
- **`touch-inline`** para linha horizontal, como a trilha de navegação, onde 44px de
  altura visível ficaria desproporcional: o `padding-block` cria a área de toque e a
  margem negativa a devolve ao layout. Só serve na horizontal — em lista empilhada as
  áreas de toque de vizinhos se sobreporiam.

O rodapé no mobile passou de ~750px para 1208px de altura. É o que custa, e ele está
abaixo da dobra.

---

## Os ativos de marca são gerados, não desenhados à mão

`npm run assets` roda [`scripts/gerar-assets-de-marca.mjs`](./scripts/gerar-assets-de-marca.mjs)
e produz, a partir do `logo.png` e das fotos reais:

```
public/favicon.ico           16 + 32 + 48, PNG dentro de ICO
public/apple-touch-icon.png  180, fundo opaco (o iOS ignora alfa e a renderiza preta)
public/icone-192.png         manifest
public/icone-512.png         manifest
public/og-image.jpg          1200×630
src/assets/aldifer/fachada.jpg   a fachada, sem o overlay promocional
```

A saída é **commitada** e o script roda sob demanda, não no build: assim a og-image não
depende de fonte instalada na Vercel e fica estável entre deploys.

Três detalhes que o script documenta e que custaram tempo:

- **O `sharp` não escreve ICO.** O formato é simples e aceita PNG embutido, que todo
  navegador atual lê, então o container é montado à mão: cabeçalho de 6 bytes, uma
  entrada de diretório de 16 bytes por tamanho, e os PNGs em seguida.
- **`extract` e `trim` não se encadeiam.** No mesmo pipeline o `sharp` aplica o `trim`
  primeiro, o logo cai para 240×58 e o recorte de 60 de altura estoura com "bad extract
  area". São dois pipelines.
- **A Archivo Expanded não chega ao rasterizador.** `@font-face` com woff2 é ignorado em
  silêncio e cai numa serifada. Por isso a marca na og-image é o `logo.png` de verdade,
  como imagem, e só o texto de apoio usa sans do sistema — onde a diferença de fonte não
  engana ninguém.

O `empresa-01.jpg` era um post de rede social de 800×800, com selo de 20 anos e
"Obrigado por fazer parte dessa história" nos 375px de cima. O recorte deixa só a
fotografia da fachada, que é o que serve para reconhecer o galpão na estrada. Recortar
o overlay não inventa nada.

**Até a Etapa 8 o site servia o favicon padrão do Astro.** Ele teria ido ao ar assim.

---

## As primitivas de formulário são compartilhadas

As classes `.form-field`, `.form-error`, `.form-hint`, `.form-submit`, `.form-consent`,
`.form-honeypot` e `.form-notice` vivem em `src/styles/components.css`.

Elas nasceram dentro de `QuoteForm.astro`, na Etapa 6, com prefixo `quote-form__`. A
Etapa 8 revelou que **nenhuma** era específica do orçamento. Duplicá-las no formulário de
contato faria os dois divergirem na primeira alteração de espaçamento — e um formulário
de contato com input de outra altura que o de orçamento é o tipo de detalhe que faz o
site parecer remendado.

Ficam num arquivo compartilhado, e não em cada componente, porque `<style>` do Astro é
escopado: a mesma regra escrita nos dois arquivos gera duas cópias no CSS final. O
`QuoteForm.astro` caiu de 595 para 432 linhas.

---

## A calculadora não tem fórmula própria

A `src/lib/calculator.ts` **não calcula peso**. Ela descreve quais campos cada perfil
pede e delega para `WEIGHT_FORMULAS`, de `src/lib/steel.ts` — o mesmo registro que gera
a coluna de peso das tabelas de bitola. Uma fórmula corrigida lá aparece na calculadora
sem ninguém tocar nela.

Isso é testado, não confiado: em `src/lib/calculator.test.ts` cada caso compara o
resultado da calculadora com a chamada **direta** da função de `steel.ts`. Se alguém
reimplementar uma fórmula na calculadora, a comparação quebra.

O rótulo da medida vem do mesmo lugar: `describeDimension` é a função que nomeia as
linhas do catálogo, então "30 × 30 × 2 mm" sai igual nos dois — e um item adicionado
pela calculadora fica indistinguível de um adicionado pela tabela.

### Perfil I, U e H não têm cálculo, de propósito

A aba desses perfis é **cônica** — mais grossa junto à alma, mais fina na ponta — e há
raio de concordância entre aba e alma. Não existe fórmula fechada que acerte, e uma
aproximação erraria. Então a calculadora não mostra campo nenhum nesses perfis: mostra
a explicação e manda para a tabela de usina do produto. Dar um número aproximado seria
pior que não dar número.

### O item que vai para o orçamento carrega o produto de origem

Quem chega em `/calculadora-de-peso?produto=chapa-fina-a-frio` pelo link da página de
produto e clica em "adicionar à lista" gera um pedido que diz **"Chapa Fina a Frio"**,
com o slug real do produto. Um item que dissesse só "Chapa" obrigaria a Aldifer a ligar
de volta para saber se é fina a frio, fina a quente ou grossa — que é a objeção nº 1 do
projeto recriada dentro do próprio formulário.

Trocar o perfil no select solta esse vínculo: a pessoa saiu daquele produto.

A montagem do item mora em `buildQuoteItem`, no módulo puro, e não no script do
componente, porque duas regras dela custam um telefonema se regredirem e nenhuma é
pega por type check — a identidade do produto e o fato de que **chapa não leva
comprimento em metros** (nela o comprimento já está na medida, em milímetros).

---

## Link no corpo do texto não é laranja

O `--accent` como **cor de letra** dá 4,81:1 no branco — 0,31 de folga sobre o mínimo AA
— e **4,45:1 sobre `--paper-alt`, onde reprova**. Um link de acento passava ou reprovava
dependendo do `tone` que a seção tinha recebido, e trocar o tom de uma seção é decisão de
layout que ninguém associa a contraste.

Existe então `--surface-link`, token de contexto: `--steel-700` nos dois tons claros
(9,07:1 e 8,38:1) e `--accent-bright` no escuro (6,07:1). Não pode ser a cor fixa, porque
`--steel-700` sobre `--steel-950` dá 1,91:1.

Quatro lugares usavam o acento como texto. Um deles — o link do consentimento LGPD —
estava sobre faixa alternada e **reprovava de fato**, não era risco latente:

| Onde | Antes | Agora |
|---|---|---|
| Link do consentimento LGPD (`QuoteForm`) | 4,45:1 sobre `--paper-alt` — reprovava | 8,38:1 |
| Botão "adicionar" da tabela de bitolas | 4,81:1 no branco | 9,07:1 |
| "Ver medidas" nos cards da home | 4,81:1 no branco | 9,07:1 |
| Links de texto corrido (`.prose-aldifer a`) | 4,81:1 no branco | 9,07:1 |

**Ilha que fixa fundo claro dentro de seção escura precisa declarar o token.**
`Table.astro` e o aviso da calculadora fixam `--paper`/`--paper-alt` independente do tom
em volta; sem declarar `--surface-link` eles herdariam `--accent-bright` do tom escuro e
ficariam com laranja claro sobre branco.

O hover continua laranja: a WCAG mede o estado de repouso, e o laranja no hover é
assinatura do site.

`npm run contrast` agora, além das 22 razões e 4 separações de matiz, varre o
código-fonte procurando `--accent` como `color` em repouso e reprova.

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

## A política de falha do endpoint de orçamento

Perder lead é o pior resultado possível para este site, então o endpoint **nunca recusa
um pedido por falta de configuração**. Quando a persistência ou o anti-spam não estão
disponíveis, o pedido segue e o aviso é **carimbado no assunto do e-mail**:

| Situação | O que acontece |
|---|---|
| `TURNSTILE_SECRET_KEY` ausente | Aceita e carimba `[SEM VERIFICAÇÃO ANTI-SPAM]` |
| Persistência falhou | Aceita e carimba `[LEAD NÃO GRAVADO]` |
| E-mail falhou, mas o lead foi gravado | Devolve sucesso — o pedido não se perdeu |
| **Os dois falharam** | Devolve 502 e pede para o cliente ligar |

Toda degradação vai para o log com o nome exato da variável que falta. Nada é silencioso.

### Uma inversão deliberada na ordem das checagens

A seção 7 do `CONTEUDO.md` lista validação antes do honeypot. Testando, descobri que
nessa ordem o schema recusa o campo `website` e a resposta sai com
`fieldErrors.website` — dizendo ao robô exatamente qual campo o pegou.

O honeypot passou a ser verificado **antes**, no payload cru, e a resposta é 200 com
sucesso falso. Nenhuma checagem foi pulada, só invertida.

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
| `npm test` | 215 testes: fórmulas, rótulos, busca, legendas, lista de orçamento e e-mail. |
| `npm run contrast` | 22 contrastes, 4 separações de matiz, e varre o código procurando o acento usado como cor de texto. |
| `npm run meta` | Confere title, description, canonical, og:image e h1 único em TODA rota do build. Reprova em título repetido. |
| `npm run assets` | Regera favicon, ícones e og-image a partir do logotipo. Rode ao trocar o logo. |
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
src/lib/schemas.ts            schema Zod único, usado no cliente E no servidor
src/lib/lead-store.ts         interface LeadStore + driver de arquivo
src/lib/rate-limit.ts         limite de envios por IP
src/lib/turnstile.ts          verificação anti-robô no servidor
src/lib/quote-email.ts        corpo do e-mail em texto e HTML
src/lib/form-content.ts       copy do formulário e das respostas da API
src/lib/privacy-content.ts    conteúdo da política de privacidade
src/lib/cross-section-legend.ts  liga as cotas do desenho às colunas da tabela
src/lib/catalog-content.ts    copy do catálogo
src/lib/home-content.ts       copy da home, das seções 2 e 3 do CONTEUDO.md
src/lib/navigation.ts         navegação e rota ativa
src/lib/*.test.ts             82 testes (fórmulas, rótulos, busca)

src/pages/produtos/           catálogo, categoria e produto
src/pages/orcamento.astro     lista de orçamento + formulário
src/pages/politica-de-privacidade.astro
src/pages/api/orcamento.ts    ÚNICA rota sob demanda; as outras são estáticas
src/pages/indice-de-busca.json.ts   índice da busca, gerado em build

src/components/
  CrossSection.astro          o elemento de assinatura
  cross-sections/             13 perfis + 3 auxiliares de cota
  ui/                         Button, Container, Section, Heading, Table
  home/                       as 8 seções da home, na ordem do CONTEUDO.md
  catalog/                    Breadcrumb, ProductCard, CatalogFilter, GaugeTable
  quote/QuoteList.astro       lista editável de /orcamento
  quote/QuoteForm.astro       formulário do pedido
  QuoteBar.astro              barra fixa, única ilha global
  QuickSearch.astro           busca rápida (custom element, sem framework)
  Header · MobileMenu · Footer · DraftNotice · Pending

src/layouts/Base.astro        layout raiz
src/styles/tokens.css         TODOS os tokens do design system
                              (a rota /styleguide foi removida na Etapa 8)
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
| 6 — Formulário, servidor e LGPD | ◐ implementado e verificado, EXCETO a entrega do e-mail — falta a chave do Resend |
| 7 — Calculadora de peso | ✅ |
| 8 — Páginas restantes | ✅ |
| 9 — SEO técnico | ⬜ |
| 10 — Migração de URLs | ⬜ |
| 11 — CMS Keystatic | ⬜ |
| 12 — Portões de qualidade | ⬜ |
| 13 — Deploy e entrega | ⬜ |
