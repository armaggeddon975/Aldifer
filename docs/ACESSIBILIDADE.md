# Acessibilidade — o que o axe não pega

O portão do `CLAUDE.md` é "WCAG 2.2 AA, zero violação crítica ou séria".
`npm run axe` roda em TODAS as rotas do build e reprova em `critical` ou
`serious` — resultado atual em `docs/QUALIDADE.md`.

Mas o axe detecta de **20% a 50%** do que existe, número da própria
documentação da Deque. O que ele não decide é o que está aqui: se o alvo de
toque é grande o bastante quando o rótulo faz parte dele, se a ordem do foco
segue a leitura, se o anel de foco tem contraste, se o site funciona sem
JavaScript.

Cada item abaixo foi MEDIDO, e a medição está registrada. Refaça esta lista
quando mexer em formulário, navegação, tabela ou tipografia.

## Estrutura — medido em /orcamento a 360px

```
lang                    pt-BR
h1                      1
hierarquia de título    1,2,2,2,2,2      sem pulo de nível
header                  1
nav[aria-label]         6
main                    1
footer                  1
```

`npm run meta` confere `h1` único nas 44 rotas; a hierarquia e os landmarks são
os do layout, iguais em todas.

## Link "Pular para o conteúdo"

É o **primeiro elemento focável** do documento (`a.skip-link`, `href="#conteudo"`,
50px de altura ao aparecer).

Ele fica fora da tela por `translate: 0 -200%`, e volta com
`&:focus-visible { translate: 0 0 }`. **Não** usa `display: none` nem
`visibility: hidden`, que o tirariam da ordem de tabulação e o deixariam
inalcançável — é o erro clássico deste padrão.

O `html` tem `scroll-padding-top: 5rem` porque o header é fixo: sem isso o
atalho levaria ao conteúdo escondido atrás dele.

## Anel de foco

```css
:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
```

Contraste do anel, verificado por `npm run contrast` contra o mínimo de 3:1 da
WCAG 1.4.11:

```
ok   4.81       3  anel de foco no claro   (--accent / --paper)
ok   6.07       3  anel de foco no escuro  (--accent-bright / --steel-950)
```

Nenhum `outline: none` sem substituto visível. O portão de contraste lê os
tokens do `tokens.css` e recalcula — não é afirmação neste arquivo.

## Alvo de toque — medido em /orcamento a 360px

O `CLAUDE.md` pede "mínimo 44×44px no mobile"; a WCAG 2.5.8 (AA) pede 24×24 com
isenção para link **em linha de texto**. A varredura listou nove elementos com
alguma dimensão abaixo de 44px. Cada um, e por que passa:

| Elemento | Caixa | Por que está certo |
|---|---|---|
| `input#qf-website` | 215×26 | **Honeypot.** `aria-hidden="true"`, `tabindex="-1"`, 1×1px em `left: -9999px`. Não é alvo de ninguém. |
| `input#qf-consent` | 20×20 | Checkbox de LGPD. O `<label for>` associado mede **296×67** e clicar nele alterna o campo — o alvo operável é o rótulo, não a caixinha. |
| `a` "Li a Política de Privacidade" | 178×17 | Link **dentro da frase** do consentimento. Isenção explícita da 2.5.8. |
| `a` "(11) 4344-1919" | 118×18 | Link **dentro da frase** "Prefere falar? (11) 4344-1919". Mesma isenção. O telefone do cabeçalho, que é botão e não frase, tem `min-height: 44px`. |
| `a.touch-inline` "Início" | 35×46 | Breadcrumb. **46px de altura**; a largura é a da palavra. |
| `a.touch-row` "Barras", "Tubos", "Perfis", "Telas" | 35–43 × **44** | Colunas de link do rodapé. **44px de altura garantidos** pela utility `touch-row`; a largura é a do texto, e são links empilhados verticalmente, onde o que evita erro de toque é a altura. |

As utilities `touch-row` e `touch-inline` existem porque, antes delas, os links
do rodapé mediam **17px de altura em todas as páginas**.

## Movimento

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

O `scroll-behavior: smooth` do `html` é desligado junto — rolagem animada é
movimento como qualquer outro.

## Sem JavaScript

O `CLAUDE.md` exige "comportamento sem JS preservado". Verificado no HTML do
build, e não no navegador com script ligado:

- **Formulário de contato** posta nativamente e responde com 303 para
  `/mensagem-enviada` ou `/mensagem-nao-enviada`. O `loadedAt` vai como `0`, e o
  servidor trata 0 como "não medido" em vez de recusar.
- **Calculadora** abre com os campos e o desenho do perfil padrão VISÍVEIS.
  Isto foi um defeito corrigido na Etapa 12: os 12 grupos saíam com `hidden` e o
  script desescondia um, então sem JavaScript a página mostrava o seletor e mais
  nada. Ver `docs/QUALIDADE.md`.
- **Filtro do catálogo** e **tabelas** são markup do servidor; o
  `<table-scroller>` rola sem script, só perde a sombra de borda.
- **Lista de orçamento** precisa de `localStorage`, então sem JavaScript ela não
  existe — e a página mostra o aviso de lista vazia JUNTO do formulário, que é o
  comportamento honesto (as duas regras de CSS dependem de um atributo que só o
  script de boot escreve).

## O que este ambiente NÃO consegue testar

Precisa de teclado e leitor de tela de verdade. Faça manualmente antes do
lançamento:

1. **Tab por toda a página.** A ordem do foco deve seguir a leitura. As teclas
   Tab e Esc não chegam à página pelo ambiente de automação usado aqui; foi
   contornado medindo a ordem do DOM contra a posição visual, e exercitando a
   API do `<dialog>` direto. Isso não substitui a passada real.
2. **Esc fecha o menu mobile e o `<dialog>`**, devolvendo o foco a quem o abriu.
3. **NVDA ou VoiceOver** na tabela de bitolas: confirmar que cada célula é
   anunciada com o cabeçalho da coluna, e que o `<caption>` é lido antes.
4. **Zoom de texto a 200%** sem perda de conteúdo (WCAG 1.4.4). O portão
   responsivo mede viewport, não zoom de fonte.
5. **Leitura do `aria-live`** da lista de orçamento ao mudar quantidade: o
   anúncio não pode roubar o foco do campo que está sendo editado.
