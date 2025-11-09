// src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

const pokedexPath = path.join(__dirname, "../../pokedex");
console.log("Preload: carregando. pokedexPath =", pokedexPath);

contextBridge.exposeInMainWorld("api", {
  ping: () => "pong",
  savePokemon: (pokemon) => ipcRenderer.invoke("save-pokemon", pokemon),
  readStarters: () => ipcRenderer.invoke("read-starters"),
  // startOverlay envia o objeto pokemon (original vindo do renderer, contém spritePath)
  startOverlay: (pokemon) => ipcRenderer.invoke("start-overlay", pokemon),
});
