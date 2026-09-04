# CONTEÚDO — Site Aldifer

> Fonte única de verdade do conteúdo. O Claude Code consulta este arquivo em vez de
> inventar texto. Coloque em `docs/CONTEUDO.md` no repositório.

---

## 1. Sitemap

```
/                                Home
/produtos                        Catálogo completo com filtro
/produtos/barras                 Categoria
/produtos/barras/barra-chata     Produto, com tabela de bitolas
/produtos/tubos
/produtos/chapas
/produtos/perfis
/produtos/telas
/produtos/diversos
/calculadora-de-peso             Ferramenta
/orcamento                       Lista montada + formulário
/empresa                         História, missão, valores, instalações
/contato                         Mapa, rota, telefone, horário
/politica-de-privacidade         LGPD
/404                             Erro personalizado
/admin                           Painel Keystatic (noindex)
```

Regra de URL: minúscula, hífen, sem acento, sem parâmetro, em português.

---

## 2. Copy do hero (aprovada na Fase 1)

```
H1   Ferro e aço em pronta-entrega para quem trabalha no Grande ABC.

Sub  Barras, tubos, chapas, perfis e telas com estoque em São Bernardo do Campo.
     Monte sua lista de material e receba o orçamento pelo mesmo canal.

CTA primária     [ Montar lista de orçamento ]     → /produtos
CTA secundária     Falar no WhatsApp               → wa.me/[CONFIRMAR]
```

Abaixo do CTA, três provas em linha (sem card, sem ícone genérico — só texto com
divisor vertical fino):

```
Desde 2002  ·  São Bernardo do Campo  ·  Atendimento a serralheria e indústria
```

**Não use:** "Soluções inovadoras", "Excelência em atendimento", "Seja bem-vindo",
"Qualidade que você confia", "Parceiro estratégico". O hero diz o que vende,
para quem e onde. Nada mais.

---

## 3. Seções da home, na ordem

| # | Seção | Objetivo | CTA |
|---|---|---|---|
| 1 | Hero | Dizer o que é e abrir o catálogo | Montar lista |
| 2 | Busca rápida | Campo único: "chapa 1/8", "tubo 30x30" | Vai para o catálogo filtrado |
| 3 | As 6 categorias | Acesso direto às tabelas, com o desenho de seção | Ver medidas |
| 4 | Por que a Aldifer | Atacar a objeção nº 1 | — |
| 5 | Calculadora de peso | Ferramenta que gera retorno recorrente | Calcular |
| 6 | Para quem atendemos | Serralheria · Indústria · Construção | — |
| 7 | Onde estamos | Mapa, horário, rota | Traçar rota |
| 8 | Fechamento | Última chance de conversão | Pedir orçamento |

### Texto da seção 4 — "Por que a Aldifer"

Três blocos. Sem ícone decorativo, sem card com sombra. Título em Archivo, texto em Inter.

```
Estoque, não catálogo de encomenda
A linha completa de barras, tubos, chapas, perfis e telas fica no galpão de São
Bernardo. Você consulta a medida no site e confirma a retirada no mesmo dia.
[CONFIRMAR: prazo e política de retirada]

Quem atende entende de serralheria
Desde 2002 fornecendo para as serralherias e indústrias do Grande ABC. Você fala
com quem sabe a diferença entre chapa fina a frio e a quente sem precisar explicar.

Pedido que já chega pronto
Monte a lista com bitola, quantidade e observação. O orçamento sai sem telefonema
de ida e volta e sem risco de o material errado subir no caminhão.
```

### Texto da seção 6 — "Para quem atendemos"

```
Serralheria     Portões, grades, estruturas, corrimãos e escadas. Barras, tubos,
                chapas e degraus na medida que o projeto pede.

Indústria       Reposição, manutenção e fabricação. Perfis estruturais, chapas
                laminadas e tubos com fornecimento recorrente.

Construção      Estrutura metálica, telhas galvanizadas, telas e alambrados para
                obra e fechamento de terreno.
```

---

## 4. Catálogo — estrutura de dados

Cada produto é um arquivo em `src/content/products/`, com este schema:

```ts
{
  slug: string            // "barra-chata"
  name: string            // "Barra Chata"
  category: string        // "barras"
  crossSection: string    // id do SVG de seção transversal
  shortDescription: string  // 1 linha, aparece no card
  description: string       // 2 a 4 parágrafos, MDX
  applications: string[]    // ["Portões", "Grades", "Estruturas"]
  finishes: string[]        // ["Laminado a quente", "Galvanizado"]
  dimensionColumns: string[]  // rótulos das colunas da tabela
  dimensions: Array<Record<string, string | number>>
  weightFormula: string     // id da fórmula na calculadora
  seoTitle: string
  seoDescription: string
}
```

### Categorias e produtos (do catálogo atual da Aldifer)

| Categoria | Produtos |
|---|---|
| **Barras** | Barra chata · Barra redonda · Barra quadrada · Barra chata galvanizada |
| **Tubos** | Tubo redondo · Tubo quadrado · Tubo retangular · Tubo galvanizado |
| **Chapas** | Chapa fina a frio · Chapa fina a quente · Chapa xadrez · Chapa galvanizada |
| **Perfis** | Perfil I · Perfil I W · Perfil I H W · Perfil U · Cantoneira · Perfil T |
| **Telas** | Tela ondulada · Tela hexagonal · Tela para alambrado · Tela galvanizada |
| **Diversos** | Telha galvanizada · Degraus · Discos de corte · Eletrodos · Fechaduras · Tintas e solventes · Acessórios |

### ⚠️ Tabelas de bitola — leia antes de preencher

**As medidas comerciais que o Claude Code conhece são padrão de mercado, não o estoque
da Aldifer.** Publicar bitola que a empresa não tem gera pedido que ela não consegue
atender — pior que não publicar nada.

Procedimento obrigatório:

1. Estruture a tabela com a **faixa comercial padrão** de cada produto.
2. Marque o arquivo inteiro com `status: "rascunho"` no frontmatter.
3. Renderize um aviso visível em ambiente de desenvolvimento:
   `⚠ Tabela em conferência — validar com a Aldifer antes de publicar`.
4. Liste no README, em destaque, que **a planilha de estoque real precisa ser
   solicitada à Aldifer** e substituída antes do lançamento.
5. Nenhum produto com `status: "rascunho"` entra no build de produção.

Colunas típicas por produto (só a estrutura, não os valores):

```
Barra chata        Largura (mm) · Espessura (mm) · Comprimento (m) · Peso (kg/m)
Barra redonda      Diâmetro (mm ou pol) · Comprimento (m) · Peso (kg/m)
Barra quadrada     Lado (mm) · Comprimento (m) · Peso (kg/m)
Tubo redondo       Ø externo (mm ou pol) · Parede (mm) · Comprimento (m) · Peso (kg/m)
Tubo quadrado      Lado (mm) · Parede (mm) · Comprimento (m) · Peso (kg/m)
Tubo retangular    Base × Altura (mm) · Parede (mm) · Comprimento (m) · Peso (kg/m)
Chapa              Espessura (mm) · Bitola MSG · Largura × Comprimento (m) · Peso (kg/chapa)
Perfil I / U       Altura (mm) · Aba (mm) · Alma (mm) · Comprimento (m) · Peso (kg/m)
Cantoneira         Aba × Aba (mm ou pol) · Espessura (mm) · Comprimento (m) · Peso (kg/m)
Tela               Malha (mm) · Fio (BWG/mm) · Altura do rolo (m) · Comprimento do rolo (m)
Telha              Espessura (mm) · Largura útil (m) · Comprimento (m) · Peso (kg/m²)
```

A coluna **Peso** é calculada em build pelas fórmulas da seção 5 — não digite à mão.

---

## 5. Calculadora de peso teórico

Elemento de assinatura funcional. Densidade do aço carbono: **7.850 kg/m³**
(fator 0,00785 kg por mm² por metro).

Fórmulas — peso em **kg por metro linear**, dimensões em **mm**:

```
Barra redonda        P = 0,006165 × Ø²
Barra quadrada       P = 0,00785 × L²
Barra chata          P = 0,00785 × largura × espessura
Barra sextavada      P = 0,0068 × entre-faces²

Tubo redondo         P = 0,02466 × parede × (Ø_externo − parede)
Tubo quadrado        P = 0,0314 × parede × (lado − parede)
Tubo retangular      P = 0,0157 × parede × (base + altura − 2 × parede)

Cantoneira           P = 0,00785 × espessura × (aba₁ + aba₂ − espessura)
Perfil T             P = 0,00785 × espessura × (aba + altura − espessura)

Chapa (kg por peça)  P = 0,00000785 × espessura × largura × comprimento
                         (as três dimensões em mm)
Chapa (kg/m²)        P = 7,85 × espessura
```

**Observações que devem aparecer na interface:**

- O resultado é **peso teórico**. Tubos e cantoneiras têm raio de canto, e a
  laminação tem tolerância — o peso real varia tipicamente ±3%.
- Perfil I, U e H **não têm fórmula simples**: as abas são cônicas e há raio de
  concordância. Use a tabela de bitolas da usina, nunca cálculo aproximado.
  Na calculadora, esses perfis consultam a tabela em vez de calcular.
- Para aço inox use densidade 7.900 e para alumínio 2.700 — só implemente se a
  Aldifer trabalhar com esses materiais. `[CONFIRMAR]`

**Comportamento:** o usuário calcula, vê o peso, e um botão discreto oferece
"Adicionar à lista de orçamento" já com a medida preenchida. É assim que a
ferramenta vira lead.

---

## 6. Lista de orçamento

Estado no `localStorage`, chave `aldifer:quote:v1`, com versionamento no nome
para permitir migração de schema.

```ts
type QuoteItem = {
  productSlug: string
  productName: string
  dimension: string      // "50 × 6 mm"
  length?: string        // "6 m"
  quantity: number
  unit: "peça" | "barra" | "chapa" | "rolo" | "kg" | "m"
  note?: string          // observação livre do cliente
}
```

Comportamento:

- Barra fixa no rodapé aparece assim que há 1 item. Mostra a contagem e o botão
  "Fechar pedido". Em mobile ela não pode cobrir o conteúdo — reserve o espaço.
- Adicionar item dispara confirmação discreta (região `aria-live="polite"`),
  **sem modal** e sem tirar o usuário da navegação.
- A lista é editável na página `/orcamento`: alterar quantidade, remover, anotar.
- Persistir por 30 dias. Ao expirar, limpar sem avisar.
- Lista vazia em `/orcamento` mostra caminho de saída para o catálogo, não erro.

---

## 7. Formulário de orçamento

### Campos

| Campo | Tipo | Obrigatório | autocomplete |
|---|---|---|---|
| Nome | text | sim | `name` |
| Empresa | text | não | `organization` |
| E-mail | email | sim | `email` |
| Telefone / WhatsApp | tel | sim | `tel` |
| Cidade | text | não | `address-level2` |
| Itens da lista | gerado | — | — |
| Observações | textarea | não | `off` |
| Consentimento LGPD | checkbox | sim, **não pré-marcado** | — |
| `website` (honeypot) | text oculto | deve vir vazio | `off` |

Telefone é obrigatório aqui — este público responde por WhatsApp, não por e-mail.
Cada campo além destes derruba conversão. Não adicione CPF, não adicione "como nos conheceu".

### Fluxo no servidor

```
Cliente (valida com Zod)
  → POST /api/orcamento  (prerender = false)
      ├─ revalida com o MESMO schema Zod
      ├─ honeypot vazio?
      ├─ tempo de preenchimento > 3s?
      ├─ Turnstile válido? (verificação server-side)
      ├─ rate limit: 5 envios/hora por IP
      ├─ persiste o lead  ← OBRIGATÓRIO
      ├─ envia e-mail via Resend, reply-to = e-mail do lead
      └─ 200 + mensagem de sucesso
```

**E-mail sozinho perde lead.** Persistir é obrigatório. Ordem de preferência do
destino: Google Sheets via service account → Notion → Supabase.
`[DECIDIR COM A ALDIFER — o que eles já usam no dia a dia]`

### Estados de UI

```
idle       "Enviar pedido de orçamento"
enviando   botão desabilitado, texto "Enviando..."
sucesso    "Pedido recebido. Respondemos em até 1 dia útil, em horário comercial."
           + opção de mandar o mesmo pedido pelo WhatsApp
erro       "Não foi possível enviar. Tente novamente ou chame no (11) 4344-1919."
           + os dados digitados PRESERVADOS
```

Erro por campo, em português, dizendo o que fazer. Nunca "campo inválido".
Nunca limpe o que o usuário digitou.

### Texto do consentimento

```
☐ Autorizo a Aldifer a usar meus dados de contato para responder a este pedido
  de orçamento. Li a Política de Privacidade.
```

Sem pré-marcação. `[Política de Privacidade]` é link para `/politica-de-privacidade`.

---

## 8. Página Empresa — texto real do site atual

Pode usar. É informação confirmada pela própria Aldifer.

**Sobre**
Fundada em 2002, a Aldifer Distribuidora de Ferro e Aço é uma empresa de base familiar
que começou suas atividades em São Bernardo do Campo com a comercialização de tubos e
laminados para indústrias e serralherias. Ao longo dos anos a empresa expandiu seu
mercado de atuação, passando a comercializar diversos produtos siderúrgicos com foco
em qualidade e preço baixo, se tornando uma das principais distribuidoras das usinas
e serralherias do Grande ABC.

**Missão**
Comercializar e oferecer soluções em ferro e aço com foco em qualidade e baixo custo,
gerando valor a clientes, colaboradores e fornecedores.

**Visão**
Tornar-se referência em qualidade e baixo custo no segmento de mercado em que atua na
região do Grande ABC, por meio da geração de valor ao público estratégico.

**Valores**
- Satisfação dos grupos de interesse
- Melhoria contínua dos processos
- Valorização e respeito às pessoas
- Integridade e comportamento ético

> Correção aplicada: o site atual escreve "Torna-se referência". O correto é
> "Tornar-se". Ajustar.

**Instalações:** o site atual tem 4 fotos (`empresa-02.jpg` a `empresa-05.jpg`).
São pequenas e antigas. Usar como provisórias e registrar no README a recomendação
de nova sessão fotográfica — aço bem fotografado é metade da credibilidade da página.

---

## 9. Mapa de redirects 301

Toda URL `.php` do site antigo precisa de destino. Nenhuma pode virar 404.

### Páginas principais

| Antiga | Nova |
|---|---|
| `/index.php` | `/` |
| `/empresa.php` | `/empresa` |
| `/contato.php` | `/contato` |
| `/barras.php` | `/produtos/barras` |
| `/tubos.php` | `/produtos/tubos` |
| `/chapas.php` | `/produtos/chapas` |
| `/perfis.php` | `/produtos/perfis` |
| `/telas.php` | `/produtos/telas` |
| `/diversos.php` | `/produtos/diversos` |

### Páginas de produto

| Antiga | Nova |
|---|---|
| `/barra-chata.php` | `/produtos/barras/barra-chata` |
| `/barra-redonda.php` | `/produtos/barras/barra-redonda` |
| `/barra-quadrada.php` | `/produtos/barras/barra-quadrada` |
| `/tubo-redondo.php` | `/produtos/tubos/tubo-redondo` |
| `/tubo-quadrado.php` | `/produtos/tubos/tubo-quadrado` |
| `/tubo-retangular.php` | `/produtos/tubos/tubo-retangular` |
| `/chapas-finas-a-frio.php` | `/produtos/chapas/chapa-fina-a-frio` |
| `/chapas-finas-a-quente.php` | `/produtos/chapas/chapa-fina-a-quente` |
| `/chapas-xadrez.php` | `/produtos/chapas/chapa-xadrez` |
| `/chapas-galvanizadas.php` | `/produtos/chapas/chapa-galvanizada` |
| `/perfil-i.php` · `/perfil-i-w.php` · `/perfil-i-h-w.php` | `/produtos/perfis/perfil-i` |
| `/perfil-u.php` | `/produtos/perfis/perfil-u` |
| `/perfil-t.php` | `/produtos/perfis/perfil-t` |
| `/cantoneira.php` · `/perfil-cantoneira.php` | `/produtos/perfis/cantoneira` |
| `/tela-ondulada.php` | `/produtos/telas/tela-ondulada` |
| `/tela-hexagonal.php` · `/tela-hexagonais.php` · `/telas-hexagonais.php` | `/produtos/telas/tela-hexagonal` |
| `/tela-alambrado.php` · `/tela-alambrados.php` | `/produtos/telas/tela-alambrado` |
| `/telha-galvanizada.php` | `/produtos/diversos/telha-galvanizada` |
| `/degraus.php` | `/produtos/diversos/degraus` |
| `/discos-de-corte.php` | `/produtos/diversos/discos-de-corte` |
| `/eletrodos.php` | `/produtos/diversos/eletrodos` |
| `/fechaduras.php` | `/produtos/diversos/fechaduras` |
| `/tintas-e-solventes.php` | `/produtos/diversos/tintas-e-solventes` |
| `/acessorios.php` | `/produtos/diversos/acessorios` |

### As ~70 páginas-satélite de keyword

Todas as variações do tipo `*-preco.php`, `*-em-sp.php`, `*-no-abc.php`,
`*-em-sao-bernardo.php`, `distribuidor-de-*.php`, `distribuidora-de-*.php`,
`empresa-de-ferro-e-aco-no-abc.php`, `comercio-de-ferro-e-aco-*.php`.

Regra de redirect por radical, na ordem:

```
contém "viga" ou "perfil"       → /produtos/perfis
contém "cantoneira"             → /produtos/perfis/cantoneira
contém "chapa"                  → /produtos/chapas
contém "tubo"                   → /produtos/tubos
contém "barra"                  → /produtos/barras
contém "tela"                   → /produtos/telas
contém "telha"                  → /produtos/diversos/telha-galvanizada
contém "degrau"                 → /produtos/diversos/degraus
qualquer outra (distribuidor,
comercio, empresa, ferro-e-aco) → /produtos
```

Gere o `vercel.json` a partir dessa regra, **listando cada URL explicitamente**.
Regex genérico em redirect é fonte de loop e de destino errado.

Antes de gerar: rode o script da Etapa 10 para extrair a lista completa de `href`
do site antigo. Não confie na lista deste documento — ela pode estar incompleta.

---

## 10. Meta tags por página

Todo `title` até ~60 caracteres. Toda `description` entre 140 e 160.

| Página | Title | Description |
|---|---|---|
| Home | Aldifer — Ferro e Aço em São Bernardo do Campo | Distribuidora de ferro e aço no Grande ABC desde 2002. Barras, tubos, chapas, perfis e telas em pronta-entrega. Monte sua lista e peça orçamento. |
| Produtos | Catálogo de Ferro e Aço — Aldifer | Barras, tubos, chapas, perfis, telas e acessórios com medidas e bitolas. Consulte a linha completa e monte seu pedido de orçamento online. |
| Barras | Barras de Aço: Chata, Redonda e Quadrada — Aldifer | Barras chatas, redondas e quadradas em aço carbono e galvanizado, com tabela de bitolas e comprimentos. Estoque em São Bernardo do Campo. |
| Tubos | Tubos de Aço Redondo, Quadrado e Retangular — Aldifer | Tubos de aço em diversas bitolas e espessuras de parede, com peso por metro. Pronta-entrega para serralheria e indústria no Grande ABC. |
| Chapas | Chapas de Aço a Frio, a Quente e Xadrez — Aldifer | Chapas laminadas a frio e a quente, xadrez e galvanizadas. Espessuras, bitolas MSG e formatos disponíveis com retirada em São Bernardo. |
| Perfis | Perfis de Aço: Viga I, U, T e Cantoneira — Aldifer | Perfis estruturais em aço com altura, aba e peso por metro conforme tabela de usina. Fornecimento para estrutura metálica no ABC. |
| Telas | Telas de Aço: Ondulada, Hexagonal e Alambrado — Aldifer | Telas onduladas, hexagonais e para alambrado em rolos, com malha e fio especificados. Fechamento de terreno e proteção industrial. |
| Calculadora | Calculadora de Peso de Aço por Metro — Aldifer | Calcule o peso teórico de barras, tubos, chapas e cantoneiras. Informe a bitola e receba o peso em kg/m para orçar seu serviço. |
| Empresa | A Aldifer — Distribuidora de Ferro e Aço desde 2002 | Empresa familiar de São Bernardo do Campo que fornece produtos siderúrgicos para serralherias e indústrias do Grande ABC há mais de 20 anos. |
| Contato | Contato e Endereço — Aldifer São Bernardo | Estrada dos Alvarengas, 5338, São Bernardo do Campo. Telefone (11) 4344-1919. Veja rota, horário e envie seu pedido de orçamento. |
| Orçamento | Pedir Orçamento de Ferro e Aço — Aldifer | Envie sua lista de materiais com bitola e quantidade e receba o orçamento da Aldifer em até 1 dia útil. Atendimento no Grande ABC. |

---

## 11. JSON-LD

No layout base, `LocalBusiness`. **Só com dado confirmado.**

```json
{
  "@context": "https://schema.org",
  "@type": "HardwareStore",
  "name": "Aldifer Distribuidora de Ferro e Aço",
  "alternateName": "Aldifer — A Loja do Aço",
  "url": "https://www.aldifer.com.br",
  "telephone": "+551143441919",
  "email": "contato@aldifer.com.br",
  "foundingDate": "2002",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Estrada dos Alvarengas, 5338",
    "addressLocality": "São Bernardo do Campo",
    "addressRegion": "SP",
    "postalCode": "09850-550",
    "addressCountry": "BR"
  },
  "areaServed": ["São Bernardo do Campo", "Santo André", "São Caetano do Sul",
                 "Diadema", "Mauá", "Ribeirão Pires", "São Paulo"],
  "sameAs": [
    "https://www.linkedin.com/company/aldifer/",
    "https://www.instagram.com/aldiferoficial/",
    "https://www.facebook.com/aldiferoficial/"
  ]
}
```

`openingHours` e `geo` **só depois de confirmar** horário e coordenadas exatas.
JSON-LD com dado inventado é pior que JSON-LD ausente.

Adicionar também: `BreadcrumbList` nas páginas internas e `ItemList` no catálogo.

---

## 12. Perguntas pendentes com a Aldifer

Entregar esta lista ao cliente antes do lançamento:

1. Vocês fazem **corte sob medida**? Qual tolerância e prazo?
2. Qual o **horário de funcionamento**, incluindo sábado?
3. Qual o **número de WhatsApp** direto do comercial?
4. **CNPJ** para rodapé e dados estruturados.
5. Existe **pedido mínimo**, em valor ou em peso?
6. Vocês **entregam**? Em que cidades e com que prazo?
7. Qual a **planilha real de bitolas em estoque**? (bloqueante para as tabelas)
8. Trabalham com **inox ou alumínio**, ou só aço carbono?
9. Emitem **certificado de qualidade da usina** quando o cliente pede?
10. Onde os leads devem cair: e-mail de quem, e em qual planilha ou sistema?
