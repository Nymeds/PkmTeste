// src/main.js - Processo Principal do Electron (CORRIGIDO)

const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { initDatabase, getGameState, createPet, updatePet, getPetById, updateGameState } = require('./database/db');
const { loadPokemonData } = require('./utils/pokemonLoader');
const { calculateXpGain, levelUp } = require('./utils/experienceSystem');

let starterWindow = null;
let petWindows = new Map();
let gameState = null;
let xpInterval = null;

// Inicializa o banco de dados
async function initialize() {
    try {
        await initDatabase();
        gameState = await getGameState();
        
        console.log('Estado do jogo:', gameState);
        
        if (!gameState.hasChosenStarter) {
            console.log('Criando janela de seleção...');
            createStarterWindow();
        } else {
            console.log('Carregando pet inicial...');
            const starterPet = await getPetById(gameState.starterPetId);
            if (starterPet) {
                await createPetWindow(starterPet);
                startXpSystem();
            } else {
                console.error('Pet inicial não encontrado!');
                createStarterWindow();
            }
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
}

// Janela de seleção do inicial
function createStarterWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    starterWindow = new BrowserWindow({
        width: 800,
        height: 600,
        x: Math.floor((width - 800) / 2),
        y: Math.floor((height - 600) / 2),
        frame: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    starterWindow.loadFile(path.join(__dirname, 'windows/starter.html'));
    starterWindow.setMenu(null);
    
    starterWindow.webContents.openDevTools(); // Para debug
    
    starterWindow.on('closed', () => {
        starterWindow = null;
    });
}

// Cria janela do pet
async function createPetWindow(petData) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    const petWindow = new BrowserWindow({
        width: 120,
        height: 120,
        x: petData.positionX || Math.floor(Math.random() * (width - 120)),
        y: height - 140,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        hasShadow: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    await petWindow.loadFile(path.join(__dirname, 'windows/pet.html'));
    
    // Pequeno delay para garantir que a página carregou
    setTimeout(() => {
        petWindow.webContents.send('pet-data', petData);
        console.log('Dados do pet enviados:', petData);
    }, 500);
    
    petWindow.setIgnoreMouseEvents(true, { forward: true });
    petWindow.setMenu(null);
    
    petWindow.webContents.openDevTools(); // Para debug

    petWindows.set(petData.id, petWindow);

    petWindow.on('closed', () => {
        petWindows.delete(petData.id);
    });

    return petWindow;
}

// Sistema de ganho de XP passivo
function startXpSystem() {
    console.log('Sistema de XP iniciado');
    
    xpInterval = setInterval(async () => {
        console.log('Ganho de XP passivo...');
        
        for (const [petId, window] of petWindows) {
            try {
                const pet = await getPetById(petId);
                if (pet && pet.isActive) {
                    const xpGain = calculateXpGain(pet.level);
                    const newXp = pet.experience + xpGain;
                    
                    console.log(`Pet ${pet.pokemonId} ganhou ${xpGain} XP (Total: ${newXp})`);
                    
                    const levelUpResult = levelUp(pet.level, newXp);
                    
                    const updatedPet = await updatePet(petId, {
                        experience: levelUpResult.experience,
                        level: levelUpResult.level,
                        maxHp: levelUpResult.level > pet.level ? pet.maxHp + 5 : pet.maxHp,
                        attack: levelUpResult.level > pet.level ? pet.attack + 2 : pet.attack,
                        currentHp: levelUpResult.level > pet.level ? pet.currentHp + 5 : pet.currentHp,
                        lastXpGain: new Date()
                    });

                    window.webContents.send('pet-update', updatedPet);
                    
                    if (levelUpResult.leveledUp) {
                        console.log(`LEVEL UP! Novo nível: ${levelUpResult.level}`);
                        window.webContents.send('level-up', {
                            newLevel: levelUpResult.level,
                            petId: petId
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao processar XP:', error);
            }
        }
    }, 10000); // 10 segundos
}

// ============ IPC HANDLERS ============

ipcMain.handle('choose-starter', async (event, pokemonId) => {
    try {
        console.log('Escolhendo inicial:', pokemonId);
        
        const pokemonData = await loadPokemonData(pokemonId);
        console.log('Dados do Pokémon:', pokemonData);
        
        const newPet = await createPet({
            pokemonId: pokemonId,
            isStarter: true,
            maxHp: pokemonData.baseStats.hp,
            currentHp: pokemonData.baseStats.hp,
            attack: pokemonData.baseStats.attack,
            defense: pokemonData.baseStats.defense,
            speed: pokemonData.baseStats.speed
        });

        console.log('Pet criado:', newPet);

        gameState = await updateGameState({
            hasChosenStarter: true,
            starterPetId: newPet.id
        });

        console.log('Estado atualizado:', gameState);

        if (starterWindow) {
            starterWindow.close();
            starterWindow = null;
        }

        await createPetWindow(newPet);
        startXpSystem();

        return { success: true, pet: newPet };
    } catch (error) {
        console.error('Erro ao escolher inicial:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-starters', async () => {
    try {
        const starters = ['pikachu', 'charmander', 'squirtle', 'bulbasaur', 'dragonite'];
        const starterData = await Promise.all(
            starters.map(async id => {
                try {
                    return await loadPokemonData(id);
                } catch (error) {
                    console.error(`Erro ao carregar ${id}:`, error);
                    return null;
                }
            })
        );
        return starterData.filter(s => s !== null);
    } catch (error) {
        console.error('Erro ao carregar starters:', error);
        return [];
    }
});

ipcMain.on('move-window', async (event, data) => {
    const { petId, x, y } = data;
    const window = petWindows.get(petId);
    
    if (window && !window.isDestroyed()) {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        window.setBounds({
            x: Math.max(0, Math.min(x, width - 120)),
            y: y || height - 140,
            width: 120,
            height: 120
        });

        await updatePet(petId, { positionX: x, positionY: y });
    }
});

ipcMain.handle('get-pet-data', async (event, petId) => {
    return await getPetById(petId);
});

// ============ APP LIFECYCLE ============

app.whenReady().then(() => {
    console.log('App pronto, inicializando...');
    initialize();
});

app.on('window-all-closed', () => {
    if (xpInterval) clearInterval(xpInterval);
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        initialize();
    }
});

app.on('before-quit', async () => {
    if (xpInterval) clearInterval(xpInterval);
    
    for (const [petId, window] of petWindows) {
        if (!window.isDestroyed()) {
            const bounds = window.getBounds();
            await updatePet(petId, {
                positionX: bounds.x,
                positionY: bounds.y
            });
        }
    }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promise rejeitada:', reason);
});