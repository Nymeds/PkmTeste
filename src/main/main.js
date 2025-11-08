// src/main/main.js
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let pets = []; // { id, petWin, cardWin?, name, isTeamMember, dbId }
const SPAWN_INTERVAL = 30000; // 30s
const MAX_FREE_POKEMONS = 2;
const FREE_LIFETIME = 30000;
const MAX_ACTIVE_PETS = 3;

// ======== Função para criar janela de Pokémon (pet + card) =========
function createPet(id, name, isTeamMember = false, dbId = null) {
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
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    show: false,
    acceptFirstMouse: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      additionalArguments: [
        `--pokemonName=${name}`,
        `--teamMember=${isTeamMember}`,
        `--petId=${id}`,
        `--dbId=${dbId || ''}`
      ],
    },
  });

  petWin.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
  petWin.setMenu(null);

  // cria card window (oculta inicialmente)
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

  petWin.once('ready-to-show', () => {
    try {
      petWin.showInactive();
      petWin.setAlwaysOnTop(true, 'screen-saver');
    } catch (e) {
      petWin.show();
    }
  });

  pets.push({ id, petWin, cardWin, name, isTeamMember, dbId });
}

// ======== IPC Handlers for Selection / Starters =========
ipcMain.handle('get-available-pokemon', async () => {
  try {
    const pokedexPath = path.join(__dirname, '../../pokedex');
    const starters = ['charmander', 'bulbasaur', 'squirtle'];

    const available = starters.map(name => {
      const imgPath = path.join(pokedexPath, name, `${name}.png`);
      return {
        name,
        image: fs.existsSync(imgPath) ? `file://${imgPath.replace(/\\/g,'/')}` : null
      };
    });

    return available;
  } catch (err) {
    console.error('Erro em get-available-pokemon:', err);
    return [];
  }
});

ipcMain.handle('select-starter', async (event, pokemonName) => {
  try {
    const baseStats = {
      charmander: { hp: 39, maxHp: 39, attack: 52, defense: 43, speed: 65 },
      bulbasaur:  { hp: 45, maxHp: 45, attack: 49, defense: 49, speed: 45 },
      squirtle:   { hp: 44, maxHp: 44, attack: 48, defense: 65, speed: 43 }
    };
    const stats = baseStats[pokemonName.toLowerCase()] || { hp: 50, maxHp: 50, attack: 50, defense: 50, speed: 50 };

    const starter = await prisma.TeamPokemon.create({
      data: {
        name: pokemonName,
        xp: 0,
        level: 1,
        hp: stats.hp,
        maxHp: stats.maxHp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed
      }
    });

    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();

    createPet(1, starter.name, true, starter.id);
    setInterval(spawnFreePokemon, SPAWN_INTERVAL);

    return { success: true };
  } catch (err) {
    console.error('Erro em select-starter:', err);
    return { success: false, error: err.message };
  }
});

// ======== show-card / hide-card / update-card (card window control) =========
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
  setTimeout(() => { if (!pet.cardWin.isDestroyed()) pet.cardWin.hide(); }, 250);
});

ipcMain.on('update-card', async (event, id, data) => {
  const pet = pets.find(p => p.id === id);
  if (!pet || pet.cardWin.isDestroyed()) return;
  pet.cardWin.webContents.send('update-stats', data);

  // persiste stats se for membro do time (dbId presente)
  if ((pet.isTeamMember) && pet.dbId) {
    try {
      await prisma.teamPokemon.update({
        where: { id: pet.dbId },
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

// ======== capture-pokemon: cria no DB e transforma selvagem em membro do time =========
ipcMain.handle('capture-pokemon', async (event, { id, name, pokemonData }) => {
  try {
    // cria registro no banco (TeamPokemon)
    const baseStats = pokemonData || {};
    const newPokemon = await prisma.teamPokemon.create({
      data: {
        name,
        xp: baseStats.xp ?? 0,
        level: baseStats.level ?? 1,
        hp: baseStats.hp ?? 50,
        maxHp: baseStats.maxHp ?? (baseStats.hp ?? 50),
        attack: baseStats.attack ?? 50,
        defense: baseStats.defense ?? 50,
        speed: baseStats.speed ?? 50
      }
    });

    // remove a janela correspondente (instância selvagem)
    const pet = pets.find(p => p.id === id);
    if (pet) {
      try { if (!pet.petWin.isDestroyed()) pet.petWin.close(); } catch(e){/* ignore */ }
      try { if (pet.cardWin && !pet.cardWin.isDestroyed()) pet.cardWin.close(); } catch(e){/* ignore */ }
      pets = pets.filter(p => p.id !== id);
    }

    // se houver espaço na tela (time ativo menor que MAX_ACTIVE_PETS), spawn como membro após 3s
    const activeTeamCount = pets.filter(p => p.isTeamMember).length + (await prisma.teamPokemon.count());
    // simpler approach: spawn if current on-screen < MAX_ACTIVE_PETS
    const onScreenTeam = pets.filter(p => p.isTeamMember || p.dbId).length;
    if (onScreenTeam < MAX_ACTIVE_PETS) {
      setTimeout(() => {
        // Use id base 1000 + timestamp fragment (garante id único para janela)
        const newPetWindowId = 1000 + Math.floor(Math.random() * 9000);
        createPet(newPetWindowId, newPokemon.name, true, newPokemon.id);
      }, 3000);
    }

    return { success: true, pokemon: newPokemon };
  } catch (err) {
    console.error('Erro ao capturar Pokémon no main:', err);
    return { success: false, error: err.message };
  }
});

// ======== Spawn de pokémons selvagens =========
async function spawnFreePokemon() {
  const freeCount = pets.filter(p => !p.isTeamMember).length;
  if (freeCount >= MAX_FREE_POKEMONS) return;

  const pokedexPath = path.join(__dirname, '../../pokedex');
  const allPokemons = fs.readdirSync(pokedexPath)
                        .filter(f => !['charmander','bulbasaur','squirtle'].includes(f.toLowerCase()));

  if (!allPokemons.length) return;

  const count = Math.floor(Math.random() * 2) + 1; // 1 ou 2
  for (let i = 0; i < count; i++) {
    const name = allPokemons[Math.floor(Math.random() * allPokemons.length)];
    const id = Date.now() + Math.floor(Math.random()*1000);
    createPet(id, name, false, null);

    setTimeout(() => {
      // garante que remove apenas a instância antiga caso ainda exista
      const p = pets.find(p => p.id === id);
      if (p) {
        try { if (!p.petWin.isDestroyed()) p.petWin.close(); } catch(e) {}
        try { if (p.cardWin && !p.cardWin.isDestroyed()) p.cardWin.close(); } catch(e) {}
        pets = pets.filter(pp => pp.id !== id);
      }
    }, FREE_LIFETIME);
  }
}

// ======== move-window (posição das janelas) =========
ipcMain.on('move-window', (event, id, newX, yOffset) => {
  const pet = pets.find(p => p.id === id);
  if (!pet || pet.petWin.isDestroyed()) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const xi = Number(newX) || 0;
  const x = Math.max(0, Math.min(Math.round(xi), width - 120));
  const yBase = height - 150;

  const yOff = Number(yOffset) || 0;
  const clampedOffset = Math.max(0, Math.min(yOff, 150));
  const y = Math.max(0, Math.min(Math.round(yBase - clampedOffset), height - 120));

  try {
    pet.petWin.setBounds({ x, y, width: 120, height: 120 });
  } catch (err) {
    console.warn('[move-window] setBounds falhou', err);
  }
});

// ======== Inicialização =========
app.whenReady().then(async () => {
  try {
    const team = await prisma.teamPokemon.findMany();

    if (team.length === 0) {
      const selectionWin = new BrowserWindow({
        width: 900, height: 600,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      });
      selectionWin.loadFile(path.join(__dirname,'../renderer/selection/selection.html'));
      return;
    }

    // Cria pets do time (até MAX_ACTIVE_PETS)
    team.forEach((p, idx) => {
      if (idx < MAX_ACTIVE_PETS) createPet(1000+idx, p.name, true, p.id);
    });

    setInterval(spawnFreePokemon, SPAWN_INTERVAL);
  } catch (err) {
    console.error('[App Init] Erro na inicialização:', err);
  }
});

app.on('before-quit', async () => { await prisma.$disconnect(); });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
