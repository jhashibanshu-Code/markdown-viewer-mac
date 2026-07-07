#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const script = path.join(root, 'scripts', 'render-athena-premium-short.py');

const result = spawnSync('python3', [script, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
