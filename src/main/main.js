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
    acceptFirstMouse: true, // ← importante para cliques imediatos
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // garante animação continua
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

  pets.push({ id, petWin, cardWin, isStarter });
}

// ===================
// Spawn de pokémon livre
// ===================let spawnCount = 0; // contador global

let spawnCount = 0; // contador global

async function spawnFreePokemon() {
    spawnCount++;
    const now = new Date().toLocaleTimeString();
    console.log(`[Spawn ${spawnCount}] Tentando spawn às ${now}`);
  
    const freeCount = pets.filter(p => !p.isStarter).length;
    if (freeCount >= MAX_FREE_POKEMONS) {
      console.log(`[Spawn ${spawnCount}] Limite de pokémons livres atingido (${freeCount}/${MAX_FREE_POKEMONS})`);
      return;
    }
  
    // pega todos os pokémons da pasta pokedex
    const pokedexPath = path.join(__dirname, '../../pokedex');
    let allPokemons = fs.readdirSync(pokedexPath).filter(file => {
      return fs.statSync(path.join(pokedexPath, file)).isDirectory();
    });
  
    if (!allPokemons.length) {
      console.log(`[Spawn ${spawnCount}] Nenhum pokémon disponível na Pokédex`);
      return;
    }
  
    // escolhe um aleatório
    const freePokemonName = allPokemons[Math.floor(Math.random() * allPokemons.length)];
    const id = Math.floor(Math.random() * 100000);
  
    createPet(id, freePokemonName, false);
    console.log(`[Spawn ${spawnCount}] Criando Pokémon livre: ${freePokemonName} (ID: ${id})`);
  
    setTimeout(() => {
      const pet = pets.find(p => p.id === id);
      if (pet) {
        pet.petWin.close();
        pet.cardWin.close();
        pets = pets.filter(p => p.id !== id);
        console.log(`[Spawn ${spawnCount}] Pokémon livre removido: ${freePokemonName} (ID: ${id})`);
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

// substitua o handler antigo por este
ipcMain.on('move-window', (event, id, newX, jumpHeight) => {
 
    const pet = pets.find(p => p.id === id);
    if (!pet) return;
  
    const { petWin } = pet;
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
    // garante number válido para newX
    const xi = Number(newX);
    const x = Number.isFinite(xi) ? Math.max(0, Math.min(xi, width - 120)) : 0;
  
    // jumpHeight é opcional — se não for número usamos 0 (sem movimento vertical)
    const jh = (typeof jumpHeight === 'number' && Number.isFinite(jumpHeight)) ? jumpHeight : 0;
  
    // y fixo (acima da taskbar). jh pode reduzir y se quiser movimento vertical,
    // mas se jh for 0 aqui ficará sempre no mesmo nível vertical.
    const yBase = height - 150;
    const y = Math.max(0, Math.min(yBase - jh, height - 120));
  
    petWin.setBounds({ x, y, width: 120, height: 120 });
  });
  

// ===================
// Seleção de starter
// ===================
ipcMain.handle('select-starter', async (event, pokemonName) => {
  try {
    await prisma.pokemon.updateMany({ where: {}, data: { isStarter: false } });

    const starter = await prisma.pokemon.upsert({
      where: { name: pokemonName },
      update: { isStarter: true },
      create: { name: pokemonName, hp: 100, maxHp: 100, attack: 10, defense: 10, speed: 10, isStarter: true }
    });

    // Adiciona no slot 1
    await prisma.teamSlot.create({
      data: { slot: 1, pokemonId: starter.id }
    });

    createPet(1, starter.name, true);

    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();

    setInterval(spawnFreePokemon, SPAWN_INTERVAL);

    return { success: true };
  } catch (err) {
    console.error(err);
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
        // Converte para caminho absoluto tipo file://
        pokemonList.push({
          name: p.charAt(0).toUpperCase() + p.slice(1),
          image: `file://${imgPath.replace(/\\/g, '/')}` // importante para Windows
        });
      }
    }
  
    return pokemonList;
  });
  

// ===================
// Inicialização do app
// ===================
app.whenReady().then(async () => {
  const starter = await prisma.pokemon.findFirst({ where: { isStarter: true } });

  if (!starter) {
    // Nenhum starter definido → abrir janela de seleção
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

  // Starter já existe → cria pet
  createPet(1, starter.name, true);

  // Inicia spawn de pokémons livres
  setInterval(spawnFreePokemon, SPAWN_INTERVAL);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
// ===================
// Captura de Pokémon
// ===================
ipcMain.on('capture-success', async (event, petId, pokemonData) => {
    try {
        console.log(`[Capture] Pokémon capturado: ${pokemonData.name} (ID do pet: ${petId})`);

        // Salva o Pokémon no banco
        const capturedPokemon = await prisma.pokemon.create({
            data: {
                name: pokemonData.name,
                hp: pokemonData.hp,
                maxHp: pokemonData.maxHp,
                attack: pokemonData.attack,
                defense: pokemonData.defense,
                speed: pokemonData.speed,
                isStarter: false
            }
        });

        // Procura primeiro slot vazio na equipe (1 a 6)
        for (let slot = 1; slot <= 6; slot++) {
            const existing = await prisma.teamSlot.findFirst({ where: { slot } });
            if (!existing) {
                await prisma.teamSlot.create({
                    data: { slot, pokemonId: capturedPokemon.id }
                });
                console.log(`[Capture] Pokémon ${pokemonData.name} adicionado ao slot ${slot}`);
                break;
            }
        }

        // Fecha a janela do pet
        const pet = pets.find(p => p.id === petId);
        if (pet) {
            pet.petWin.close();
            pet.cardWin.close();
            pets = pets.filter(p => p.id !== petId);
        }
    } catch (err) {
        console.error('[Capture] Erro ao capturar Pokémon:', err);
    }
});
