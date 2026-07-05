const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const markdownExtensions = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt', '.canvas']);
const ignoredVaultDirectories = new Set([
  '.git',
  '.hg',
  '.svn',
  '.DS_Store',
  'node_modules',
  'dist',
  'release',
  'build',
  '.next',
  '.cache',
  '.obsidian-trash'
]);
const MAX_MARKDOWN_BYTES = 100 * 1024 * 1024;
const MAX_EXPORT_HTML_BYTES = 40 * 1024 * 1024;
const MAX_TEXT_EXPORT_BYTES = 12 * 1024 * 1024;
const MAX_AUTOSAVE_BYTES = 18 * 1024 * 1024;
const MAX_AUTOSAVE_DOCUMENTS = 80;
const MAX_HISTORY_SNAPSHOT_BYTES = 6 * 1024 * 1024;
const MAX_HISTORY_SNAPSHOTS_PER_FILE = 40;
const MAX_PUBLISH_FILES = 3000;
const MAX_PUBLISH_TOTAL_BYTES = 300 * 1024 * 1024;
const MAX_VAULT_FILES = 5000;
const MAX_VAULT_DEPTH = 16;
const MAX_RECENT_ITEMS = 24;
const MAX_RECENT_STORE_BYTES = 128 * 1024;
const WATCH_DEBOUNCE_MS = 350;
const APP_PROTOCOL_SCHEME = 'shibanshu-markdown';
const MAX_PROTOCOL_CONTENT_BYTES = 1024 * 1024;
const MAX_PROTOCOL_TEXT_LENGTH = 1200;
const pendingOpenPaths = [];
const pendingProtocolCommands = [];
const trustedFilePaths = new Set();
const trustedWritablePaths = new Set();
const trustedVaultRoots = new Set();
const watchedFiles = new Map();
const internalWriteSuppressions = new Map();
let mainWindow = null;
let rendererIsReady = false;
let appEntryUrl = null;
let allowWindowClose = false;
let rendererDocumentState = {
  dirtyCount: 0,
  activePath: null,
  activeTitle: 'Untitled.md'
};

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
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

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process ended:', details.reason);
  });

  mainWindow.on('close', (event) => {
    handleWindowClose(event);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererIsReady = false;
    allowWindowClose = false;
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
        { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => sendMenuCommand('new') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuCommand('open') },
        { label: 'Open Folder...', accelerator: 'Shift+CmdOrCtrl+O', click: () => sendMenuCommand('open-vault') },
        { label: 'Commands...', accelerator: 'CmdOrCtrl+K', click: () => sendMenuCommand('command-palette') },
        { label: 'Quick Open...', accelerator: 'CmdOrCtrl+P', click: () => sendMenuCommand('quick-open') },
        { type: 'separator' },
        { label: 'New Note In Folder...', accelerator: 'Alt+CmdOrCtrl+N', click: () => sendMenuCommand('vault:new-file') },
        { label: 'Rename Current Note...', click: () => sendMenuCommand('vault:rename-file') },
        { label: 'Move Current Note to Trash', click: () => sendMenuCommand('vault:delete-file') },
        ...(process.platform === 'darwin'
          ? [
              { role: 'recentDocuments' },
              { role: 'clearRecentDocuments' }
            ]
          : []),
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save') },
        { label: 'Save As...', accelerator: 'Shift+CmdOrCtrl+S', click: () => sendMenuCommand('save-as') },
        { label: 'Version History...', click: () => sendMenuCommand('history:open') },
        { type: 'separator' },
        { label: 'Save HTML...', click: () => sendMenuCommand('export-html') },
        { label: 'Save PDF...', click: () => sendMenuCommand('export-pdf') },
        { label: 'Create Website...', click: () => sendMenuCommand('publish:static-site') },
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
        { type: 'separator' },
        { label: 'Search Files...', accelerator: 'Shift+CmdOrCtrl+F', click: () => sendMenuCommand('search:global') },
        { type: 'separator' },
        {
            label: 'Insert Note Map From Headings',
          accelerator: 'Shift+CmdOrCtrl+M',
          click: () => sendMenuCommand('insert:mind-map')
        },
        { type: 'separator' },
        { role: 'startSpeaking' },
        { role: 'stopSpeaking' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Format',
      submenu: [
        { label: 'Heading 1', accelerator: 'Alt+CmdOrCtrl+H', click: () => sendMenuCommand('format:heading') },
        { type: 'separator' },
        { label: 'Bold', accelerator: 'CmdOrCtrl+B', click: () => sendMenuCommand('format:bold') },
        { label: 'Italic', accelerator: 'CmdOrCtrl+I', click: () => sendMenuCommand('format:italic') },
        { label: 'Inline Code', accelerator: 'Alt+CmdOrCtrl+C', click: () => sendMenuCommand('format:code') },
        { label: 'Insert Link...', accelerator: 'Alt+CmdOrCtrl+L', click: () => sendMenuCommand('format:link') },
        { type: 'separator' },
        { label: 'Block Quote', accelerator: 'Alt+CmdOrCtrl+Q', click: () => sendMenuCommand('format:quote') },
        { label: 'Task List', accelerator: 'Alt+CmdOrCtrl+T', click: () => sendMenuCommand('format:task') },
        { label: 'Insert Table', click: () => sendMenuCommand('format:table') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Write + Read', accelerator: 'CmdOrCtrl+1', click: () => sendMenuCommand('view:split') },
        { label: 'Write', accelerator: 'CmdOrCtrl+2', click: () => sendMenuCommand('view:editor') },
        { label: 'Read', accelerator: 'CmdOrCtrl+3', click: () => sendMenuCommand('view:preview') },
        { label: 'Open Folder Map', accelerator: 'Shift+CmdOrCtrl+G', click: () => sendMenuCommand('graph:open') },
        { label: 'Open Note Map', accelerator: 'Alt+Shift+CmdOrCtrl+M', click: () => sendMenuCommand('mind-map:open') },
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

function queueOrDispatchProtocolCommands(commands) {
  const normalized = commands.filter(Boolean);
  if (!normalized.length) return;

  if (!mainWindow || !rendererIsReady) {
    pendingProtocolCommands.push(...normalized);
    return;
  }

  sendProtocolCommands(normalized);
}

function sendProtocolCommands(commands) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const command of commands) {
    mainWindow.webContents.send('system-url-command', command);
  }
  mainWindow.focus();
}

async function sendOpenedFiles(pathsToOpen) {
  const files = await readMarkdownFiles(pathsToOpen);
  if (files.length && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-open-files', files);
    mainWindow.focus();
  }
}

async function readMarkdownFiles(pathsToOpen, options = {}) {
  const shouldAddRecentDocument = options.addRecentDocument !== false;
  const uniquePaths = [...new Set(pathsToOpen.map(normalizeFilePath).filter(Boolean))];
  const files = [];

  for (const filePath of uniquePaths) {
    const ext = path.extname(filePath).toLowerCase();
    if (!markdownExtensions.has(ext)) continue;

    try {
      const fileState = await getFileState(filePath);
      if (fileState.size > MAX_MARKDOWN_BYTES) {
        throw new Error(`File is larger than ${Math.round(MAX_MARKDOWN_BYTES / 1024 / 1024)} MB.`);
      }
      const content = await fsp.readFile(filePath, 'utf8');
      rememberTrustedFile(filePath);
      watchTrustedFile(filePath);
      if (shouldAddRecentDocument && process.platform === 'darwin') {
        app.addRecentDocument(filePath);
      }
      if (shouldAddRecentDocument) {
        await rememberRecentFile(filePath);
      }
      files.push({
        path: filePath,
        name: path.basename(filePath),
        relativePath: options.rootPath ? path.relative(options.rootPath, filePath) : path.basename(filePath),
        content,
        lastSavedAt: Date.now(),
        fileState
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

function forgetTrustedFile(filePath) {
  const normalized = normalizeFilePath(filePath);
  if (!normalized) return;
  trustedFilePaths.delete(normalized);
  trustedWritablePaths.delete(normalized);
  const watcher = watchedFiles.get(normalized);
  if (watcher) {
    watcher.close();
    watchedFiles.delete(normalized);
  }
  internalWriteSuppressions.delete(normalized);
}

function rememberTrustedVault(rootPath) {
  const normalizedRoot = normalizeFilePath(rootPath);
  if (!normalizedRoot) return;
  trustedVaultRoots.add(normalizedRoot);
}

async function openVaultWithDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Markdown Folder',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths?.[0]) return null;

  const rootPath = normalizeFilePath(result.filePaths[0]);
  rememberTrustedVault(rootPath);
  const filePaths = await discoverVaultMarkdownFiles(rootPath);
  const files = await readMarkdownFiles(filePaths, {
    rootPath,
    addRecentDocument: false
  });

  const vault = {
    path: rootPath,
    name: path.basename(rootPath) || rootPath,
    files
  };
  await rememberRecentVault(rootPath);
  return vault;
}

async function discoverVaultMarkdownFiles(rootPath) {
  const normalizedRoot = normalizeFilePath(rootPath);
  if (!normalizedRoot) return [];

  const stats = await fsp.stat(normalizedRoot);
  if (!stats.isDirectory()) {
    throw new Error('Selected path is not a folder.');
  }

  const files = [];

  async function walk(directory, depth) {
    if (files.length >= MAX_VAULT_FILES || depth > MAX_VAULT_DEPTH) return;

    let entries = [];
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (files.length >= MAX_VAULT_FILES) break;
      if (entry.name.startsWith('.') && entry.name !== '.index.md') continue;

      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (ignoredVaultDirectories.has(entry.name)) continue;
        await walk(entryPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!markdownExtensions.has(ext)) continue;
      files.push(entryPath);
    }
  }

  await walk(normalizedRoot, 0);
  return files;
}

async function saveMarkdownWithDialog(content, defaultPath = 'Untitled.md') {
  const safeContent = coerceTextContent(content);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Markdown',
    defaultPath,
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'JSON Canvas', extensions: ['canvas'] },
      { name: 'Text', extensions: ['txt'] }
    ]
  });

  if (result.canceled || !result.filePath) return null;

  const normalizedPath = normalizeFilePath(result.filePath);
  await snapshotDiskVersion(normalizedPath).catch((error) => {
    console.error('Version history disk snapshot failed:', error);
  });
  markInternalWrite(normalizedPath);
  await atomicWriteFile(normalizedPath, safeContent, 'utf8');
  rememberTrustedFile(normalizedPath);
  watchTrustedFile(normalizedPath);
  if (process.platform === 'darwin') {
    app.addRecentDocument(normalizedPath);
  }
  await rememberRecentFile(normalizedPath);
  const fileState = await getFileState(normalizedPath);
  await recordFileHistorySnapshot(normalizedPath, safeContent, { fileState }).catch((error) => {
    console.error('Version history snapshot failed:', error);
  });

  return {
    path: normalizedPath,
    name: path.basename(normalizedPath),
    lastSavedAt: Date.now(),
    fileState
  };
}

async function atomicWriteFile(filePath, data, encoding) {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempName = `.${baseName}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const tempPath = path.join(directory, tempName);
  let handle = null;

  try {
    handle = await fsp.open(tempPath, 'wx');
    if (Buffer.isBuffer(data)) {
      await handle.writeFile(data);
    } else {
      await handle.writeFile(String(data), encoding);
    }
    await handle.sync();
    await handle.close();
    handle = null;
    await fsp.rename(tempPath, filePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    await fsp.unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function getFileState(filePath) {
  const stats = await fsp.stat(filePath);
  if (!stats.isFile()) {
    throw new Error('Path is not a file.');
  }

  return {
    size: stats.size,
    mtimeMs: Math.round(stats.mtimeMs)
  };
}

function getAutosaveDraftPath() {
  return path.join(app.getPath('userData'), 'autosave-drafts.json');
}

function getVersionHistoryDirectory() {
  return path.join(app.getPath('userData'), 'version-history');
}

function getVersionHistoryPath(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath) {
    throw new Error('Missing file path.');
  }
  const digest = crypto.createHash('sha256').update(normalizedPath).digest('hex');
  return path.join(getVersionHistoryDirectory(), `${digest}.json`);
}

function getRecentStorePath() {
  return path.join(app.getPath('userData'), 'recent-workspaces.json');
}

function createRecentId() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizeRecentItem(item, type) {
  const normalizedPath = normalizeFilePath(item?.path);
  if (!normalizedPath) return null;
  const normalizedType = type || item?.type;
  if (!['file', 'vault'].includes(normalizedType)) return null;

  return {
    id: String(item?.id || createRecentId()).replace(/[^a-f0-9]/gi, '').slice(0, 64) || createRecentId(),
    type: normalizedType,
    path: normalizedPath,
    name: String(item?.name || path.basename(normalizedPath) || normalizedPath).slice(0, 240),
    openedAt: Number(item?.openedAt) || Date.now()
  };
}

function normalizeRecentStore(parsed = {}) {
  const files = Array.isArray(parsed.files) ? parsed.files.map((item) => normalizeRecentItem(item, 'file')).filter(Boolean) : [];
  const vaults = Array.isArray(parsed.vaults) ? parsed.vaults.map((item) => normalizeRecentItem(item, 'vault')).filter(Boolean) : [];
  return {
    version: 1,
    files: dedupeRecentItems(files).slice(0, MAX_RECENT_ITEMS),
    vaults: dedupeRecentItems(vaults).slice(0, MAX_RECENT_ITEMS)
  };
}

function dedupeRecentItems(items) {
  const byPath = new Map();
  for (const item of items.sort((left, right) => right.openedAt - left.openedAt)) {
    if (!byPath.has(item.path)) byPath.set(item.path, item);
  }
  return [...byPath.values()].sort((left, right) => right.openedAt - left.openedAt);
}

async function readRecentStore() {
  const storePath = getRecentStorePath();
  try {
    const stats = await fsp.stat(storePath);
    if (!stats.isFile() || stats.size > MAX_RECENT_STORE_BYTES) return normalizeRecentStore();
    return normalizeRecentStore(JSON.parse(await fsp.readFile(storePath, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return normalizeRecentStore();
    throw error;
  }
}

async function writeRecentStore(store) {
  const normalized = normalizeRecentStore(store);
  const json = JSON.stringify(normalized);
  if (Buffer.byteLength(json, 'utf8') > MAX_RECENT_STORE_BYTES) {
    throw new Error('Recent workspace store is too large.');
  }
  const storePath = getRecentStorePath();
  await fsp.mkdir(path.dirname(storePath), { recursive: true });
  await atomicWriteFile(storePath, json, 'utf8');
  return normalized;
}

async function updateRecentStore(updater) {
  const store = await readRecentStore();
  return writeRecentStore(updater(store) || store);
}

async function rememberRecentFile(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath) return;
  await updateRecentStore((store) => {
    const existing = store.files.find((item) => item.path === normalizedPath);
    const item = normalizeRecentItem(
      {
        id: existing?.id,
        type: 'file',
        path: normalizedPath,
        name: path.basename(normalizedPath),
        openedAt: Date.now()
      },
      'file'
    );
    return {
      ...store,
      files: dedupeRecentItems([item, ...store.files]).slice(0, MAX_RECENT_ITEMS)
    };
  });
}

async function rememberRecentVault(rootPath) {
  const normalizedPath = normalizeFilePath(rootPath);
  if (!normalizedPath) return;
  await updateRecentStore((store) => {
    const existing = store.vaults.find((item) => item.path === normalizedPath);
    const item = normalizeRecentItem(
      {
        id: existing?.id,
        type: 'vault',
        path: normalizedPath,
        name: path.basename(normalizedPath) || normalizedPath,
        openedAt: Date.now()
      },
      'vault'
    );
    return {
      ...store,
      vaults: dedupeRecentItems([item, ...store.vaults]).slice(0, MAX_RECENT_ITEMS)
    };
  });
}

function publicRecentItem(item) {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    path: item.path,
    openedAt: item.openedAt
  };
}

async function listRecentItems() {
  const store = await readRecentStore();
  return {
    files: store.files.map(publicRecentItem),
    vaults: store.vaults.map(publicRecentItem)
  };
}

function findRecentItem(store, type, recentId) {
  const id = String(recentId || '').replace(/[^a-f0-9]/gi, '').slice(0, 64);
  if (!id) return null;
  const source = type === 'vault' ? store.vaults : store.files;
  return source.find((item) => item.id === id) || null;
}

async function openRecentFile(recentId) {
  const store = await readRecentStore();
  const item = findRecentItem(store, 'file', recentId);
  if (!item) return [];
  const files = await readMarkdownFiles([item.path]);
  if (files.length) await rememberRecentFile(item.path);
  return files;
}

async function openRecentVault(recentId) {
  const store = await readRecentStore();
  const item = findRecentItem(store, 'vault', recentId);
  if (!item) return null;
  rememberTrustedVault(item.path);
  const filePaths = await discoverVaultMarkdownFiles(item.path);
  const files = await readMarkdownFiles(filePaths, {
    rootPath: item.path,
    addRecentDocument: false
  });
  await rememberRecentVault(item.path);
  return {
    path: item.path,
    name: item.name || path.basename(item.path) || item.path,
    files
  };
}

function normalizeAutosaveText(value, maxLength = 500) {
  return String(value ?? '').slice(0, maxLength);
}

function normalizeAutosaveDocument(document) {
  const content = coerceTextContent(document?.content);
  return {
    id: normalizeAutosaveText(document?.id || crypto.randomUUID(), 80),
    title: normalizeAutosaveText(document?.title || 'Untitled.md', 240),
    path: document?.path ? normalizeFilePath(document.path) : null,
    relativePath: document?.relativePath ? normalizeAutosaveText(document.relativePath, 600) : null,
    content,
    dirty: true,
    lastSavedAt: Number(document?.lastSavedAt) || null,
    fileState: normalizeFileState(document?.fileState),
    recoveredAt: Number(document?.recoveredAt) || null
  };
}

function normalizeAutosavePayload(payload = {}) {
  const documents = Array.isArray(payload.documents)
    ? payload.documents.slice(0, MAX_AUTOSAVE_DOCUMENTS).filter((document) => document?.dirty).map(normalizeAutosaveDocument)
    : [];
  const activeVault =
    payload.activeVault && typeof payload.activeVault === 'object'
      ? {
          path: payload.activeVault.path ? normalizeFilePath(payload.activeVault.path) : null,
          name: normalizeAutosaveText(payload.activeVault.name, 240),
          openedAt: Number(payload.activeVault.openedAt) || null
        }
      : null;

  return {
    version: 1,
    savedAt: Date.now(),
    activeDocumentId: normalizeAutosaveText(payload.activeDocumentId, 80),
    activeVault,
    documents
  };
}

async function saveAutosaveDrafts(payload) {
  const drafts = normalizeAutosavePayload(payload);
  const draftPath = getAutosaveDraftPath();

  if (!drafts.documents.length) {
    await fsp.unlink(draftPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    return { saved: false, documents: 0 };
  }

  const json = JSON.stringify(drafts);
  if (Buffer.byteLength(json, 'utf8') > MAX_AUTOSAVE_BYTES) {
    throw new Error(`Autosave draft set is larger than ${Math.round(MAX_AUTOSAVE_BYTES / 1024 / 1024)} MB.`);
  }

  await fsp.mkdir(path.dirname(draftPath), { recursive: true });
  await atomicWriteFile(draftPath, json, 'utf8');
  return {
    saved: true,
    savedAt: drafts.savedAt,
    documents: drafts.documents.length
  };
}

async function readAutosaveDrafts() {
  const draftPath = getAutosaveDraftPath();
  let raw = '';
  try {
    const stats = await fsp.stat(draftPath);
    if (!stats.isFile() || stats.size > MAX_AUTOSAVE_BYTES) return null;
    raw = await fsp.readFile(draftPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }

  const parsed = JSON.parse(raw);
  const normalized = normalizeAutosavePayload(parsed);
  normalized.savedAt = Number(parsed.savedAt) || Date.now();
  return normalized.documents.length ? normalized : null;
}

async function clearAutosaveDrafts() {
  await fsp.unlink(getAutosaveDraftPath()).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  return { cleared: true };
}

function assertTrustedHistoryFile(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath || !trustedFilePaths.has(normalizedPath)) {
    throw new Error('File history is available only for trusted open files.');
  }
  return normalizedPath;
}

function makeHistorySnapshotId(filePath, savedAt, contentHash) {
  return crypto.createHash('sha256').update(`${filePath}:${savedAt}:${contentHash}`).digest('hex').slice(0, 24);
}

function normalizeHistorySnapshot(filePath, content, options = {}) {
  const text = String(content ?? '');
  const byteLength = Buffer.byteLength(text, 'utf8');
  if (byteLength > MAX_HISTORY_SNAPSHOT_BYTES) {
    return null;
  }

  const savedAt = Number(options.savedAt) || Date.now();
  const contentHash = crypto.createHash('sha256').update(text).digest('hex');

  return {
    id: makeHistorySnapshotId(filePath, savedAt, contentHash),
    savedAt,
    path: filePath,
    name: path.basename(filePath),
    bytes: byteLength,
    contentHash,
    content: text,
    fileState: normalizeFileState(options.fileState)
  };
}

function normalizeHistoryStore(filePath, parsed = {}) {
  const normalizedPath = normalizeFilePath(parsed.filePath || filePath);
  const snapshots = Array.isArray(parsed.snapshots)
    ? parsed.snapshots
        .map((snapshot) => {
          const content = String(snapshot?.content ?? '');
          const byteLength = Buffer.byteLength(content, 'utf8');
          if (byteLength > MAX_HISTORY_SNAPSHOT_BYTES) return null;
          const savedAt = Number(snapshot?.savedAt) || Date.now();
          const contentHash = /^[a-f0-9]{64}$/i.test(snapshot?.contentHash || '')
            ? snapshot.contentHash
            : crypto.createHash('sha256').update(content).digest('hex');
          return {
            id: String(snapshot?.id || makeHistorySnapshotId(normalizedPath, savedAt, contentHash)).slice(0, 80),
            savedAt,
            path: normalizedPath,
            name: path.basename(normalizedPath),
            bytes: byteLength,
            contentHash,
            content,
            fileState: normalizeFileState(snapshot?.fileState)
          };
        })
        .filter(Boolean)
    : [];

  return {
    version: 1,
    filePath: normalizedPath,
    snapshots: snapshots
      .sort((left, right) => right.savedAt - left.savedAt)
      .slice(0, MAX_HISTORY_SNAPSHOTS_PER_FILE)
  };
}

async function readHistoryStore(filePath) {
  const historyPath = getVersionHistoryPath(filePath);
  try {
    const raw = await fsp.readFile(historyPath, 'utf8');
    return normalizeHistoryStore(filePath, JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return normalizeHistoryStore(filePath);
    }
    throw error;
  }
}

async function writeHistoryStore(filePath, store) {
  const historyPath = getVersionHistoryPath(filePath);
  await fsp.mkdir(path.dirname(historyPath), { recursive: true });
  await atomicWriteFile(historyPath, JSON.stringify(normalizeHistoryStore(filePath, store)), 'utf8');
}

async function recordFileHistorySnapshot(filePath, content, options = {}) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath) return { saved: false, reason: 'missing-path' };

  const snapshot = normalizeHistorySnapshot(normalizedPath, content, options);
  if (!snapshot) return { saved: false, reason: 'too-large' };

  const store = await readHistoryStore(normalizedPath);
  if (store.snapshots[0]?.contentHash === snapshot.contentHash) {
    return { saved: false, reason: 'duplicate' };
  }

  const nextStore = normalizeHistoryStore(normalizedPath, {
    ...store,
    snapshots: [snapshot, ...store.snapshots.filter((entry) => entry.contentHash !== snapshot.contentHash)]
  });

  await writeHistoryStore(normalizedPath, nextStore);
  return { saved: true, snapshot: snapshot.id };
}

async function snapshotDiskVersion(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath) return { saved: false, reason: 'missing-path' };

  try {
    const fileState = await getFileState(normalizedPath);
    if (fileState.size > MAX_HISTORY_SNAPSHOT_BYTES) {
      return { saved: false, reason: 'too-large' };
    }
    const content = await fsp.readFile(normalizedPath, 'utf8');
    return recordFileHistorySnapshot(normalizedPath, content, { fileState });
  } catch (error) {
    if (error.code === 'ENOENT') return { saved: false, reason: 'missing-file' };
    throw error;
  }
}

async function listFileHistory(filePath) {
  const normalizedPath = assertTrustedHistoryFile(filePath);
  const store = await readHistoryStore(normalizedPath);
  return {
    path: normalizedPath,
    name: path.basename(normalizedPath),
    snapshots: store.snapshots.map((snapshot) => ({
      id: snapshot.id,
      savedAt: snapshot.savedAt,
      name: snapshot.name,
      bytes: snapshot.bytes,
      fileState: snapshot.fileState
    }))
  };
}

async function readFileHistorySnapshot({ path: filePath, id }) {
  const normalizedPath = assertTrustedHistoryFile(filePath);
  const snapshotId = String(id || '').slice(0, 80);
  if (!snapshotId) {
    throw new Error('Missing snapshot id.');
  }

  const store = await readHistoryStore(normalizedPath);
  const snapshot = store.snapshots.find((entry) => entry.id === snapshotId);
  if (!snapshot) {
    throw new Error('Version history snapshot was not found.');
  }

  return {
    id: snapshot.id,
    path: normalizedPath,
    name: snapshot.name,
    savedAt: snapshot.savedAt,
    bytes: snapshot.bytes,
    content: snapshot.content,
    fileState: snapshot.fileState
  };
}

function normalizeFileState(fileState) {
  if (!fileState || typeof fileState !== 'object') return null;
  const size = Number(fileState.size);
  const mtimeMs = Number(fileState.mtimeMs);
  if (!Number.isFinite(size) || !Number.isFinite(mtimeMs)) return null;
  return {
    size,
    mtimeMs: Math.round(mtimeMs)
  };
}

function fileStatesMatch(left, right) {
  const a = normalizeFileState(left);
  const b = normalizeFileState(right);
  return Boolean(a && b && a.size === b.size && a.mtimeMs === b.mtimeMs);
}

async function fileChangedOnDisk(filePath, lastKnownFileState) {
  const expected = normalizeFileState(lastKnownFileState);
  if (!expected) return false;
  try {
    const current = await getFileState(filePath);
    return !fileStatesMatch(current, expected);
  } catch (_error) {
    return true;
  }
}

function coerceTextContent(value) {
  const text = String(value ?? '');
  if (Buffer.byteLength(text, 'utf8') > MAX_MARKDOWN_BYTES) {
    throw new Error(`Document is larger than ${Math.round(MAX_MARKDOWN_BYTES / 1024 / 1024)} MB.`);
  }
  return text;
}

function coerceExportText(value) {
  const text = String(value ?? '');
  if (Buffer.byteLength(text, 'utf8') > MAX_EXPORT_HTML_BYTES) {
    throw new Error(`Export content is larger than ${Math.round(MAX_EXPORT_HTML_BYTES / 1024 / 1024)} MB.`);
  }
  return text;
}

function coerceTextExportContent(value) {
  const text = String(value ?? '');
  if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_EXPORT_BYTES) {
    throw new Error(`Text export is larger than ${Math.round(MAX_TEXT_EXPORT_BYTES / 1024 / 1024)} MB.`);
  }
  return text;
}

function normalizeTextExportPayload(payload = {}) {
  const formatConfig = {
    json: { name: 'JSON', extensions: ['json'] },
    svg: { name: 'SVG', extensions: ['svg'] },
    md: { name: 'Markdown', extensions: ['md', 'markdown'] },
    txt: { name: 'Text', extensions: ['txt'] }
  };
  const requestedFormat = String(payload.format || '').toLowerCase();
  const format = Object.hasOwn(formatConfig, requestedFormat) ? requestedFormat : 'txt';
  const extension = formatConfig[format].extensions[0];
  const defaultPath = String(payload.defaultPath || `Shibanshu Graph.${extension}`)
    .replace(/[\\/:\0]/g, '-')
    .slice(0, 180);
  return {
    title: normalizePublishText(payload.title || 'Export Text', 120),
    defaultPath,
    filters: [formatConfig[format]],
    content: coerceTextExportContent(payload.content)
  };
}

function resolveTrustedVaultPath(rootPath, relativePath) {
  const normalizedRoot = normalizeFilePath(rootPath);
  if (!normalizedRoot || !trustedVaultRoots.has(normalizedRoot)) {
    throw new Error('Vault root is not trusted. Reopen the folder and try again.');
  }

  const relative = String(relativePath || '').replaceAll('\\', '/').trim();
  if (!relative || relative.startsWith('/') || /^[a-z]:/i.test(relative)) {
    throw new Error('Missing or invalid vault-relative path.');
  }

  const normalizedRelative = path.posix.normalize(relative);
  if (
    normalizedRelative === '.' ||
    normalizedRelative.startsWith('../') ||
    normalizedRelative.includes('/../') ||
    normalizedRelative.endsWith('/..')
  ) {
    throw new Error('Vault path cannot escape the open folder.');
  }

  const extension = path.extname(normalizedRelative).toLowerCase();
  if (!markdownExtensions.has(extension)) {
    throw new Error('Vault file operations are limited to Markdown, text, and Canvas files.');
  }

  const fullPath = normalizeFilePath(path.join(normalizedRoot, ...normalizedRelative.split('/')));
  const relativeFromRoot = path.relative(normalizedRoot, fullPath);
  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error('Vault path cannot escape the open folder.');
  }

  return {
    rootPath: normalizedRoot,
    filePath: fullPath,
    relativePath: relativeFromRoot
  };
}

function sanitizeVaultRelativePath(value) {
  const raw = String(value || '').replaceAll('\\', '/').trim();
  const extension = path.extname(raw);
  const withExtension = extension ? raw : `${raw}.md`;
  return withExtension
    .split('/')
    .map((segment) => segment.trim().replace(/[<>:"|?*\u0000-\u001f]/g, '-'))
    .filter(Boolean)
    .join('/');
}

async function makeOpenedFileRecord(filePath, rootPath) {
  const fileState = await getFileState(filePath);
  const content = await fsp.readFile(filePath, 'utf8');
  rememberTrustedFile(filePath);
  watchTrustedFile(filePath);
  if (process.platform === 'darwin') {
    app.addRecentDocument(filePath);
  }

  return {
    path: filePath,
    name: path.basename(filePath),
    relativePath: rootPath ? path.relative(rootPath, filePath) : path.basename(filePath),
    content,
    lastSavedAt: Date.now(),
    fileState
  };
}

async function createVaultFile({ rootPath, relativePath, content = '' }) {
  const safeRelativePath = sanitizeVaultRelativePath(relativePath);
  const target = resolveTrustedVaultPath(rootPath, safeRelativePath);

  try {
    try {
      await fsp.access(target.filePath);
      throw new Error('A file already exists at that path.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    await fsp.mkdir(path.dirname(target.filePath), { recursive: true });
    markInternalWrite(target.filePath);
    await atomicWriteFile(target.filePath, coerceTextContent(content), 'utf8');
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('A file already exists at that path.');
    }
    throw error;
  }

  return makeOpenedFileRecord(target.filePath, target.rootPath);
}

async function renameVaultFile({ rootPath, currentRelativePath, nextRelativePath }) {
  const source = resolveTrustedVaultPath(rootPath, currentRelativePath);
  const target = resolveTrustedVaultPath(rootPath, sanitizeVaultRelativePath(nextRelativePath));

  if (source.filePath === target.filePath) {
    return makeOpenedFileRecord(source.filePath, source.rootPath);
  }

  if (!trustedFilePaths.has(source.filePath)) {
    throw new Error('Source file is not part of the trusted vault index.');
  }

  await getFileState(source.filePath);

  try {
    await fsp.access(target.filePath);
    throw new Error('A file already exists at the new path.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fsp.mkdir(path.dirname(target.filePath), { recursive: true });
  markInternalWrite(source.filePath);
  markInternalWrite(target.filePath);
  await fsp.rename(source.filePath, target.filePath);
  forgetTrustedFile(source.filePath);

  return makeOpenedFileRecord(target.filePath, target.rootPath);
}

async function deleteVaultFile({ rootPath, relativePath }) {
  const target = resolveTrustedVaultPath(rootPath, relativePath);

  if (!trustedFilePaths.has(target.filePath)) {
    throw new Error('File is not part of the trusted vault index.');
  }

  await getFileState(target.filePath);
  markInternalWrite(target.filePath);
  await shell.trashItem(target.filePath);
  forgetTrustedFile(target.filePath);

  return {
    path: target.filePath,
    relativePath: target.relativePath
  };
}

function makeConflictCopyPath(filePath) {
  const directory = path.dirname(filePath);
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension);
  return path.join(directory, `${baseName} conflict copy${extension || '.md'}`);
}

function parseArgFiles(argv) {
  return argv
    .slice(1)
    .filter((arg) => !arg.startsWith('-'))
    .map((arg) => path.resolve(arg))
    .filter((arg) => markdownExtensions.has(path.extname(arg).toLowerCase()));
}

function parseArgProtocolCommands(argv) {
  return argv.map(parseProtocolUrl).filter(Boolean);
}

function parseProtocolUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''));
    if (parsed.protocol !== `${APP_PROTOCOL_SCHEME}:`) return null;

    const action = normalizeProtocolAction(parsed.hostname || parsed.pathname.split('/').filter(Boolean)[0]);
    const params = parsed.searchParams;

    if (action === 'new') {
      return {
        type: 'new',
        title: normalizeProtocolText(params.get('title') || params.get('name') || 'URL Note.md', 240),
        content: coerceProtocolContent(params.get('content') || params.get('body') || '')
      };
    }

    if (action === 'search') {
      return {
        type: 'search',
        query: normalizeProtocolText(params.get('q') || params.get('query') || '', 500)
      };
    }

    if (action === 'open') {
      return { type: 'open-dialog' };
    }

    if (action === 'open-vault' || action === 'vault') {
      return { type: 'open-vault-dialog' };
    }

    if (action === 'command-palette' || action === 'commands') {
      return { type: 'command-palette' };
    }

    if (action === 'graph') {
      return { type: 'graph' };
    }

    if (action === 'workflow') {
      return {
        type: 'workflow',
        surface: normalizeProtocolText(params.get('surface') || ''),
        target: normalizeProtocolText(params.get('target') || params.get('note') || ''),
        path: normalizeProtocolText(params.get('path') || ''),
        query: normalizeProtocolText(params.get('query') || params.get('q') || ''),
        mode: normalizeProtocolText(params.get('mode') || params.get('graph') || params.get('graph-mode') || ''),
        space: normalizeProtocolText(params.get('space') || params.get('full-graph-space') || ''),
        open: normalizeProtocolBoolean(params.get('open') || '')
      };
    }

    if (action === 'mind-map' || action === 'mindmap') {
      return { type: 'mind-map' };
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function normalizeProtocolAction(value) {
  return String(value || '')
    .replaceAll('_', '-')
    .trim()
    .toLowerCase();
}

function normalizeProtocolText(value, maxLength = MAX_PROTOCOL_TEXT_LENGTH) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function normalizeProtocolBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'open' || normalized === 'on';
}

function coerceProtocolContent(value) {
  const text = String(value ?? '').replace(/\u0000/g, '');
  if (Buffer.byteLength(text, 'utf8') > MAX_PROTOCOL_CONTENT_BYTES) {
    throw new Error(`URL content is larger than ${Math.round(MAX_PROTOCOL_CONTENT_BYTES / 1024 / 1024)} MB.`);
  }
  return text;
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
  return Boolean(appEntryUrl && (url === appEntryUrl || url.startsWith(`${appEntryUrl}#`)));
}

function registerProtocolClient() {
  try {
    if (process.defaultApp) {
      const appPath = process.argv[1] ? path.resolve(process.argv[1]) : process.cwd();
      app.setAsDefaultProtocolClient(APP_PROTOCOL_SCHEME, process.execPath, [appPath]);
      return;
    }
    app.setAsDefaultProtocolClient(APP_PROTOCOL_SCHEME);
  } catch (error) {
    console.error(`Could not register ${APP_PROTOCOL_SCHEME} URL scheme:`, error.message);
  }
}

function handleWindowClose(event) {
  if (allowWindowClose || !rendererDocumentState.dirtyCount || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  event.preventDefault();

  const dirtyCount = rendererDocumentState.dirtyCount;
  dialog
    .showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Review Documents', 'Close Without Saving'],
      defaultId: 0,
      cancelId: 0,
      message: dirtyCount === 1 ? 'One document has unsaved changes.' : `${dirtyCount} documents have unsaved changes.`,
      detail: 'Review the documents to save your work, or close without saving to discard unsaved edits.'
    })
    .then(({ response }) => {
      if (response !== 1 || !mainWindow || mainWindow.isDestroyed()) return;
      allowWindowClose = true;
      mainWindow.close();
    })
    .catch((error) => {
      console.error('Close confirmation failed:', error);
    });
}

function updateNativeDocumentState(nextState = {}) {
  rendererDocumentState = {
    dirtyCount: Math.max(0, Number(nextState.dirtyCount) || 0),
    activePath: normalizeFilePath(nextState.activePath) || null,
    activeTitle: String(nextState.activeTitle || 'Untitled.md').slice(0, 200)
  };

  if (!mainWindow || mainWindow.isDestroyed()) return;

  const isDirty = rendererDocumentState.dirtyCount > 0;
  mainWindow.setDocumentEdited(isDirty);
  mainWindow.setRepresentedFilename(rendererDocumentState.activePath || '');
  mainWindow.setTitle(`${isDirty ? '* ' : ''}${rendererDocumentState.activeTitle} - Shibanshu Markdown Viewer`);
}

function watchTrustedFile(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath || watchedFiles.has(normalizedPath)) return;

  try {
    let timer = null;
    const watcher = fs.watch(normalizedPath, { persistent: false }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        notifyExternalFileChange(normalizedPath);
      }, WATCH_DEBOUNCE_MS);
    });

    watcher.on('error', () => {
      watcher.close();
      watchedFiles.delete(normalizedPath);
    });

    watchedFiles.set(normalizedPath, watcher);
  } catch (_error) {
    // File watching is best effort; save-time conflict detection still protects data.
  }
}

async function notifyExternalFileChange(filePath) {
  if (!mainWindow || mainWindow.isDestroyed() || !trustedFilePaths.has(filePath)) return;
  if (Date.now() < (internalWriteSuppressions.get(filePath) || 0)) return;
  internalWriteSuppressions.delete(filePath);

  let fileState = null;
  let exists = true;
  try {
    fileState = await getFileState(filePath);
  } catch (_error) {
    exists = false;
  }

  mainWindow.webContents.send('file:external-change', {
    path: filePath,
    exists,
    fileState
  });
}

function markInternalWrite(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath) return;
  internalWriteSuppressions.set(normalizedPath, Date.now() + 1500);
}

function handleApp(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    assertTrustedSender(event);
    return handler(event, ...args);
  });
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!isAppNavigationUrl(senderUrl)) {
    throw new Error('Rejected native request from an untrusted renderer.');
  }
}

function buildExportHtml({ title, body, theme, css }) {
  const safeTitle = escapeHtml(title || 'Markdown Export');
  const mode = theme === 'dark' ? 'dark' : 'light';
  const exportCss = sanitizeExportCss(coerceExportText(css || ''));
  const exportBody = sanitizeExportBody(coerceExportText(body || ''));

  return `<!doctype html>
<html lang="en" data-theme="${mode}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;" />
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

async function publishStaticSite(payload = {}) {
  const site = normalizePublishPayload(payload);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Create Website',
    buttonLabel: 'Create Site',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths?.[0]) return null;

  const outputRoot = normalizeFilePath(result.filePaths[0]);
  await fsp.mkdir(outputRoot, { recursive: true });

  const writes = [
    ['index.html', buildPublishIndexHtml(site)],
    ['assets/site.css', buildPublishCss(site)],
    ['assets/site.js', buildPublishJs()],
    ['assets/site-data.js', buildPublishDataJs(site)],
    ['assets/graph.json', JSON.stringify(site.graph, null, 2)]
  ];

  for (const file of site.files) {
    writes.push([file.url, buildPublishPageHtml(site, file)]);
  }

  for (const [relativePath, content] of writes) {
    await writePublishFile(outputRoot, relativePath, content);
  }

  return {
    path: outputRoot,
    indexPath: path.join(outputRoot, 'index.html'),
    files: site.files.length,
    writtenFiles: writes.length,
    name: path.basename(outputRoot) || outputRoot,
    lastSavedAt: Date.now()
  };
}

function normalizePublishPayload(payload = {}) {
  const files = Array.isArray(payload.files) ? payload.files : [];
  if (!files.length) {
    throw new Error('Open a vault before publishing a static site.');
  }
  if (files.length > MAX_PUBLISH_FILES) {
    throw new Error(`Static publish is limited to ${MAX_PUBLISH_FILES} files.`);
  }

  const safeFiles = [];
  const routeSet = new Set();
  let totalBytes = 0;

  for (const file of files) {
    const url = normalizePublishRoute(file?.url);
    if (routeSet.has(url)) {
      throw new Error(`Duplicate publish route: ${url}`);
    }
    routeSet.add(url);

    const body = sanitizeExportBody(coerceExportText(file?.body || ''));
    const text = normalizePublishText(file?.text, 12000);
    const excerpt = normalizePublishText(file?.excerpt, 500);
    totalBytes += Buffer.byteLength(body, 'utf8') + Buffer.byteLength(text, 'utf8');
    if (totalBytes > MAX_PUBLISH_TOTAL_BYTES) {
      throw new Error(`Static publish is larger than ${Math.round(MAX_PUBLISH_TOTAL_BYTES / 1024 / 1024)} MB.`);
    }

    safeFiles.push({
      id: normalizePublishText(file?.id || url, 800),
      title: normalizePublishText(file?.title || path.basename(url, '.html'), 240),
      relativePath: normalizePublishText(file?.relativePath || file?.title || url, 800),
      url,
      body,
      text,
      excerpt,
      words: Math.max(0, Math.round(Number(file?.words) || 0)),
      headings: normalizePublishList(file?.headings, 60, (heading) => ({
        text: normalizePublishText(heading?.text || heading, 180),
        level: Math.min(6, Math.max(1, Math.round(Number(heading?.level) || 1)))
      })),
      tags: normalizePublishList(file?.tags, 60, (tag) => normalizePublishText(tag, 80)).filter(Boolean),
      outgoing: normalizePublishLinks(file?.outgoing),
      backlinks: normalizePublishLinks(file?.backlinks)
    });
  }

  const fileByUrl = new Map(safeFiles.map((file) => [file.url, file]));
  for (const file of safeFiles) {
    file.outgoing = file.outgoing.filter((link) => !link.url || fileByUrl.has(link.url));
    file.backlinks = file.backlinks.filter((link) => !link.url || fileByUrl.has(link.url));
  }

  return {
    version: 1,
    title: normalizePublishText(payload.title || 'Markdown Site', 180),
    theme: payload.theme === 'dark' ? 'dark' : 'light',
    generatedAt: normalizePublishText(payload.generatedAt || new Date().toISOString(), 80),
    css: sanitizeExportCss(coerceExportText(payload.css || '')),
    files: safeFiles,
    graph: normalizePublishGraph(payload.graph, fileByUrl)
  };
}

function normalizePublishLinks(value) {
  return normalizePublishList(value, 120, (link) => {
    const url = link?.url ? normalizePublishRoute(link.url) : '';
    return {
      title: normalizePublishText(link?.title || link?.label || link?.relativePath || url, 240),
      relativePath: normalizePublishText(link?.relativePath || link?.path || '', 800),
      url,
      label: normalizePublishText(link?.label || link?.title || '', 240)
    };
  });
}

function normalizePublishGraph(graph = {}, fileByUrl) {
  const nodes = Array.isArray(graph.nodes)
    ? graph.nodes
        .map((node) => {
          const url = node?.url ? normalizePublishRoute(node.url) : '';
          if (!url || !fileByUrl.has(url)) return null;
          const file = fileByUrl.get(url);
          return {
            id: url,
            label: normalizePublishText(node?.label || file.title, 240),
            title: normalizePublishText(node?.title || file.title, 240),
            relativePath: normalizePublishText(node?.relativePath || file.relativePath, 800),
            url,
            incoming: Math.max(0, Math.round(Number(node?.incoming) || 0)),
            outgoing: Math.max(0, Math.round(Number(node?.outgoing) || 0))
          };
        })
        .filter(Boolean)
    : [...fileByUrl.values()].map((file) => ({
        id: file.url,
        label: file.title,
        title: file.title,
        relativePath: file.relativePath,
        url: file.url,
        incoming: file.backlinks.length,
        outgoing: file.outgoing.length
      }));

  const nodeUrls = new Set(nodes.map((node) => node.url));
  const edgeKeys = new Set();
  const edges = Array.isArray(graph.edges)
    ? graph.edges
        .map((edge) => {
          const source = edge?.source ? normalizePublishRoute(edge.source) : '';
          const target = edge?.target ? normalizePublishRoute(edge.target) : '';
          if (!nodeUrls.has(source) || !nodeUrls.has(target) || source === target) return null;
          const key = `${source}->${target}`;
          if (edgeKeys.has(key)) return null;
          edgeKeys.add(key);
          return {
            source,
            target,
            label: normalizePublishText(edge?.label || edge?.text || '', 180)
          };
        })
        .filter(Boolean)
    : [];

  return {
    nodes,
    edges,
    unresolvedLinks: normalizePublishList(graph.unresolvedLinks, 200, (link) => ({
      source: link?.source ? normalizePublishRoute(link.source) : '',
      target: normalizePublishText(link?.target, 240),
      label: normalizePublishText(link?.label || link?.text || '', 180)
    })).filter((link) => link.source && nodeUrls.has(link.source) && link.target)
  };
}

function normalizePublishList(value, maxItems, mapper) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(mapper).filter(Boolean);
}

function normalizePublishText(value, maxLength) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function normalizePublishRoute(value) {
  const route = String(value || '').replaceAll('\\', '/').trim();
  if (!route || route.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(route)) {
    throw new Error('Invalid publish route.');
  }

  const normalized = path.posix.normalize(route);
  if (
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    path.posix.extname(normalized).toLowerCase() !== '.html'
  ) {
    throw new Error('Publish route must be a safe relative HTML path.');
  }

  return normalized;
}

async function writePublishFile(outputRoot, relativePath, content) {
  const filePath = resolvePublishOutputPath(outputRoot, relativePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await atomicWriteFile(filePath, content, 'utf8');
}

function resolvePublishOutputPath(outputRoot, relativePath) {
  const normalizedRoot = normalizeFilePath(outputRoot);
  if (!normalizedRoot) {
    throw new Error('Missing static publish output folder.');
  }

  const relative = String(relativePath || '').replaceAll('\\', '/').trim();
  if (!relative || relative.startsWith('/') || /^[a-z]:/i.test(relative)) {
    throw new Error('Invalid static publish output path.');
  }

  const normalizedRelative = path.posix.normalize(relative);
  if (
    normalizedRelative === '.' ||
    normalizedRelative.startsWith('../') ||
    normalizedRelative.includes('/../') ||
    normalizedRelative.endsWith('/..')
  ) {
    throw new Error('Static publish output cannot escape the selected folder.');
  }

  const target = path.join(normalizedRoot, ...normalizedRelative.split('/'));
  const relativeFromRoot = path.relative(normalizedRoot, target);
  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error('Static publish output cannot escape the selected folder.');
  }
  return target;
}

function buildPublishIndexHtml(site) {
  const fileCards = site.files
    .map((file) => {
      return `<article class="publish-card">
        <a href="${escapeAttribute(file.url)}">${escapeHtml(file.title)}</a>
        <p>${escapeHtml(file.excerpt || 'No preview text.')}</p>
        <small>${escapeHtml(file.relativePath)} · ${file.words} words</small>
      </article>`;
    })
    .join('');

  return buildPublishShell({
    site,
    currentUrl: 'index.html',
    title: site.title,
    body: `<section class="publish-hero">
        <p class="publish-kicker">Local static publish</p>
        <h1>${escapeHtml(site.title)}</h1>
        <p>${site.files.length} notes exported with backlinks, search data, and graph context.</p>
      </section>
      <section class="publish-search-panel" aria-labelledby="publish-search-heading">
        <h2 id="publish-search-heading">Search</h2>
        <label class="publish-search">
          <span>Search notes</span>
          <input id="publish-search-input" type="search" autocomplete="off" />
        </label>
        <div id="publish-search-results" class="publish-results"></div>
      </section>
      <section class="publish-graph-panel" aria-labelledby="publish-graph-heading">
        <div>
          <h2 id="publish-graph-heading">Graph</h2>
          <p>${site.graph.nodes.length} notes · ${site.graph.edges.length} links</p>
        </div>
        <div id="publish-graph" class="publish-graph" role="img" aria-label="Published note graph"></div>
      </section>
      <section class="publish-card-grid" aria-label="Published notes">${fileCards}</section>`
  });
}

function buildPublishPageHtml(site, file) {
  const backlinks = renderPublishLinkList(site, file.url, file.backlinks, 'No backlinks in this export.');
  const outgoing = renderPublishLinkList(site, file.url, file.outgoing, 'No outgoing note links.');
  const headings = file.headings.length
    ? `<ol>${file.headings
        .map((heading) => `<li class="publish-depth-${heading.level}">${escapeHtml(heading.text)}</li>`)
        .join('')}</ol>`
    : '<p>No headings found.</p>';
  const tags = file.tags.length
    ? `<div class="publish-tags">${file.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';

  return buildPublishShell({
    site,
    currentUrl: file.url,
    title: `${file.title} - ${site.title}`,
    body: `<article class="publish-note">
        <header class="publish-note-header">
          <p class="publish-kicker">${escapeHtml(file.relativePath)}</p>
          <h1>${escapeHtml(file.title)}</h1>
          <p>${file.words} words · ${file.backlinks.length} backlinks · ${file.outgoing.length} links</p>
          ${tags}
        </header>
        <div class="markdown-body">${file.body}</div>
      </article>
      <aside class="publish-note-aside">
        <section>
          <h2>Outline</h2>
          ${headings}
        </section>
        <section>
          <h2>Backlinks</h2>
          ${backlinks}
        </section>
        <section>
          <h2>Outgoing</h2>
          ${outgoing}
        </section>
      </aside>`
  });
}

function buildPublishShell({ site, currentUrl, title, body }) {
  const mode = site.theme === 'dark' ? 'dark' : 'light';
  const assetPrefix = currentUrl === 'index.html' ? 'assets' : '../assets';
  const indexHref = relativizePublishUrl(currentUrl, 'index.html');
  const sidebar = site.files
    .map((file) => {
      const active = file.url === currentUrl ? ' active' : '';
      return `<a class="publish-nav-link${active}" href="${escapeAttribute(relativizePublishUrl(currentUrl, file.url))}">
        <span>${escapeHtml(file.title)}</span>
        <small>${escapeHtml(file.relativePath)}</small>
      </a>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en" data-theme="${mode}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${buildPublishCsp()}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="Shibanshu Markdown Viewer" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${assetPrefix}/site.css" />
  <script defer src="${assetPrefix}/site-data.js"></script>
  <script defer src="${assetPrefix}/site.js"></script>
</head>
<body data-current-url="${escapeAttribute(currentUrl)}">
  <div class="publish-layout">
    <aside class="publish-sidebar">
      <a class="publish-site-title" href="${escapeAttribute(indexHref)}">${escapeHtml(site.title)}</a>
      <nav aria-label="Published notes">${sidebar}</nav>
    </aside>
    <main class="publish-main">${body}</main>
  </div>
</body>
</html>`;
}

function buildPublishCsp() {
  return "default-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self' data:;";
}

function renderPublishLinkList(site, currentUrl, links, emptyText) {
  if (!links.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<ul>${links
    .map((link) => {
      const href = link.url ? relativizePublishUrl(currentUrl, link.url) : '';
      const label = link.title || link.label || link.relativePath || link.url;
      return href
        ? `<li><a href="${escapeAttribute(href)}">${escapeHtml(label)}</a></li>`
        : `<li>${escapeHtml(label)}</li>`;
    })
    .join('')}</ul>`;
}

function buildPublishCss(site) {
  const mode = site.theme === 'dark' ? 'dark' : 'light';
  const base = `:root {
  color-scheme: light dark;
  --publish-bg: ${mode === 'dark' ? '#0f1115' : '#f6f7f9'};
  --publish-panel: ${mode === 'dark' ? '#171b22' : '#ffffff'};
  --publish-text: ${mode === 'dark' ? '#e6edf3' : '#1f2328'};
  --publish-muted: ${mode === 'dark' ? '#9aa4b2' : '#667085'};
  --publish-border: ${mode === 'dark' ? '#2c3440' : '#d8dee8'};
  --publish-accent: ${mode === 'dark' ? '#7dd3fc' : '#2563eb'};
  --publish-accent-soft: ${mode === 'dark' ? '#123246' : '#e8f0ff'};
  --publish-code: ${mode === 'dark' ? '#10141b' : '#f6f8fa'};
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--publish-bg);
  color: var(--publish-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.58;
}
a { color: var(--publish-accent); }
.publish-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  min-height: 100vh;
}
.publish-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  border-right: 1px solid var(--publish-border);
  background: var(--publish-panel);
  padding: 22px 14px;
}
.publish-site-title {
  display: block;
  color: var(--publish-text);
  font-weight: 800;
  text-decoration: none;
  margin: 0 8px 18px;
}
.publish-nav-link {
  display: grid;
  gap: 2px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--publish-text);
  text-decoration: none;
}
.publish-nav-link:hover,
.publish-nav-link.active {
  background: var(--publish-accent-soft);
}
.publish-nav-link small,
.publish-kicker,
.publish-card small,
.publish-note-header p,
.publish-graph-panel p,
.publish-search label span {
  color: var(--publish-muted);
}
.publish-main {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 34px;
}
.publish-hero,
.publish-search-panel,
.publish-graph-panel,
.publish-note,
.publish-note-aside section,
.publish-card {
  background: var(--publish-panel);
  border: 1px solid var(--publish-border);
  border-radius: 8px;
}
.publish-hero,
.publish-search-panel,
.publish-graph-panel,
.publish-note,
.publish-note-aside section {
  padding: 24px;
  margin-bottom: 18px;
}
.publish-hero h1,
.publish-note-header h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: 0;
}
.publish-kicker {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}
.publish-search {
  display: grid;
  gap: 6px;
}
.publish-search input {
  width: 100%;
  border: 1px solid var(--publish-border);
  border-radius: 8px;
  background: var(--publish-bg);
  color: var(--publish-text);
  padding: 11px 12px;
  font: inherit;
}
.publish-results {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.publish-result {
  display: grid;
  gap: 2px;
  padding: 10px;
  border: 1px solid var(--publish-border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--publish-text);
}
.publish-graph {
  min-height: 360px;
  border: 1px solid var(--publish-border);
  border-radius: 8px;
  background: var(--publish-bg);
  overflow: hidden;
}
.publish-graph svg {
  width: 100%;
  min-height: 360px;
  display: block;
}
.publish-graph-edge {
  stroke: var(--publish-border);
  stroke-width: 1.35;
}
.publish-graph-node circle {
  fill: var(--publish-muted);
}
.publish-graph-node text {
  fill: var(--publish-text);
  font-size: 11px;
  text-anchor: middle;
}
.publish-graph-node.active circle {
  fill: var(--publish-accent);
}
.publish-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.publish-card {
  padding: 16px;
}
.publish-card a {
  color: var(--publish-text);
  font-weight: 750;
  text-decoration: none;
}
.publish-card p {
  color: var(--publish-muted);
}
.publish-note {
  max-width: 920px;
}
.publish-note-aside {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  max-width: 920px;
}
.publish-note-aside h2 {
  margin-top: 0;
  font-size: 1rem;
}
.publish-note-aside ol,
.publish-note-aside ul {
  margin: 0;
  padding-left: 1.2rem;
}
.publish-depth-2 { margin-left: 12px; }
.publish-depth-3 { margin-left: 24px; }
.publish-depth-4 { margin-left: 36px; }
.publish-depth-5 { margin-left: 48px; }
.publish-depth-6 { margin-left: 60px; }
.publish-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.publish-tags span {
  border: 1px solid var(--publish-border);
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--publish-muted);
}
.markdown-body {
  background: transparent;
  color: var(--publish-text);
}
.markdown-body pre,
.markdown-body code {
  background: var(--publish-code);
}
@media (max-width: 860px) {
  .publish-layout {
    display: block;
  }
  .publish-sidebar {
    position: relative;
    height: auto;
    max-height: 42vh;
  }
  .publish-main {
    padding: 18px;
  }
}`;

  return `${base}\n\n${site.css}`;
}

function buildPublishDataJs(site) {
  const publicSite = {
    version: site.version,
    title: site.title,
    theme: site.theme,
    generatedAt: site.generatedAt,
    files: site.files.map(({ body: _body, ...file }) => file),
    graph: site.graph
  };
  const json = JSON.stringify(publicSite)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `window.SHIBANSHU_PUBLISH_DATA = ${json};\n`;
}

function buildPublishJs() {
  return `'use strict';

(function () {
  const site = window.SHIBANSHU_PUBLISH_DATA;
  if (!site || !Array.isArray(site.files)) return;

  const currentUrl = document.body?.dataset.currentUrl || 'index.html';
  const searchInput = document.getElementById('publish-search-input');
  const searchResults = document.getElementById('publish-search-results');
  const graphHost = document.getElementById('publish-graph');

  if (searchInput && searchResults) {
    const renderResults = () => {
      const terms = searchInput.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
      const matches = site.files
        .filter((file) => {
          if (!terms.length) return true;
          const text = [file.title, file.relativePath, file.text, ...(file.tags || [])].join(' ').toLowerCase();
          return terms.every((term) => text.includes(term));
        })
        .slice(0, 30);

      searchResults.innerHTML = matches
        .map((file) => {
          return '<a class="publish-result" href="' + escapeAttribute(file.url) + '">' +
            '<strong>' + escapeHtml(file.title) + '</strong>' +
            '<span>' + escapeHtml(file.excerpt || file.relativePath || '') + '</span>' +
            '</a>';
        })
        .join('') || '<p>No matching notes.</p>';
    };
    searchInput.addEventListener('input', renderResults);
    renderResults();
  }

  if (graphHost && site.graph) {
    graphHost.innerHTML = renderGraph(site.graph, currentUrl);
  }

  function renderGraph(graph, activeUrl) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    if (!nodes.length) return '<p>No notes in this export.</p>';

    const width = 980;
    const height = 420;
    const layout = layoutNodes(nodes, edges, width, height, activeUrl);
    const edgeMarkup = edges
      .map((edge) => {
        const source = layout.get(edge.source);
        const target = layout.get(edge.target);
        if (!source || !target) return '';
        return '<line class="publish-graph-edge" x1="' + source.x + '" y1="' + source.y + '" x2="' + target.x + '" y2="' + target.y + '"></line>';
      })
      .join('');
    const nodeMarkup = nodes
      .map((node) => {
        const point = layout.get(node.url);
        if (!point) return '';
        const active = node.url === activeUrl ? ' active' : '';
        const degree = Math.max(1, (node.incoming || 0) + (node.outgoing || 0));
        const radius = Math.min(18, 6 + Math.sqrt(degree) * 3);
        const label = truncate(stripExtension(node.title || node.label || node.url), 18);
        return '<a class="publish-graph-node' + active + '" href="' + escapeAttribute(relativeFromIndex(node.url)) + '">' +
          '<circle cx="' + point.x + '" cy="' + point.y + '" r="' + radius + '"></circle>' +
          '<text x="' + point.x + '" y="' + (point.y + radius + 14) + '">' + escapeHtml(label) + '</text>' +
          '<title>' + escapeHtml(node.relativePath || node.title || node.url) + '</title>' +
          '</a>';
      })
      .join('');

    return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Published note graph">' + edgeMarkup + nodeMarkup + '</svg>';
  }

  function layoutNodes(nodes, edges, width, height, activeUrl) {
    const layout = new Map();
    const sorted = [...nodes].sort((left, right) => {
      if (left.url === activeUrl) return -1;
      if (right.url === activeUrl) return 1;
      return ((right.incoming || 0) + (right.outgoing || 0)) - ((left.incoming || 0) + (left.outgoing || 0)) ||
        String(left.title || left.url).localeCompare(String(right.title || right.url));
    });
    const centerX = width / 2;
    const centerY = height / 2;
    if (sorted.length === 1) {
      layout.set(sorted[0].url, { x: centerX, y: centerY });
      return layout;
    }

    const hasActive = activeUrl && sorted.some((node) => node.url === activeUrl);
    const ring = hasActive ? sorted.slice(1) : sorted;
    if (hasActive) layout.set(sorted[0].url, { x: centerX, y: centerY });
    const radiusX = Math.max(140, width / 2 - 90);
    const radiusY = Math.max(110, height / 2 - 70);
    ring.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, ring.length);
      const linkedToActive = edges.some((edge) => edge.source === activeUrl && edge.target === node.url || edge.target === activeUrl && edge.source === node.url);
      const scale = linkedToActive ? 0.62 : 1;
      layout.set(node.url, {
        x: Math.round(centerX + Math.cos(angle) * radiusX * scale),
        y: Math.round(centerY + Math.sin(angle) * radiusY * scale)
      });
    });
    return layout;
  }

  function relativeFromIndex(url) {
    if (currentUrl === 'index.html') return url;
    return url.replace(/^notes\\//, '');
  }

  function stripExtension(value) {
    return String(value || '').replace(/\\.(md|markdown|mdown|mkd|txt|canvas)$/i, '');
  }

  function truncate(value, max) {
    const text = String(value || '');
    return text.length > max ? text.slice(0, max - 3) + '...' : text;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('\\n', '&#10;');
  }
})();\n`;
}

function relativizePublishUrl(fromUrl, targetUrl) {
  if (fromUrl === targetUrl) return path.posix.basename(targetUrl);
  const fromDirectory = fromUrl === 'index.html' ? '.' : path.posix.dirname(fromUrl);
  const relative = path.posix.relative(fromDirectory, targetUrl);
  return relative || path.posix.basename(targetUrl);
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

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', '&#10;');
}

handleApp('dialog:open-markdown', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Markdown',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'JSON Canvas', extensions: ['canvas'] }
    ]
  });

  if (result.canceled) return [];
  return readMarkdownFiles(result.filePaths);
});

handleApp('dialog:open-vault', async () => openVaultWithDialog());

handleApp('recent:list', async () => listRecentItems());

handleApp('recent:open-file', async (_event, recentId) => openRecentFile(recentId));

handleApp('recent:open-vault', async (_event, recentId) => openRecentVault(recentId));

handleApp('file:open-dropped-files', async (_event, pathsToOpen) => {
  if (!Array.isArray(pathsToOpen)) return [];
  return readMarkdownFiles(pathsToOpen);
});

handleApp('file:reload', async (_event, filePath) => {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath || !trustedFilePaths.has(normalizedPath)) return null;
  const files = await readMarkdownFiles([normalizedPath]);
  return files[0] || null;
});

handleApp('autosave:read-drafts', async () => readAutosaveDrafts());

handleApp('autosave:save-drafts', async (_event, payload) => saveAutosaveDrafts(payload || {}));

handleApp('autosave:clear-drafts', async () => clearAutosaveDrafts());

handleApp('file:history-list', async (_event, filePath) => listFileHistory(filePath));

handleApp('file:history-read', async (_event, payload) => readFileHistorySnapshot(payload || {}));

handleApp('vault:create-file', async (_event, payload) => createVaultFile(payload || {}));

handleApp('vault:rename-file', async (_event, payload) => renameVaultFile(payload || {}));

handleApp('vault:delete-file', async (_event, payload) => deleteVaultFile(payload || {}));

handleApp('file:save', async (_event, payload) => {
  const filePath = normalizeFilePath(payload?.path);
  const content = coerceTextContent(payload?.content);

  if (!filePath) {
    throw new Error('Missing file path.');
  }

  if (!trustedWritablePaths.has(filePath)) {
    return saveMarkdownWithDialog(content, filePath);
  }

  if (await fileChangedOnDisk(filePath, payload?.fileState)) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Overwrite Disk File', 'Save Copy...'],
      defaultId: 0,
      cancelId: 0,
      message: 'This file changed on disk.',
      detail: `${path.basename(filePath)} was modified outside this app. Choose how to protect your work.`
    });

    if (response === 0) {
      return {
        canceled: true,
        conflict: true,
        path: filePath,
        name: path.basename(filePath),
        fileState: await getFileState(filePath).catch(() => null)
      };
    }

    if (response === 2) {
      return saveMarkdownWithDialog(content, makeConflictCopyPath(filePath));
    }
  }

  await snapshotDiskVersion(filePath).catch((error) => {
    console.error('Version history disk snapshot failed:', error);
  });
  markInternalWrite(filePath);
  await atomicWriteFile(filePath, content, 'utf8');
  rememberTrustedFile(filePath);
  watchTrustedFile(filePath);
  if (process.platform === 'darwin') {
    app.addRecentDocument(filePath);
  }
  const fileState = await getFileState(filePath);
  await recordFileHistorySnapshot(filePath, content, { fileState }).catch((error) => {
    console.error('Version history snapshot failed:', error);
  });

  return {
    path: filePath,
    name: path.basename(filePath),
    lastSavedAt: Date.now(),
    fileState
  };
});

handleApp('file:save-as', async (_event, payload) => {
  const content = coerceTextContent(payload?.content);
  const defaultPath = payload?.defaultPath || 'Untitled.md';
  return saveMarkdownWithDialog(content, defaultPath);
});

handleApp('file:export-html', async (_event, payload) => {
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

  await atomicWriteFile(result.filePath, html, 'utf8');

  return {
    path: result.filePath,
    name: path.basename(result.filePath),
    lastSavedAt: Date.now()
  };
});

handleApp('file:export-text', async (_event, payload) => {
  const exportPayload = normalizeTextExportPayload(payload || {});
  const result = await dialog.showSaveDialog(mainWindow, {
    title: exportPayload.title,
    defaultPath: exportPayload.defaultPath,
    filters: exportPayload.filters
  });

  if (result.canceled || !result.filePath) return null;

  await atomicWriteFile(result.filePath, exportPayload.content, 'utf8');

  return {
    path: result.filePath,
    name: path.basename(result.filePath),
    lastSavedAt: Date.now()
  };
});

handleApp('file:export-pdf', async (_event, payload) => {
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
      partition: `export-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    exportWindow.webContents.session.webRequest.onBeforeRequest(
      {
        urls: ['http://*/*', 'https://*/*', 'file://*/*']
      },
      (_details, callback) => {
        callback({ cancel: true });
      }
    );

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
    await atomicWriteFile(result.filePath, pdf);

    return {
      path: result.filePath,
      name: path.basename(result.filePath),
      lastSavedAt: Date.now()
    };
  } finally {
    exportWindow.destroy();
  }
});

handleApp('vault:publish-static', async (_event, payload) => publishStaticSite(payload || {}));

handleApp('file:reveal', async (_event, filePath) => {
  const normalizedPath = normalizeFilePath(filePath);
  if (!normalizedPath || !trustedFilePaths.has(normalizedPath)) return false;
  shell.showItemInFolder(normalizedPath);
  return true;
});

handleApp('shell:open-external', async (_event, url) => {
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
    const protocolCommands = parseArgProtocolCommands(argv);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
    queueOrOpenPaths(files);
    queueOrDispatchProtocolCommands(protocolCommands);
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    queueOrOpenPaths([filePath]);
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    queueOrDispatchProtocolCommands([parseProtocolUrl(url)]);
  });

  app.whenReady().then(() => {
    app.setName('Shibanshu Markdown Viewer');
    registerProtocolClient();
    createMenu();
    createMainWindow();
    queueOrOpenPaths(parseArgFiles(process.argv));
    queueOrDispatchProtocolCommands(parseArgProtocolCommands(process.argv));
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

  app.on('before-quit', () => {
    for (const watcher of watchedFiles.values()) {
      watcher.close();
    }
    watchedFiles.clear();
  });
}

ipcMain.on('renderer:document-state', (event, state) => {
  try {
    assertTrustedSender(event);
    updateNativeDocumentState(state);
  } catch (error) {
    console.error('Ignored document state update:', error.message);
  }
});

ipcMain.on('renderer:ready', async (event) => {
  try {
    assertTrustedSender(event);
  } catch (error) {
    console.error('Ignored renderer ready event:', error.message);
    return;
  }
  rendererIsReady = true;
  if (pendingOpenPaths.length) {
    const pathsToOpen = pendingOpenPaths.splice(0, pendingOpenPaths.length);
    await sendOpenedFiles(pathsToOpen);
  }
  if (pendingProtocolCommands.length) {
    const commands = pendingProtocolCommands.splice(0, pendingProtocolCommands.length);
    sendProtocolCommands(commands);
  }
});
