// src/main/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const prisma = require('./db');

// Gerenciamento de janelas
const windows = {
  pets: new Map(), // id -> { win, cardWin, data }
  selection: null
};

// Pokemons selvagens temporários
let wildPokemons = [];
let spawnInterval = null;
let saveInterval = null;

// ==================== HELPERS ====================

function loadPokemonStats(pokemonName) {
  try {
    const statsPath = path.join(__dirname, `../../pokedex/${pokemonName.toLowerCase()}/stats.json`);
    if (!fs.existsSync(statsPath)) return null;
    return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  } catch (err) {
    console.error(`Erro ao carregar stats de ${pokemonName}:`, err);
    return null;
  }
}

function getAvailablePokedex() {
  try {
    const pokedexPath = path.join(__dirname, '../../pokedex');
    if (!fs.existsSync(pokedexPath)) return [];
    
    return fs.readdirSync(pokedexPath)
      .filter(dir => {
        const fullPath = path.join(pokedexPath, dir);
        return fs.statSync(fullPath).isDirectory();
      });
  } catch (err) {
    console.error('Erro ao listar Pokedex:', err);
    return [];
  }
}

// ==================== CRIAÇÃO DE JANELAS ====================

async function createPetWindow(petData) {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const petWin = new BrowserWindow({
    width: 120,
    height: 120,
    x: Math.floor(Math.random() * (width - 120)),
    y: height - 150,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      additionalArguments: [
        `--pokemonId=${petData.id}`,
        `--pokemonName=${petData.name}`,
        `--isWild=${petData.isWild || false}`,
        `--level=${petData.level}`,
        `--xp=${petData.xp}`,
        `--hp=${petData.hp}`,
        `--maxHp=${petData.maxHp}`,
        `--attack=${petData.attack}`,
        `--defense=${petData.defense}`,
        `--speed=${petData.speed}`
      ]
    }
  });

  const cardWin = new BrowserWindow({
    width: 180,
    height: 220,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await petWin.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
  await cardWin.loadFile(path.join(__dirname, '../renderer/card/card.html'));

  petWin.setMenu(null);
  cardWin.setMenu(null);

  petWin.once('ready-to-show', () => {
    try {
      petWin.showInactive();
      petWin.setAlwaysOnTop(true, 'screen-saver');
    } catch (e) {
      petWin.show();
    }
  });

  windows.pets.set(petData.id, {
    win: petWin,
    cardWin: cardWin,
    data: petData
  });

  return { petWin, cardWin };
}

function removePetWindow(petId) {
  const pet = windows.pets.get(petId);
  if (!pet) return;

  try {
    if (!pet.win.isDestroyed()) pet.win.close();
    if (!pet.cardWin.isDestroyed()) pet.cardWin.close();
  } catch (e) {
    console.error('Erro ao remover janela:', e);
  }

  windows.pets.delete(petId);
}

// ==================== SPAWN SYSTEM ====================

async function spawnWildPokemon() {
  // Limita a 2 selvagens simultâneos
  if (wildPokemons.length >= 2) return;

  const available = getAvailablePokedex()
    .filter(name => !['charmander', 'bulbasaur', 'squirtle'].includes(name.toLowerCase()));

  if (available.length === 0) return;

  const count = Math.random() < 0.5 ? 1 : 2;
  
  for (let i = 0; i < count && wildPokemons.length < 2; i++) {
    const pokemonName = available[Math.floor(Math.random() * available.length)];
    const stats = loadPokemonStats(pokemonName);
    
    if (!stats) continue;

    const wildId = `wild_${Date.now()}_${Math.random()}`;
    const wildData = {
      id: wildId,
      name: pokemonName,
      isWild: true,
      level: Math.floor(Math.random() * 5) + 1,
      xp: 0,
      hp: stats.baseStats.hp,
      maxHp: stats.baseStats.hp,
      attack: stats.baseStats.attack,
      defense: stats.baseStats.defense,
      speed: stats.baseStats.speed
    };

    wildPokemons.push(wildData);
    await createPetWindow(wildData);

    // Remove após 30 segundos
    setTimeout(() => {
      const index = wildPokemons.findIndex(p => p.id === wildId);
      if (index !== -1) {
        wildPokemons.splice(index, 1);
        removePetWindow(wildId);
      }
    }, 30000);
  }
}

function startSpawnSystem() {
  spawnWildPokemon(); // Spawn inicial
  spawnInterval = setInterval(spawnWildPokemon, 30000);
}

// ==================== TEAM SYSTEM ====================

async function renderTeamPokemons() {
  try {
    // Busca os 3 primeiros slots do time
    const teamSlots = await prisma.teamSlot.findMany({
      where: { slotNumber: { lte: 3 } },
      include: { pokemon: true },
      orderBy: { slotNumber: 'asc' }
    });

    for (const slot of teamSlots) {
      const petData = {
        id: `team_${slot.pokemon.uuid}`,
        dbId: slot.pokemon.id,
        name: slot.pokemon.name,
        isWild: false,
        isTeam: true,
        slotNumber: slot.slotNumber,
        level: slot.pokemon.level,
        xp: slot.pokemon.xp,
        hp: slot.pokemon.hp,
        maxHp: slot.pokemon.maxHp,
        attack: slot.pokemon.attack,
        defense: slot.pokemon.defense,
        speed: slot.pokemon.speed
      };

      await createPetWindow(petData);
    }
  } catch (err) {
    console.error('Erro ao renderizar time:', err);
  }
}

// ==================== SAVE SYSTEM ====================

async function saveAllTeamStats() {
  for (const [id, pet] of windows.pets) {
    if (pet.data.isTeam && pet.data.dbId) {
      try {
        await prisma.pokemon.update({
          where: { id: pet.data.dbId },
          data: {
            level: pet.data.level,
            xp: pet.data.xp,
            hp: pet.data.hp,
            maxHp: pet.data.maxHp,
            attack: pet.data.attack,
            defense: pet.data.defense,
            speed: pet.data.speed
          }
        });
        console.log(`✅ Stats salvos: ${pet.data.name}`);
      } catch (err) {
        console.error(`❌ Erro ao salvar ${pet.data.name}:`, err);
      }
    }
  }
}

function startAutoSave() {
  saveInterval = setInterval(saveAllTeamStats, 20000);
}

// ==================== IPC HANDLERS ====================

ipcMain.handle('get-available-pokemon', async () => {
  const starters = ['charmander', 'bulbasaur', 'squirtle'];
  return starters.map(name => {
    const imgPath = path.join(__dirname, `../../pokedex/${name}/${name}.png`);
    return {
      name,
      image: fs.existsSync(imgPath) ? `file://${imgPath.replace(/\\/g, '/')}` : null
    };
  });
});

ipcMain.handle('select-starter', async (event, pokemonName) => {
  try {
    const stats = loadPokemonStats(pokemonName);
    if (!stats) return { success: false, error: 'Stats não encontrados' };

    // Cria o Pokemon
    const pokemon = await prisma.pokemon.create({
      data: {
        name: pokemonName,
        level: 1,
        xp: 0,
        hp: stats.baseStats.hp,
        maxHp: stats.baseStats.hp,
        attack: stats.baseStats.attack,
        defense: stats.baseStats.defense,
        speed: stats.baseStats.speed
      }
    });

    // Adiciona ao slot 1 (starter)
    await prisma.teamSlot.create({
      data: {
        slotNumber: 1,
        pokemonId: pokemon.id
      }
    });

    // Atualiza GameState
    await prisma.gameState.upsert({
      where: { id: 1 },
      create: { starterChosen: true, starterPokemon: pokemonName },
      update: { starterChosen: true, starterPokemon: pokemonName }
    });

    // Fecha janela de seleção
    if (windows.selection && !windows.selection.isDestroyed()) {
      windows.selection.close();
      windows.selection = null;
    }

    // Renderiza time e inicia sistemas
    await renderTeamPokemons();
    startSpawnSystem();
    startAutoSave();

    return { success: true };
  } catch (err) {
    console.error('Erro ao selecionar starter:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('capture-pokemon', async (event, payload) => {
  try {
    const { pokemonId } = payload;
    
    // Verifica se é selvagem
    const wildIndex = wildPokemons.findIndex(p => p.id === pokemonId);
    if (wildIndex === -1) {
      return { success: false, error: 'Não é um Pokemon selvagem' };
    }

    const wildData = wildPokemons[wildIndex];

    // Calcula chance de captura (60% base - 5% por nível)
    let captureChance = 0.6 - ((wildData.level - 1) * 0.05);
    captureChance = Math.max(captureChance, 0.3);

    const captured = Math.random() < captureChance;

    if (!captured) {
      return { success: false, captured: false };
    }

    // Remove da lista de selvagens
    wildPokemons.splice(wildIndex, 1);
    removePetWindow(pokemonId);

    // Salva no banco
    const pokemon = await prisma.pokemon.create({
      data: {
        name: wildData.name,
        level: wildData.level,
        xp: wildData.xp,
        hp: wildData.hp,
        maxHp: wildData.maxHp,
        attack: wildData.attack,
        defense: wildData.defense,
        speed: wildData.speed
      }
    });

    // Verifica slots disponíveis (2 e 3)
    const usedSlots = await prisma.teamSlot.findMany({
      where: { slotNumber: { in: [2, 3] } }
    });

    if (usedSlots.length < 2) {
      const nextSlot = usedSlots.length === 0 ? 2 : 3;
      
      // Adiciona ao time
      await prisma.teamSlot.create({
        data: {
          slotNumber: nextSlot,
          pokemonId: pokemon.id
        }
      });

      // Aguarda 5 segundos e renderiza
      setTimeout(async () => {
        const petData = {
          id: `team_${pokemon.uuid}`,
          dbId: pokemon.id,
          name: pokemon.name,
          isWild: false,
          isTeam: true,
          slotNumber: nextSlot,
          level: pokemon.level,
          xp: pokemon.xp,
          hp: pokemon.hp,
          maxHp: pokemon.maxHp,
          attack: pokemon.attack,
          defense: pokemon.defense,
          speed: pokemon.speed
        };

        await createPetWindow(petData);
      }, 5000);
    }

    return { success: true, captured: true, addedToTeam: usedSlots.length < 2 };
  } catch (err) {
    console.error('Erro na captura:', err);
    return { success: false, error: err.message };
  }
});

// Card handlers
ipcMain.on('show-card', (event, pokemonId) => {
  const pet = windows.pets.get(pokemonId);
  if (!pet) return;

  try {
    const petBounds = pet.win.getBounds();
    pet.cardWin.setBounds({
      x: petBounds.x - 30,
      y: petBounds.y - 230,
      width: 180,
      height: 220
    });
    pet.cardWin.showInactive();
    pet.cardWin.webContents.send('update-card-data', pet.data);
  } catch (e) {
    console.error('Erro ao mostrar card:', e);
  }
});

ipcMain.on('hide-card', (event, pokemonId) => {
  const pet = windows.pets.get(pokemonId);
  if (!pet) return;

  try {
    pet.cardWin.hide();
  } catch (e) {
    console.error('Erro ao esconder card:', e);
  }
});

ipcMain.on('update-stats', (event, { pokemonId, stats }) => {
  const pet = windows.pets.get(pokemonId);
  if (!pet) return;

  // Atualiza dados locais
  Object.assign(pet.data, stats);

  // Atualiza card se visível
  if (pet.cardWin.isVisible()) {
    pet.cardWin.webContents.send('update-card-data', pet.data);
  }
});

// ==================== APP LIFECYCLE ====================

app.whenReady().then(async () => {
  try {
    const gameState = await prisma.gameState.findFirst();

    if (!gameState || !gameState.starterChosen) {
      // Mostra seleção de starter
      windows.selection = new BrowserWindow({
        width: 900,
        height: 600,
        resizable: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });
      windows.selection.loadFile(path.join(__dirname, '../renderer/selection/selection.html'));
      windows.selection.setMenu(null);
    } else {
      // Carrega time existente
      await renderTeamPokemons();
      startSpawnSystem();
      startAutoSave();
    }
  } catch (err) {
    console.error('Erro na inicialização:', err);
  }
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  
  // Para intervalos
  if (spawnInterval) clearInterval(spawnInterval);
  if (saveInterval) clearInterval(saveInterval);
  
  // Salva stats
  await saveAllTeamStats();
  
  // Desconecta Prisma
  await prisma.$disconnect();
  
  app.exit(0);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});