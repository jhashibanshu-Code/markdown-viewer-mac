#!/usr/bin/env node

import { access, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const productName = packageJson.build?.productName || packageJson.name;
const version = packageJson.version;
const arch = getArg('--arch') || process.env.npm_config_arch || process.arch;
const requireLaunchServices = process.argv.includes('--require-launchservices');
const releaseDir = path.join(root, 'release');
const appPath = getArg('--app') || (await resolveAppPath(arch));
const checks = [];

await verifyAppBundle(appPath);
await verifyPackagedArtifacts();
printReport();

if (checks.some((check) => check.status === 'fail')) {
  process.exitCode = 1;
}

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
      // Continue through conventional electron-builder output folders.
    }
  }

  throw new Error(`No macOS app bundle found for arch "${archName}". Run npm run dist:mac:${archName} first.`);
}

async function verifyAppBundle(bundlePath) {
  await expectPath(bundlePath, 'app bundle exists');
  const contentsPath = path.join(bundlePath, 'Contents');
  const infoPlistPath = path.join(contentsPath, 'Info.plist');
  const asarPath = path.join(contentsPath, 'Resources', 'app.asar');
  await expectPath(contentsPath, 'Contents directory exists');
  await expectPath(infoPlistPath, 'Info.plist exists');
  await expectPath(asarPath, 'app.asar exists');

  const plutil = run('plutil', ['-lint', infoPlistPath]);
  record(plutil.status === 0 ? 'pass' : 'fail', 'Info.plist parses', cleanOutput(plutil));

  const executableName = plistValue(infoPlistPath, 'CFBundleExecutable');
  const bundleName = plistValue(infoPlistPath, 'CFBundleName');
  const packageType = plistValue(infoPlistPath, 'CFBundlePackageType');
  const appId = plistValue(infoPlistPath, 'CFBundleIdentifier');
  const atsAllowsArbitraryLoads = plistValue(infoPlistPath, 'NSAppTransportSecurity:NSAllowsArbitraryLoads');
  const executablePath = path.join(contentsPath, 'MacOS', executableName);

  record(packageType === 'APPL' ? 'pass' : 'fail', 'bundle package type is APPL', packageType || 'missing');
  record(appId === packageJson.build?.appId ? 'pass' : 'fail', 'bundle identifier matches package config', appId || 'missing');
  record(Boolean(bundleName) ? 'pass' : 'fail', 'bundle name is present', bundleName || 'missing');
  record(atsAllowsArbitraryLoads === 'false' ? 'pass' : 'fail', 'ATS arbitrary loads disabled', atsAllowsArbitraryLoads || 'missing');
  await expectPath(executablePath, 'CFBundleExecutable points at a real file');

  const executableStats = await stat(executablePath);
  record(executableStats.mode & 0o111 ? 'pass' : 'fail', 'main executable is executable', modeString(executableStats.mode));

  const fileInfo = run('file', [executablePath]);
  const fileText = cleanOutput(fileInfo);
  const expectedArch = arch === 'x64' ? 'x86_64' : arch;
  record(fileInfo.status === 0 && fileText.includes('Mach-O') ? 'pass' : 'fail', 'main executable is Mach-O', fileText);
  if (['arm64', 'x86_64'].includes(expectedArch)) {
    record(fileText.includes(expectedArch) ? 'pass' : 'fail', `main executable includes ${expectedArch}`, fileText);
  }

  const codesignVerify = run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', bundlePath]);
  record(codesignVerify.status === 0 ? 'pass' : 'fail', 'codesign deep strict verification', cleanOutput(codesignVerify));

  const codesignDetails = run('codesign', ['-dv', '--verbose=4', bundlePath]);
  const signatureDetails = cleanOutput(codesignDetails);
  record(
    signatureDetails.includes('Signature=adhoc') ? 'warn' : 'pass',
    'production signing status',
    signatureDetails.includes('Signature=adhoc') ? 'ad-hoc signed; Developer ID signing/notarization still required' : firstLine(signatureDetails)
  );

  const spctl = run('spctl', ['--assess', '--type', 'execute', '--verbose=4', bundlePath]);
  record(spctl.status === 0 ? 'pass' : 'warn', 'Gatekeeper assessment', cleanOutput(spctl) || 'no output');

  verifyAsarContents(asarPath);
  verifyLaunchServicesVisibility(bundlePath);
}

async function verifyPackagedArtifacts() {
  const zipPath = path.join(releaseDir, `${productName}-${version}-${arch}-mac.zip`);
  try {
    await access(zipPath);
  } catch (_error) {
    record('warn', 'macOS ZIP artifact exists', `missing ${path.relative(root, zipPath)}`);
    return;
  }

  const zipStats = await stat(zipPath);
  record(zipStats.size > 1024 * 1024 ? 'pass' : 'fail', 'macOS ZIP artifact has content', `${zipStats.size} bytes`);

  const checksumPath = path.join(releaseDir, 'SHA256SUMS');
  try {
    const checksumText = await readFile(checksumPath, 'utf8');
    const relativeZip = path.relative(releaseDir, zipPath).replaceAll(path.sep, '/');
    const actualChecksum = await sha256File(zipPath);
    const expectedLine = `${actualChecksum}  ${relativeZip}`;
    record(checksumText.includes(expectedLine) ? 'pass' : 'fail', 'macOS ZIP checksum is indexed', expectedLine);
  } catch (error) {
    record('fail', 'macOS ZIP checksum is indexed', error.message);
  }
}

function verifyAsarContents(asarPath) {
  const asarBin = path.join(root, 'node_modules', '@electron', 'asar', 'bin', 'asar.js');
  const result = run(process.execPath, [asarBin, 'list', asarPath]);
  const output = cleanOutput(result);
  record(result.status === 0 ? 'pass' : 'fail', 'app.asar can be listed', firstLine(output));

  const requiredEntries = [
    '/dist/index.html',
    '/electron/main.cjs',
    '/electron/preload.cjs',
    '/bin/shibanshu-markdown.mjs',
    '/scripts/export-claude-map.mjs',
    '/scripts/publish-static-site.mjs',
    '/skills/shibanshu-markdown-context/SKILL.md'
  ];

  for (const entry of requiredEntries) {
    record(output.includes(entry) ? 'pass' : 'fail', `app.asar includes ${entry}`, output.includes(entry) ? 'present' : 'missing');
  }
}

function verifyLaunchServicesVisibility(bundlePath) {
  const mdls = run('mdls', ['-name', 'kMDItemContentType', '-name', 'kMDItemKind', bundlePath]);
  const mdlsText = cleanOutput(mdls);
  const mdlsStatus = mdls.status === 0 && !mdlsText.includes('could not find');
  record(mdlsStatus ? 'pass' : 'warn', 'Spotlight can classify app bundle', mdlsText || 'no output');

  const lsregisterPath =
    '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
  const lsregister = run(lsregisterPath, ['-f', bundlePath]);
  const launchServicesStatus = lsregister.status === 0;
  const status = launchServicesStatus ? 'pass' : requireLaunchServices ? 'fail' : 'warn';
  record(status, 'LaunchServices can scan app bundle', cleanOutput(lsregister) || 'no output');
}

async function expectPath(targetPath, label) {
  try {
    await access(targetPath);
    record('pass', label, path.relative(root, targetPath) || targetPath);
  } catch (error) {
    record('fail', label, error.message);
  }
}

function plistValue(infoPlistPath, key) {
  const result = run('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, infoPlistPath]);
  if (result.status !== 0) return '';
  return cleanOutput(result);
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8'
  });
}

async function sha256File(filePath) {
  return crypto.createHash('sha256').update(await readFile(filePath)).digest('hex');
}

function record(status, label, detail = '') {
  checks.push({ status, label, detail });
}

function cleanOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function firstLine(text) {
  return text.split('\n').find(Boolean) || '';
}

function modeString(mode) {
  return `0${(mode & 0o777).toString(8)}`;
}

function printReport() {
  console.log(`macOS app verification: ${path.relative(root, appPath)}`);
  for (const check of checks) {
    const mark = check.status.toUpperCase().padEnd(4, ' ');
    const detail = check.detail ? ` — ${check.detail}` : '';
    console.log(`${mark} ${check.label}${detail}`);
  }

  const failures = checks.filter((check) => check.status === 'fail').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  console.log(`${failures} failure${failures === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
}
