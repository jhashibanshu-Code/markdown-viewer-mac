const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const markdownExtensions = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt']);
const pendingOpenPaths = [];
const trustedFilePaths = new Set();
const trustedWritablePaths = new Set();
let mainWindow = null;
let rendererIsReady = false;
let appEntryUrl = null;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    title: 'Shibanshu Markdown Viewer',
    show: false,
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppNavigationUrl(url)) return;
    event.preventDefault();
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererIsReady = false;
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const appEntryPath = path.join(__dirname, '..', 'dist', 'index.html');
    appEntryUrl = pathToFileURL(appEntryPath).href;
    mainWindow.loadFile(appEntryPath);
  }

  return mainWindow;
}

function createMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Document', accelerator: 'CmdOrCtrl+N', click: () => sendMenuCommand('new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuCommand('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save') },
        { label: 'Save As...', accelerator: 'Shift+CmdOrCtrl+S', click: () => sendMenuCommand('save-as') },
        { type: 'separator' },
        { label: 'Export HTML...', click: () => sendMenuCommand('export-html') },
        { label: 'Export PDF...', click: () => sendMenuCommand('export-pdf') },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Split', accelerator: 'CmdOrCtrl+1', click: () => sendMenuCommand('view:split') },
        { label: 'Editor', accelerator: 'CmdOrCtrl+2', click: () => sendMenuCommand('view:editor') },
        { label: 'Preview', accelerator: 'CmdOrCtrl+3', click: () => sendMenuCommand('view:preview') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendMenuCommand(command) {
  if (!mainWindow) {
    createMainWindow();
  }
  mainWindow.webContents.send('menu-command', command);
}

function queueOrOpenPaths(pathsToOpen) {
  const normalized = pathsToOpen.filter(Boolean);
  if (!normalized.length) return;

  if (!mainWindow || !rendererIsReady) {
    pendingOpenPaths.push(...normalized);
    return;
  }

  sendOpenedFiles(normalized);
}

async function sendOpenedFiles(pathsToOpen) {
  const files = await readMarkdownFiles(pathsToOpen);
  if (files.length && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-open-files', files);
    mainWindow.focus();
  }
}

async function readMarkdownFiles(pathsToOpen) {
  const uniquePaths = [...new Set(pathsToOpen.map(normalizeFilePath).filter(Boolean))];
  const files = [];

  for (const filePath of uniquePaths) {
    const ext = path.extname(filePath).toLowerCase();
    if (!markdownExtensions.has(ext)) continue;

    try {
      const content = await fs.readFile(filePath, 'utf8');
      rememberTrustedFile(filePath);
      files.push({
        path: filePath,
        name: path.basename(filePath),
        content,
        lastSavedAt: Date.now()
      });
    } catch (error) {
      dialog.showErrorBox('Could not open file', `${filePath}\n\n${error.message}`);
    }
  }

  return files;
}

function normalizeFilePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return null;
  return path.resolve(filePath);
}

function rememberTrustedFile(filePath) {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) return;
  trustedFilePaths.add(normalized);
  trustedWritablePaths.add(normalized);
}

async function saveMarkdownWithDialog(content, defaultPath = 'Untitled.md') {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Markdown',
    defaultPath,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
  });

  if (result.canceled || !result.filePath) return null;

  const normalizedPath = normalizeFilePath(result.filePath);
  await fs.writeFile(normalizedPath, content, 'utf8');
  rememberTrustedFile(normalizedPath);

  return {
    path: normalizedPath,
    name: path.basename(normalizedPath),
    lastSavedAt: Date.now()
  };
}

function parseArgFiles(argv) {
  return argv
    .slice(1)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => path.resolve(arg))
    .filter((arg) => markdownExtensions.has(path.extname(arg).toLowerCase()));
}

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch (_error) {
    return false;
  }
}

function isAppNavigationUrl(url) {
  if (isDev && url.startsWith(process.env.VITE_DEV_SERVER_URL)) return true;
  return Boolean(appEntryUrl && url === appEntryUrl);
}

function buildExportHtml({ title, body, theme, css }) {
  const safeTitle = escapeHtml(title || 'Markdown Export');
  const mode = theme === 'dark' ? 'dark' : 'light';
  const exportCss = sanitizeExportCss(css || '');
  const exportBody = sanitizeExportBody(body || '');

  return `<!doctype html>
<html lang="en" data-theme="${mode}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: ${mode === 'dark' ? '#0f1419' : '#ffffff'};
      --fg: ${mode === 'dark' ? '#e6edf3' : '#24292f'};
      --muted: ${mode === 'dark' ? '#8b949e' : '#57606a'};
      --border: ${mode === 'dark' ? '#30363d' : '#d0d7de'};
      --code-bg: ${mode === 'dark' ? '#161b22' : '#f6f8fa'};
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.58;
    }
    .markdown-body {
      max-width: 920px;
      margin: 0 auto;
      padding: 48px 32px;
      box-sizing: border-box;
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: var(--code-bg);
      border-radius: 6px;
    }
    pre {
      overflow: auto;
      padding: 16px;
      border: 1px solid var(--border);
    }
    code {
      padding: 0.15em 0.35em;
    }
    pre code {
      padding: 0;
      background: transparent;
    }
    blockquote {
      margin-left: 0;
      padding-left: 1rem;
      color: var(--muted);
      border-left: 0.25rem solid var(--border);
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 10px;
    }
    img, svg {
      max-width: 100%;
    }
    ${exportCss}
  </style>
</head>
<body>
  <article class="markdown-body">${exportBody}</article>
</body>
</html>`;
}

function sanitizeExportCss(css) {
  return String(css)
    .replace(/<\/style/gi, '<\\/style')
    .replace(/@import[^;]+;/gi, '');
}

function sanitizeExportBody(body) {
  return String(body)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s(?:href|src)\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/\s(?:href|src)\s*=\s*'javascript:[^']*'/gi, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

ipcMain.handle('dialog:open-markdown', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Markdown',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
      { name: 'Text', extensions: ['txt'] }
    ]
  });

  if (result.canceled) return [];
  return readMarkdownFiles(result.filePaths);
});

ipcMain.handle('file:open-dropped-files', async (_event, pathsToOpen) => {
  if (!Array.isArray(pathsToOpen)) return [];
  return readMarkdownFiles(pathsToOpen);
});

ipcMain.handle('file:save', async (_event, payload) => {
  const filePath = normalizeFilePath(payload?.path);
  const content = String(payload?.content ?? '');

  if (!filePath) {
    throw new Error('Missing file path.');
  }

  if (!trustedWritablePaths.has(filePath)) {
    return saveMarkdownWithDialog(content, filePath);
  }

  await fs.writeFile(filePath, content, 'utf8');
  rememberTrustedFile(filePath);

  return {
    path: filePath,
    name: path.basename(filePath),
    lastSavedAt: Date.now()
  };
});

ipcMain.handle('file:save-as', async (_event, payload) => {
  const content = String(payload?.content ?? '');
  const defaultPath = payload?.defaultPath || 'Untitled.md';
  return saveMarkdownWithDialog(content, defaultPath);
});

ipcMain.handle('file:export-html', async (_event, payload) => {
  const title = payload?.title || 'Markdown Export';
  const defaultPath = payload?.defaultPath || `${title}.html`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export HTML',
    defaultPath,
    filters: [{ name: 'HTML', extensions: ['html'] }]
  });

  if (result.canceled || !result.filePath) return null;

  const html = buildExportHtml({
    title,
    body: String(payload?.body ?? ''),
    theme: payload?.theme,
    css: payload?.css
  });

  await fs.writeFile(result.filePath, html, 'utf8');

  return {
    path: result.filePath,
    name: path.basename(result.filePath),
    lastSavedAt: Date.now()
  };
});

ipcMain.handle('file:export-pdf', async (_event, payload) => {
  const title = payload?.title || 'Markdown Export';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF',
    defaultPath: `${title}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (result.canceled || !result.filePath) return null;

  const exportWindow = new BrowserWindow({
    width: 1024,
    height: 1320,
    show: false,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    const html = buildExportHtml({
      title,
      body: String(payload?.body ?? ''),
      theme: payload?.theme,
      css: payload?.css
    });
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await exportWindow.loadURL(dataUrl);
    const pdf = await exportWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'default'
      }
    });
    await fs.writeFile(result.filePath, pdf);

    return {
      path: result.filePath,
      name: path.basename(result.filePath),
      lastSavedAt: Date.now()
    };
  } finally {
    exportWindow.destroy();
  }
});

ipcMain.handle('file:reveal', async (_event, filePath) => {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath || !trustedFilePaths.has(normalizedPath)) return false;
  shell.showItemInFolder(normalizedPath);
  return true;
});

ipcMain.handle('shell:open-external', async (_event, url) => {
  if (!isSafeExternalUrl(url)) return false;
  await shell.openExternal(url);
  return true;
});

const lock = app.requestSingleInstanceLock();

if (!lock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const files = parseArgFiles(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
    queueOrOpenPaths(files);
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    queueOrOpenPaths([filePath]);
  });

  app.whenReady().then(() => {
    app.setName('Shibanshu Markdown Viewer');
    createMenu();
    createMainWindow();
    queueOrOpenPaths(parseArgFiles(process.argv));
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

ipcMain.on('renderer:ready', async () => {
  rendererIsReady = true;
  if (pendingOpenPaths.length) {
    const pathsToOpen = pendingOpenPaths.splice(0, pendingOpenPaths.length);
    await sendOpenedFiles(pathsToOpen);
  }
});
