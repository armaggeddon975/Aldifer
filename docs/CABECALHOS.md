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
| `Strict-Transport-Security` | `max-age=63072000` | Que a **primeira** visita saia em http e seja interceptada. Dois anos, **sem `includeSubDomains` e sem `preload`** — ver a seção abaixo, que não é escolha estética. |
| `X-Content-Type-Options` | `nosniff` | Que o navegador adivinhe o tipo de um arquivo e execute como script algo servido como texto |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Que a URL completa vaze para terceiro. Ao clicar num link externo, o Google recebe `https://www.aldifer.com.br`, sem o caminho. Preserva o referenciador interno, que o analytics usa |
| `Permissions-Policy` | tudo `()` exceto `fullscreen=(self)` | Que um script de terceiro comprometido peça câmera, microfone ou localização. `()` é lista vazia: nem o próprio site pode. `fullscreen=(self)` fica porque o mapa em tela cheia é uso legítimo |
| `Cross-Origin-Opener-Policy` | `same-origin` | Que uma janela aberta pelo site mantenha referência à nossa, vetor de *tabnabbing* |
| `X-Permitted-Cross-Domain-Policies` | `none` | Que um `crossdomain.xml` autorize cliente Flash/PDF a ler dados do domínio. Legado, mas custa um cabeçalho |

## Como verificar, sem depender de produção

Desde a Etapa 13 o `npm run servir` **lê os cabeçalhos deste `vercel.json` e os
aplica**, em vez de reproduzir só o `Cache-Control` à mão. Antes disso os nove
cabeçalhos de segurança nunca tinham sido servidos localmente: eles existiam
numa configuração que ninguém havia visto responder, e um erro de digitação só
apareceria em produção.

```
$ curl -sI http://localhost:4330/
strict-transport-security: max-age=63072000
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: accelerometer=(), autoplay=(), camera=(), ...
x-frame-options: DENY
content-security-policy: frame-ancestors 'none'
cross-origin-opener-policy: same-origin
x-permitted-cross-domain-policies: none

$ curl -sI http://localhost:4330/fonts/archivo-latin-expanded-normal.woff2
cache-control: public, max-age=31536000, immutable

$ curl -sI http://localhost:4330/api/orcamento
cache-control: no-store
x-robots-tag: noindex, nofollow
```

### Duas linhas de CSP no painel, e por que está certo

```
$ curl -sI http://localhost:4330/keystatic | grep -c content-security-policy
2
content-security-policy: default-src 'none'; img-src 'self' data: https://avatars...
content-security-policy: frame-ancestors 'none'
```

A regra global do `vercel.json` manda `frame-ancestors 'none'`, e o
`src/middleware.ts` manda a política do painel. **Duas linhas de CSP significam
que as DUAS valem** — o navegador aplica a interseção — e é o resultado que se
quer: o painel mantém o relaxamento de estilo de que o `@keystar/ui` precisa, e
o site inteiro mantém a proteção contra clickjacking.

⚠️ **Isto precisa ser reconferido na Vercel.** Se ela SUBSTITUIR o cabeçalho da
função pelo da configuração, em vez de somar, uma das duas políticas se perde —
e as duas consequências são ruins: ou o painel quebra, ou o `frame-ancestors`
desaparece. O teste está no passo 4 do [`DEPLOY.md`](./DEPLOY.md).

## Por que o HSTS NÃO tem `includeSubDomains` nem `preload`

Decidido na Etapa 13, **com medição do DNS real da Aldifer**, e não por
preferência.

A versão anterior deste cabeçalho trazia `includeSubDomains; preload`, que são
os requisitos da lista de *preload* do Chrome. O comentário aqui dizia
"confirmar na Etapa 13", e a confirmação reprovou:

```
mail.aldifer.com.br      CNAME -> mail.ita.locamail.com.br
pop.aldifer.com.br       CNAME -> mail.ita.locamail.com.br
webmail.aldifer.com.br   CNAME -> webmail.ita.locamail.com.br

$ curl https://webmail.aldifer.com.br
curl: (60) SNI or certificate check failed: SEC_E_WRONG_PRINCIPAL

$ openssl s_client -servername webmail.aldifer.com.br ...
subject=CN=*.webmail-seguro.com.br
X509v3 Subject Alternative Name: DNS:*.webmail-seguro.com.br, DNS:webmail-seguro.com.br
```

O e-mail da Aldifer é da **Locaweb**, e o certificado servido em
`webmail.aldifer.com.br` é de `*.webmail-seguro.com.br` — nome errado para
aquele host. **Hoje** o navegador mostra um aviso que a pessoa pode ignorar e
seguir. **Com `includeSubDomains` no apex, esse aviso passa a ser inignorável:**
o Chrome não oferece o botão "prosseguir" em host sob HSTS. A equipe da Aldifer
perderia o webmail pelo endereço que ela decorou.

E `preload` é praticamente irreversível: a remoção da lista leva meses e só
chega ao usuário na atualização do navegador.

Então o HSTS fica no host exato, que é onde ele protege o site — e é o site que
este repositório controla.

**Para ligar `includeSubDomains` depois**, e vale a pena, a ordem é: pedir à
Locaweb um certificado válido para `webmail.aldifer.com.br` (ou mover a equipe
para o endereço próprio da Locaweb), conferir que **todo** subdomínio responde
https válido, e só então acrescentar a diretiva. `preload` depois disso, e não
antes.

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
