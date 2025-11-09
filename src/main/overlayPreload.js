const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
  getPokemonSprite: () => "./pikachu.png", // sprite de teste local
});
