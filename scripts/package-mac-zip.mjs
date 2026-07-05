#!/usr/bin/env node

import { access, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const productName = packageJson.build?.productName || packageJson.name;
const version = packageJson.version;
const arch = getArg('--arch') || process.env.npm_config_arch || process.arch;
const releaseDir = path.join(root, 'release');
const appPath = await resolveAppPath(arch);
const zipPath = path.join(releaseDir, `${productName}-${version}-${arch}-mac.zip`);

await access(appPath);
await rm(zipPath, { force: true });

run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, zipPath]);

const zipStats = await stat(zipPath);
console.log(`Mac ZIP written: ${zipPath}`);
console.log(`Size: ${formatBytes(zipStats.size)}`);

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

async function resolveAppPath(archName) {
  const candidates = [
    path.join(releaseDir, `mac-${archName}`, `${productName}.app`),
    path.join(releaseDir, 'mac', `${productName}.app`)
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch (_error) {
      // Try the next conventional electron-builder output folder.
    }
  }

  throw new Error(`No macOS app bundle found for arch "${archName}". Run electron-builder --mac dir first.`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
