# Cabeçalhos de segurança — por que cada um está lá

Registro das decisões do `vercel.json`, para ninguém remover um cabeçalho por
achar que "não faz nada" e descobrir depois o que ele impedia.

## A CSP está em DOIS lugares, e isso é deliberado

| Onde | O que carrega | Por quê |
|---|---|---|
| `<meta http-equiv>` em cada página, gerado pelo Astro | `default-src`, `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `frame-src`, `form-action`, `base-uri`, `object-src` | Só o Astro conhece o **hash** dos scripts que ele embute inline |
| Cabeçalho HTTP no `vercel.json` | apenas `frame-ancestors 'none'` | `<meta>` **ignora** `frame-ancestors` |

O Astro embute em cada página os scripts pequenos — o menu mobile tem 372 B, o
carregador do mapa 494 B, a busca rápida 3,7 KB. Uma CSP escrita à mão no
`vercel.json` só os aceitaria de duas formas:

- com `unsafe-inline`, que desliga justamente a proteção que a CSP dá;
- com hashes digitados, que mudam a cada build e passariam a **bloquear o
  próprio site** na primeira alteração de código.

O Astro calcula os hashes no build. Fica sempre em sincronia.

Quando duas políticas de CSP são entregues, **cada uma é aplicada
independentemente** e vale a interseção. A do cabeçalho declara só
`frame-ancestors`, então ela não restringe script, estilo nem imagem — não há
conflito com a do `<meta>`.

`frame-ancestors 'none'` e `X-Frame-Options: DENY` dizem a mesma coisa para
gerações diferentes de navegador. O segundo é ignorado por quem entende o
primeiro.

## Os demais

| Cabeçalho | Valor | O que evita |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Que a **primeira** visita saia em http e seja interceptada. Dois anos e `includeSubDomains`, que são os requisitos da lista `preload` do Chrome. **Cuidado:** com `includeSubDomains`, todo subdomínio passa a exigir https válido — se a Aldifer tiver algo em `algo.aldifer.com.br` sem certificado, quebra. Confirmar na Etapa 13. |
| `X-Content-Type-Options` | `nosniff` | Que o navegador adivinhe o tipo de um arquivo e execute como script algo servido como texto |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Que a URL completa vaze para terceiro. Ao clicar num link externo, o Google recebe `https://www.aldifer.com.br`, sem o caminho. Preserva o referenciador interno, que o analytics usa |
| `Permissions-Policy` | tudo `()` exceto `fullscreen=(self)` | Que um script de terceiro comprometido peça câmera, microfone ou localização. `()` é lista vazia: nem o próprio site pode. `fullscreen=(self)` fica porque o mapa em tela cheia é uso legítimo |
| `Cross-Origin-Opener-Policy` | `same-origin` | Que uma janela aberta pelo site mantenha referência à nossa, vetor de *tabnabbing* |
| `X-Permitted-Cross-Domain-Policies` | `none` | Que um `crossdomain.xml` autorize cliente Flash/PDF a ler dados do domínio. Legado, mas custa um cabeçalho |

## Cache

`/_astro/` e `/fonts/` recebem `immutable` com um ano: os dois têm hash no nome
do arquivo, então uma mudança de conteúdo muda a URL. Cache eterno em arquivo
sem hash serviria conteúdo velho por um ano.

`/api/` recebe `no-store`. É resposta de formulário, não há nada a cachear, e
uma resposta de pedido guardada em cache intermediário seria vazamento de dado
pessoal.

## O que NÃO está aqui

- **`Cross-Origin-Embedder-Policy`** — exigiria CORP em todo recurso de
  terceiro, e o iframe do Google Maps não o manda. Ligá-lo quebraria o mapa em
  troca de proteção contra um ataque (Spectre) que não se aplica a um site sem
  dado sensível no cliente.
- **`report-uri` / `report-to`** — precisa de endpoint coletor. Vale a pena
  ligar por alguns dias depois do lançamento, para achar violação de CSP que
  não apareceu nos testes. Decidir na Etapa 13.
