// src/main/overlayPreload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
  // Busca os pokémon do time (banco de dados)
  getTeamPokemon: () => ipcRenderer.invoke("get-team-pokemon"),
  
  // Busca todos os pokémon disponíveis (para spawn)
  getAllPokemon: () => ipcRenderer.invoke("read-all-pokemon"),
  
  // Salva um novo pokémon no banco
  savePokemon: (pokemon) => ipcRenderer.invoke("save-pokemon", pokemon),
  
  // Atualiza dados de um pokémon existente
  updatePokemon: (pokemonData) => ipcRenderer.invoke("update-pokemon", pokemonData),
});