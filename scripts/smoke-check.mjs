import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'dist/index.html',
  'electron/main.cjs',
  'electron/preload.cjs',
  'src/renderer.js',
  'src/styles.css',
  'docs/research.md'
];

await Promise.all(requiredFiles.map((file) => access(path.join(root, file))));

const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const mainProcess = await readFile(path.join(root, 'electron/main.cjs'), 'utf8');
const preload = await readFile(path.join(root, 'electron/preload.cjs'), 'utf8');

if (!html.includes('Shibanshu Markdown Viewer')) {
  throw new Error('Built HTML is missing the app title.');
}

if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
  throw new Error('Built HTML still uses absolute asset paths; Electron file loading will break.');
}

const assetRefs = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((match) => match[1]);

if (!assetRefs.length) {
  throw new Error('Built HTML does not reference compiled renderer assets.');
}

for (const assetRef of assetRefs) {
  const assetPath = path.join(root, 'dist', assetRef.replace(/^\.\//, ''));
  await access(assetPath);
}

if (mainProcess.includes('sandbox: false')) {
  throw new Error('Main window sandbox is disabled.');
}

if (preload.includes('openPaths:')) {
  throw new Error('Preload exposes arbitrary path opening.');
}

console.log('Smoke check passed.');
