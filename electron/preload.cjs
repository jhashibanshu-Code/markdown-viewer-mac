const { contextBridge, ipcRenderer, webUtils } = require('electron');

function getDroppedFilePaths(files) {
  return Array.from(files || [])
    .map((file) => {
      try {
        return webUtils.getPathForFile(file);
      } catch (_error) {
        return '';
      }
    })
    .filter(Boolean);
}

contextBridge.exposeInMainWorld('markdownNative', {
  platform: process.platform,
  openDialog: () => ipcRenderer.invoke('dialog:open-markdown'),
  openVault: () => ipcRenderer.invoke('dialog:open-vault'),
  listRecentItems: () => ipcRenderer.invoke('recent:list'),
  openRecentFile: (recentId) => ipcRenderer.invoke('recent:open-file', recentId),
  openRecentVault: (recentId) => ipcRenderer.invoke('recent:open-vault', recentId),
  openDroppedFiles: (files) => ipcRenderer.invoke('file:open-dropped-files', getDroppedFilePaths(files)),
  reloadFile: (filePath) => ipcRenderer.invoke('file:reload', filePath),
  readAutosaveDrafts: () => ipcRenderer.invoke('autosave:read-drafts'),
  saveAutosaveDrafts: (payload) => ipcRenderer.invoke('autosave:save-drafts', payload),
  clearAutosaveDrafts: () => ipcRenderer.invoke('autosave:clear-drafts'),
  listFileHistory: (filePath) => ipcRenderer.invoke('file:history-list', filePath),
  readFileHistorySnapshot: (payload) => ipcRenderer.invoke('file:history-read', payload),
  createVaultFile: (payload) => ipcRenderer.invoke('vault:create-file', payload),
  renameVaultFile: (payload) => ipcRenderer.invoke('vault:rename-file', payload),
  deleteVaultFile: (payload) => ipcRenderer.invoke('vault:delete-file', payload),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  saveFileAs: (payload) => ipcRenderer.invoke('file:save-as', payload),
  exportHtml: (payload) => ipcRenderer.invoke('file:export-html', payload),
  exportText: (payload) => ipcRenderer.invoke('file:export-text', payload),
  exportPdf: (payload) => ipcRenderer.invoke('file:export-pdf', payload),
  publishStaticSite: (payload) => ipcRenderer.invoke('vault:publish-static', payload),
  revealFile: (filePath) => ipcRenderer.invoke('file:reveal', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  setDocumentState: (payload) => ipcRenderer.send('renderer:document-state', payload),
  rendererReady: () => ipcRenderer.send('renderer:ready'),
  onExternalFileChanged: (callback) => {
    const listener = (_event, change) => callback(change);
    ipcRenderer.on('file:external-change', listener);
    return () => ipcRenderer.removeListener('file:external-change', listener);
  },
  onSystemOpenFiles: (callback) => {
    const listener = (_event, files) => callback(files);
    ipcRenderer.on('system-open-files', listener);
    return () => ipcRenderer.removeListener('system-open-files', listener);
  },
  onSystemUrlCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('system-url-command', listener);
    return () => ipcRenderer.removeListener('system-url-command', listener);
  },
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu-command', listener);
    return () => ipcRenderer.removeListener('menu-command', listener);
  }
});
