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

if (!html.includes('Markdown Viewer Mac')) {
  throw new Error('Built HTML is missing the app title.');
}

console.log('Smoke check passed.');
