#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checkedExtensions = new Set(['.js', '.mjs', '.cjs']);
const ignoredDirectories = new Set([
  '.git',
  '.shibanshu',
  '.vite',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'release',
  'test-artifacts'
]);

const files = await discoverJavaScriptFiles(root);
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    failures.push({
      file: path.relative(root, file),
      output: `${result.stderr}${result.stdout}`.trim()
    });
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`Syntax check failed: ${failure.file}`);
    console.error(failure.output);
  }
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);

async function discoverJavaScriptFiles(directory) {
  const result = [];

  async function walk(currentDirectory) {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) continue;
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!checkedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
      result.push(absolutePath);
    }
  }

  await walk(directory);
  return result;
}
