import { _electron as electron } from 'playwright';
import electronPath from 'electron';
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-markdown-viewer-'));
const userDataDir = path.join(tempDir, 'profile');
const testFile = path.join(tempDir, 'e2e-document.md');
const artifactDir = path.join(root, 'test-artifacts');
const screenshotPath = path.join(artifactDir, 'e2e-app.png');
let launchStartedAt = 0;
let fatalLaunchHandled = false;

process.on('uncaughtException', (error) => {
  void handleFatalLaunchError(error);
});

process.on('unhandledRejection', (reason) => {
  void handleFatalLaunchError(reason);
});

const initialMarkdown = `# E2E Document

This file was opened by the Shibanshu Markdown Viewer end-to-end test.

- tools should be connected
- preview should render
`;

const updatedMarkdown = `${initialMarkdown}
## Saved From App

The Save button wrote this line.
`;

await mkdir(artifactDir, { recursive: true });
await writeFile(testFile, initialMarkdown, 'utf8');

let app;
launchStartedAt = Date.now();
try {
  app = await electron.launch({
    executablePath: electronPath,
    args: [`--user-data-dir=${userDataDir}`, root, testFile],
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
    }
  });
} catch (error) {
  if (await shouldSkipMacLaunchFailure(error)) {
    printLaunchSkipWarning();
    process.exit(0);
  }
  throw error;
}

const page = await app.firstWindow();
const pageErrors = [];

page.on('pageerror', (error) => {
  pageErrors.push(error.message);
});

try {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean(window.markdownNative));
  await page.waitForSelector('#markdown-editor');
  await page.waitForSelector('#markdown-editor .cm-content[contenteditable="true"]');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#app')).display === 'grid');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.toolbar')).display === 'flex');
  await page.waitForSelector('#vault-sidebar');
  await page.waitForFunction(() => document.querySelector('#vault-name')?.textContent === 'No folder');
  await page.waitForSelector('#graph-canvas');
  await page.waitForFunction(() => document.querySelector('#graph-summary')?.textContent.includes('Open a folder'));
  await page.waitForFunction(() => document.querySelector('#copy-ai-map')?.disabled === true);
  await page.waitForFunction(() => document.querySelectorAll('svg').length >= 6);
  await page.waitForFunction(() => document.querySelector('#markdown-editor .cm-content')?.textContent.includes('E2E Document'));
  await page.waitForFunction(() => document.querySelector('#markdown-preview h1')?.textContent === 'E2E Document');

  await page.click('[data-view-mode="preview"]');
  await page.waitForFunction(() => document.querySelector('#workspace').classList.contains('preview'));

  await page.click('[data-view-mode="editor"]');
  await page.waitForFunction(() => document.querySelector('#workspace').classList.contains('editor'));

  await page.locator('#markdown-editor .cm-content').fill(updatedMarkdown);
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Unsaved');
  await page.click('#save-file');
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Saved');

  const savedMarkdown = await readFile(testFile, 'utf8');
  if (!savedMarkdown.includes('The Save button wrote this line.')) {
    throw new Error('Save button did not write the edited Markdown back to disk.');
  }

  await page.click('[data-view-mode="split"]');
  await page.waitForFunction(() => document.querySelector('#workspace').classList.contains('split'));
  await page.click('#insert-mind-map');
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Unsaved');
  await page.waitForFunction(() => document.querySelector('#markdown-preview .mermaid-block'));
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (pageErrors.length) {
    throw new Error(`Renderer errors were thrown:\n${pageErrors.join('\n')}`);
  }

  console.log(`Electron E2E passed. Screenshot: ${screenshotPath}`);
} finally {
  await app?.close();
}

function isMacElectronSandboxError(error) {
  const text = `${error?.message || ''}\n${error?.stack || ''}`;
  return (
    text.includes('MachPortRendezvous') ||
    text.includes('bootstrap_check_in') ||
    text.includes('Permission denied (1100)')
  );
}

async function handleFatalLaunchError(error) {
  if (fatalLaunchHandled) return;
  fatalLaunchHandled = true;

  if (await shouldSkipMacLaunchFailure(error)) {
    printLaunchSkipWarning();
    process.exit(0);
  }

  console.error(error);
  process.exit(1);
}

async function shouldSkipMacLaunchFailure(error) {
  const text = `${error?.message || error || ''}\n${error?.stack || ''}`;
  if (isMacElectronSandboxError(error)) return true;
  if (!text.includes('Process failed to launch')) return false;
  return hasRecentMacLaunchEnvironmentCrash((launchStartedAt || Date.now()) - 1000);
}

function printLaunchSkipWarning() {
  console.warn(
    'Electron E2E skipped: macOS denied Electron app registration in this terminal context. Run `npm run diagnose:mac:launch` for the crash classification.'
  );
}

async function hasRecentMacLaunchEnvironmentCrash(cutoffMs) {
  if (process.platform !== 'darwin') return false;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (await findRecentMacLaunchEnvironmentCrash(cutoffMs)) {
      return true;
    }
    await sleep(500);
  }

  return false;
}

async function findRecentMacLaunchEnvironmentCrash(cutoffMs) {
  if (process.platform !== 'darwin') return false;

  const diagnosticDir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');

  let reportNames = [];
  try {
    reportNames = await readdir(diagnosticDir);
  } catch (_error) {
    return false;
  }

  const candidateReports = [];
  for (const name of reportNames) {
    if (!/(?:Electron|Shibanshu Markdown Viewer|Markdown Viewer Mac).*\.ips$/i.test(name)) continue;
    const reportPath = path.join(diagnosticDir, name);
    try {
      const details = await stat(reportPath);
      if (details.mtimeMs >= cutoffMs) {
        candidateReports.push({ path: reportPath, mtimeMs: details.mtimeMs });
      }
    } catch (_error) {
      // Ignore reports that rotated away while scanning.
    }
  }

  candidateReports.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const report of candidateReports.slice(0, 4)) {
    try {
      const text = await readFile(report.path, 'utf8');
      if (
        (text.includes('_RegisterApplication') || text.includes('RegisterApplication')) &&
        (text.includes('SIGABRT') || text.includes('Abort trap: 6') || text.includes('abort() called'))
      ) {
        return true;
      }
    } catch (_error) {
      // Ignore unreadable reports.
    }
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
