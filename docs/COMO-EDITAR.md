# Como editar o site da Aldifer

Este guia é para quem vai mexer no site sem ser programador. Não precisa saber
nada de programação, nem instalar nada. Só um navegador.

---

## O que você consegue mudar sozinho

| Você mexe | Onde aparece |
|---|---|
| Telefone, e-mail, endereço, redes sociais | Rodapé, página Contato, botão de rota |
| Horário de funcionamento | Página Contato e rodapé |
| Número do WhatsApp | Botões de WhatsApp em todo o site |
| Aviso no topo (recesso, feriado) | Faixa no topo de todas as páginas |
| Nome e texto de um produto | Página do produto e cards do catálogo |
| Se um produto aparece ou não no site | Catálogo, busca, menu |
| Textos das seis categorias | Cards e páginas de categoria |

## O que você **não** consegue, e por quê

**A tabela de bitolas** (aquela lista de medidas com o peso por metro) não
aparece no painel. Não é esquecimento: o peso de cada linha é **calculado**
pelo site a partir das medidas, e as colunas mudam de produto para produto —
uma barra chata tem largura e espessura, um tubo tem diâmetro e parede. Se
alguém digitasse uma medida no lugar errado, a coluna de peso sairia errada e
ninguém notaria.

Então a tabela é montada a partir da planilha que vocês mandarem. Para
atualizar bitola, mandem a planilha.

---

## Primeiro acesso

1. Abra **aldifer.com.br/admin**
2. O navegador te leva para a tela do painel
3. Clique em **entrar com GitHub** e use a conta que foi criada para você
4. Autorize o acesso na primeira vez

> **Se pedir senha e você não tiver:** fale com quem cuida do site. O acesso é
> por conta do GitHub, e ela precisa ser liberada uma vez.

Depois de entrar, você vê um menu à esquerda com quatro coisas:

```
O SITE
  Dados da empresa      ← telefone, endereço, horário, WhatsApp
  Aviso no topo do site  ← faixa de recesso ou feriado

CATÁLOGO
  Produtos              ← os 27 produtos
  Categorias            ← as 6 categorias
```

---

## Trocar um texto — o passo a passo

Vamos trocar a descrição de um produto, que é o caso mais comum.

1. No menu da esquerda, clique em **Produtos**
2. Aparece a lista. Clique no nome do produto, por exemplo **Barra Chata**
3. Role até o campo que quer mudar. **Cada campo tem uma explicação embaixo do
   título dizendo onde ele aparece no site** — leia antes de mudar
4. Apague o texto antigo e escreva o novo
5. No alto da tela, o botão **Save** fica azul e aparece a palavra **Unsaved**
6. Clique em **Save**

Pronto. A mudança já está registrada. Em dois ou três minutos o site publica a
versão nova sozinho.

> **Não achou o botão Save?** Ele fica no canto superior direito. Se estiver
> apagado, é porque nada mudou ainda.

### O que acontece depois que você clica em Save

Cada Save cria um registro com seu nome, a data e exatamente o que mudou. Isso
significa três coisas boas:

- **Nada se perde.** Dá para ver quem mudou o quê e quando.
- **Dá para voltar atrás.** Se você apagar algo por engano, quem cuida do site
  recupera o texto antigo.
- **Você não quebra o site.** Se um campo obrigatório ficar vazio ou fora do
  tamanho, o site simplesmente **não publica** a versão errada e continua no ar
  com a anterior. Você recebe um aviso.

---

## Publicar um produto que está escondido

Hoje **os 27 produtos estão escondidos**, porque as tabelas de bitola são
medidas comerciais genéricas, e não o estoque de verdade da Aldifer. Um cliente
que visse uma medida que vocês não têm ligaria pedindo o que não existe.

Para pôr um produto no ar:

1. **Produtos** → clique no produto
2. Role até o campo **Situação**
3. Troque de **Rascunho — não aparece no site** para **Publicado — no ar**
4. **Save**

> **Confira a tabela de bitolas antes.** Ela está na página do produto, no
> site. Publicar um produto com medida que vocês não têm gera pedido que não dá
> para atender.

Enquanto está em **Rascunho**, o produto não aparece em lugar nenhum: nem no
catálogo, nem na busca, nem no Google.

---

## Publicar um aviso de recesso ou feriado

Isso aparece numa faixa escura no topo de **todas** as páginas.

1. No menu, clique em **Aviso no topo do site**
2. Escreva a **Mensagem**. Uma ou duas frases:
   > Recesso de fim de ano: fechados de 24/12 a 02/01. Pedidos feitos pelo site
   > são respondidos a partir do dia 05/01.
3. **Preencha "Some sozinho depois de"** com a data em que o aviso deixa de
   valer
4. Marque **Mostrar o aviso agora**
5. **Save**

### O campo mais importante desta tela

**"Some sozinho depois de".** Depois dessa data o aviso desaparece do site sem
ninguém precisar voltar aqui.

Sem data, ele fica no ar até alguém desmarcar. Um aviso de recesso de Natal
ainda visível em março passa a impressão de site abandonado — e é o erro mais
comum com faixa de aviso.

### Para tirar o aviso antes da data

**Aviso no topo do site** → desmarque **Mostrar o aviso agora** → **Save**.

O texto fica guardado. No ano que vem você só marca de novo e troca a data.

---

## Trocar telefone, endereço ou horário

1. No menu, clique em **Dados da empresa**
2. Mude o que precisa
3. **Save**

### Cuidado com os dois campos de telefone

São dois de propósito:

| Campo | O que escrever | Para que serve |
|---|---|---|
| **Telefone (como se escreve)** | `(11) 4344-1919` | É o que a pessoa **lê** na tela |
| **Telefone (para discar)** | `+551143441919` | É o que o celular **disca** ao tocar no número |

**Os dois precisam ser o mesmo número.** Se você mudar um e esquecer o outro, o
cliente vê um número e o celular liga para outro.

O segundo é sem espaço, sem parêntese e sem traço, começando com `+55`.

### O horário é uma linha por faixa

Clique em **Add** para cada linha:

```
Segunda a sexta, 8h às 18h
Sábado, 8h às 12h
```

Enquanto estiver vazio, **o site não mostra horário nenhum** — em vez de
mostrar um horário errado. É a informação que mais falta numa página de
contato, porque sem ela o cliente não sabe se vale sair de casa.

### O campo "corte sob medida"

Deixe em **"Ainda não confirmado"** até ter certeza.

Responder **Não** quando na verdade a Aldifer faz custa venda. Responder **Sim**
quando não faz gera cliente irritado no balcão. Enquanto estiver em "ainda não
confirmado", o site não fala do assunto.

---

## Adicionar um produto novo

Isto é mais trabalhoso, porque produto novo precisa da tabela de bitolas — e a
tabela não se edita pelo painel.

**O caminho certo:** mande para quem cuida do site o nome do produto e a
planilha com as medidas. A tabela é montada e conferida, e depois você publica
pelo painel.

Se quiser criar a página desde já, sem tabela:

1. **Produtos** → botão **Add** no alto
2. Preencha **Nome do produto**. O **Endereço da página** é sugerido sozinho
3. Escolha **Categoria** e **Desenho da seção transversal**
4. Preencha os textos e deixe **Situação** em **Rascunho**
5. **Save**

> **Nunca mude o "Endereço da página" de um produto que já está no ar.** O
> endereço antigo passa a dar erro, e o Google leva semanas para achar o novo.

---

## Subir foto

O painel **não** tem campo de foto hoje, de propósito: foto no site precisa ser
otimizada, redimensionada e receber uma descrição para leitor de tela — coisas
que se fazem uma vez, no código, e não a cada envio.

**Para trocar as fotos do galpão:** mande os arquivos originais, do tamanho que
saíram da câmera, para quem cuida do site.

As quatro fotos que estão no ar hoje são de 2016, tiradas de celular. **Uma
sessão de fotos nova é a coisa que mais melhoraria a página A Empresa** — aço
bem fotografado é metade da credibilidade.

---

## Perguntas que aparecem sempre

**Estraguei um texto. Como volto?**
Fale com quem cuida do site. Cada Save fica registrado, e o texto anterior é
recuperado em minutos.

**Cliquei em Save e o site não mudou.**
Espere dois ou três minutos e recarregue com **Ctrl+F5**. Se depois de cinco
minutos continuar igual, avise.

**Apareceu uma mensagem de erro vermelha no campo.**
Ela diz o que está faltando — geralmente um campo obrigatório vazio ou texto
maior que o permitido. Os campos de Google têm limite porque o Google corta o
que passa.

**Posso mexer em dois produtos ao mesmo tempo?**
Sim, mas salve um antes de abrir o outro. Sair da página sem salvar perde o que
você escreveu.

**Alguém do escritório e eu editando juntos, dá problema?**
Não, se forem coisas diferentes. Se as duas pessoas mudarem **o mesmo campo do
mesmo produto** ao mesmo tempo, a segunda recebe um aviso de conflito.

**O que é aquele texto embaixo de cada campo?**
A explicação de para que ele serve e onde aparece no site. Foi escrita para ser
lida — em caso de dúvida, é a resposta.

---

## Resumo de uma página

| Quero… | Vá em | Depois |
|---|---|---|
| Trocar texto de produto | Produtos → o produto | Edite → **Save** |
| Pôr produto no ar | Produtos → o produto → **Situação** | Publicado → **Save** |
| Tirar produto do ar | Produtos → o produto → **Situação** | Rascunho → **Save** |
| Avisar de recesso | Aviso no topo do site | Mensagem + data + marcar → **Save** |
| Tirar o aviso | Aviso no topo do site | Desmarcar → **Save** |
| Trocar telefone | Dados da empresa | **Os dois campos** → **Save** |
| Pôr horário | Dados da empresa → Horário | **Add** por linha → **Save** |
| Mudar bitola | — | Mande a planilha |
| Trocar foto | — | Mande os arquivos |
