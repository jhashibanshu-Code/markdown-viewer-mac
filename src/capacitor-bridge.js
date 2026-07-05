/**
 * Capacitor native bridge for Shibanshu Markdown Viewer.
 *
 * Provides `window.markdownNative`-compatible methods using Capacitor plugins
 * so the renderer can work on Android without Electron.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';
import { FilePicker } from '@capawesome/capacitor-file-picker';

const AUTOSAVE_KEY = 'shibanshu-autosave-drafts';
const RECENT_ITEMS_KEY = 'shibanshu-recent-items';
const MAX_VAULT_FILES = 750;
const MAX_VAULT_DEPTH = 16;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt', '.canvas']);

function getExtension(name) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.substring(dotIndex).toLowerCase() : '';
}

function isMarkdownFile(name) {
  return MARKDOWN_EXTENSIONS.has(getExtension(name));
}

function basename(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function dirname(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.substring(0, lastSlash) : '.';
}

async function readFileContent(uri) {
  const result = await Filesystem.readFile({
    path: uri,
    encoding: Encoding.UTF8
  });
  return typeof result.data === 'string' ? result.data : '';
}

async function getRecentItems() {
  try {
    const { value } = await Preferences.get({ key: RECENT_ITEMS_KEY });
    return value ? JSON.parse(value) : { files: [], vaults: [] };
  } catch {
    return { files: [], vaults: [] };
  }
}

async function addRecentFile(filePath, name) {
  const recent = await getRecentItems();
  recent.files = recent.files.filter((f) => f.path !== filePath);
  recent.files.unshift({ path: filePath, name, addedAt: Date.now() });
  if (recent.files.length > 24) recent.files.length = 24;
  await Preferences.set({ key: RECENT_ITEMS_KEY, value: JSON.stringify(recent) });
}

async function addRecentVault(vaultPath, name) {
  const recent = await getRecentItems();
  recent.vaults = recent.vaults.filter((v) => v.path !== vaultPath);
  recent.vaults.unshift({ path: vaultPath, name, addedAt: Date.now() });
  if (recent.vaults.length > 12) recent.vaults.length = 12;
  await Preferences.set({ key: RECENT_ITEMS_KEY, value: JSON.stringify(recent) });
}

async function walkDirectory(dirPath, rootPath, depth, files) {
  if (files.length >= MAX_VAULT_FILES || depth > MAX_VAULT_DEPTH) return;

  let entries;
  try {
    const result = await Filesystem.readdir({ path: dirPath });
    entries = result.files || [];
  } catch {
    return;
  }

  entries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  for (const entry of entries) {
    if (files.length >= MAX_VAULT_FILES) break;
    const entryName = entry.name || '';

    if (entryName.startsWith('.') || entryName === 'node_modules') continue;

    const entryPath = dirPath.endsWith('/') ? dirPath + entryName : dirPath + '/' + entryName;

    if (entry.type === 'directory') {
      await walkDirectory(entryPath, rootPath, depth + 1, files);
    } else if (isMarkdownFile(entryName)) {
      try {
        const content = await readFileContent(entryPath);
        const relativePath = entryPath.startsWith(rootPath)
          ? entryPath.substring(rootPath.length).replace(/^\//, '')
          : entryName;
        files.push({
          path: entryPath,
          name: entryName,
          relativePath,
          content,
          lastSavedAt: Date.now(),
          fileState: { size: content.length, mtime: Date.now() }
        });
      } catch {
        // Skip unreadable files
      }
    }
  }
}

export function createCapacitorNative() {
  // Register back button handler
  App.addListener('backButton', ({ canGoBack }) => {
    // Close any open modals first (handled by renderer via DOM)
    const openModal = document.querySelector('.modal-backdrop:not([hidden])');
    if (openModal) {
      openModal.setAttribute('hidden', '');
      return;
    }
    // Close vault sidebar on mobile
    const sidebar = document.getElementById('vault-sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      return;
    }
    // Minimize app
    App.minimizeApp();
  });

  return {
    platform: 'android',

    async openDialog() {
      try {
        const result = await FilePicker.pickFiles({
          types: ['text/markdown', 'text/plain', 'application/octet-stream'],
          multiple: true,
          readData: true
        });

        const files = [];
        for (const file of result.files || []) {
          try {
            let content = '';
            if (file.data) {
              content = atob(file.data);
            } else if (file.path) {
              content = await readFileContent(file.path);
            }

            const filePath = file.path || file.name || 'Untitled.md';
            files.push({
              path: filePath,
              name: file.name || basename(filePath),
              relativePath: file.name || basename(filePath),
              content,
              lastSavedAt: Date.now(),
              fileState: { size: content.length, mtime: Date.now() }
            });
            await addRecentFile(filePath, file.name || basename(filePath));
          } catch {
            // Skip unreadable files
          }
        }
        return files;
      } catch (error) {
        if (error?.message?.includes('cancel') || error?.message?.includes('Cancel')) return [];
        throw error;
      }
    },

    async openVault() {
      try {
        const result = await FilePicker.pickDirectory();
        if (!result?.path) return null;

        const rootPath = result.path;
        const vaultName = basename(rootPath) || 'Vault';
        const files = [];
        await walkDirectory(rootPath, rootPath, 0, files);

        await addRecentVault(rootPath, vaultName);

        return {
          path: rootPath,
          name: vaultName,
          files
        };
      } catch (error) {
        if (error?.message?.includes('cancel') || error?.message?.includes('Cancel')) return null;
        throw error;
      }
    },

    async listRecentItems() {
      return getRecentItems();
    },

    async openRecentFile(recentId) {
      try {
        const content = await readFileContent(recentId);
        return [
          {
            path: recentId,
            name: basename(recentId),
            relativePath: basename(recentId),
            content,
            lastSavedAt: Date.now(),
            fileState: { size: content.length, mtime: Date.now() }
          }
        ];
      } catch {
        return [];
      }
    },

    async openRecentVault(recentId) {
      try {
        const rootPath = recentId;
        const vaultName = basename(rootPath) || 'Vault';
        const files = [];
        await walkDirectory(rootPath, rootPath, 0, files);
        return { path: rootPath, name: vaultName, files };
      } catch {
        return null;
      }
    },

    async openDroppedFiles() {
      return [];
    },

    async reloadFile(filePath) {
      try {
        const content = await readFileContent(filePath);
        return {
          path: filePath,
          name: basename(filePath),
          relativePath: basename(filePath),
          content,
          lastSavedAt: Date.now(),
          fileState: { size: content.length, mtime: Date.now() }
        };
      } catch {
        return null;
      }
    },

    async readAutosaveDrafts() {
      try {
        const { value } = await Preferences.get({ key: AUTOSAVE_KEY });
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    },

    async saveAutosaveDrafts(payload) {
      try {
        await Preferences.set({ key: AUTOSAVE_KEY, value: JSON.stringify(payload) });
        return { saved: true };
      } catch {
        return { saved: false };
      }
    },

    async clearAutosaveDrafts() {
      await Preferences.remove({ key: AUTOSAVE_KEY });
      return { cleared: true };
    },

    async listFileHistory() {
      return { snapshots: [] };
    },

    async readFileHistorySnapshot() {
      return null;
    },

    async createVaultFile(payload) {
      const { vaultPath, relativePath, content } = payload || {};
      if (!vaultPath || !relativePath) throw new Error('Missing vault path or file name.');

      const fullPath = vaultPath.endsWith('/')
        ? vaultPath + relativePath
        : vaultPath + '/' + relativePath;

      await Filesystem.writeFile({
        path: fullPath,
        data: content || `# ${basename(relativePath).replace(/\.[^.]+$/, '')}\n\n`,
        encoding: Encoding.UTF8
      });

      const fileContent = content || `# ${basename(relativePath).replace(/\.[^.]+$/, '')}\n\n`;
      return {
        path: fullPath,
        name: basename(relativePath),
        relativePath,
        content: fileContent,
        lastSavedAt: Date.now(),
        fileState: { size: fileContent.length, mtime: Date.now() }
      };
    },

    async renameVaultFile(payload) {
      const { oldPath, newPath } = payload || {};
      if (!oldPath || !newPath) throw new Error('Missing old or new path.');

      await Filesystem.rename({
        from: oldPath,
        to: newPath
      });

      return { path: newPath, name: basename(newPath) };
    },

    async deleteVaultFile(payload) {
      const { filePath } = payload || {};
      if (!filePath) throw new Error('Missing file path.');

      await Filesystem.deleteFile({ path: filePath });
      return { deleted: true };
    },

    async saveFile(payload) {
      const { path: filePath, content } = payload || {};
      if (!filePath) throw new Error('Missing file path.');

      try {
        await Filesystem.writeFile({
          path: filePath,
          data: content || '',
          encoding: Encoding.UTF8
        });

        return {
          path: filePath,
          name: basename(filePath),
          lastSavedAt: Date.now(),
          fileState: { size: (content || '').length, mtime: Date.now() }
        };
      } catch {
        // If direct write fails, fall back to save-as
        return this.saveFileAs(payload);
      }
    },

    async saveFileAs(payload) {
      const { content, name: suggestedName } = payload || {};
      const fileName = suggestedName || 'Untitled.md';

      // Write to Documents directory with the suggested name
      const result = await Filesystem.writeFile({
        path: fileName,
        data: content || '',
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      const savedPath = result.uri || fileName;
      await addRecentFile(savedPath, fileName);

      return {
        path: savedPath,
        name: fileName,
        lastSavedAt: Date.now(),
        fileState: { size: (content || '').length, mtime: Date.now() }
      };
    },

    async exportHtml(payload) {
      const { html, name: suggestedName } = payload || {};
      const fileName = (suggestedName || 'export').replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') + '.html';

      const result = await Filesystem.writeFile({
        path: fileName,
        data: html || '',
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: 'Share HTML Export'
      });

      return { path: result.uri, name: fileName };
    },

    async exportText(payload) {
      const { text, name: suggestedName } = payload || {};
      const fileName = (suggestedName || 'export').replace(/\.[^.]+$/, '') + '.txt';

      const result = await Filesystem.writeFile({
        path: fileName,
        data: text || '',
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: 'Share Text Export'
      });

      return { path: result.uri, name: fileName };
    },

    async exportPdf() {
      window.print();
      return { path: '', name: 'print.pdf' };
    },

    async publishStaticSite() {
      throw new Error('Static site publishing is not available on Android.');
    },

    async revealFile() {
      return false;
    },

    async openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    },

    setDocumentState() {},
    rendererReady() {},
    onExternalFileChanged() {
      return () => {};
    },
    onSystemOpenFiles() {
      return () => {};
    },
    onSystemUrlCommand() {
      return () => {};
    },
    onMenuCommand() {
      return () => {};
    }
  };
}
