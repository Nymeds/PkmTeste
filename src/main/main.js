const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let pets = [];
const SPAWN_INTERVAL = 30000;
const MAX_FREE_POKEMONS = 3;
const FREE_LIFETIME = 20000;

// ===================
// Criar um pet (janela + card)
// ===================
function createPet(id, name, isStarter) {
  console.log(`[Main] Criando pet: ${name}, ID: ${id}, Starter: ${isStarter}`);
  
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
      additionalArguments: [`--pokemonName=${name}`, `--starter=${isStarter}`, `--petId=${id}`],
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

  pets.push({ id, petWin, cardWin, isStarter, name });
  
  console.log(`[Main] Pet criado com sucesso. Total de pets: ${pets.length}`);
}

// ===================
// Spawn de pokémon livre
// ===================
let spawnCount = 0;

async function spawnFreePokemon() {
    spawnCount++;
    const now = new Date().toLocaleTimeString();
    console.log(`[Spawn ${spawnCount}] Tentando spawn às ${now}`);
  
    const freeCount = pets.filter(p => !p.isStarter).length;
    if (freeCount >= MAX_FREE_POKEMONS) {
      console.log(`[Spawn ${spawnCount}] Limite de pokémons livres atingido (${freeCount}/${MAX_FREE_POKEMONS})`);
      return;
    }
  
    const pokedexPath = path.join(__dirname, '../../pokedex');
    let allPokemons = fs.readdirSync(pokedexPath).filter(file => {
      return fs.statSync(path.join(pokedexPath, file)).isDirectory();
    });
  
    if (!allPokemons.length) {
      console.log(`[Spawn ${spawnCount}] Nenhum pokémon disponível na Pokédex`);
      return;
    }
  
    const freePokemonName = allPokemons[Math.floor(Math.random() * allPokemons.length)];
    const id = Date.now() + Math.floor(Math.random() * 1000);
  
    createPet(id, freePokemonName, false);
    console.log(`[Spawn ${spawnCount}] Criando Pokémon livre: ${freePokemonName} (ID: ${id})`);
  
    setTimeout(() => {
      const pet = pets.find(p => p.id === id);
      if (pet) {
        console.log(`[Spawn ${spawnCount}] Removendo Pokémon livre: ${freePokemonName} (ID: ${id})`);
        if (!pet.petWin.isDestroyed()) pet.petWin.close();
        if (!pet.cardWin.isDestroyed()) pet.cardWin.close();
        pets = pets.filter(p => p.id !== id);
      }
    }, FREE_LIFETIME);
}

// ===================
// IPC Events
// ===================

// Mostrar / esconder card
ipcMain.on('show-card', (event, id) => {
  const pet = pets.find(p => p.id === id);
  if (!pet) return;
  const { petWin, cardWin } = pet;
  if (petWin.isDestroyed() || cardWin.isDestroyed()) return;
  
  const { height } = screen.getPrimaryDisplay().workAreaSize;
  const winBounds = petWin.getBounds();
  cardWin.setBounds({ x: winBounds.x + 130, y: height - 260, width: 180, height: 200 });
  cardWin.showInactive();
  cardWin.webContents.send('show-card');
});

ipcMain.on('hide-card', (event, id) => {
  const pet = pets.find(p => p.id === id);
  if (!pet) return;
  const { cardWin } = pet;
  if (cardWin.isDestroyed()) return;
  
  cardWin.webContents.send('hide-card');
  setTimeout(() => {
    if (!cardWin.isDestroyed()) cardWin.hide();
  }, 250);
});

ipcMain.on('update-card', (event, id, data) => {
  const pet = pets.find(p => p.id === id);
  if (pet && pet.cardWin && !pet.cardWin.isDestroyed()) {
    pet.cardWin.webContents.send('update-stats', data);
  }
});

ipcMain.on('move-window', (event, id, newX, jumpHeight) => {
    const pet = pets.find(p => p.id === id);
    if (!pet || pet.petWin.isDestroyed()) return;
  
    const { petWin } = pet;
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
    const xi = Number(newX);
    const x = Number.isFinite(xi) ? Math.max(0, Math.min(xi, width - 120)) : 0;
  
    const jh = (typeof jumpHeight === 'number' && Number.isFinite(jumpHeight)) ? jumpHeight : 0;
  
    const yBase = height - 150;
    const y = Math.max(0, Math.min(yBase - jh, height - 120));
  
    petWin.setBounds({ x, y, width: 120, height: 120 });
});

// ===================
// Seleção de starter
// ===================
ipcMain.handle('select-starter', async (event, pokemonName) => {
  try {
    console.log(`[Main] Selecionando starter: ${pokemonName}`);
    
    await prisma.pokemon.updateMany({ where: {}, data: { isStarter: false } });

    const starter = await prisma.pokemon.upsert({
      where: { name: pokemonName },
      update: { isStarter: true },
      create: { 
        name: pokemonName, 
        hp: 100, 
        maxHp: 100, 
        attack: 10, 
        defense: 10, 
        speed: 10, 
        isStarter: true 
      }
    });

    // Limpa slots anteriores
    await prisma.teamSlot.deleteMany({});
    
    // Adiciona no slot 1
    await prisma.teamSlot.create({
      data: { slot: 1, pokemonId: starter.id }
    });

    createPet(1, starter.name, true);

    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();

    // Inicia spawn de pokémons após 5 segundos
    setTimeout(() => {
      setInterval(spawnFreePokemon, SPAWN_INTERVAL);
    }, 5000);

    return { success: true };
  } catch (err) {
    console.error('[Main] Erro ao selecionar starter:', err);
    return { success: false, error: err.message };
  }
});

// ===================
// Retorna os starters da pasta pokedex
// ===================
ipcMain.handle('get-available-pokemon', async () => {
    const pokedexPath = path.join(__dirname, '../../pokedex');
    const starters = ['pikachu', 'charmander', 'squirtle', 'bulbasaur'];
    const pokemonList = [];
  
    for (const p of starters) {
      const pPath = path.join(pokedexPath, p);
      const imgPath = path.join(pPath, `${p}.png`);
      if (fs.existsSync(imgPath)) {
        pokemonList.push({
          name: p.charAt(0).toUpperCase() + p.slice(1),
          image: `file://${imgPath.replace(/\\/g, '/')}`
        });
      }
    }
  
    return pokemonList;
});

// ===================
// Captura de Pokémon
// ===================
ipcMain.on('capture-success', async (event, petId, pokemonData) => {
    try {
        console.log(`[Capture] Iniciando captura de ${pokemonData.name} (Pet ID: ${petId})`);

        // Verifica se já existe
        const existing = await prisma.pokemon.findUnique({
            where: { name: pokemonData.name }
        });

        let capturedPokemon;
        if (existing) {
            console.log(`[Capture] Pokémon já existe no banco, atualizando dados`);
            capturedPokemon = existing;
        } else {
            console.log(`[Capture] Criando novo registro no banco`);
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
        }

        // Procura primeiro slot vazio (2 a 6, pois 1 é do starter)
        let slotAdded = false;
        for (let slot = 2; slot <= 6; slot++) {
            const slotExists = await prisma.teamSlot.findFirst({ where: { slot } });
            if (!slotExists) {
                await prisma.teamSlot.create({
                    data: { slot, pokemonId: capturedPokemon.id }
                });
                console.log(`[Capture] Pokémon ${pokemonData.name} adicionado ao slot ${slot}`);
                slotAdded = true;
                break;
            }
        }

        if (!slotAdded) {
            console.log(`[Capture] Equipe cheia! Pokémon capturado mas não adicionado à equipe`);
        }

        // Remove o pet da lista e fecha janelas
        const pet = pets.find(p => p.id === petId);
        if (pet) {
            console.log(`[Capture] Fechando janelas do pet`);
            
            setTimeout(() => {
                if (!pet.petWin.isDestroyed()) pet.petWin.close();
                if (!pet.cardWin.isDestroyed()) pet.cardWin.close();
            }, 500);
            
            pets = pets.filter(p => p.id !== petId);
            console.log(`[Capture] Pet removido. Total de pets: ${pets.length}`);
        }

        console.log(`[Capture] Captura concluída com sucesso!`);
    } catch (err) {
        console.error('[Capture] Erro ao capturar Pokémon:', err);
    }
});

// ===================
// Inicialização do app
// ===================
app.whenReady().then(async () => {
  console.log('[Main] Aplicação iniciando...');
  
  const starter = await prisma.pokemon.findFirst({ where: { isStarter: true } });

  if (!starter) {
    console.log('[Main] Nenhum starter encontrado, abrindo seleção');
    const selectionWin = new BrowserWindow({
      width: 900,
      height: 600,
      resizable: false,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    selectionWin.loadFile(path.join(__dirname, '../renderer/selection/selection.html'));
    return;
  }

  console.log(`[Main] Starter encontrado: ${starter.name}`);
  createPet(1, starter.name, true);

  // Inicia spawn após 5 segundos
  setTimeout(() => {
    console.log('[Main] Iniciando sistema de spawn');
    setInterval(spawnFreePokemon, SPAWN_INTERVAL);
  }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('[Main] Fechando aplicação');
    app.quit();
  }
});

// Cleanup ao sair
app.on('before-quit', async () => {
  console.log('[Main] Limpando recursos...');
  await prisma.$disconnect();
});