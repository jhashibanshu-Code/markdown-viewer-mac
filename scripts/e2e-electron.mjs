import { _electron as electron } from 'playwright';
import electronPath from 'electron';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'shibanshu-markdown-viewer-'));
const userDataDir = path.join(tempDir, 'profile');
const testFile = path.join(tempDir, 'e2e-document.md');
const artifactDir = path.join(root, 'test-artifacts');
const screenshotPath = path.join(artifactDir, 'e2e-app.png');

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

const app = await electron.launch({
  executablePath: electronPath,
  args: [`--user-data-dir=${userDataDir}`, root, testFile],
  cwd: root,
  env: {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
  }
});

const page = await app.firstWindow();
const pageErrors = [];

page.on('pageerror', (error) => {
  pageErrors.push(error.message);
});

try {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean(window.markdownNative));
  await page.waitForSelector('#markdown-editor');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#app')).display === 'grid');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.toolbar')).display === 'flex');
  await page.waitForFunction(() => document.querySelectorAll('svg').length >= 6);
  await page.waitForFunction(() => document.querySelector('#markdown-editor').value.includes('# E2E Document'));
  await page.waitForFunction(() => document.querySelector('#markdown-preview h1')?.textContent === 'E2E Document');

  await page.click('[data-view-mode="preview"]');
  await page.waitForFunction(() => document.querySelector('#workspace').classList.contains('preview'));

  await page.click('[data-view-mode="editor"]');
  await page.waitForFunction(() => document.querySelector('#workspace').classList.contains('editor'));

  await page.fill('#markdown-editor', updatedMarkdown);
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Unsaved');
  await page.click('#save-file');
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Saved');

  const savedMarkdown = await readFile(testFile, 'utf8');
  if (!savedMarkdown.includes('The Save button wrote this line.')) {
    throw new Error('Save button did not write the edited Markdown back to disk.');
  }

  await page.click('[data-view-mode="split"]');
  await page.waitForFunction(() => document.querySelector('#workspace').classList.contains('split'));
  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (pageErrors.length) {
    throw new Error(`Renderer errors were thrown:\n${pageErrors.join('\n')}`);
  }

  console.log(`Electron E2E passed. Screenshot: ${screenshotPath}`);
} finally {
  await app.close();
}
