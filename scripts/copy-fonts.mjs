// Prepara as fontes em public/fonts/.
//
//   npm run fonts
//
// Motivo do caminho estável e sem hash: é o exigido pelo <link rel="preload">
// da fonte do LCP.
//
// Só o subset `latin` — cobre todos os acentos do português (U+00C0–U+00FF).
//
// A ARCHIVO NÃO É COPIADA, É GERADA. Ver a nota em ARCHIVO, abaixo, e o
// cabeçalho de scripts/instanciar-archivo.py. O arquivo gerado é VERSIONADO,
// então este script só precisa rodar ao trocar de versão da fonte — quem clona
// e roda `npm install && npm run build` não precisa de Python.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = new URL('../public/fonts/', import.meta.url);

/** Copiadas como vêm: só têm o eixo de peso, que é o que o site usa. */
const COPIAR = [
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
];

/**
 * ARCHIVO: gerada, e não copiada.
 *
 * "Archivo Expanded" do design system não é uma família separada — é o eixo
 * `wdth` em 125%. Pedir 125% por CSS obriga o arquivo a carregar o eixo inteiro
 * (62% a 125%), e isso custa 90.104 B contra 34.648 B do mesmo desenho com o
 * eixo já aplicado.
 *
 * Como a Archivo é a fonte do H1 — o elemento de LCP — e por isso a única com
 * `preload`, esses 55 KB ficam no caminho crítico. Medido em /orcamento com 9
 * execuções do Lighthouse: 7 de 9 acima da meta de LCP com o eixo, 0 de 9 sem.
 *
 * Instanciar dá as duas coisas: o desenho expandido idêntico e o arquivo menor.
 */
const ARCHIVO_ORIGEM = '@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2';
const ARCHIVO_DESTINO = 'archivo-latin-expanded-normal.woff2';

await mkdir(OUT, { recursive: true });

for (const spec of COPIAR) {
  const from = new URL(`../node_modules/${spec}`, import.meta.url);
  const name = spec.split('/').pop();
  await copyFile(from, new URL(name, OUT));
  console.log(`fonte copiada:  ${name} (${statSync(fileURLToPath(from)).size} B)`);
}

const origem = fileURLToPath(new URL(`../node_modules/${ARCHIVO_ORIGEM}`, import.meta.url));
const destino = fileURLToPath(new URL(ARCHIVO_DESTINO, OUT));
const script = fileURLToPath(new URL('instanciar-archivo.py', import.meta.url));

if (!existsSync(origem)) {
  throw new Error(`fonte de origem não encontrada: ${origem}. Rode "npm install".`);
}

try {
  const saida = execFileSync('python', [script, origem, destino], { encoding: 'utf8' });
  console.log(`fonte gerada:   ${saida.trim()}`);
} catch (erro) {
  // ERRO ALTO, e não silencioso: se a geração falhar e o arquivo antigo
  // continuar em public/fonts/, o site segue funcionando com a fonte de 90 KB
  // e ninguém percebe que a otimização saiu.
  console.error(
    [
      '',
      'FALHOU ao gerar a Archivo instanciada.',
      '',
      'Este passo exige Python com fontTools e brotli:',
      '  python -m pip install --user "fonttools[woff]"',
      '',
      `O arquivo VERSIONADO em public/fonts/${ARCHIVO_DESTINO} continua válido —`,
      'este script só precisa rodar ao trocar a versão da fonte.',
      '',
      String(erro.stderr || erro.message).trim(),
    ].join('\n'),
  );
  process.exitCode = 1;
}
