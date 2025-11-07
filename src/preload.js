// src/preload.js - Script de preload para comunicação segura

const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Escolha de inicial
    chooseStarter: (pokemonId) => ipcRenderer.invoke('choose-starter', pokemonId),
    getStarters: () => ipcRenderer.invoke('get-starters'),
    
    // Dados do pet
    getPetData: (petId) => ipcRenderer.invoke('get-pet-data', petId),
    
    // Movimento da janela
    moveWindow: (data) => ipcRenderer.send('move-window', data),
    
    // Card de informações
    toggleCard: (data) => ipcRenderer.send('toggle-card', data),
    
    // Listeners para atualizações
    onPetData: (callback) => {
        ipcRenderer.on('pet-data', (event, data) => callback(data));
    },
    
    onPetUpdate: (callback) => {
        ipcRenderer.on('pet-update', (event, data) => callback(data));
    },
    
    onLevelUp: (callback) => {
        ipcRenderer.on('level-up', (event, data) => callback(data));
    },
    
    onToggleCard: (callback) => {
        ipcRenderer.on('toggle-card', (event, show) => callback(show));
    },
    
    // Remove listeners
    removeListener: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});

console.log('Preload script carregado');