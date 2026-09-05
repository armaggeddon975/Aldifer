// Compara o VALOR do frontmatter de dois arquivos, ignorando formatação.
//
// Existe por causa da Etapa 11: ao salvar pelo painel, o Keystatic reescreve o
// YAML no estilo dele — `{ width: 12, thickness: 3 }` em uma linha vira três
// linhas em bloco. O diff do git fica grande e parece perda de dado.
//
// Este script responde a pergunta que importa: os VALORES são os mesmos?
//
//   node scripts/comparar-frontmatter.mjs antes.md depois.md
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const [a, b] = process.argv.slice(2);
if (!a || !b) throw new Error('uso: node scripts/comparar-frontmatter.mjs <antes> <depois>');

const frontmatter = (caminho) => {
  const texto = readFileSync(caminho, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (!m) throw new Error(`${caminho} sem frontmatter`);
  return { dados: parse(m[1]), corpo: texto.slice(m[0].length).trim() };
};

const antes = frontmatter(a);
const depois = frontmatter(b);

const chaves = [...new Set([...Object.keys(antes.dados), ...Object.keys(depois.dados)])].sort();

const diferentes = [];
for (const chave of chaves) {
  const x = JSON.stringify(antes.dados[chave]);
  const y = JSON.stringify(depois.dados[chave]);
  if (x !== y) diferentes.push({ chave, antes: x, depois: y });
}

const corpoIgual = antes.corpo === depois.corpo;

console.log(`${chaves.length} chaves comparadas\n`);

if (diferentes.length === 0) {
  console.log('VALORES IDÊNTICOS no frontmatter — a diferença é só de formatação.');
} else {
  console.log(`${diferentes.length} chave(s) com valor diferente:`);
  for (const d of diferentes) {
    console.log(`\n  ${d.chave}`);
    console.log(`    antes:  ${String(d.antes).slice(0, 150)}`);
    console.log(`    depois: ${String(d.depois).slice(0, 150)}`);
  }
}

console.log(`\ncorpo do markdown: ${corpoIgual ? 'idêntico' : 'DIFERENTE'}`);
if (!corpoIgual) {
  console.log(`  antes:  ${antes.corpo.length} caracteres`);
  console.log(`  depois: ${depois.corpo.length} caracteres`);
}

// Chaves perdidas são o risco real: o Keystatic descarta campo não declarado.
const perdidas = Object.keys(antes.dados).filter((k) => !(k in depois.dados));
if (perdidas.length > 0) {
  console.error(`\nCAMPOS PERDIDOS: ${perdidas.join(', ')}`);
  process.exitCode = 1;
}
