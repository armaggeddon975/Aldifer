// Gera os ativos de marca a partir do logotipo e das fotos reais da Aldifer,
// baixados de aldifer.com.br com autorização e guardados em src/assets/aldifer/.
//
// Roda sob demanda, não no build: a saída é COMMITADA. Isso evita depender de
// fonte do sistema na Vercel e mantém a og-image estável entre deploys.
//
//   npm run assets
//
// O que produz:
//   public/favicon.ico          16 + 32 + 48, PNG dentro de ICO
//   public/apple-touch-icon.png 180, com fundo opaco (o iOS não lida com alfa)
//   public/icone-192.png        manifest
//   public/icone-512.png        manifest
//   public/og-image.jpg         1200x630 de compartilhamento
//   src/assets/aldifer/fachada.jpg  a fachada, sem o overlay promocional
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const ORIGEM = 'src/assets/aldifer/';
const PUBLICO = 'public/';

const feitos = [];
/** Só o tamanho em bytes: o sharp não lê ICO, e é o byte que o CLAUDE.md limita. */
const registrar = (caminho) => {
  feitos.push({ caminho, bytes: readFileSync(caminho).length });
};

// --- 1. O marco circular, isolado do logotipo -------------------------------
//
// O logo.png tem 240x60: o marco ocupa o quadrado da esquerda e a palavra
// "ALDIFER" o resto. `trim` acha a borda exata do círculo em vez de eu chutar
// coordenadas, e falha alto se o recorte vier vazio.

// Em DOIS pipelines de propósito: encadeados, o sharp aplica o `trim` ANTES do
// `extract`, o logo cai para 240x58 e o recorte de 60 de altura estoura com
// "bad extract area".
const recorte = await sharp(ORIGEM + 'logo.png')
  .extract({ left: 0, top: 0, width: 62, height: 60 })
  .png()
  .toBuffer();

const marco = await sharp(recorte)
  .trim({ threshold: 10 })
  .png()
  .toBuffer({ resolveWithObject: true });

const { width: mw, height: mh } = marco.info;
if (mw < 40 || mh < 40) {
  throw new Error(`o recorte do marco saiu ${mw}x${mh} — esperado ~57x57. Confira o logo.png.`);
}
console.log(`marco isolado: ${mw}x${mh}`);

/**
 * Ícone quadrado no tamanho pedido.
 *
 * 12% de respiro em volta: colado na borda, o círculo fica pesado na aba do
 * navegador e o iOS ainda recorta os cantos por cima. `fundo` opaco é
 * obrigatório no apple-touch-icon, que ignora transparência e a renderiza
 * preta.
 */
const icone = async (lado, fundo) => {
  const respiro = Math.round(lado * 0.12);
  const interno = lado - respiro * 2;

  return sharp({
    create: {
      width: lado,
      height: lado,
      channels: 4,
      background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(marco.data)
          .resize(interno, interno, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer(),
        top: respiro,
        left: respiro,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
};

const BRANCO = { r: 255, g: 255, b: 255, alpha: 1 };

// --- 2. favicon.ico ---------------------------------------------------------
//
// O sharp não escreve ICO. O formato é simples e aceita PNG embutido, que todo
// navegador atual lê: cabeçalho de 6 bytes, uma entrada de diretório de 16
// bytes por tamanho, e os PNGs em seguida.

const TAMANHOS_ICO = [16, 32, 48];
const pngsIco = await Promise.all(TAMANHOS_ICO.map((lado) => icone(lado)));

const cabecalho = Buffer.alloc(6);
cabecalho.writeUInt16LE(0, 0); // reservado
cabecalho.writeUInt16LE(1, 2); // 1 = ícone
cabecalho.writeUInt16LE(TAMANHOS_ICO.length, 4);

let deslocamento = 6 + 16 * TAMANHOS_ICO.length;
const diretorio = [];
for (const [i, lado] of TAMANHOS_ICO.entries()) {
  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(lado === 256 ? 0 : lado, 0); // largura
  entrada.writeUInt8(lado === 256 ? 0 : lado, 1); // altura
  entrada.writeUInt8(0, 2); // paleta
  entrada.writeUInt8(0, 3); // reservado
  entrada.writeUInt16LE(1, 4); // planos
  entrada.writeUInt16LE(32, 6); // bits por pixel
  entrada.writeUInt32LE(pngsIco[i].length, 8);
  entrada.writeUInt32LE(deslocamento, 12);
  deslocamento += pngsIco[i].length;
  diretorio.push(entrada);
}

writeFileSync(PUBLICO + 'favicon.ico', Buffer.concat([cabecalho, ...diretorio, ...pngsIco]));
registrar(PUBLICO + 'favicon.ico');

// --- 3. PNGs de ícone -------------------------------------------------------

writeFileSync(PUBLICO + 'apple-touch-icon.png', await icone(180, BRANCO));
writeFileSync(PUBLICO + 'icone-192.png', await icone(192, BRANCO));
writeFileSync(PUBLICO + 'icone-512.png', await icone(512, BRANCO));
for (const n of ['apple-touch-icon.png', 'icone-192.png', 'icone-512.png']) {
  registrar(PUBLICO + n);
}

// --- 4. A fachada, sem o overlay promocional --------------------------------
//
// O empresa-01.jpg é um post de rede social de 800x800: os 375px de cima são
// arte ("Obrigado por fazer parte dessa história", selo de 20 anos) e o resto
// é a foto real do galpão. Recortar o overlay não inventa nada — deixa só a
// fotografia, que é o que serve para reconhecer o lugar na rua.

await sharp(ORIGEM + 'empresa-01.jpg')
  .extract({ left: 0, top: 375, width: 800, height: 425 })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(ORIGEM + 'fachada.jpg');
registrar(ORIGEM + 'fachada.jpg');

// --- 5. og-image 1200x630 ---------------------------------------------------
//
// A marca vem do logo.png de verdade, e não de texto: a fonte do site é a
// Archivo Expanded, e ela NÃO chega ao rasterizador do sharp — @font-face com
// woff2 é ignorado em silêncio e cai numa serifada. Como imagem, o logotipo
// sai no desenho certo. O texto de apoio usa sans do sistema, onde a diferença
// de fonte não engana ninguém.
//
// O fundo é a foto das prateleiras de tubos, a mesma prova que a página Empresa
// mostra: um card social com estoque real vale mais que fundo chapado.

const OG_L = 1200;
const OG_A = 630;

const fundoOg = await sharp(ORIGEM + 'empresa-03.jpg')
  .resize(OG_L, OG_A, { fit: 'cover', position: 'centre' })
  .toBuffer();

// Escurece o suficiente para o texto claro passar em contraste com folga.
const veu = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_L}" height="${OG_A}">
    <defs>
      <linearGradient id="v" x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0" stop-color="#0B1B2E" stop-opacity="0.97"/>
        <stop offset="0.58" stop-color="#0B1B2E" stop-opacity="0.90"/>
        <stop offset="1" stop-color="#0B1B2E" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="${OG_L}" height="${OG_A}" fill="url(#v)"/>
    <rect y="${OG_A - 10}" width="${OG_L}" height="10" fill="#CD4116"/>
  </svg>`,
);

// A palavra do logotipo sobre uma placa clara, como ela aparece no cabeçalho
// do site. 1,5x de ampliação a partir de 240px de largura — acima disso o
// traço do wordmark começa a amolecer.
const placa = await sharp({
  create: { width: 396, height: 126, channels: 4, background: BRANCO },
})
  .composite([
    {
      input: await sharp(ORIGEM + 'logo.png').resize({ width: 360 }).png().toBuffer(),
      gravity: 'centre',
    },
  ])
  .png()
  .toBuffer();

const textoOg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_L}" height="${OG_A}">
    <style>
      .t { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; fill: #E8EBEF; }
      .h { font-size: 52px; font-weight: 700; }
      .s { font-size: 30px; fill: #9AA6B8; }
      .l { font-size: 26px; font-weight: 600; fill: #FF6A2B; letter-spacing: 1.5px; }
    </style>
    <text class="t h" x="72" y="288">Ferro e aço em pronta-entrega</text>
    <text class="t h" x="72" y="352">para quem trabalha no Grande ABC.</text>
    <text class="t s" x="72" y="418">Barras · Tubos · Chapas · Perfis · Telas</text>
    <text class="t l" x="72" y="500">SÃO BERNARDO DO CAMPO · DESDE 2002</text>
  </svg>`,
);

await sharp(fundoOg)
  .composite([
    { input: veu, top: 0, left: 0 },
    { input: placa, top: 72, left: 72 },
    { input: textoOg, top: 0, left: 0 },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(PUBLICO + 'og-image.jpg');
registrar(PUBLICO + 'og-image.jpg');

// --- relatório --------------------------------------------------------------

const LIMITE = 250 * 1024;
console.log('');
let estourou = false;
for (const { caminho, bytes } of feitos) {
  const kb = (bytes / 1024).toFixed(1);
  const ok = bytes <= LIMITE;
  if (!ok) estourou = true;
  console.log(`${ok ? 'ok ' : 'X  '} ${String(kb).padStart(7)} KB  ${caminho}`);
}

if (estourou) {
  console.error('\nAlgum arquivo passou dos 250 KB que o CLAUDE.md permite.');
  process.exitCode = 1;
}
