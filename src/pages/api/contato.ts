import type { APIRoute } from 'astro';

import { contactMessageSchema } from '@/lib/schemas';
import { processSubmission } from '@/lib/submission';

/**
 * Recebe a mensagem do formulário de contato.
 *
 * Passa pelo MESMO pipeline do orçamento (src/lib/submission.ts): honeypot,
 * tempo de preenchimento, Turnstile, limite por IP, persistência e a política
 * de nunca perder um lead. A única diferença é o schema — aqui a mensagem é
 * obrigatória e não há lista de material.
 *
 * DUAS RESPOSTAS, uma por caminho:
 *
 * - Com JavaScript, o formulário envia por fetch com `Accept: application/json`
 *   e recebe JSON, para mostrar erro por campo sem recarregar a página.
 * - SEM JavaScript, o navegador faz um POST comum de formulário. Responder JSON
 *   aí deixaria a pessoa olhando um objeto na tela, então o caminho devolve 303
 *   para uma PÁGINA ESTÁTICA de resultado.
 *
 * Por que página estática e não /contato com o resultado na query: /contato é
 * HTML pré-gerado e não tem como ler `?enviado=1` no servidor. Torná-la
 * renderizada sob demanda por causa de um caminho de exceção sairia caro em
 * toda visita normal. Os erros de preenchimento, nesse caminho, já são barrados
 * antes do POST pela validação nativa do HTML (`required`, `type=email`,
 * `minlength`, `pattern`), então o que sobra para a página de falha é envio
 * rápido demais, limite por IP e falha de entrega — casos em que a informação
 * útil não é qual campo errou, e sim o telefone da Aldifer.
 *
 * O 303 (e não 302) é o que troca o método para GET no redirecionamento, então
 * recarregar a página de destino não reenvia a mensagem.
 *
 * O POST de formulário nativo passa pela checagem de origem do Astro
 * (`security.checkOrigin`), que recusa com 403 quando falta o header `Origin`.
 * Navegador sempre o manda; script de fora, não. É proteção contra CSRF e fica.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const aceitaJson = (request.headers.get('accept') ?? '').includes('application/json');
  const resultado = await processSubmission(request, 'contato', contactMessageSchema);

  if (aceitaJson) {
    const { status, ...corpo } = resultado;
    return new Response(JSON.stringify(corpo), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { location: resultado.ok ? '/mensagem-enviada' : '/mensagem-nao-enviada' },
  });
};
