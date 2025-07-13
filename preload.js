// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openFolder: () => ipcRenderer.invoke('open-folder-dialog'),
    savePresets: (presets) => ipcRenderer.invoke('save-presets', presets),
    loadPresets: () => ipcRenderer.invoke('load-presets'),
    // --- 新規追加 ---
    createAndOpenFolder: (data) => ipcRenderer.invoke('create-and-open-folder', data),
    // 新しいAPIを追加
    checkFolderForFiles: (data) => ipcRenderer.invoke('check-folder-for-files', data)
});