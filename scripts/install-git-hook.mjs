#!/usr/bin/env node

/**
 * Installs a post-commit git hook that auto-regenerates the context map.
 * Run: node scripts/install-git-hook.mjs /path/to/your/repo
 */

import { writeFile, mkdir, chmod, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportScript = path.join(__dirname, 'export-claude-map.mjs');

const repoPath = process.argv[2];
if (!repoPath) {
  console.log('Usage: node scripts/install-git-hook.mjs /path/to/your/repo');
  process.exit(1);
}

const absRepo = path.resolve(repoPath);
const hooksDir = path.join(absRepo, '.git', 'hooks');
const hookPath = path.join(hooksDir, 'post-commit');

const hookScript = `#!/bin/sh
# Auto-regenerate context map after each commit
# Installed by athena-mcp
node "${exportScript}" "${absRepo}" --out "${path.join(absRepo, '.athena')}" > /dev/null 2>&1 &
echo "Context map updated."
`;

try {
  await mkdir(hooksDir, { recursive: true });

  // Check if hook already exists
  try {
    const existing = await readFile(hookPath, 'utf8');
    if (existing.includes('athena-mcp')) {
      console.log('Hook already installed at', hookPath);
      process.exit(0);
    }
    // Append to existing hook
    await writeFile(hookPath, existing + '\n' + hookScript, 'utf8');
    console.log('Appended to existing post-commit hook at', hookPath);
  } catch {
    // No existing hook, create new
    await writeFile(hookPath, hookScript, 'utf8');
    console.log('Created post-commit hook at', hookPath);
  }

  await chmod(hookPath, 0o755);
  console.log('Done. Context map will auto-update on every commit.');
} catch (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}
