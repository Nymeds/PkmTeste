// src/main/main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { addTeamPokemon, getTeamPokemon, getAllTeamPokemon, prisma } = require("./database");

let mainWindow = null;
let overlayWindow = null;
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

  // Não carrega nada ainda, espera verificação do banco
  mainWindow.loadFile(path.join(__dirname, "../renderer/loading.html"));
}

app.whenReady().then(async () => {
  createWindow();
  
  // Verifica se tem pokémon no banco
  const hasTeam = await checkTeamExists();
  
  if (hasTeam) {
    // Se tem time, abre o overlay direto
    const teamPokemons = await getAllTeamPokemon();
    startOverlayWithTeam(teamPokemons);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      mainWindow = null;
    }
  } else {
    // Se não tem, mostra a tela de seleção
    mainWindow.loadFile(path.join(__dirname, "../renderer/choose_starter.html"));
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

async function checkTeamExists() {
  try {
    const team = await prisma.teamPokemon.findMany({
      where: { id: { lte: 3 } },
      orderBy: { id: 'asc' }
    });
    return team.length > 0;
  } catch (error) {
    console.error("Erro ao verificar time:", error);
    return false;
  }
}

async function startOverlayWithTeam(teamPokemons) {
  try {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      return;
    }

    overlayWindow = new BrowserWindow({
      width: 1920,
      height: 200,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      hasShadow: false,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, "overlayPreload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Posiciona na parte inferior da tela
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    overlayWindow.setPosition(0, height - 200);

    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.loadFile(path.join(__dirname, "../renderer/overlay.html"));
    
    return { success: true };
  } catch (err) {
    console.error("Erro startOverlayWithTeam:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Salva no DB (Prisma) e retorna o registro criado.
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
        id: folder,
        name: stats.name || folder,
        level: stats.level || 1,
        hp: base.hp ?? stats.hp ?? 0,
        maxHp: base.hp ?? stats.maxHp ?? stats.hp ?? 0,
        attack: base.attack ?? stats.attack ?? 0,
        defense: base.defense ?? stats.defense ?? 0,
        speed: base.speed ?? stats.speed ?? 0,
        type: stats.type || [],
        description: stats.description || "",
        color: stats.color || "#999",
        spritePath,
        spriteUrl: pathToFileURL(spritePath).href
      };
    }).filter(Boolean);

    return starters.slice(0, 3);
  } catch (err) {
    console.error("Erro em read-starters:", err);
    return [];
  }
});

/**
 * Lê todos os pokémon da pasta pokedex para spawn
 */
ipcMain.handle("read-all-pokemon", async () => {
  try {
    const pokedexPath = path.join(__dirname, "../../pokedex");
    const entries = fs.readdirSync(pokedexPath, { withFileTypes: true });
    const folders = entries.filter(d => d.isDirectory()).map(d => d.name);

    const allPokemon = folders.map(folder => {
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
        id: folder,
        name: stats.name || folder,
        level: 1,
        hp: base.hp ?? stats.hp ?? 0,
        maxHp: base.hp ?? stats.maxHp ?? stats.hp ?? 0,
        attack: base.attack ?? stats.attack ?? 0,
        defense: base.defense ?? stats.defense ?? 0,
        speed: base.speed ?? stats.speed ?? 0,
        type: stats.type || [],
        color: stats.color || "#999",
        spritePath,
        spriteUrl: pathToFileURL(spritePath).href
      };
    }).filter(Boolean);

    return allPokemon;
  } catch (err) {
    console.error("Erro em read-all-pokemon:", err);
    return [];
  }
});

/**
 * Inicia a janela overlay com o pokemon passado pelo renderer.
 */
ipcMain.handle("start-overlay", async (event, pokemon) => {
  try {
    const spriteUrl = pokemon && pokemon.spritePath
      ? pathToFileURL(pokemon.spritePath).href
      : "";

    selectedPokemon = { ...pokemon, spriteUrl };

    if (mainWindow && !mainWindow.isDestroyed()) {
      try { mainWindow.close(); } catch (e) { /* ignore */ }
      mainWindow = null;
    }

    const teamPokemons = await getAllTeamPokemon();
    await startOverlayWithTeam(teamPokemons);

    return { success: true };
  } catch (err) {
    console.error("Erro start-overlay:", err);
    return { success: false, error: err.message };
  }
});

/** Handler para overlay pedir os pokémons do time */
ipcMain.handle("get-team-pokemon", async () => {
  try {
    const team = await getAllTeamPokemon();
    
    // Adiciona as sprites dos pokémons
    const teamWithSprites = await Promise.all(team.map(async (pkm) => {
      const pokedexPath = path.join(__dirname, "../../pokedex");
      const folderPath = path.join(pokedexPath, pkm.name.toLowerCase());
      let spritePath = "";
      
      if (fs.existsSync(folderPath)) {
        const possibleImage = path.join(folderPath, `${pkm.name.toLowerCase()}.png`);
        if (fs.existsSync(possibleImage)) {
          spritePath = possibleImage;
        } else {
          const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith(".png"));
          if (files.length) spritePath = path.join(folderPath, files[0]);
        }
      }
      
      return {
        ...pkm,
        spritePath,
        spriteUrl: spritePath ? pathToFileURL(spritePath).href : ""
      };
    }));
    
    return teamWithSprites;
  } catch (error) {
    console.error("Erro ao buscar time:", error);
    return [];
  }
});

/** Atualiza dados do pokémon no banco */
ipcMain.handle("update-pokemon", async (event, pokemonData) => {
  try {
    const updated = await prisma.teamPokemon.update({
      where: { id: pokemonData.id },
      data: {
        level: pokemonData.level,
        xp: pokemonData.xp,
        hp: pokemonData.hp,
        maxHp: pokemonData.maxHp,
        attack: pokemonData.attack,
        defense: pokemonData.defense,
        speed: pokemonData.speed,
      }
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error("Erro ao atualizar Pokémon:", error);
    return { success: false, error: error.message };
  }
});