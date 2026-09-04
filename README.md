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
| **Cor de erro e de sucesso** | A paleta do `CLAUDE.md` define "um acento só, sem concorrente" e não prevê cor de feedback. O formulário precisa de vermelho de erro, que não pode ser o mesmo laranja do CTA. | 6 (bloqueia) |
| **Onde persistir o lead** | E-mail sozinho perde lead. Ordem de preferência: Google Sheets → Notion → Supabase. Depende da pergunta 10. | 6 |
| **`www` ou apex** | Fixado em `https://www.aldifer.com.br` no `astro.config.mjs`, para casar com o JSON-LD. Se mudar, muda nos dois lugares. | 13 |
| **Orçamento de JS** | O runtime do React custa 58 KB gzip de um teto de 100 KB. A busca rápida da home talvez não deva ser ilha React. | 3 |
| **Fonte Archivo** | O arquivo com eixo de largura custa 88 KB contra 34 KB da versão só-peso. É o preço do "Expanded". Candidata nº 1 de otimização. | 12 |
| **Script inline** | O menu mobile sai como 372 B de JS inline. Ótimo para performance, mas a CSP restrita precisará de hash ou de forçar arquivo externo. | 9 |
| **Header fixo + QuoteBar** | Duas barras fixas comem a viewport de um celular. Decidir quando a QuoteBar existir. | 5 |
| **Nova sessão fotográfica** | O site atual tem 4 fotos das instalações, pequenas e antigas. Aço bem fotografado é metade da credibilidade da página Empresa. | 8 |

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
| `npm test` | Testes das fórmulas de peso. |
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
src/lib/steel.test.ts         53 testes das fórmulas
src/lib/products.ts           consultas ao catálogo e montagem das tabelas
src/lib/navigation.ts         navegação e rota ativa

src/components/
  CrossSection.astro          o elemento de assinatura
  cross-sections/             13 perfis + 3 auxiliares de cota
  ui/                         Button, Container, Section, Heading, Table
  Header · MobileMenu · Footer · DraftNotice

src/layouts/Base.astro        layout raiz
src/styles/tokens.css         TODOS os tokens do design system
src/pages/styleguide.astro    rota temporária de revisão — REMOVER na Etapa 8
```

### Como editar conteúdo pelo código

Texto de produto e de categoria fica em `src/content/`, em Markdown com frontmatter. O
corpo do arquivo é a descrição longa; o frontmatter tem o resto.

A partir da Etapa 11 o mesmo arquivo também será editável pelo painel do Keystatic em
`/admin` — uma fonte de verdade, duas portas de entrada.

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
| 3 — Home | ⬜ |
| 4 — Catálogo | ⬜ |
| 5 — Lista de orçamento | ⬜ |
| 6 — Formulário, servidor e LGPD | ⬜ bloqueada pela cor de feedback e pela pergunta 10 |
| 7 — Calculadora de peso | ⬜ |
| 8 — Páginas restantes | ⬜ |
| 9 — SEO técnico | ⬜ |
| 10 — Migração de URLs | ⬜ |
| 11 — CMS Keystatic | ⬜ |
| 12 — Portões de qualidade | ⬜ |
| 13 — Deploy e entrega | ⬜ |
