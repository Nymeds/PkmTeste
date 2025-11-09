// src/main/main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { addTeamPokemon } = require("./database");

let mainWindow = null;
let selectedPokemon = null;

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("Main: preloadPath exists?", fs.existsSync(preloadPath), preloadPath);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/choose_starter.html"));
  // mainWindow.webContents.openDevTools(); // descomente se quiser debugar
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/**
 * Salva no DB (Prisma) e retorna o registro criado.
 * Não fecha janela nem abre overlay aqui.
 */
ipcMain.handle("save-pokemon", async (event, pokemon) => {
  try {
    const created = await addTeamPokemon(pokemon);
    return { success: true, data: created };
  } catch (error) {
    console.error("Erro ao salvar Pokémon:", error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle("read-starters", async () => {
  try {
    const pokedexPath = path.join(__dirname, "../../pokedex");
    const entries = fs.readdirSync(pokedexPath, { withFileTypes: true });
    const folders = entries.filter(d => d.isDirectory()).map(d => d.name);

    const starters = folders.map(folder => {
      const folderPath = path.join(pokedexPath, folder);
      const statsPath = path.join(folderPath, "stats.json");
      if (!fs.existsSync(statsPath)) return null;
      const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
      const base = stats.baseStats || {};
      const possibleImage = path.join(folderPath, `${folder}.png`);
      let spritePath = "";
      if (fs.existsSync(possibleImage)) spritePath = possibleImage;
      else {
        const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith(".png"));
        if (files.length) spritePath = path.join(folderPath, files[0]);
      }
      return {
        name: stats.name || folder,
        level: stats.level || 1,
        hp: base.hp ?? stats.hp ?? 0,
        maxHp: base.hp ?? stats.maxHp ?? stats.hp ?? 0,
        attack: base.attack ?? stats.attack ?? 0,
        defense: base.defense ?? stats.defense ?? 0,
        speed: base.speed ?? stats.speed ?? 0,
        type: stats.type || [],
        description: stats.description || "",
        spritePath,
      };
    }).filter(Boolean);

    return starters.slice(0, 3);
  } catch (err) {
    console.error("Erro em read-starters:", err);
    return [];
  }
});

/**
 * Inicia a janela overlay com o pokemon passado pelo renderer.
 * Espera receber o objeto com pelo menos: name, spritePath (caminho local).
 */
ipcMain.handle("start-overlay", async (event, pokemon) => {
  try {
    // Guarda o pokemon (adiciona spriteUrl convertido)
    const spriteUrl = pokemon && pokemon.spritePath
      ? pathToFileURL(pokemon.spritePath).href
      : "";

    selectedPokemon = { ...pokemon, spriteUrl };

    // Fecha a janela principal de seleção, se existir
    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.close(); } catch (e) { /* ignore */ }
      mainWindow = null;
    }

    // Cria a janela overlay
    const overlay = new BrowserWindow({
      width: 200,
      height: 200,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, "overlayPreload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    overlay.setIgnoreMouseEvents(false); // ajustável: true para passar clique através da janela
    overlay.loadFile(path.join(__dirname, "../renderer/overlay.html"));
    // overlay.webContents.openDevTools(); // opcional para debug

    return { success: true };
  } catch (err) {
    console.error("Erro start-overlay:", err);
    return { success: false, error: err.message };
  }
});

/** Handler para overlay pedir o pokemon selecionado */
ipcMain.handle("get-selected-pokemon", () => {
  return selectedPokemon;
});
