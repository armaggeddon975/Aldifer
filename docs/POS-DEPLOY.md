# Depois do deploy — o que fazer, em ordem

A migração de URLs não termina no deploy. O `CLAUDE.md` chama a perda do
histórico de indexação de **maior causa de queda de tráfego pós-redesenho**, e
essa perda acontece nas semanas seguintes, não no dia.

São 117 URLs `.php` indexadas no site antigo. Todas têm redirect 301 e nenhuma
vira 404 — verificado seguindo cada uma, uma por uma. O que falta é fazer o
Google notar.

---

## Dia 0 — no dia do deploy

### 1. Confirmar que os redirects funcionam em produção

O `vercel.json` só é aplicado pela Vercel. Antes de anunciar o site:

```bash
BASE=https://www.aldifer.com.br npm run testar-redirects
```

O script segue as 117 URLs e reprova se alguma não devolver **301 em um salto
com destino 200**. Se reprovar, o site novo está perdendo tráfego a cada minuto
que fica no ar — é motivo para reverter, não para investigar com calma.

### 2. Enviar o sitemap no Search Console

Em [search.google.com/search-console](https://search.google.com/search-console),
na propriedade de `www.aldifer.com.br`:

1. **Sitemaps** → adicionar `https://www.aldifer.com.br/sitemap-index.xml`
2. **Remover o sitemap antigo** (`/sitemap.xml`, que lista as 117 URLs `.php`).
   Deixar os dois faz o Google reindexar URLs que agora só redirecionam, e o
   relatório enche de "Página com redirecionamento" como se fosse problema.

Guardar o `sitemap.xml` antigo em algum lugar antes de removê-lo: é o inventário
do que precisa continuar funcionando. Ele está preservado em
[`docs/urls-antigas.txt`](./urls-antigas.txt).

### 3. Inspecionar as URLs que mais importam

Ainda no Search Console, em **Inspeção de URL**, pedir indexação de:

```
/                       /produtos              /produtos/barras
/produtos/tubos         /produtos/chapas       /produtos/perfis
/produtos/telas         /produtos/diversos     /calculadora-de-peso
/empresa                /contato
```

São 11 pedidos. A cota diária costuma dar. Sem isso, o Google acha as páginas
sozinho — em dias ou semanas.

### 4. Rich Results Test

O JSON-LD foi validado no validador do schema.org (3 tipos, 0 erros, 0 avisos),
mas o [Rich Results Test](https://search.google.com/test/rich-results) do Google
precisa de URL pública e só pôde ficar para agora. Rodar em `/produtos/barras`,
que tem os três tipos: `HardwareStore`, `BreadcrumbList` e `ItemList`.

Esperar que ele reporte **apenas o Breadcrumb**: dados de negócio local
alimentam o Perfil da Empresa, não um card de busca, e `ItemList` simples não é
tipo de resultado enriquecido. Ausência deles ali não é erro.

### 5. Ligar o analytics

Sem `PUBLIC_PLAUSIBLE_DOMAIN` na Vercel, nenhum script de analytics carrega —
**e o host nem entra na CSP**. Depois de preencher a variável é obrigatório
**refazer o deploy**: a política é montada no build.

Confirmar depois: abrir o site, ver o `script` do Plausible no HTML e um evento
chegando no painel.

---

## Primeira semana

### Cobertura no Search Console

Em **Páginas**, acompanhar:

| O que aparecer | O que significa |
|---|---|
| "Página com redirecionamento" crescendo até ~117 | **Esperado e bom.** É o Google processando os 301 |
| "Não encontrada (404)" com URL `.php` | **Problema.** Alguma URL escapou do inventário — acrescentar a `docs/urls-antigas.txt` e rodar `npm run redirects` |
| "Erro de redirecionamento" | **Problema.** Cadeia ou loop. Rodar `npm run check-redirects` |
| "Excluída por tag noindex" com 2 URLs | **Esperado.** São `/mensagem-enviada` e `/mensagem-nao-enviada` |
| "Rastreada, mas não indexada" nas categorias | Comum enquanto as categorias estiverem sem produto — ver o bloqueante abaixo |

### O erro que NÃO é erro

O relatório vai mostrar 117 páginas "com redirecionamento" e isso parece uma
massa de problemas. Não é. É exatamente o resultado desejado: o Google viu a URL
antiga, seguiu o 301 e passou a autoridade para a nova.

---

## Trinta dias

Comparar no Search Console, em **Desempenho**, os 30 dias depois do lançamento
contra os 30 antes. O que esperar:

- **Impressões caem primeiro e sobem depois.** As ~70 páginas-satélite de
  keyword stuffing eram conteúdo raso e duplicado, penalizado desde o Helpful
  Content Update. Elas geravam impressão de baixa qualidade que não convertia.
  A queda dessas impressões não é perda.
- **O que precisa subir é CLIQUE nas páginas de categoria e de produto.** É a
  métrica honesta desta migração.
- **Conversão é a métrica final**, e ela não vive no Search Console: está no
  evento `orcamento_enviado` do Plausible.

Se ao fim de 30 dias houver URL `.php` ainda em 404, ela é perda direta de
tráfego e é urgente.

---

## ⛔ Enquanto os 27 produtos estiverem em rascunho

**Isto muda os redirects.** Hoje 69 das 117 URLs param na CATEGORIA em vez da
página de produto, porque nenhuma página de produto é gerada — e um 301 para uma
página que não existe é pior que um 404 direto: o Google registra soft 404 e
ainda segue o redirecionamento.

O gerador confere cada destino contra as rotas que o build realmente produziu e
rebaixa o que não existe. **Quando a planilha da Aldifer chegar e os produtos
saírem do rascunho:**

```bash
npm run build
npm run redirects        # 53 das 117 passam a apontar para o produto
npm run check-redirects
git commit -am "aponta os redirects para as páginas de produto publicadas"
```

Trocar o destino de um 301 **não cria cadeia**: a URL antiga passa a apontar
direto para o novo destino. Verificado: com os produtos publicados, a cobertura
segue 100% e nenhum caminho tem mais de um salto.

Fazer isso é o que recupera a precisão da migração. Enquanto não for feito, quem
buscava "barra chata" cai na lista de barras em vez da tabela de bitolas — não é
404, mas é um clique a mais.
