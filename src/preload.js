//preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getStarters: () => ipcRenderer.invoke("get-starters"),
  chooseStarter: (starter) => ipcRenderer.invoke("choose-starter", starter),
});
