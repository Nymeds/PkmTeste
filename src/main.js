// src/main.js - Processo Principal do Electron

const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { initDatabase, getGameState, createPet, updatePet, getPetById } = require('./database/db');
const { loadPokemonData } = require('./utils/pokemonLoader');
const { calculateXpGain, levelUp } = require('./utils/experienceSystem');

let starterWindow = null;
let petWindows = new Map(); // Map de petId -> BrowserWindow
let gameState = null;
let xpInterval = null;

// Inicializa o banco de dados
async function initialize() {
    await initDatabase();
    gameState = await getGameState();
    
    if (!gameState.hasChosenStarter) {
        createStarterWindow();
    } else {
        // Carrega o pet inicial e cria a janela
        const starterPet = await getPetById(gameState.starterPetId);
        if (starterPet) {
            createPetWindow(starterPet);
            startXpSystem();
        }
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
}

// Cria janela do pet
function createPetWindow(petData) {
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

    petWindow.loadFile(path.join(__dirname, 'windows/pet.html'));
    petWindow.setIgnoreMouseEvents(true, { forward: true });
    petWindow.setMenu(null);

    // Envia dados do pet quando a página carregar
    petWindow.webContents.on('did-finish-load', () => {
        petWindow.webContents.send('pet-data', petData);
    });

    // ESC para fechar
    petWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape') {
            app.quit();
        }
    });

    petWindows.set(petData.id, petWindow);

    petWindow.on('closed', () => {
        petWindows.delete(petData.id);
    });

    return petWindow;
}

// Sistema de ganho de XP passivo
function startXpSystem() {
    // Ganha XP a cada 10 segundos
    xpInterval = setInterval(async () => {
        for (const [petId, window] of petWindows) {
            const pet = await getPetById(petId);
            if (pet && pet.isActive) {
                const xpGain = calculateXpGain(pet.level);
                const newXp = pet.experience + xpGain;
                
                // Verifica se subiu de nível
                const levelUpResult = levelUp(pet.level, newXp);
                
                const updatedPet = await updatePet(petId, {
                    experience: levelUpResult.experience,
                    level: levelUpResult.level,
                    maxHp: levelUpResult.level > pet.level ? pet.maxHp + 5 : pet.maxHp,
                    attack: levelUpResult.level > pet.level ? pet.attack + 2 : pet.attack,
                    lastXpGain: new Date()
                });

                // Notifica a janela do pet
                window.webContents.send('pet-update', updatedPet);
                
                if (levelUpResult.leveledUp) {
                    window.webContents.send('level-up', {
                        newLevel: levelUpResult.level,
                        petId: petId
                    });
                }
            }
        }
    }, 10000); // 10 segundos
}

// ============ IPC HANDLERS ============

// Escolha do inicial
ipcMain.handle('choose-starter', async (event, pokemonId) => {
    try {
        const pokemonData = await loadPokemonData(pokemonId);
        
        const newPet = await createPet({
            pokemonId: pokemonId,
            isStarter: true,
            maxHp: pokemonData.baseStats.hp,
            currentHp: pokemonData.baseStats.hp,
            attack: pokemonData.baseStats.attack,
            defense: pokemonData.baseStats.defense,
            speed: pokemonData.baseStats.speed
        });

        // Atualiza estado do jogo
        gameState = await updateGameState({
            hasChosenStarter: true,
            starterPetId: newPet.id
        });

        if (starterWindow) {
            starterWindow.close();
            starterWindow = null;
        }

        createPetWindow(newPet);
        startXpSystem();

        return { success: true, pet: newPet };
    } catch (error) {
        console.error('Erro ao escolher inicial:', error);
        return { success: false, error: error.message };
    }
});

// Carrega lista de iniciais disponíveis
ipcMain.handle('get-starters', async () => {
    const starters = ['pikachu', 'charmander', 'squirtle', 'bulbasaur', 'dragonite'];
    const starterData = await Promise.all(
        starters.map(id => loadPokemonData(id))
    );
    return starterData;
});

// Move a janela do pet
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

        // Atualiza posição no banco
        await updatePet(petId, { positionX: x, positionY: y });
    }
});

// Mostra/esconde card de informações
ipcMain.on('toggle-card', (event, data) => {
    const { petId, show } = data;
    const window = petWindows.get(petId);
    
    if (window) {
        window.webContents.send('toggle-card', show);
    }
});

// Obtém dados atualizados do pet
ipcMain.handle('get-pet-data', async (event, petId) => {
    return await getPetById(petId);
});

// ============ APP LIFECYCLE ============

app.whenReady().then(initialize);

app.on('window-all-closed', () => {
    if (xpInterval) clearInterval(xpInterval);
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        initialize();
    }
});

// Salva estado antes de fechar
app.on('before-quit', async () => {
    if (xpInterval) clearInterval(xpInterval);
    
    // Salva posições dos pets
    for (const [petId, window] of petWindows) {
        const bounds = window.getBounds();
        await updatePet(petId, {
            positionX: bounds.x,
            positionY: bounds.y
        });
    }
});

// Importa funções do database que faltam
const { updateGameState } = require('./database/db');