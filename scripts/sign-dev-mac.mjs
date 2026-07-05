import { access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const arch = getArg('--arch') || process.env.npm_config_arch || process.arch;
const appPath = await resolveAppPath(arch);
const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');

await access(appPath);
await access(infoPlistPath);

run('xattr', ['-cr', appPath]);
patchInfoPlist(infoPlistPath);
run('codesign', ['--force', '--deep', '--sign', '-', appPath]);
run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath]);

console.log(`Development-signed macOS app: ${appPath}`);

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

async function resolveAppPath(archName) {
  const productName = 'Shibanshu Markdown Viewer';
  const releaseDir = path.join(root, 'release');
  const candidates = [
    path.join(releaseDir, `mac-${archName}`, `${productName}.app`),
    path.join(releaseDir, 'mac', `${productName}.app`)
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch (_error) {
      // Continue through the known electron-builder output folders.
    }
  }

  throw new Error(`No macOS app bundle found for arch "${archName}".`);
}

function patchInfoPlist(infoPlist) {
  run('plutil', ['-replace', 'NSAppTransportSecurity.NSAllowsArbitraryLoads', '-bool', 'NO', infoPlist]);
  run('plutil', [
    '-replace',
    'NSAudioCaptureUsageDescription',
    '-string',
    'Shibanshu Markdown Viewer does not use audio capture.',
    infoPlist
  ]);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}
