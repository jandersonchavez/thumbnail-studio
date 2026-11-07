import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const folder = process.argv[2] === 'dist' ? 'dist' : 'public';
const expected = [
  'zero2players-logo.png', 'demo-person.svg', 'demo-person-blue.svg',
  'brand-background.svg', 'arena-background.svg', 'react-background.svg',
  'tutorial-screen.svg',
  'pieces/arrow-red.svg', 'pieces/focus-ring.svg',
  'pieces/grunge-stripe.svg', 'pieces/vs-badge.svg',
  'pieces/explosion.svg', 'pieces/speedlines.svg',
];
const missing = expected.filter(name => {
  const file = resolve(folder,name);
  return !existsSync(file) || !statSync(file).isFile() || statSync(file).size === 0;
});
if (missing.length) {
  console.error(`Arquivos ausentes/zerados em ${folder}:`);
  for (const name of missing) console.error(` - ${name}`);
  process.exitCode = 1;
} else {
  console.log(`OK: ${expected.length} imagens e peças disponíveis em ${folder}/`);
}
