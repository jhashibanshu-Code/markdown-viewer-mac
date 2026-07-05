#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const releaseManifestPath = path.join(root, 'release', 'release-manifest.json');
const releaseReadinessPath = path.join(root, 'release', 'release-readiness.json');
const outputDir = path.join(root, 'docs', 'download');
const outputPath = path.join(outputDir, 'index.html');
let manifest = {
  productName: packageJson.build?.productName || packageJson.name,
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
  artifacts: []
};

try {
  manifest = JSON.parse(await readFile(releaseManifestPath, 'utf8'));
} catch (_error) {
  // The page can still be generated before release artifacts exist.
}

let readiness = null;
try {
  readiness = JSON.parse(await readFile(releaseReadinessPath, 'utf8'));
} catch (_error) {
  // Readiness is optional until release verification has been run.
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, renderDownloadPage(packageJson, manifest, readiness), 'utf8');
console.log(`Download page written: ${outputPath}`);

function renderDownloadPage(pkg, data, releaseReadiness) {
  const productName = escapeHtml(data.productName || pkg.build?.productName || 'Shibanshu Markdown Viewer');
  const version = escapeHtml(data.version || pkg.version);
  const generatedAt = escapeHtml(data.generatedAt || new Date().toISOString());
  const artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
  const primaryArtifacts = artifacts.filter((artifact) =>
    ['mac-dmg', 'mac-zip', 'windows-exe', 'linux-appimage', 'linux-deb', 'linux-rpm'].includes(artifact.type)
  );

  const artifactRows = primaryArtifacts.length
    ? primaryArtifacts
        .map((artifact) => `<tr>
          <td><a href="../../release/${escapeAttribute(artifact.path)}">${escapeHtml(artifact.path)}</a></td>
          <td>${escapeHtml(artifact.type)}</td>
          <td>${formatBytes(artifact.size)}</td>
          <td><code>${escapeHtml(artifact.sha256 || 'directory artifact')}</code></td>
        </tr>`)
        .join('')
    : `<tr><td colspan="4">No downloadable installers have been generated yet. Run <code>npm run dist:mac:arm64</code> first.</td></tr>`;
  const readinessPanel = renderReadinessPanel(releaseReadiness);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${productName} Download</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f7f7f4;
      --surface: #ffffff;
      --text: #1f2522;
      --muted: #64706a;
      --border: #d9ded8;
      --accent: #236f55;
      --accent-2: #315e9f;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111316;
        --surface: #181b20;
        --text: #f2f4f0;
        --muted: #a8b0ab;
        --border: #333941;
        --accent: #7dd3a8;
        --accent-2: #8ab4f8;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.56;
    }
    main {
      width: min(1040px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 48px 0 72px;
    }
    h1 {
      max-width: 760px;
      margin: 0 0 12px;
      font-size: clamp(2.2rem, 5vw, 4.8rem);
      line-height: 0.98;
      letter-spacing: 0;
    }
    h2 { margin-top: 34px; }
    .lead {
      max-width: 760px;
      color: var(--muted);
      font-size: 1.1rem;
    }
    .panel {
      margin-top: 24px;
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    code {
      overflow-wrap: anywhere;
      color: var(--accent);
    }
    a { color: var(--accent-2); }
    ol, ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <main>
    <p>Version ${version} · Generated ${generatedAt}</p>
    <h1>${productName}</h1>
    <p class="lead">A free, local-first Markdown viewer, editor, graph mapper, AI context exporter, and static publisher. The app works offline after installation and does not require an account or hosted service.</p>

    <section class="panel" aria-labelledby="downloads">
      <h2 id="downloads">Downloads</h2>
      <table>
        <thead>
          <tr><th>Artifact</th><th>Type</th><th>Size</th><th>SHA-256</th></tr>
        </thead>
        <tbody>${artifactRows}</tbody>
      </table>
    </section>

    ${readinessPanel}

    <section class="panel" aria-labelledby="install">
      <h2 id="install">Install</h2>
      <ol>
        <li>Download the installer for your platform.</li>
        <li>Verify the SHA-256 checksum against <code>release/SHA256SUMS</code>.</li>
        <li>On macOS, open the ZIP or DMG and drag the app into Applications.</li>
        <li>Open a Markdown file, or open a folder as a vault from the app.</li>
      </ol>
    </section>

    <section class="panel" aria-labelledby="trust">
      <h2 id="trust">Trust And Privacy</h2>
      <ul>
        <li>Markdown rendering, graph mapping, AI context maps, and static publishing run locally.</li>
        <li>Generated context files are saved only where you choose.</li>
        <li>Production public releases should be Developer ID signed, notarized, stapled, and listed with checksums.</li>
        <li>Ad-hoc developer builds are useful for testing but are not a substitute for notarized public distribution.</li>
      </ul>
    </section>

    <section class="panel" aria-labelledby="troubleshooting">
      <h2 id="troubleshooting">Troubleshooting</h2>
      <ul>
        <li>If macOS blocks an unsigned development build, use a notarized release for normal installation.</li>
        <li>If Electron cannot launch from a restricted terminal session, run <code>npm run local:web</code> and open the printed localhost URL to test the same renderer UI.</li>
        <li>If a file association does not update immediately, restart Finder or choose the app from “Open With”.</li>
        <li>For automation, use <code>shibanshu-markdown context</code>, <code>shibanshu-markdown publish</code>, or the <code>shibanshu-markdown://</code> URL scheme.</li>
      </ul>
    </section>
  </main>
</body>
</html>`;
}

function renderReadinessPanel(releaseReadiness) {
  if (!releaseReadiness) {
    return `<section class="panel" aria-labelledby="readiness">
      <h2 id="readiness">Release Readiness</h2>
      <p>No readiness report has been generated yet. Run <code>npm run release:readiness -- --arch arm64</code>.</p>
    </section>`;
  }

  const status = escapeHtml(releaseReadiness.status || 'unknown');
  const mode = escapeHtml(releaseReadiness.mode || 'development');
  const failures = Number(releaseReadiness.failures || 0);
  const warnings = Number(releaseReadiness.warnings || 0);
  const blockers = Number(releaseReadiness.publicBlockers || 0);
  const blockerItems = Array.isArray(releaseReadiness.checks)
    ? releaseReadiness.checks
        .filter((check) => check.publicBlocker)
        .slice(0, 6)
        .map((check) => `<li>${escapeHtml(check.label)}: ${escapeHtml(check.detail || check.status || 'blocked')}</li>`)
        .join('')
    : '';

  return `<section class="panel" aria-labelledby="readiness">
      <h2 id="readiness">Release Readiness</h2>
      <p><strong>${status}</strong> · ${mode} mode · ${failures} failures · ${warnings} warnings · ${blockers} public blockers</p>
      ${blockerItems ? `<ul>${blockerItems}</ul>` : '<p>No public release blockers were reported by the latest readiness run.</p>'}
    </section>`;
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/[\r\n\t]/g, ' ');
}
