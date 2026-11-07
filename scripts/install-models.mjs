/**
 * One-time developer setup. Downloads only model/WASM assets, never photos.
 * The web app subsequently serves the assets from its own /models/ directory.
 * Requires npm install first (the 'tar' dev dependency).
 */
import { mkdir, mkdtemp, readFile, copyFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { x as extractTar } from 'tar';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.dependencies['@imgly/background-removal'];
const url = `https://staticimgly.com/@imgly/background-removal-data/${version}/package.tgz`;
const dest = resolve('public/models');
const temp = await mkdtemp(join(tmpdir(), 'thumb-models-'));
console.log(`Baixando os modelos IMG.LY versão ${version} para uso local...`);
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha HTTP ${response.status} ao obter ${url}`);
  const file = join(temp,'package.tgz');
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  await extractTar({ file, cwd: temp });
  const from = join(temp, 'package', 'dist');
  const entries = await readdir(from, { withFileTypes: true });
  await mkdir(dest, {recursive:true});
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    await copyFile(join(from,entry.name), join(dest,entry.name));
  }
  console.log(`Pronto: ${entries.filter(e=>e.isFile()).length} recursos copiados para public/models.`);
  console.log('As fotos nunca são transmitidas para a IMG.LY. O navegador carregará os modelos deste servidor local.');
} finally {
  await rm(temp, {recursive:true,force:true});
}
