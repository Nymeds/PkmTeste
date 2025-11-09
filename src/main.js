// main.js (com janela separada para o card de informações)
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
    const candidates = [`${name}.png`, `${name}.jpg`, `${name}.jpeg`, `${name}.webp`, 'sprite.png', 'icon.png'];
    for (const f of candidates) {
      const p = path.join(pokemonDir, f);
      if (fs.existsSync(p)) { imagePath = p; break; }
    }

    if (!imagePath) {
      const files = fs.readdirSync(pokemonDir);
      for (const f of files) {
        const lower = f.toLowerCase();
        if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) { imagePath = path.join(pokemonDir, f); break; }
      }
    }

    list.push({
      id: name,
      stats,
      imagePath,
      imageUrl: imagePath ? pathToFileURL(imagePath).href : null
    });
  }
  console.log(`[main] readPokedex -> ${list.length} entries`);
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
  
  console.log('[main] Card window created');
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

  // Criar janela do card após a janela principal
  createCardWindow();

  win.webContents.on('did-finish-load', async () => {
    try {
      const team = await prisma.team.findFirst({ include: { capturedPokemons: true } });
      if (!team || !team.capturedPokemons || team.capturedPokemons.length === 0) {
        console.log('[main] nenhum time/capturedPokemons encontrado -> abrindo starter window');
        openStarterWindow();
      } else {
        const payload = team.capturedPokemons.map(p => ({
          id: p.species,
          uuid: p.uuid,
          stats: (() => { try { return JSON.parse(p.stats || '{}'); } catch(e){ return {}; } })(),
          imagePath: p.imagePath
        }));
        console.log('[main] enviando persisted-pokemons para renderer', payload);
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
  const { width } = screen.getPrimaryDisplay().workAreaSize;

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

// IPC para controlar o card de informações
ipcMain.on('show-card', (event, data) => {
  if (cardWin && !cardWin.isDestroyed()) {
    cardWin.webContents.send('display-card', data);
  }
});

ipcMain.on('hide-card', (event) => {
  if (cardWin && !cardWin.isDestroyed()) {
    cardWin.webContents.send('hide-card');
  }
});

ipcMain.on('select-starter', async (event, payload) => {
  try {
    console.log('[main] select-starter payload:', payload);
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
        teamId: team.id
      }
    });

    if (win && !win.isDestroyed()) {
      win.webContents.send('starter-selected', {
        species: payload.id,
        uuid: cp.uuid,
        stats: payload.stats,
        imageUrl: payload.imageUrl,
        imagePath: payload.imagePath
      });
    }

    if (starterWin && !starterWin.isDestroyed()) starterWin.close();
    console.log('[main] starter salvo no DB, uuid:', cp.uuid);

  } catch (e) {
    console.error('Erro criando registro no DB:', e);
  }
});

ipcMain.handle('read-pokedex', async () => readPokedex());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  prisma.$disconnect().catch(() => {});
  app.quit();
});