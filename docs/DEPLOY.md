# Deploy — do repositório local ao domínio

Ordem importa. Cada passo depende do anterior, e o **domínio é o último**: uma vez
apontado, o site antigo sai do ar para o mundo, e o que estiver errado fica
errado em produção.

Para o que fazer **depois** do domínio apontado, veja
[`POS-DEPLOY.md`](./POS-DEPLOY.md). Para marcar item por item antes de apontar,
[`CHECKLIST-LANCAMENTO.md`](./CHECKLIST-LANCAMENTO.md).

## O que eu NÃO fiz, e por quê

Sejamos explícitos, porque isto é entrega:

- **O deploy não foi feito.** Ele exige uma conta na Vercel e uma conta no
  GitHub, que são da Aldifer ou de quem administra o projeto. Nenhuma credencial
  desse tipo passou por aqui, e não deve passar.
- **O repositório não tem remote.** Ele é local (`git remote -v` não devolve
  nada). Sem repositório remoto não há deploy contínuo na Vercel e o painel do
  Keystatic não sai do modo local.
- **O DNS não foi alterado.** Só foi CONSULTADO, e o que a consulta achou está
  registrado abaixo — inclusive um problema que precisa de decisão antes de
  apontar o domínio.

O resto — build, cabeçalhos, redirects, variáveis, portões de qualidade — está
pronto e verificado. Ver [`QUALIDADE.md`](./QUALIDADE.md).

## Passo 1 — Repositório no GitHub

```bash
git remote add origin git@github.com:<usuario>/<repositorio>.git
git push -u origin main
```

**Repositório privado.** Não há segredo versionado (o `.env` está no
`.gitignore`), mas há endereço, telefone e a estrutura de preço-por-pedido do
negócio.

O repositório não é só código: com o Keystatic em modo GitHub, **cada Save no
painel vira um commit aqui**. É o histórico de quem mudou o quê no conteúdo do
site.

## Passo 2 — Projeto na Vercel

1. **Add New → Project → Import** do repositório.
2. Framework: a Vercel detecta Astro sozinha. **Não** mude build command nem
   output directory — o adapter `@astrojs/vercel` cuida disso.
3. Node: **22.12 ou maior** (exigência do Astro 7). O `package.json` já declara
   `"engines": { "node": ">=22.12.0" }`, que é de onde a Vercel tira a versão —
   confirme em Settings → General que ela respeitou.
4. Cadastre as variáveis de ambiente (passo 3) **antes** do primeiro deploy que
   você for testar de verdade. Variável de build — as `PUBLIC_` e as do
   Plausible — só entra no bundle no build seguinte.

O `vercel.json` do repositório traz os cabeçalhos de segurança e os 117
redirects 301 da migração. A Vercel os aplica sozinha; nada a configurar no
painel.

## Passo 3 — Variáveis de ambiente

**No painel da Vercel, nunca no repositório.** A lista completa, com o que cada
uma faz e o passo a passo de onde tirar o valor, está em
[`.env.example`](../.env.example) — ele é versionado justamente para isso.

O que é **obrigatório para o site funcionar**:

| Variável | Sem ela | Onde conseguir |
|---|---|---|
| `RESEND_API_KEY` | O formulário aceita o pedido, persiste o lead e **avisa que o e-mail não saiu**. Não perde o pedido, mas ninguém é notificado. | resend.com/api-keys |
| `QUOTE_MAIL_FROM` | Idem. Precisa ser de domínio verificado no Resend. | Você define; ver passo 6 |
| `QUOTE_MAIL_TO` | Idem. **Depende da pergunta 10 à Aldifer.** | A Aldifer |
| `PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | O formulário funciona, mas sem o portão anti-robô. Restam o honeypot e o limite por IP. | dash.cloudflare.com → Turnstile |
| `LEAD_STORE_DRIVER` | Fica em `json`, que **não persiste em serverless** — o disco da Vercel é efêmero. O código detecta, recusa a gravação e carimba o aviso no assunto do e-mail. **Depende da pergunta 10.** | A Aldifer |

O que é **obrigatório para o painel de edição**:

`PUBLIC_KEYSTATIC_GITHUB_REPO`, `KEYSTATIC_GITHUB_CLIENT_ID`,
`KEYSTATIC_GITHUB_CLIENT_SECRET` e `KEYSTATIC_SECRET`. Sem as quatro, o painel
roda em modo local e **não salva nada em produção**. O próprio Keystatic conduz
a criação do GitHub App e devolve os valores; o passo a passo está no
`.env.example`.

O que é **opcional mas mede o sucesso do projeto**:

`PUBLIC_PLAUSIBLE_DOMAIN`. Sem ela nenhum script de analytics carrega e o host
nem entra na CSP. O `CLAUDE.md` define o sucesso do site como "pedidos de
orçamento estruturados recebidos" — sem analytics, o lançamento vai às cegas.
**Atenção:** ela é lida no `astro.config.mjs` em tempo de build, então ligá-la
exige um redeploy, não só salvar a variável.

## Passo 4 — Verificar na URL de preview, antes do domínio

A Vercel dá uma URL `*.vercel.app` a cada deploy. Rode os portões contra ela:

```bash
BASE=https://<preview>.vercel.app npm run testar-redirects
BASE=https://<preview>.vercel.app npm run axe
```

E confira à mão, que é o que automação não cobre:

- **A CSP não bloqueia nada.** Abra o console em `/`, `/orcamento`,
  `/calculadora-de-peso` e `/keystatic`. A política é um `<meta>` gerado no
  build, e `npm run dev` não a emite — este é o primeiro lugar onde ela roda
  fora do `npm run servir`.
- **O formulário envia de verdade** e o e-mail chega. Ver passo 6 antes.
- **O painel salva.** Abra `/keystatic`, mude o aviso do topo, salve, e confirme
  que apareceu um commit no GitHub.
- **Cabeçalhos:** `curl -sI https://<preview>.vercel.app` e confira os nove.
  Localmente eles já são servidos pelo `npm run servir`, que lê o
  `vercel.json` — então o que muda aqui é só a Vercel aplicando a mesma
  configuração.
- ⚠️ **A CSP do painel convive com a da configuração?** Este é o único ponto
  que não dá para verificar fora da Vercel:

  ```bash
  curl -sI https://<preview>.vercel.app/keystatic | grep -ci content-security-policy
  ```

  **Esperado: 2.** Uma linha é a política do painel, montada pelo
  `src/middleware.ts`; a outra é o `frame-ancestors 'none'` do `vercel.json`.
  Duas linhas significam que as duas valem, que é o comportamento seguro.

  **Se vier 1**, a Vercel substituiu em vez de somar, e alguma coisa se perdeu:
  ou o relaxamento de estilo de que o `@keystar/ui` precisa — e aí o painel abre
  desmontado — ou a proteção contra clickjacking. Confira qual sobrou e ajuste:
  se sobrou a da configuração, remova o `Content-Security-Policy` do
  `vercel.json` e passe o `frame-ancestors 'none'` para dentro da política que o
  middleware monta.

## Passo 5 — Domínio e DNS

### A decisão: `www` é o canônico

Medido, não escolhido por gosto. O site antigo responde 200 no apex e no `www`,
sem redirect entre eles e sem `<link rel="canonical">`. Na falta de canonical, o
sinal mais forte é o link interno — e **todo link e todo asset do HTML antigo é
URL absoluta com `www`**:

```
href="https://www.aldifer.com.br/barra-chata.php"
href="https://www.aldifer.com.br/css/main.css"
```

Então `www` é o host indexado, e é nele que o histórico dos 117 redirects vale.
`astro.config.mjs` já está com `site: 'https://www.aldifer.com.br'`, e o sitemap,
os canonicals e o JSON-LD saem daí.

### Como está hoje

```
aldifer.com.br          A     187.45.240.114        (hospedagem Locaweb)
www.aldifer.com.br      CNAME aldifer.com.br
mail.aldifer.com.br     CNAME mail.ita.locamail.com.br
pop.aldifer.com.br      CNAME mail.ita.locamail.com.br
webmail.aldifer.com.br  CNAME webmail.ita.locamail.com.br
MX                      mx.a / mx.b / mx.jk .locaweb.com.br
TXT                     v=spf1 include:_spf.locaweb.com.br ?all
_dmarc                  v=DMARC1; p=none;
```

Repare que hoje o `www` é CNAME do apex — o **inverso** do que passa a valer.

### O que muda

1. **Baixe o TTL** dos registros de `aldifer.com.br` e `www` para 300s
   **algumas horas antes** da virada. Sem isso, um erro fica no cache dos
   resolvedores pelo TTL antigo.
2. Na Vercel: Settings → Domains → adicione **os dois**,
   `www.aldifer.com.br` e `aldifer.com.br`. Marque `www` como o principal
   (*Primary*) e deixe a Vercel redirecionar o apex para ele — ela emite 308,
   que preserva o método e é tratado como permanente.
3. No DNS da Locaweb, troque **apenas** os registros do site:
   - `www` → CNAME para o alvo que a Vercel indicar (`cname.vercel-dns.com` ou o
     que o painel mostrar naquele momento).
   - apex → o A que a Vercel indicar (o apex não aceita CNAME; a Vercel dá um IP
     ou instrui ALIAS/ANAME, se a Locaweb suportar).
4. **NÃO TOQUE** nos registros `MX`, no `TXT` de SPF, nem nos CNAMEs `mail`,
   `pop` e `webmail`. Eles são o e-mail da empresa, e são de outro serviço.
   Trocar o A do apex não afeta o e-mail — MX é independente.
5. HTTPS: a Vercel emite e renova o certificado sozinha, para os dois hosts,
   depois que o DNS propaga. Não há nada a fazer.
6. Depois de propagar, confirme:

```bash
curl -sI http://aldifer.com.br      | head -3   # espera 30x para https
curl -sI https://aldifer.com.br     | head -3   # espera 30x para www
curl -sI https://www.aldifer.com.br | head -3   # espera 200
```

### HSTS: por que sem `includeSubDomains`

O cabeçalho é `max-age=63072000`, sem `includeSubDomains` e sem `preload`, e
isso foi **medido**:

```
$ curl https://webmail.aldifer.com.br
curl: (60) SNI or certificate check failed: SEC_E_WRONG_PRINCIPAL
$ openssl s_client -servername webmail.aldifer.com.br ...
subject=CN=*.webmail-seguro.com.br
```

O certificado servido em `webmail.aldifer.com.br` é de `*.webmail-seguro.com.br`
— nome errado para aquele host. **Hoje** o navegador mostra um aviso que a pessoa
ignora e segue. **Com `includeSubDomains` no apex, o aviso fica inignorável:** o
Chrome não oferece "prosseguir" em host sob HSTS, e a equipe da Aldifer perderia
o webmail pelo endereço que decorou. `preload` seria pior: sair da lista leva
meses.

Para ligar depois — e vale a pena: peça à Locaweb um certificado válido para
`webmail.aldifer.com.br` (ou mova a equipe para o endereço próprio da Locaweb),
confirme que **todo** subdomínio responde https válido, e então acrescente a
diretiva no `vercel.json`. `preload` só depois disso. Detalhes em
[`CABECALHOS.md`](./CABECALHOS.md).

## Passo 6 — Resend: SPF, DKIM e DMARC

Sem isto o e-mail de orçamento cai em spam e **a Aldifer perde lead sem saber** —
que é o pior modo de falha possível neste site, porque é silencioso.

1. Em resend.com → **Domains → Add Domain**, use `aldifer.com.br`.
2. O Resend mostra os registros a criar. Eles ficam em **nomes próprios**, e é
   isso que torna a operação segura:
   - **DKIM** num TXT sob `resend._domainkey.aldifer.com.br`. É a assinatura
     criptográfica, e é o que dá alinhamento de DMARC.
   - **SPF** num TXT sob um subdomínio de envio (o Resend usa
     `send.aldifer.com.br`), porque o SPF é verificado no domínio do
     *return-path*, não no do `From:`.
   - Possivelmente um **MX** no mesmo subdomínio de envio, para retorno de
     bounce.
3. ⛔ **UM DOMÍNIO SÓ PODE TER UM REGISTRO SPF.** O apex já tem
   `v=spf1 include:_spf.locaweb.com.br ?all`. Se alguém criar um **segundo**
   `v=spf1` no apex, os dois passam a falhar e o e-mail da empresa inteira
   sofre. Como o Resend pede o SPF no subdomínio de envio, **o SPF do apex não
   deve ser tocado**. Se em algum momento for preciso mesmo somar no apex, é
   editando o registro existente para incluir os dois `include:`, nunca
   adicionando outro.
4. Ponha em `QUOTE_MAIL_FROM` um endereço do domínio verificado, por exemplo
   `Site Aldifer <site@aldifer.com.br>`. **A caixa não precisa existir:** o
   código manda `replyTo` com o e-mail de quem preencheu o formulário, então
   responder no cliente de e-mail vai direto ao cliente da Aldifer.
5. **DMARC.** O domínio já tem `v=DMARC1; p=none;` — política de monitoramento.
   Deixe em `p=none` até confirmar que o e-mail do site chega assinado e
   alinhado; depois vale subir para `p=quarantine`. Acrescentar um `rua=` com um
   endereço de relatório é o que transforma o DMARC em informação em vez de
   enfeite.
6. Registre também, para a Aldifer decidir com o provedor de e-mail dela: o SPF
   atual termina em **`?all`**, que é "neutro" — não pede rejeição de remetente
   não autorizado. Não é assunto deste site e **não foi alterado**, mas enfraquece
   a proteção do domínio contra falsificação.
7. Teste de verdade: envie um pedido pelo formulário e confira no e-mail
   recebido que SPF, DKIM e DMARC aparecem como `pass`. No Gmail: abrir a
   mensagem → menu → "Mostrar original".

## Passo 7 — Search Console

O apex já tem um `google-site-verification` no DNS, então provavelmente existe
uma propriedade. Confirme, e prefira a propriedade de **domínio** (`Domain`), que
cobre apex, `www` e qualquer subdomínio de uma vez.

O envio do sitemap, a inspeção das URLs que mais importam e o que esperar nos
primeiros trinta dias estão em [`POS-DEPLOY.md`](./POS-DEPLOY.md), que é a
sequência do dia do deploy.

## Passo 8 — Transferência de acessos

Cinco contas. Em todas, **a Aldifer precisa ser dona, não convidada** — conta de
serviço no nome de um prestador é a forma mais comum de uma empresa perder o
próprio site.

| Serviço | O que transferir | Como |
|---|---|---|
| **GitHub** | Propriedade do repositório | Transferir para uma organização da Aldifer, ou para a conta pessoal do responsável. Settings → Danger Zone → Transfer. Quem administra o site entra como colaborador. |
| **Vercel** | Propriedade do projeto | Ideal: criar o projeto já num Team da Aldifer. Se nasceu numa conta pessoal, use Settings → Transfer. **A transferência não leva as variáveis de ambiente** — recadastre e refaça o deploy. |
| **Resend** | Conta e domínio verificado | Conta no e-mail da Aldifer. A chave de API é revogável e deve ser rotacionada se passar por terceiros. |
| **Plausible** | Propriedade do site | Conta no e-mail da Aldifer, com o site `aldifer.com.br` cadastrado. |
| **Search Console** | Permissão de proprietário | Adicionar o e-mail da Aldifer como **Proprietário** (não "Usuário completo"), pela propriedade de domínio. |

Anote também, num lugar que a Aldifer controle: onde está o DNS (Locaweb, hoje),
quem tem acesso ao painel de DNS, e onde vive o e-mail (Locaweb). Um site sem o
acesso ao DNS é um site que não se pode mudar de lugar.

## Ordem recomendada no dia

1. Baixar o TTL do DNS (algumas horas antes).
2. Deploy na Vercel com todas as variáveis, e verificar na URL de preview.
3. Configurar o Resend e **testar um envio real** pela preview.
4. Percorrer o [`CHECKLIST-LANCAMENTO.md`](./CHECKLIST-LANCAMENTO.md).
5. Apontar o DNS.
6. Seguir o [`POS-DEPLOY.md`](./POS-DEPLOY.md) — redirects em produção, sitemap,
   Rich Results Test, analytics.
7. Subir o TTL de volta.
