// main.js (com sistema de XP)
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { pathToFileURL } = require('url');

const prisma = new PrismaClient();

try { require('@electron/remote/main').initialize(); } catch (e) {}

let win = null;
let cardWin = null;
let starterWin = null;

const POKEDEX_DIR = path.join(__dirname, '..', 'pokedex');

function readPokedex(dir = POKEDEX_DIR) {
  const list = [];
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    const pokemonDir = path.join(dir, name);
    const statsPath = path.join(pokemonDir, 'stats.json');

    let stats = null;
    if (fs.existsSync(statsPath)) {
      try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); }
      catch (e) { console.error(`Erro parsing ${statsPath}:`, e); }
    }

    let imagePath = null;
    // Prioritize GIF files first for animated sprites, then fall back to static images
    const candidates = [`${name}.gif`, `${name}.png`, `${name}.jpg`, `${name}.jpeg`, `${name}.webp`, 'sprite.gif', 'sprite.png', 'icon.png'];
    for (const f of candidates) {
      const p = path.join(pokemonDir, f);
      if (fs.existsSync(p)) { imagePath = p; break; }
    }

    if (!imagePath) {
      const files = fs.readdirSync(pokemonDir);
      for (const f of files) {
        const lower = f.toLowerCase();
        // Search for GIF files first, then other image formats
        if (/\.gif$/i.test(lower)) { imagePath = path.join(pokemonDir, f); break; }
      }
      if (!imagePath) {
        for (const f of files) {
          const lower = f.toLowerCase();
          if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) { imagePath = path.join(pokemonDir, f); break; }
        }
      }
    }

    list.push({
      id: name,
      stats,
      imagePath,
      imageUrl: imagePath ? pathToFileURL(imagePath).href : null
    });
  }
  return list;
}

function createCardWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  cardWin = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  cardWin.loadFile(path.join(__dirname, 'card.html'));
  cardWin.setIgnoreMouseEvents(true, { forward: true });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 480, windowHeight = 120;

  win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.floor(Math.random() * Math.max(1, width - windowWidth)),
    y: height - (windowHeight + 20),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setIgnoreMouseEvents(false);
  win.setMenu(null);

  createCardWindow();

  win.webContents.on('did-finish-load', async () => {
    try {
      const team = await prisma.team.findFirst({ include: { capturedPokemons: true } });
      if (!team || !team.capturedPokemons || team.capturedPokemons.length === 0) {
        openStarterWindow();
      } else {
        const payload = team.capturedPokemons.map(p => ({
          id: p.species,
          uuid: p.uuid,
          stats: (() => { try { return JSON.parse(p.stats || '{}'); } catch(e){ return {}; } })(),
          imagePath: p.imagePath,
          level: p.level,
          xp: p.xp
        }));
        win.webContents.send('persisted-pokemons', payload);
      }
    } catch (e) {
      console.error('Erro ao acessar DB:', e);
      openStarterWindow();
    }
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') app.quit();
  });
}

async function openStarterWindow() {
  if (starterWin && !starterWin.isDestroyed()) return;

  starterWin = new BrowserWindow({
    width: 420,
    height: 260,
    parent: win,
    modal: true,
    frame: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  starterWin.loadFile(path.join(__dirname, 'chooseStarter.html'));
  starterWin.on('closed', () => { starterWin = null; });

  starterWin.webContents.on('did-finish-load', () => {
    const dex = readPokedex();
    const prefer = ['bulbasaur', 'charmander', 'squirtle'];
    const starters = [];
    for (const p of prefer) {
      const found = dex.find(d => d.id.toLowerCase() === p.toLowerCase());
      if (found) starters.push(found);
    }
    if (starters.length < 3) {
      for (const d of dex) {
        if (!starters.find(s => s.id === d.id)) starters.push(d);
        if (starters.length >= 3) break;
      }
    }
    starterWin.webContents.send('starter-list', starters.slice(0, 3));
  });
}

ipcMain.on('show-card', (event, data) => {
  if (cardWin && !cardWin.isDestroyed() && win && !win.isDestroyed()) {
    const winBounds = win.getBounds();
    const screenX = winBounds.x + data.x;
    const screenY = winBounds.y + data.y;
    
    cardWin.webContents.send('display-card', {
      stats: data.stats,
      x: screenX,
      y: screenY,
      persistent: data.persistent
    });
  }
});

ipcMain.on('hide-card', (event) => {
  if (cardWin && !cardWin.isDestroyed()) {
    cardWin.webContents.send('hide-card');
  }
});

// Handler para salvar XP no banco de dados
ipcMain.on('save-xp', async (event, xpData) => {
  try {
    for (const data of xpData) {
      await prisma.capturedPokemon.update({
        where: { uuid: data.uuid },
        data: {
          level: data.level,
          xp: data.xp
        }
      });
    }
    console.log('XP atualizado no banco de dados para', xpData.length, 'Pokémon(s)');
  } catch (error) {
    console.error('Erro ao salvar XP no banco de dados:', error);
  }
});

ipcMain.on('select-starter', async (event, payload) => {
  try {
    let team = await prisma.team.findFirst();
    if (!team) team = await prisma.team.create({ data: { name: 'PlayerTeam' } });

    const existing = await prisma.capturedPokemon.findMany({ where: { teamId: team.id }, orderBy: { slot: 'asc' } });
    const usedSlots = existing.map(e => e.slot);
    let slot = 1;
    for (; slot <= 6; slot++) if (!usedSlots.includes(slot)) break;
    if (slot > 6) slot = 6;

    const cp = await prisma.capturedPokemon.create({
      data: {
        species: payload.id,
        stats: JSON.stringify(payload.stats || {}),
        imagePath: payload.imagePath ?? null,
        slot,
        level: 1,
        xp: 0,
        teamId: team.id
      }
    });

    if (win && !win.isDestroyed()) {
      win.webContents.send('starter-selected', {
        species: payload.id,
        uuid: cp.uuid,
        stats: payload.stats,
        imageUrl: payload.imageUrl,
        imagePath: payload.imagePath,
        level: 1,
        xp: 0
      });
    }

    if (starterWin && !starterWin.isDestroyed()) starterWin.close();

  } catch (e) {
    console.error('Erro criando registro no DB:', e);
  }
});
// Handler para captura enviada pelo renderer (pet.js)
ipcMain.on('capture-pokemon', async (event, captureData) => {
  try {
    // Certifica que existe um time
    let team = await prisma.team.findFirst();
    if (!team) {
      team = await prisma.team.create({ data: { name: 'PlayerTeam' } });
    }

    // Pegar slots já usados e escolher um disponível (1..6)
    const existing = await prisma.capturedPokemon.findMany({ where: { teamId: team.id }, orderBy: { slot: 'asc' } });
    const usedSlots = existing.map(e => e.slot);
    let slot = 1;
    for (; slot <= 6; slot++) if (!usedSlots.includes(slot)) break;
    if (slot > 6) slot = 6; // fallback: se cheio, usa slot 6 (ou adapte conforme quiser)

    // Normalizar dados vindos do renderer
    const species = captureData.species ?? 'unknown';
    const statsObj = captureData.stats ?? {};
    const statsJson = JSON.stringify(statsObj);
    const imagePath = captureData.imagePath ?? null;
    const level = Number.isFinite(captureData.level) ? captureData.level : 1;
    const xp = Number.isFinite(captureData.xp) ? captureData.xp : 0;

    // Criar o registro no DB
    const cp = await prisma.capturedPokemon.create({
      data: {
        species,
        stats: statsJson,
        imagePath,
        slot,
        level,
        xp,
        teamId: team.id
      }
    });

    console.log('Pokemon salvo no DB:', cp.species, cp.uuid);

    // Enviar pro renderer para ele adicionar à lista (o pet.js escuta 'pokemon-captured')
    if (win && !win.isDestroyed()) {
      win.webContents.send('pokemon-captured', {
        species: cp.species,
        uuid: cp.uuid,
        level: cp.level,
        xp: cp.xp,
        imagePath: cp.imagePath ?? null,
        imageUrl: cp.imagePath ? pathToFileURL(cp.imagePath).href : null,
        stats: statsObj
      });
    }
  } catch (error) {
    console.error('Erro ao salvar captura no DB:', error);
    // opcional: enviar um event de erro pro renderer se quiser feedback visual
    if (win && !win.isDestroyed()) {
      win.webContents.send('pokemon-capture-error', { message: error.message || 'Erro desconhecido' });
    }
  }
});

ipcMain.handle('read-pokedex', async () => readPokedex());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  prisma.$disconnect().catch(() => {});
  app.quit();
});