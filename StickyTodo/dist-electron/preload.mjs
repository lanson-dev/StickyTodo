"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  loadTodos: () => electron.ipcRenderer.invoke("load-todos"),
  saveTodos: (data) => electron.ipcRenderer.invoke("save-todos", data),
  loadConfig: () => electron.ipcRenderer.invoke("load-config"),
  saveConfig: (data) => electron.ipcRenderer.invoke("save-config", data),
  setAlwaysOnTop: (flag) => electron.ipcRenderer.invoke("set-always-on-top", flag),
  minimizeWindow: () => electron.ipcRenderer.invoke("minimize-window"),
  closeWindow: () => electron.ipcRenderer.invoke("close-window")
});
