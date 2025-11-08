// src/main/main.js
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let pets = [];
const SPAWN_INTERVAL = 30000;
const MAX_FREE_POKEMONS = 2;
const FREE_LIFETIME = 20000;
const MAX_ACTIVE_PETS = 3; // starter + 2 capturados

// ===================
// Criar pet (janela + card)
// ===================
function createPet(id, name, isStarter, isTeamMember = false) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const startX = Math.floor(Math.random() * (width - 120));

  const petWin = new BrowserWindow({
    width: 120,
    height: 120,
    x: startX,
    y: height - 150,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    acceptFirstMouse: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      additionalArguments: [
        `--pokemonName=${name}`,
        `--starter=${isStarter}`,
        `--petId=${id}`,
        `--teamMember=${isTeamMember}`
      ],
    },
  });

  petWin.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
  petWin.setMenu(null);

  const cardWin = new BrowserWindow({
    width: 180,
    height: 200,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  cardWin.loadFile(path.join(__dirname, '../renderer/card/card.html'));
  cardWin.setMenu(null);

  pets.push({ id, petWin, cardWin, isStarter, name, isTeamMember });
}

// ===================
// Spawn de Pokémon livre
// ===================
async function spawnFreePokemon() {
  const freeCount = pets.filter(p => !p.isStarter && !p.isTeamMember).length;
  if (freeCount >= MAX_FREE_POKEMONS) return;

  const pokedexPath = path.join(__dirname, '../../pokedex');
  const allPokemons = fs.readdirSync(pokedexPath).filter(file => fs.statSync(path.join(pokedexPath, file)).isDirectory());
  if (!allPokemons.length) return;

  const freePokemonName = allPokemons[Math.floor(Math.random() * allPokemons.length)];
  const id = Date.now() + Math.floor(Math.random() * 1000);

  createPet(id, freePokemonName, false, false);

  setTimeout(() => {
    const pet = pets.find(p => p.id === id);
    if (pet) {
      if (!pet.petWin.isDestroyed()) pet.petWin.close();
      if (!pet.cardWin.isDestroyed()) pet.cardWin.close();
      pets = pets.filter(p => p.id !== id);
    }
  }, FREE_LIFETIME);
}

// ===================
// IPC Events
// ===================
ipcMain.on('show-card', (event, id) => {
  const pet = pets.find(p => p.id === id);
  if (!pet || pet.petWin.isDestroyed() || pet.cardWin.isDestroyed()) return;

  const { height } = screen.getPrimaryDisplay().workAreaSize;
  const winBounds = pet.petWin.getBounds();
  pet.cardWin.setBounds({ x: winBounds.x + 130, y: height - 260, width: 180, height: 200 });
  pet.cardWin.showInactive();
  pet.cardWin.webContents.send('show-card');
});

ipcMain.on('hide-card', (event, id) => {
  const pet = pets.find(p => p.id === id);
  if (!pet || pet.cardWin.isDestroyed()) return;

  pet.cardWin.webContents.send('hide-card');
  setTimeout(() => {
    if (!pet.cardWin.isDestroyed()) pet.cardWin.hide();
  }, 250);
});

ipcMain.on('update-card', async (event, id, data) => {
  const pet = pets.find(p => p.id === id);
  if (!pet || pet.cardWin.isDestroyed()) return;

  pet.cardWin.webContents.send('update-stats', data);

  // Salva XP/level no banco se for starter ou membro
  if (pet.isStarter || pet.isTeamMember) {
    try {
      await prisma.pokemon.update({
        where: { id: data.id },
        data: {
          xp: data.xp,
          level: data.level,
          hp: data.hp,
          maxHp: data.maxHp,
          attack: data.attack,
          defense: data.defense,
          speed: data.speed
        }
      });
    } catch (err) {
      console.error('[Save XP] Erro ao salvar stats:', err);
    }
  }
});

ipcMain.on('move-window', (event, id, newX, jumpHeight) => {
  const pet = pets.find(p => p.id === id);
  if (!pet || pet.petWin.isDestroyed()) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const xi = Number(newX);
  const x = Number.isFinite(xi) ? Math.max(0, Math.min(xi, width - 120)) : 0;
  const yBase = height - 150;
  const y = Math.max(0, Math.min(yBase - jumpHeight, height - 120));

  pet.petWin.setBounds({ x, y, width: 120, height: 120 });

  if (id === 1) {
    pets.forEach(p => {
      if (p.isTeamMember) {
        const slot = p.id - 1000;
        const offset = slot * 60 - 60;
        const teamX = Math.max(0, Math.min(x - offset, width - 120));
        if (!p.petWin.isDestroyed()) p.petWin.setBounds({ x: teamX, y, width: 120, height: 120 });
      }
    });
  }
});

// ===================
// Captura de Pokémon
// ===================
ipcMain.on('capture-success', async (event, petId, pokemonData) => {
  try {
    const pet = pets.find(p => p.id === petId);
    if (!pet || pet.isTeamMember) return;

    // Remove da tela
    if (!pet.petWin.isDestroyed()) pet.petWin.close();
    if (!pet.cardWin.isDestroyed()) pet.cardWin.close();
    pets = pets.filter(p => p.id !== petId);

    // Evita duplicidade de name
    let capturedPokemon;
    try {
      capturedPokemon = await prisma.pokemon.create({
        data: {
          name: pokemonData.name,
          hp: pokemonData.hp,
          maxHp: pokemonData.maxHp,
          attack: pokemonData.attack,
          defense: pokemonData.defense,
          speed: pokemonData.speed,
          level: pokemonData.level,
          xp: pokemonData.xp,
          isStarter: false
        }
      });
    } catch (err) {
      if (err.code === 'P2002') { // name duplicado
        capturedPokemon = await prisma.pokemon.findFirst({ where: { name: pokemonData.name } });
      } else {
        throw err;
      }
    }

    // Verifica espaço na tela (starter + membros)
    const activeTeam = pets.filter(p => p.isStarter || p.isTeamMember);
    if (activeTeam.length < MAX_ACTIVE_PETS) {
      for (let slot = 2; slot <= 6; slot++) {
        const existing = await prisma.teamSlot.findFirst({ where: { slot } });
        if (!existing) {
          await prisma.teamSlot.create({ data: { slot, pokemonId: capturedPokemon.id } });
          const newPetId = 1000 + slot;
          createPet(newPetId, capturedPokemon.name, false, true);
          break;
        }
      }
    }
  } catch (err) {
    console.error('[Capture] Erro ao capturar Pokémon:', err);
  }
});

// ===================
// Inicialização
// ===================
app.whenReady().then(async () => {
  try {
    const starter = await prisma.pokemon.findFirst({ where: { isStarter: true } });

    if (!starter) {
      const selectionWin = new BrowserWindow({
        width: 900,
        height: 600,
        resizable: false,
        frame: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      });
      selectionWin.loadFile(path.join(__dirname, '../renderer/selection/selection.html'));
      return;
    }

    createPet(1, starter.name, true);

    // Carrega equipe
    const teamSlots = await prisma.teamSlot.findMany({ include: { pokemon: true }, orderBy: { slot: 'asc' } });
    for (const slot of teamSlots) {
      if (slot.slot === 1) continue;
      const petId = 1000 + slot.slot;
      createPet(petId, slot.pokemon.name, false, true);
    }

    // Spawn de pokémons livres
    setInterval(spawnFreePokemon, SPAWN_INTERVAL);

  } catch (err) {
    console.error('[App Init] Erro na inicialização:', err);
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async () => { await prisma.$disconnect(); });

// Global handler para promises não capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
