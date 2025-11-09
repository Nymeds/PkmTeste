const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  readStarters: () => ipcRenderer.invoke("read-starters"),
  savePokemon: (pokemon) => ipcRenderer.invoke("save-pokemon", pokemon),
});
