#!/usr/bin/env node

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const releaseDir = path.join(root, 'release');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const artifactExtensions = new Set(['.dmg', '.zip', '.exe', '.AppImage', '.deb', '.rpm', '.yml', '.blockmap']);
const ignoredArtifacts = new Set(['builder-debug.yml']);

await mkdir(releaseDir, { recursive: true });
const artifacts = await discoverReleaseArtifacts(releaseDir);
const manifest = {
  productName: packageJson.build?.productName || packageJson.name,
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
  offline: true,
  artifacts
};

const checksumLines = artifacts
  .filter((artifact) => artifact.sha256)
  .map((artifact) => `${artifact.sha256}  ${artifact.path}`)
  .join('\n');

await writeFile(path.join(releaseDir, 'SHA256SUMS'), checksumLines ? `${checksumLines}\n` : '');
await writeFile(path.join(releaseDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Release manifest written: ${path.join(releaseDir, 'release-manifest.json')}`);
console.log(`SHA-256 checksums written: ${path.join(releaseDir, 'SHA256SUMS')}`);
console.log(`${artifacts.length} release artifact${artifacts.length === 1 ? '' : 's'} indexed.`);

async function discoverReleaseArtifacts(directory) {
  const artifacts = [];

  async function walk(currentDirectory) {
    let entries = [];
    try {
      entries = await readdir(currentDirectory, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      const relativePath = path.relative(releaseDir, absolutePath).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        if (entry.name.endsWith('.app')) {
          const size = await directorySize(absolutePath);
          artifacts.push({
            path: relativePath,
            type: 'mac-app-bundle',
            size,
            sha256: null,
            note: 'Directory bundle. Distribute a DMG or ZIP for end users.'
          });
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (ignoredArtifacts.has(entry.name)) continue;
      const extension = getArtifactExtension(entry.name);
      if (!artifactExtensions.has(extension) && !['SHA256SUMS', 'release-manifest.json'].includes(entry.name)) continue;
      if (entry.name === 'SHA256SUMS' || entry.name === 'release-manifest.json') continue;
      const fileStats = await stat(absolutePath);
      artifacts.push({
        path: relativePath,
        type: artifactType(entry.name),
        size: fileStats.size,
        sha256: await sha256File(absolutePath)
      });
    }
  }

  await walk(directory);
  return artifacts;
}

async function sha256File(filePath) {
  return crypto.createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function directorySize(directory) {
  let total = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(absolutePath);
    } else if (entry.isFile()) {
      total += (await stat(absolutePath)).size;
    }
  }
  return total;
}

function getArtifactExtension(fileName) {
  if (fileName.endsWith('.AppImage')) return '.AppImage';
  if (fileName.endsWith('.blockmap')) return '.blockmap';
  return path.extname(fileName);
}

function artifactType(fileName) {
  if (fileName.endsWith('.dmg')) return 'mac-dmg';
  if (fileName.endsWith('-mac.zip')) return 'mac-zip';
  if (fileName.endsWith('.zip')) return 'zip';
  if (fileName.endsWith('.exe')) return 'windows-exe';
  if (fileName.endsWith('.AppImage')) return 'linux-appimage';
  if (fileName.endsWith('.deb')) return 'linux-deb';
  if (fileName.endsWith('.rpm')) return 'linux-rpm';
  if (fileName.endsWith('.blockmap')) return 'update-blockmap';
  if (fileName.endsWith('.yml')) return 'update-metadata';
  return 'release-artifact';
}
