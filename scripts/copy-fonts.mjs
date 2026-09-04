// Copia as fontes variáveis do node_modules para public/fonts/.
// Motivo: caminho estável e sem hash, exigido pelo <link rel="preload"> da fonte do LCP.
// Só o subset `latin` — cobre todos os acentos do português (U+00C0–U+00FF).
import { copyFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../public/fonts/', import.meta.url);

// Archivo usa o arquivo `standard` porque precisamos do eixo de largura (wdth 62–125%):
// "Archivo Expanded" do design system é wdth: 125%, não uma família separada.
const FONTS = [
  '@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2',
  '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
];

await mkdir(OUT, { recursive: true });

for (const spec of FONTS) {
  const from = new URL(`../node_modules/${spec}`, import.meta.url);
  const name = spec.split('/').pop();
  await copyFile(from, new URL(name, OUT));
  console.log(`fonte copiada: ${name}`);
}
