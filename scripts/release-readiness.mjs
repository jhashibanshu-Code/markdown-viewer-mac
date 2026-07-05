#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const releaseDir = path.join(root, 'release');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const productName = packageJson.build?.productName || packageJson.name;
const arch = getArg('--arch') || process.env.npm_config_arch || process.arch;
const publicMode = process.argv.includes('--public');
const appPath = await resolveAppPath(arch);
const checks = [];

await mkdir(releaseDir, { recursive: true });

await checkReleaseArtifacts();
await checkMacTrust();
await checkDownloadPage();
await checkTrustDocs();

const report = buildReport();
await writeFile(path.join(releaseDir, 'release-readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
printReport(report);

if (report.failures > 0 || (publicMode && report.publicBlockers > 0)) {
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
      // Try the next conventional electron-builder output folder.
    }
  }

  throw new Error(`No macOS app bundle found for arch "${archName}". Run npm run dist:mac:${archName} first.`);
}

async function checkReleaseArtifacts() {
  const manifestPath = path.join(releaseDir, 'release-manifest.json');
  const checksumPath = path.join(releaseDir, 'SHA256SUMS');
  let manifest = null;
  let checksums = '';

  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    record('pass', 'release manifest exists', path.relative(root, manifestPath));
  } catch (error) {
    record('fail', 'release manifest exists', error.message, true);
  }

  try {
    checksums = await readFile(checksumPath, 'utf8');
    record('pass', 'SHA-256 checksum file exists', path.relative(root, checksumPath));
  } catch (error) {
    record('fail', 'SHA-256 checksum file exists', error.message, true);
  }

  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  const downloadableArtifacts = artifacts.filter((artifact) =>
    ['mac-dmg', 'mac-zip', 'windows-exe', 'linux-appimage', 'linux-deb', 'linux-rpm'].includes(artifact.type)
  );
  record(downloadableArtifacts.length ? 'pass' : 'fail', 'downloadable artifact is indexed', `${downloadableArtifacts.length} downloadable artifact(s)`, true);

  for (const artifact of downloadableArtifacts) {
    if (!artifact.sha256) {
      record('fail', `checksum for ${artifact.path}`, 'missing sha256', true);
      continue;
    }
    const expectedLine = `${artifact.sha256}  ${artifact.path}`;
    record(
      checksums.includes(expectedLine) ? 'pass' : 'fail',
      `checksum file contains ${artifact.path}`,
      checksums.includes(expectedLine) ? 'present' : 'missing',
      true
    );
  }
}

async function checkMacTrust() {
  const appVerifier = run(process.execPath, ['scripts/verify-mac-app.mjs', '--arch', arch]);
  const verifierOutput = cleanOutput(appVerifier);
  record(appVerifier.status === 0 ? 'pass' : 'fail', 'macOS app verifier exits cleanly', firstLine(verifierOutput), true);

  const codesignDetails = run('codesign', ['-dv', '--verbose=4', appPath]);
  const signatureDetails = cleanOutput(codesignDetails);
  const adHocSigned = signatureDetails.includes('Signature=adhoc');
  const hasTeamId = /TeamIdentifier=(?!not set).+/.test(signatureDetails);
  record(adHocSigned ? 'warn' : 'pass', 'Developer ID signature', adHocSigned ? 'ad-hoc signature only' : firstLine(signatureDetails), true);
  record(hasTeamId ? 'pass' : 'warn', 'Apple Team identifier', hasTeamId ? signatureDetails.match(/TeamIdentifier=.+/)?.[0] || 'present' : 'missing TeamIdentifier', true);

  const spctl = run('spctl', ['--assess', '--type', 'execute', '--verbose=4', appPath]);
  record(spctl.status === 0 ? 'pass' : 'warn', 'Gatekeeper assessment passes', cleanOutput(spctl) || 'no output', true);

  const stapler = run('xcrun', ['stapler', 'validate', appPath]);
  record(stapler.status === 0 ? 'pass' : 'warn', 'notarization ticket is stapled', cleanOutput(stapler) || 'no output', true);
}

async function checkDownloadPage() {
  const downloadPath = path.join(root, 'docs', 'download', 'index.html');
  let html = '';
  try {
    html = await readFile(downloadPath, 'utf8');
    record('pass', 'download page exists', path.relative(root, downloadPath));
  } catch (error) {
    record('fail', 'download page exists', error.message, true);
    return;
  }

  const requiredPhrases = [
    'Shibanshu Markdown Viewer',
    'works offline',
    'SHA-256',
    'Trust And Privacy',
    'Release Readiness'
  ];

  for (const phrase of requiredPhrases) {
    record(html.includes(phrase) ? 'pass' : 'warn', `download page mentions ${phrase}`, html.includes(phrase) ? 'present' : 'missing', phrase === 'Release Readiness');
  }
}

async function checkTrustDocs() {
  const requiredDocs = [
    'LICENSE',
    'THIRD_PARTY_NOTICES.md',
    'SECURITY.md',
    'CHANGELOG.md',
    'docs/privacy.md',
    'docs/uninstall.md',
    'docs/release-readiness.md'
  ];

  for (const file of requiredDocs) {
    try {
      await access(path.join(root, file));
      record('pass', `trust document exists: ${file}`, file);
    } catch (_error) {
      record('warn', `trust document exists: ${file}`, 'missing', true);
    }
  }
}

function record(status, label, detail = '', publicBlocker = false) {
  checks.push({ status, label, detail, publicBlocker: Boolean(publicBlocker && status !== 'pass') });
}

function buildReport() {
  const failures = checks.filter((check) => check.status === 'fail').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  const publicBlockers = checks.filter((check) => check.publicBlocker).length;
  return {
    productName,
    version: packageJson.version,
    arch,
    generatedAt: new Date().toISOString(),
    mode: publicMode ? 'public' : 'development',
    status: failures ? 'failed' : publicBlockers ? 'public-blocked' : 'ready',
    failures,
    warnings,
    publicBlockers,
    checks
  };
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8'
  });
}

function cleanOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function firstLine(text) {
  return text.split('\n').find(Boolean) || '';
}

function printReport(report) {
  console.log(`Release readiness: ${report.status} (${report.mode})`);
  console.log(`${report.failures} failure${report.failures === 1 ? '' : 's'}, ${report.warnings} warning${report.warnings === 1 ? '' : 's'}, ${report.publicBlockers} public blocker${report.publicBlockers === 1 ? '' : 's'}.`);
  for (const check of report.checks) {
    const marker = check.status.toUpperCase().padEnd(4, ' ');
    const blocker = check.publicBlocker ? ' [public blocker]' : '';
    const detail = check.detail ? ` — ${check.detail}` : '';
    console.log(`${marker} ${check.label}${blocker}${detail}`);
  }
  console.log(`Readiness report written: ${path.join(releaseDir, 'release-readiness.json')}`);
}
