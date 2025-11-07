const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
let selectionWindow = null;
let petWindows = new Map(); // Map<pokemonId, BrowserWindow>
let gameState = null;

// ==========================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// ==========================================
async function initDatabase() {
    try {
        // Verifica se já existe um estado de jogo
        const states = await prisma.gameState.findMany();
        
        if (states.length === 0) {
            gameState = await prisma.gameState.create({
                data: {
                    totalPlayTime: 0,
                    totalXpEarned: 0,
                    pokemonCaught: 0
                }
            });
        } else {
            gameState = states[0];
        }

        // Carrega todos os Pokémon da Pokédex
        await loadPokedex();
        
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
    }
}

// ==========================================
// CARREGAR POKÉDEX
// ==========================================
async function loadPokedex() {
    const pokedexPath = path.join(__dirname, '../../pokedex');
    const pokemonFolders = ['pikachu', 'charmander', 'squirtle', 'bulbasaur', 'dragonite'];

    for (const folder of pokemonFolders) {
        const statsPath = path.join(pokedexPath, folder, 'stats.json');
        
        if (fs.existsSync(statsPath)) {
            const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
            
            // Verifica se o Pokémon já existe no banco
            const existing = await prisma.pokemon.findUnique({
                where: { name: stats.name }
            });

            if (!existing) {
                await prisma.pokemon.create({
                    data: {
                        name: stats.name,
                        hp: stats.baseStats.hp,
                        maxHp: stats.baseStats.hp,
                        attack: stats.baseStats.attack,
                        defense: stats.baseStats.defense,
                        speed: stats.baseStats.speed,
                        level: 1,
                        xp: 0,
                        isStarter: false,
                        isActive: false
                    }
                });
                console.log(`📝 Loaded ${stats.name} into database`);
            }
        }
    }
}

// ==========================================
// JANELA DE SELEÇÃO DE INICIAL
// ==========================================
async function createSelectionWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    selectionWindow = new BrowserWindow({
        width: 800,
        height: 600,
        x: Math.floor((width - 800) / 2),
        y: Math.floor((height - 600) / 2),
        transparent: false,
        frame: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    selectionWindow.loadFile(path.join(__dirname, '../renderer/selection/selection.html'));
    selectionWindow.setMenu(null);

    selectionWindow.on('closed', () => {
        selectionWindow = null;
    });
}

// ==========================================
// CRIAR JANELA DO PET
// ==========================================
async function createPetWindow(pokemonData, isStarter = false) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    const startX = pokemonData.positionX || Math.floor(Math.random() * (width - 120));
    const startY = height - 140;

    const petWindow = new BrowserWindow({
        width: 120,
        height: 120,
        x: startX,
        y: startY,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        hasShadow: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            additionalArguments: [`--pokemon-id=${pokemonData.id}`]
        }
    });

    petWindow.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
    petWindow.setIgnoreMouseEvents(true, { forward: true });
    petWindow.setMenu(null);

    // Armazena a referência da janela
    petWindows.set(pokemonData.id, petWindow);

    // Atualiza o Pokémon como ativo
    await prisma.pokemon.update({
        where: { id: pokemonData.id },
        data: { 
            isActive: true,
            isStarter: isStarter,
            positionX: startX,
            positionY: startY
        }
    });

    // ESC para fechar (apenas se for o starter)
    if (isStarter) {
        petWindow.webContents.on('before-input-event', (event, input) => {
            if (input.type === 'keyDown' && input.key === 'Escape') {
                app.quit();
            }
        });
    }

    petWindow.on('closed', async () => {
        petWindows.delete(pokemonData.id);
        
        // Marca como inativo no banco
        await prisma.pokemon.update({
            where: { id: pokemonData.id },
            data: { isActive: false }
        }).catch(err => console.error('Error updating pokemon:', err));
    });

    console.log(`🎮 ${pokemonData.name} spawned on screen!`);
}

// ==========================================
// SPAWN ALEATÓRIO DE POKÉMON
// ==========================================
async function spawnRandomPokemon() {
    try {
        // Busca Pokémon que não são o starter e não estão ativos
        const availablePokemon = await prisma.pokemon.findMany({
            where: {
                isStarter: false,
                isActive: false
            }
        });

        if (availablePokemon.length > 0) {
            const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
            await createPetWindow(randomPokemon, false);

            // Agenda para remover depois de 2-5 minutos
            const despawnTime = (2 + Math.random() * 3) * 60 * 1000;
            
            setTimeout(async () => {
                const window = petWindows.get(randomPokemon.id);
                if (window && !window.isDestroyed()) {
                    window.close();
                }
            }, despawnTime);
        }
    } catch (error) {
        console.error('Error spawning random pokemon:', error);
    }
}

// ==========================================
// SISTEMA DE XP AUTOMÁTICO
// ==========================================
function startXPSystem() {
    setInterval(async () => {
        try {
            const activePokemon = await prisma.pokemon.findMany({
                where: { isActive: true }
            });

            for (const pokemon of activePokemon) {
                const newXp = pokemon.xp + 1;
                const xpForNextLevel = pokemon.level * 100;
                
                let levelUp = false;
                let newLevel = pokemon.level;
                let newMaxHp = pokemon.maxHp;
                let newAttack = pokemon.attack;
                let newDefense = pokemon.defense;

                // Verifica level up
                if (newXp >= xpForNextLevel) {
                    levelUp = true;
                    newLevel += 1;
                    newMaxHp += 5;
                    newAttack += 3;
                    newDefense += 2;
                }

                await prisma.pokemon.update({
                    where: { id: pokemon.id },
                    data: {
                        xp: newXp,
                        level: newLevel,
                        maxHp: newMaxHp,
                        hp: Math.min(pokemon.hp + (levelUp ? 5 : 0), newMaxHp),
                        attack: newAttack,
                        defense: newDefense
                    }
                });

                // Notifica a janela do pet sobre a atualização
                const window = petWindows.get(pokemon.id);
                if (window && !window.isDestroyed()) {
                    window.webContents.send('pokemon-updated', {
                        level: newLevel,
                        xp: newXp,
                        maxHp: newMaxHp,
                        hp: pokemon.hp,
                        attack: newAttack,
                        defense: newDefense,
                        levelUp: levelUp
                    });
                }

                if (levelUp) {
                    console.log(`🎉 ${pokemon.name} subiu para o nível ${newLevel}!`);
                }
            }

            // Atualiza tempo total de jogo
            await prisma.gameState.update({
                where: { id: gameState.id },
                data: { 
                    totalPlayTime: { increment: 10 },
                    lastPlayed: new Date()
                }
            });
        } catch (error) {
            console.error('Error in XP system:', error);
        }
    }, 10000); // A cada 10 segundos
}

// ==========================================
// SISTEMA DE SPAWN ALEATÓRIO
// ==========================================
function startRandomSpawnSystem() {
    const spawnInterval = () => {
        const minMinutes = 15;
        const maxMinutes = 30;
        return (minMinutes + Math.random() * (maxMinutes - minMinutes)) * 60 * 1000;
    };

    const scheduleNextSpawn = () => {
        setTimeout(async () => {
            await spawnRandomPokemon();
            scheduleNextSpawn();
        }, spawnInterval());
    };

    scheduleNextSpawn();
    console.log('🎲 Random spawn system started');
}

// ==========================================
// IPC HANDLERS
// ==========================================
ipcMain.handle('get-available-pokemon', async () => {
    const pokemon = await prisma.pokemon.findMany({
        orderBy: { name: 'asc' }
    });
    return pokemon;
});

ipcMain.handle('select-starter', async (event, pokemonName) => {
    try {
        const pokemon = await prisma.pokemon.findUnique({
            where: { name: pokemonName }
        });

        if (!pokemon) {
            throw new Error('Pokemon not found');
        }

        // Atualiza o estado do jogo
        await prisma.gameState.update({
            where: { id: gameState.id },
            data: { starterPokemon: pokemonName }
        });

        // Fecha a janela de seleção
        if (selectionWindow && !selectionWindow.isDestroyed()) {
            selectionWindow.close();
        }

        // Cria a janela do pet inicial
        await createPetWindow(pokemon, true);

        // Inicia sistemas
        startXPSystem();
        startRandomSpawnSystem();

        return { success: true };
    } catch (error) {
        console.error('Error selecting starter:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-pokemon-data', async (event, pokemonId) => {
    const pokemon = await prisma.pokemon.findUnique({
        where: { id: pokemonId }
    });
    return pokemon;
});

ipcMain.on('update-position', async (event, pokemonId, x, y) => {
    try {
        await prisma.pokemon.update({
            where: { id: pokemonId },
            data: { positionX: x, positionY: y }
        });
    } catch (error) {
        console.error('Error updating position:', error);
    }
});

ipcMain.on('move-window', (event, x) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !window.isDestroyed()) {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        window.setBounds({
            x: Math.max(0, Math.min(x, width - 120)),
            y: height - 140,
            width: 120,
            height: 120
        });
    }
});

// ==========================================
// CICLO DE VIDA DO APP
// ==========================================
app.whenReady().then(async () => {
    await initDatabase();

    // Verifica se já tem um starter escolhido
    if (gameState.starterPokemon) {
        const starter = await prisma.pokemon.findUnique({
            where: { name: gameState.starterPokemon }
        });
        
        if (starter) {
            await createPetWindow(starter, true);
            startXPSystem();
            startRandomSpawnSystem();
        }
    } else {
        await createSelectionWindow();
    }
});

app.on('window-all-closed', async () => {
    await prisma.$disconnect();
    app.quit();
});

app.on('before-quit', async () => {
    await prisma.$disconnect();
});