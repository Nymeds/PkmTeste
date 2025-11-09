// src/main/overlayPreload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
  getPokemon: () => ipcRenderer.invoke("get-selected-pokemon"),
});
