# Site Aldifer

Site novo da **Aldifer Distribuidora de Ferro e Aço**, São Bernardo do Campo / SP.
Substitui o site atual (`aldifer.com.br`, PHP de 2016).

Não é um site institucional: é uma ferramenta de trabalho para serralheiro e comprador
industrial. O sucesso se mede em pedidos de orçamento estruturados recebidos.

As regras do projeto estão em [`CLAUDE.md`](./CLAUDE.md). O conteúdo aprovado está em
[`docs/CONTEUDO.md`](./docs/CONTEUDO.md). O roteiro de construção está em
[`docs/PROMPTS.md`](./docs/PROMPTS.md).

| Para... | Leia |
|---|---|
| publicar o site | [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| conferir item por item antes de apontar o domínio | [`docs/CHECKLIST-LANCAMENTO.md`](./docs/CHECKLIST-LANCAMENTO.md) |
| o que fazer depois do domínio apontado | [`docs/POS-DEPLOY.md`](./docs/POS-DEPLOY.md) |
| editar o site sem programar | [`docs/COMO-EDITAR.md`](./docs/COMO-EDITAR.md) — escrito para a Aldifer, não para dev |
| os números dos portões de qualidade | [`docs/QUALIDADE.md`](./docs/QUALIDADE.md) |
| o roteiro manual de acessibilidade | [`docs/ACESSIBILIDADE.md`](./docs/ACESSIBILIDADE.md) |
| por que cada cabeçalho HTTP existe | [`docs/CABECALHOS.md`](./docs/CABECALHOS.md) |
| o que cada chave faz e onde consegui-la | [`.env.example`](./.env.example) |

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

> **Consequência na migração de URLs (Etapa 10):** enquanto os produtos estiverem em
> rascunho, 69 das 117 URLs antigas param na página de CATEGORIA em vez da página de
> produto. Não é 404 — o gerador de redirects confere cada destino contra o build e
> rebaixa o que não existe — mas é um clique a mais para quem buscou "barra chata" no
> Google. Depois de publicar, rodar `npm run redirects`. Ver
> [`docs/POS-DEPLOY.md`](./docs/POS-DEPLOY.md).

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
| **`www` ou apex** | ✅ **DECIDIDO na Etapa 13: `www`.** Não por gosto — o site antigo responde 200 nos dois hosts, sem redirect e sem canonical, e **todo link e todo asset do HTML antigo é URL absoluta com `www`**. Na falta de canonical, o link interno é o sinal mais forte, então `www` é o host que o Google indexou, e é nele que o histórico dos 117 redirects vale. O DNS precisa acompanhar: apex com 301 para `www`. Hoje o `www` é CNAME do apex, o inverso. Ver `docs/DEPLOY.md`. | 13 |
| **Fonte Archivo** | ✅ **RESOLVIDO na Etapa 13, sem perder o Expanded.** O `npm run fonts` passou a INSTANCIAR a fonte com o eixo `wdth` fixado em 125%, aplicando o valor aos contornos: **90.104 B → 34.648 B**, menor até que a versão só-peso. O desenho é idêntico, medido em 16 comparações de largura de texto com diferença de 0,0000 px. Era o único item de 55 KB no caminho crítico, e o LCP do `/orcamento` saiu de 7 execuções em 9 acima da meta para nenhuma. | 12 · 13 |
| **Script inline** | O menu mobile sai como 372 B de JS inline. Ótimo para performance, mas a CSP restrita precisará de hash ou de forçar arquivo externo. | 9 |
| **Revisão da Política de Privacidade** | É MINUTA. O texto descreve com precisão o que o site tecnicamente faz, mas documento legal precisa de revisão de quem responde por ele. Faltam o CNPJ do controlador e a definição do prazo de retenção do lead. | 6 · 13 |
| **Limite por IP é por instância** | O contador vive na memória do processo. Em serverless cada instância tem a sua, então o limite real é 5/hora **por instância**. Contra abuso distribuído o portão é o Turnstile. Um limite global exige Vercel KV ou Upstash Redis — decidir se vale a dependência. | 13 |
| **Conta no Plausible** | O analytics está implementado e desligado: sem `PUBLIC_PLAUSIBLE_DOMAIN`, nenhum script carrega e o host nem entra na CSP. Falta criar a conta em plausible.io, cadastrar o domínio e preencher a variável na Vercel. **É como se mede a métrica que o CLAUDE.md define como sucesso do projeto** — sem ela o lançamento vai às cegas. |
| **`includeSubDomains` no HSTS** | ✅ **RESOLVIDO na Etapa 13: removido, junto com `preload`.** A confirmação reprovou. O e-mail da Aldifer é da Locaweb, e `https://webmail.aldifer.com.br` serve um certificado de `*.webmail-seguro.com.br` — nome errado para aquele host. Hoje o navegador mostra um aviso que se pode ignorar; com `includeSubDomains` no apex ele fica **inignorável**, e a equipe perderia o webmail pelo endereço que decorou. Para ligar depois: certificado válido no webmail primeiro. Ver `docs/CABECALHOS.md`. |
| **Rich Results Test** | O JSON-LD foi validado no validador oficial do schema.org: 3 tipos reconhecidos, 0 erros, 0 avisos. O Rich Results Test do Google **não** foi rodado: ele precisa de URL pública, e a aba de colar código resiste a automação. Rodar no deploy da Etapa 13. Vale saber que ele só reporta tipos que geram resultado enriquecido — aqui, só o Breadcrumb: dados de negócio local alimentam o Perfil da Empresa, não um card de busca. |
| **Repositório no GitHub** | O projeto é local, sem remote. O painel roda em modo LOCAL (grava no disco), o que serve para desenvolvimento e **não** para produção: na Vercel o disco é efêmero e somente leitura. Subir o repositório e preencher as quatro variáveis do Keystatic é o que faz cada Save virar commit. Passo a passo no `.env.example`. | 11 · 13 |
| **Nova sessão fotográfica** | As 5 fotos hoje no site são de 2016, 900×540, tiradas de celular, baixadas do site antigo com autorização. Servem porque mostram ESTOQUE REAL etiquetado por bitola — prova, não decoração. Mas 900px é o limite: em tela de 1280 a galeria já exibe a 587px, quase 1:1. Aço bem fotografado é metade da credibilidade da página Empresa. Vale notar que a placa do caminhão aparece legível na `empresa-05`. | 8 |

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

## O painel de edição, e o que o Keystatic não faz

O painel fica em **`/keystatic`**; `/admin` é o endereço que as pessoas decoram e
redireciona para lá. Guia de uso para quem não é programador em
[`docs/COMO-EDITAR.md`](./docs/COMO-EDITAR.md).

Uma fonte de verdade, duas portas: as coleções do `keystatic.config.ts` apontam para OS
MESMOS arquivos que `src/content.config.ts` valida. O que o painel salva é o que eu
editaria no editor, e o build valida as duas origens com o mesmo schema Zod.

### O Keystatic exige declarar TODO campo do frontmatter

Não é que ele descarte campo não declarado ao salvar — **ele nem abre a entrada**:

```
Error: Field validation failed: Key on object value "crossSection" is not allowed
```

Descobri isso testando com um schema deliberadamente incompleto, ANTES de refatorar 27
arquivos de conteúdo com base na suposição errada.

### A tabela de bitolas não é editável, e é decisão

O Keystatic não tem campo de matriz com **colunas variáveis** — e as colunas mudam de
produto para produto: largura e espessura numa barra chata, diâmetro e parede num tubo.
Modelá-la exigiria mudar o formato dos 27 arquivos para texto tipo planilha e reescrever
a validação Zod para parsear antes de validar.

`fields.ignored()` resolve sem mudar nada: ele **lê e reescreve o valor verbatim** e não
aparece no painel. Ficam assim `dimensionColumns`, `dimensions`, `weightSource` e
`weightFormula` — os quatro campos cuja chave precisa casar com o nome do parâmetro em
`src/lib/steel.ts`, onde um erro de digitação quebraria o cálculo do peso.

**Verificado, não presumido.** Editei um produto pelo painel e comparei o frontmatter
com `node scripts/comparar-frontmatter.mjs`:

```
15 chaves comparadas
1 chave(s) com valor diferente:  shortDescription   ← a que eu editei
corpo do markdown: idêntico
```

Zero campo perdido. As 16 linhas da tabela, as três colunas e a fórmula intactas. O
diff do git é grande porque o Keystatic reescreve o YAML no estilo dele — `{ width: 12,
thickness: 3 }` em uma linha vira três em bloco. É formatação, não dado, e o script
acima é a ferramenta que separa uma coisa da outra.

### Três bugs que só apareceram testando o painel

**1. `keystatic.config.ts` roda NO NAVEGADOR.** Duas consequências que custaram tempo:

- Importar `src/content.config.ts` de lá puxa `astro:content` e o painel abre em branco
  com 500 no módulo. A lista de categorias virou um módulo puro,
  `src/lib/categories.ts`, importado pelos dois lados — uma definição só.
- `process.env` não existe: "process is not defined". É `import.meta.env`.

**2. A CSP estrita da Etapa 9 bloqueava o estilo do painel.** As rotas sob demanda
recebem a política como CABEÇALHO, e `/keystatic` é uma delas. O painel é React sobre
`@keystar/ui`, que injeta estilo em tempo de execução — sem hash calculável. O painel
abria em `font-family: "Times New Roman"`, sem fundo.

Minha primeira correção estava errada, e o navegador explicou por quê:

> "Note that `unsafe-inline` is ignored if either a hash or nonce value is present in
> the source list."

Acrescentar `unsafe-inline` ao lado dos hashes não faz nada. O `src/middleware.ts`
**substitui** as diretivas de estilo nas rotas do painel, tirando os hashes — e só
nelas. `script-src` continua travado por hash, que é a proteção que mais vale.

**3. O painel busca a Inter no `fonts.googleapis.com`.** Bloqueada pela política, ele
caía em serifada. Em vez de liberar o Google — o `CLAUDE.md` decide "nada de Google
Fonts por CDN" — o middleware injeta um `@font-face` apontando para a MESMA Inter que o
site já auto-hospeda em `/fonts`. O Keystatic pede `Inter`, acha `Inter` na nossa
origem, e nada sai para fora.

### O React ficou onde devia

O Keystatic é uma aplicação React, e a Etapa 3 removeu o React justamente por peso. Foi
medido antes e depois com `npm run js`: as 16 páginas públicas estão **idênticas** à
linha de base — `/orcamento` em 26,7 KB, o resto abaixo de 6 KB — e nenhum bundle
público contém vestígio de React. O portão reprova página pública acima de 40 KB
justamente para acusar se algum dia vazar.

### O aviso no topo do site

O site antigo tinha um `banner-aviso.jpg` — uma IMAGEM com texto dentro, que só quem
tinha o arquivo do design sabia trocar e que nenhum leitor de tela lia. Agora é campo
editável, com um detalhe que ninguém pede: **`validoAte`**.

Depois dessa data o aviso desaparece — e desaparece do HTML, no build, não por CSS nem
JavaScript. Sem ele, um "recesso de fim de ano" continua no ar em março. Verificado nos
dois sentidos: com data futura a faixa sai em 16 páginas; com data passada, em zero.

Dois guards param o BUILD, e os dois foram testados:

```
mensagem: aviso ativo precisa de mensagem
linkTexto: preencha o texto e o endereço do link, ou deixe os dois vazios
```

### O vazio do painel não é o nulo do site

Campo nulo significa "a Aldifer não confirmou" e NÃO renderiza. Mas o Keystatic não
escreve `null`: texto vazio sai `""` e lista vazia sai `[]`.

O `""` é inofensivo, porque é falso em JavaScript. **O `[]` não é:** ele é verdadeiro, e
`site.openingHours ? <lista/> : <Pending/>` passaria a renderizar uma lista de horários
VAZIA em vez do aviso de pendência — quem limpasse o campo apagaria o aviso sem pôr
nada no lugar. `vazioComoNulo`, em `content.config.ts`, converte os dois.

O `customCutting` deixou de ser booleano por motivo parecido: um checkbox só sabe dizer
sim e não, e "não confirmado" viraria "não faz corte" — informação inventada. Virou
seleção de três estados.

Confirmado salvando de verdade pelo painel: `openingHours` chegou como `[]` e o aviso de
pendência continuou aparecendo; `cnpj` foi descartado e o `.default(null)` o recuperou.

---

## Os 117 redirects, e o que o site antigo escondia

O `CONTEUDO.md` estimava "~100 páginas-satélite" e listava umas 45 explicitamente.
O `PROMPTS.md` manda não confiar nessa lista, e estava certo:
**o site antigo tem `sitemap.xml`, com 117 URLs.**

`npm run urls-antigas` rastreia o site seguindo todo `href` `.php` do domínio até
esgotar, e depois compara com o sitemap. As duas fontes deram exatamente as mesmas
117 URLs, e todas respondem 200 — nenhuma já estava quebrada. Um rastreamento em vez
dos quatro `curl` que o PROMPTS.md sugere porque as páginas-satélite se linkam entre
si: partir de quatro páginas sem seguir os links acharia parte delas.

O inventário está em [`docs/urls-antigas.txt`](./docs/urls-antigas.txt) e é o
contrato: toda linha ali precisa de destino.

### Quatro coisas que só apareceram lendo as páginas

| URL antiga | O que o título dizia | Destino |
|---|---|---|
| `/chapa-antiderrapante.php` | "Chapa Antiderrapante" | `chapa-xadrez` — é o nome comercial da mesma chapa |
| `/perfil-de-ferro-em-u.php` | "Perfil de Ferro em U" | `perfil-u`, não a categoria toda |
| `/viga-u-preco.php` | "Viga U Preço" | `perfil-u` |
| `/responsivo.php` | **vazio** (`<title> - Aldifer</title>`, único h2 com `display:none`) | `/` — sobra de desenvolvimento que entrou no sitemap. Mandá-la para o catálogo daria a ela um destino comercial que nunca teve |

### Uma contradição no CONTEUDO.md, resolvida

A seção 9 lista as regras por radical com **"contém viga ou perfil"** antes de
**"contém cantoneira"**. Mas o mapa explícito da MESMA seção manda
`/perfil-cantoneira.php` para a cantoneira — o que aquela ordem não produz.

As duas coisas se contradizem. A leitura que resolve é **mais específico primeiro**,
então `cantoneira` foi movida para o topo. Sem isso, qualquer
`perfil-cantoneira-*.php` cairia na categoria em vez do produto. Há um teste que
trava a ordem, justamente para impedir que alguém a "corrija" de volta para o que
está escrito no documento.

(Detalhe que a ordem também resolve sem esforço: **"telha" não contém "tela"** como
substring — t-e-l-h-a contra t-e-l-a. As duas regras não competem.)

### O destino é conferido contra o build, não presumido

Esta é a parte que evita o pior erro possível aqui. **Um 301 para uma página que não
existe é pior que um 404 direto:** o Google registra soft 404, segue o
redirecionamento e ainda gasta orçamento de rastreamento no caminho.

Hoje os 27 produtos estão em rascunho, então **nenhuma** página de produto é gerada
em produção. O gerador lê as rotas que o build realmente produziu e rebaixa o que não
existe, subindo a hierarquia: produto → categoria → `/produtos` → `/`. São 69 URLs
que hoje param na categoria.

Quando a planilha da Aldifer chegar, rodar `npm run redirects` de novo faz 53 delas
voltarem ao destino preciso. Verificado de ponta a ponta: publiquei os rascunhos
temporariamente, regerei o mapa e confirmei que a cobertura segue 100% e nenhum
caminho ganha um segundo salto. Trocar o destino de um 301 não cria cadeia.

O passo a passo está em [`docs/POS-DEPLOY.md`](./docs/POS-DEPLOY.md).

### Verificado como comportamento, não como configuração

`npm run check-redirects` confere o `vercel.json`. Mas configuração certa não é o
mesmo que comportamento certo, então `npm run servir` passou a **aplicar os redirects
do `vercel.json`**, e `npm run testar-redirects` segue as 117 URLs uma por uma:

```
117/117 URLs antigas: 301 em um salto, destino 200
saltos até o 200: { '1': 117 }
nenhum 404, nenhuma cadeia, nenhum loop — verificado seguindo cada URL.
```

O `{ 1: 117 }` é a prova de que não há cadeia: toda URL chega ao 200 em um salto.
O mesmo script aponta para produção com `BASE=https://www.aldifer.com.br`, e é o
primeiro item do dia do deploy.

---

## A CSP é gerada, não escrita à mão

O `astro.config.mjs` liga `security.csp`, e o Astro emite um
`<meta http-equiv="content-security-policy">` por página **com o hash de cada
script inline que ele mesmo embutiu**.

Escrever a política à mão no `vercel.json` não era opção. O Astro embute em cada
página os scripts pequenos — menu mobile 372 B, carregador do mapa 494 B, busca
rápida 3,7 KB. Um cabeçalho só os aceitaria com `unsafe-inline`, que desliga a
proteção que a CSP existe para dar, ou com hashes digitados que mudam a cada build
e passariam a **bloquear o próprio site** na primeira alteração de código.

A política resultante é `default-src 'none'` com liberação por diretiva. Detalhe de
cada cabeçalho em [`docs/CABECALHOS.md`](./docs/CABECALHOS.md).

### Duas armadilhas que só apareceram testando

**1. O Astro NÃO hasheia `is:inline`.** Eu havia posto o stub de fila do Plausible
como `<script is:inline>` no HTML, que é o que a documentação deles recomenda. A CSP
o bloqueou: o console acusou a violação e `window.plausible.q` não existia — a fila
não funcionava e um envio rápido perderia a conversão, em silêncio. A fila passou
para dentro de `track()`, em `src/lib/analytics.ts`, criada pelo próprio código que
a usa. Não há mais script inline escrito por mim em nenhuma página.

**2. O dev não emite a CSP.** Ela é um `<meta>` de build, e `astro preview` não
funciona com o adapter da Vercel. Sem `npm run servir` a política só seria testada
em produção. Foi assim que as duas armadilhas apareceram antes do deploy.

### Verificado, e não presumido

Em `:4330`, com o build de produção: home, catálogo, categoria, empresa, contato,
orçamento, calculadora, política e 404 carregam sem uma única violação — 3 fontes,
todos os custom elements definidos, imagens completas, `fetch` do índice de busca e
iframe do mapa funcionando. Um script conferiu que **todo** script inline do build
tem hash correspondente na política da própria página.

---

## JSON-LD: só dado confirmado

Três tipos, montados em [`src/lib/structured-data.ts`](./src/lib/structured-data.ts):

| Tipo | Onde | Observação |
|---|---|---|
| `HardwareStore` | toda página, pelo layout base | Subtipo de `LocalBusiness`, mais específico que o genérico |
| `BreadcrumbList` | páginas internas | Já existia desde a Etapa 4, no próprio componente da trilha |
| `ItemList` | `/produtos` e cada categoria | Categorias na primeira, produtos nas outras |

O que está **omitido de propósito**, e não por esquecimento:

- **`openingHours`** — não consta em lugar nenhum do site atual. Declarado errado, o
  Google mostra "aberto agora" para quem está indo ao galpão fechado, e quem chega
  na porta trancada culpa a Aldifer.
- **`geo`** — sem coordenada conferida, ela cai na rua errada da Estrada dos
  Alvarengas, que é longa.
- **`priceRange`** — o site não tem preço, por decisão do `CLAUDE.md`.
- **`aggregateRating`** — não há avaliação real. Inventar avaliação em dado
  estruturado viola as diretrizes do Google, além de ser mentira.
- **`Product` com `offers`** — `Product` exige preço. Sem `offers` o Rich Results
  Test reprova; com `offers` inventado seria pior. Daí `ItemList`.

A `ItemList` de categoria **desaparece quando a categoria não tem produto visível**,
que é o caso hoje em produção com os 27 produtos em rascunho. Uma `ItemList` com
`numberOfItems: 0` declara ao Google que a categoria está vazia — pior que não
declarar nada.

**Validação:** validador oficial do schema.org, via o endpoint dele. 3 tipos
reconhecidos, **0 erros e 0 avisos**. O Rich Results Test do Google ficou para o
deploy — ver a lista de pendências.

---

## Sitemap e robots são derivados, não digitados

O `robots.txt` é uma rota (`src/pages/robots.txt.ts`) e não um arquivo em `public/`:
a URL do sitemap vem do `site` do `astro.config.mjs`, a mesma fonte do canonical. Um
arquivo estático teria o domínio digitado, e na hora de decidir www x apex alguém
trocaria em dois lugares e esqueceria o terceiro — apontando o Google para um
sitemap que redireciona.

O sitemap **filtra as páginas `noindex`**. As duas telas de resultado do formulário
de contato têm `noindex` no HTML; listá-las mandaria ao Google dois sinais opostos
sobre a mesma URL, e o Search Console reporta isso como erro. São 13 rotas no
sitemap contra 16 páginas no build: as duas telas de resultado e a 404.

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

## Os portões de qualidade, e cinco defeitos que eles acharam

Os quatro portões do `CLAUDE.md` viraram scripts na Etapa 12, e rodam em TODAS as
rotas do build em vez de numa amostra. Os números medidos estão em
[`docs/QUALIDADE.md`](docs/QUALIDADE.md); a parte manual de acessibilidade, em
[`docs/ACESSIBILIDADE.md`](docs/ACESSIBILIDADE.md).

Resumo do que passou: **performance 98–99** com LCP de 1,66 a 2,11s e TBT 0ms,
home com **169 KB** contra o limite de 1 MB · **SEO 100** em nove moldes de
página, com 89 blocos de JSON-LD validados · **zero violação** de acessibilidade
`critical` ou `serious` em 43 rotas · **172 medições** responsivas sem quebra,
sem scroll horizontal e sem corte.

Os números melhoraram na Etapa 13 por duas razões, e uma delas é desconfortável:
a **Archivo instanciada** tirou 55 KB do caminho crítico, e o servidor de teste
**passou a mandar os cabeçalhos de produção** — o que revelou que as medições da
Etapa 12 eram otimistas. Ver [`docs/QUALIDADE.md`](docs/QUALIDADE.md).

O que o portão achou, e que estava indo ao ar:

1. **A calculadora não funcionava sem JavaScript.** Os 12 grupos de campo e os 12
   desenhos de seção transversal saíam do servidor com `hidden`, e o script
   desescondia um depois de hidratar — quem chegasse sem script veria o seletor
   de perfil e mais nada. Isso também causava CLS de 0,304, contra a meta de
   0,100. E havia um descasamento por baixo: o script tinha `'tubo-quadrado'`
   como padrão enquanto o `<select>`, sem `<option selected>`, começava na barra
   redonda. Agora o padrão é uma constante única, `DEFAULT_PROFILE_SLUG`, e um
   teste garante que ela aponta para um perfil com fórmula e campos.

2. **A página `/admin` ia ao ar sem estilo nenhum.** Ela usava três atributos
   `style` inline, e a CSP gerada bloqueia estilo em atributo — sem erro no
   build, sem erro no `astro check`, sem erro no `dev`. É a mesma armadilha do
   `<script is:inline>` já anotada no `CLAUDE.md`, do lado do estilo. De
   passagem, saíram três hexes soltos que contrariavam a regra dos tokens.

3. **A lista de orçamento com itens gerava 285px de scroll horizontal a 360px.**
   Os `<label class="sr-only">` das células são `position: absolute`, e sem
   ancestral posicionado o bloco contentor deles é o ICB — então o
   `overflow: auto` do `<table-scroller>` **não os recortava**, e eles ficavam na
   coordenada de layout da célula, a 954px, empurrando o documento e arrastando a
   barra fixa. Só apareceu porque o portão passou a testar a lista COM itens.

4. **O CSS crítico perdia a corrida para o `preload` da fonte.** O Astro injeta o
   `<link rel="stylesheet">` no fim do `<head>`, depois do `preload` da Archivo
   que então tinha 90 KB — então o navegador começava a fonte antes da folha que bloqueia a
   pintura. Em 9 execuções no `/orcamento`: 4 de 9 acima da meta de LCP com o CSS
   em arquivo, 0 de 9 com ele embutido.

5. **O próprio portão passava o que não devia.** A mediana do CLS escondia uma
   distribuição bimodal — `0,000 · 0,016 · 0,016 · 0,304 · 0,304` virava "0,016"
   e passava folgado. O portão responsivo confundia a marca-d'água decorativa do
   hero com quebra de layout, e ao mesmo tempo dava por rolável uma tabela
   cortada por `overflow: hidden`. E media o painel do Keystatic acreditando
   medir `/admin`, que faz `<meta refresh>` de 0s para lá. As quatro correções
   estão em `docs/QUALIDADE.md`.

Uma lição atravessa três dos cinco: **markup renderizado em dois estados, com um
escondido na hidratação.** É o defeito mais caro deste projeto. O `CLAUDE.md` tem
a regra agora.

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
| `npm run preview` | `astro preview`. **NÃO funciona com o adapter da Vercel** — use `npm run servir`. Fica na tabela só porque é script padrão do Astro. |
| `npm run check` | Verificação de tipos, inclusive nos arquivos `.astro`. |
| `npm test` | 243 testes: fórmulas, rótulos, busca, legendas, lista de orçamento e e-mail. |
| `npm run contrast` | 22 contrastes, 4 separações de matiz, e varre o código procurando o acento usado como cor de texto. |
| `npm run meta` | Confere title, description, canonical, og:image e h1 único em TODA rota do build. Reprova em título repetido. |
| `npm run assets` | Regera favicon, ícones e og-image a partir do logotipo. Rode ao trocar o logo. |
| `npm run servir` | Serve `dist/client` em `:4330`. Existe porque a CSP é um `<meta>` gerado no BUILD: o servidor de desenvolvimento não a emite e `astro preview` não funciona com o adapter da Vercel. |
| `npm run urls-antigas` | Rastreia aldifer.com.br e reescreve `docs/urls-antigas.txt`. Rodar de novo só se o site antigo mudar. |
| `npm run redirects` | Gera os 117 redirects 301 no `vercel.json`, conferindo cada destino contra as rotas que o build produziu. **Exige `npm run build` antes.** |
| `npm run check-redirects` | Confere 100% de cobertura, sem cadeia, sem loop, todo destino existente, todos 301. |
| `npm run testar-redirects` | SEGUE as 117 URLs de verdade contra `npm run servir` e confirma 301 em um salto com destino 200. Aceita `BASE=` para apontar para produção. |
| `npm run js` | Mede o JS de cada página em gzip, contra o portão de 100 KB. Reprova página pública acima de 40 KB, que é sinal de runtime de framework vazando. |
| `npm run fonts` | Copia Inter e JetBrains de `node_modules` e **gera** a Archivo instanciada em `wdth` 125%. Só é necessário ao trocar a versão de uma fonte — o arquivo gerado é versionado. Exige `python -m pip install --user "fonttools[woff]"`. |
| `npm run lighthouse` | Portão de performance. 3 execuções por página (`EXECUCOES=5` para mais): tempo pela mediana, **CLS pelo pior caso**. Aceita rotas extras como argumento. |
| `npm run seo` | Portão de SEO. Nota 100 do Lighthouse em 9 moldes de página, mais validação estrutural do JSON-LD em TODAS as rotas. `SEM_LIGHTHOUSE=1` roda só a parte estática, em segundos. |
| `npm run axe` | Portão de acessibilidade, em TODAS as rotas do build. Reprova em violação `critical` ou `serious`. |
| `npm run responsivo` | Portão responsivo: 4 larguras × toda rota, mais um cenário com a lista de orçamento semeada. **Autoverifica-se em toda execução** — 8 provas injetam a quebra que cada balde existe para pegar. |
| `npm run cls -- /rota 4` | Diagnóstico: imprime o retângulo ANTES e DEPOIS de cada elemento que se moveu. Use quando o CLS reprovar — a atribuição de causa do Lighthouse é heurística e já apontou o culpado errado. |

---

## Como publicar

O passo a passo completo, com DNS, Resend e transferência de acessos, está em
[`docs/DEPLOY.md`](./docs/DEPLOY.md). O resumo:

1. **Suba o repositório para o GitHub**, privado. Hoje ele é local, sem remote —
   e sem remote não há deploy contínuo nem painel de edição em produção.
2. **Importe na Vercel.** Ela detecta o Astro sozinha; não mexa em build command
   nem em output directory, que o adapter `@astrojs/vercel` resolve.
3. **Cadastre as variáveis de ambiente no painel da Vercel**, nunca no
   repositório. Ver a tabela abaixo.
4. **Verifique na URL de preview** antes do domínio: os 117 redirects
   (`BASE=<preview> npm run testar-redirects`), o console limpo (a CSP é um
   `<meta>` gerado no build e só roda fora do `npm run dev`), um envio real do
   formulário, e um Save no `/keystatic`.
5. **Percorra o [checklist de lançamento](./docs/CHECKLIST-LANCAMENTO.md).**
6. **Aponte o DNS** — `www` como canônico, apex com 301 para ele.
7. **Siga o [`POS-DEPLOY.md`](./docs/POS-DEPLOY.md)**: redirects em produção,
   sitemap no Search Console, Rich Results Test, analytics.

Depois disso, cada `git push` na branch `main` publica. E cada Save no painel de
edição é um commit, portanto também publica.

### Onde ficam as chaves, e o que cada uma faz

Todas no **painel da Vercel**. O `.env` local nunca é versionado; o
[`.env.example`](./.env.example) é, e traz o passo a passo de onde tirar cada
valor.

| Chave | Para que serve | Sem ela |
|---|---|---|
| `RESEND_API_KEY` | Enviar o e-mail do pedido | O pedido é aceito e persistido, e a resposta **avisa que o e-mail não saiu**. Não se perde o pedido; ninguém é notificado |
| `QUOTE_MAIL_FROM` | Remetente. Domínio verificado no Resend | Idem |
| `QUOTE_MAIL_TO` | Quem recebe os pedidos. **[CONFIRMAR]** | Idem |
| `CONTACT_MAIL_TO` | Caixa separada para o formulário de contato | A mensagem cai em `QUOTE_MAIL_TO` — melhor chegar no lugar quase certo que não chegar |
| `PUBLIC_TURNSTILE_SITE_KEY` · `TURNSTILE_SECRET_KEY` | Portão anti-robô do formulário | O formulário funciona; restam o honeypot e o limite por IP |
| `LEAD_STORE_DRIVER` (+ chaves do driver) | Persistir o lead. **[CONFIRMAR]** | Fica em `json`, que **não persiste em serverless**. O código detecta e carimba o aviso no assunto do e-mail |
| `PUBLIC_KEYSTATIC_GITHUB_REPO` · `KEYSTATIC_GITHUB_CLIENT_ID` · `KEYSTATIC_GITHUB_CLIENT_SECRET` · `KEYSTATIC_SECRET` | Painel de edição em modo GitHub, em que cada Save vira commit | O painel abre mas **não salva nada em produção**: o disco da Vercel é efêmero e somente leitura |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Analytics sem cookie | Nenhum script de analytics carrega e o host nem entra na CSP. **É como se mede o sucesso do projeto** — sem ela o lançamento vai às cegas. Lida em tempo de build: exige redeploy |

As `PUBLIC_` vão para o navegador — não ponha segredo nelas. As outras ficam só
no servidor.

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
| 9 — SEO técnico | ✅ |
| 10 — Migração de URLs | ✅ |
| 11 — CMS Keystatic | ✅ |
| 12 — Portões de qualidade | ✅ números em `docs/QUALIDADE.md` |
| 13 — Deploy e entrega | ◐ tudo documentado e pronto; **o deploy em si depende de conta na Vercel e no GitHub** — ver `docs/DEPLOY.md` |
