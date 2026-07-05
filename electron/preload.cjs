const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('markdownNative', {
  platform: process.platform,
  openDialog: () => ipcRenderer.invoke('dialog:open-markdown'),
  openPaths: (paths) => ipcRenderer.invoke('file:open-paths', paths),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  saveFileAs: (payload) => ipcRenderer.invoke('file:save-as', payload),
  exportHtml: (payload) => ipcRenderer.invoke('file:export-html', payload),
  exportPdf: (payload) => ipcRenderer.invoke('file:export-pdf', payload),
  revealFile: (filePath) => ipcRenderer.invoke('file:reveal', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  rendererReady: () => ipcRenderer.send('renderer:ready'),
  onSystemOpenFiles: (callback) => {
    const listener = (_event, files) => callback(files);
    ipcRenderer.on('system-open-files', listener);
    return () => ipcRenderer.removeListener('system-open-files', listener);
  },
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu-command', listener);
    return () => ipcRenderer.removeListener('menu-command', listener);
  }
});
