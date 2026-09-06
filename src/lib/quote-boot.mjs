/**
 * Script que decide o estado da lista de orçamento ANTES DA PRIMEIRA PINTURA.
 *
 * POR QUE ELE EXISTE, medido na Etapa 12: a página /orcamento entregava o
 * formulário VISÍVEL e o aviso de lista vazia escondido; ao hidratar, o script
 * do formulário invertia os dois. Colapsar ~1500px de formulário para ~100px
 * de aviso é um deslocamento de layout enorme — o Lighthouse mediu CLS de
 * 0,183 a 0,332 nessa página, contra a meta de 0,100. E variava entre
 * execuções, o que é pior: significa que às vezes o salto acontece na cara de
 * quem já começou a ler.
 *
 * Módulo separado, e como STRING, por dois motivos:
 *
 * 1. Precisa rodar SÍNCRONO no `<head>`, antes de qualquer pintura. Script
 *    empacotado pelo Astro é módulo, e módulo é diferido — chega tarde.
 * 2. A CSP deste site não aceita script inline sem hash, e o Astro só hasheia
 *    o que ele processa. O `astro.config.mjs` importa esta MESMA constante e
 *    calcula o SHA-256 dela em tempo de build. Uma fonte, sem hash digitado à
 *    mão e sem risco de sair de sincronia.
 *
 * Se o script for bloqueado ou falhar, o atributo não é escrito e o CSS mostra
 * os DOIS blocos — que é o comportamento correto sem JavaScript, já que a
 * lista vive no localStorage e sem script ela não existe.
 *
 * Mantenha-o curto e sem dependência: ele bloqueia o parser.
 */

/** A MESMA chave de src/lib/quote.ts. Duplicada aqui de propósito: este
 *  script não pode importar nada, e o teste em quote-boot.test.ts garante
 *  que as duas não divirjam. */
export const QUOTE_STORAGE_KEY = 'aldifer:quote:v1';

export const QUOTE_BOOT = `(function(){try{
var r=localStorage.getItem('${QUOTE_STORAGE_KEY}');
var n=0;
if(r){var d=JSON.parse(r);if(d&&Array.isArray(d.items))n=d.items.length}
document.documentElement.dataset.quote=n>0?'ativo':'vazio'
}catch(e){}})()`;
