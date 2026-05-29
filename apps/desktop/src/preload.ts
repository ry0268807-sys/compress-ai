import { contextBridge, ipcRenderer } from 'electron';

/** Expose safe APIs to renderer */
contextBridge.exposeInMainWorld('ultraDesktop', {
  getVersion: () => ipcRenderer.invoke('ultra:get-version'),
  openOutputFolder: () => ipcRenderer.invoke('ultra:open-output-folder'),
  isDesktop: true,
});
