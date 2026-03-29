import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: (): Promise<string> => ipcRenderer.invoke('load-todos'),
  saveTodos: (data: string): Promise<void> => ipcRenderer.invoke('save-todos', data),
  loadConfig: (): Promise<string> => ipcRenderer.invoke('load-config'),
  saveConfig: (data: string): Promise<void> => ipcRenderer.invoke('save-config', data),
  setAlwaysOnTop: (flag: boolean): Promise<void> =>
    ipcRenderer.invoke('set-always-on-top', flag),
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('close-window'),
})
