const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let pets = [];
const SPAWN_INTERVAL = 30000;
const MAX_FREE_POKEMONS = 2;      // agora 2 livres
const MAX_TEAM_POKEMONS = 3;      // até 3 capturados
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
}

// ===================
// Spawn de pokémon livre
// ===================
let spawnCount = 0;
async function spawnFreePokemon() {
    spawnCount++;
    const freeCount = pets.filter(p => !p.isStarter).length;
    if (freeCount >= MAX_FREE_POKEMONS) return;

    const pokedexPath = path.join(__dirname, '../../pokedex');
    let allPokemons = fs.readdirSync(pokedexPath).filter(file => fs.statSync(path.join(pokedexPath, file)).isDirectory());
    if (!allPokemons.length) return;

    const freePokemonName = allPokemons[Math.floor(Math.random() * allPokemons.length)];
    const id = Date.now() + Math.floor(Math.random() * 1000);

    createPet(id, freePokemonName, false);

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
    setTimeout(() => { if (!cardWin.isDestroyed()) cardWin.hide(); }, 250);
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

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.max(0, Math.min(newX, width - 120));
    const yBase = height - 150;
    const y = Math.max(0, Math.min(yBase - jumpHeight, height - 120));
    pet.petWin.setBounds({ x, y, width: 120, height: 120 });

    if (id === 1) {
        pets.forEach(p => {
            if (p.id !== 1 && !p.isStarter) {
                const slot = p.id - 1000;
                const offset = slot * 60;
                const teamX = Math.max(0, Math.min(x - offset, width - 120));
                if (!p.petWin.isDestroyed()) {
                    p.petWin.setBounds({ x: teamX, y, width: 120, height: 120 });
                }
            }
        });
    }
});

// ------------------
// Captura de Pokémon
// ------------------
ipcMain.on('capture-success', async (event, petId, pokemonData) => {
    try {
        const existing = await prisma.pokemon.findUnique({ where: { name: pokemonData.name } });
        let capturedPokemon;
        if (existing) capturedPokemon = existing;
        else capturedPokemon = await prisma.pokemon.create({
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

        // Verifica se tem slot livre na equipe (máx 3)
        const teamSlots = await prisma.teamSlot.findMany();
        if (teamSlots.length >= MAX_TEAM_POKEMONS) {
            console.log(`[Capture] Equipe cheia! Pokémon não adicionado ao time.`);
        } else {
            let slot = 2;
            while (teamSlots.find(s => s.slot === slot)) slot++;
            await prisma.teamSlot.create({ data: { slot, pokemonId: capturedPokemon.id } });
            const newPetId = 1000 + slot;
            setTimeout(() => createPet(newPetId, capturedPokemon.name, false), 600);
        }

        // Remove pet livre
        const pet = pets.find(p => p.id === petId);
        if (pet) {
            setTimeout(() => {
                if (!pet.petWin.isDestroyed()) pet.petWin.close();
                if (!pet.cardWin.isDestroyed()) pet.cardWin.close();
            }, 500);
            pets = pets.filter(p => p.id !== petId);
        }
    } catch (err) {
        console.error('[Capture] Erro:', err);
    }
});

// ------------------
// Inicialização do app
// ------------------
app.whenReady().then(async () => {
    const starter = await prisma.pokemon.findFirst({ where: { isStarter: true } });

    if (!starter) {
        const selectionWin = new BrowserWindow({ width: 900, height: 600, resizable: false, frame: true, webPreferences: { nodeIntegration: true, contextIsolation: false } });
        selectionWin.loadFile(path.join(__dirname, '../renderer/selection/selection.html'));
        return;
    }

    createPet(1, starter.name, true);

    const teamSlots = await prisma.teamSlot.findMany({ include: { pokemon: true }, orderBy: { slot: 'asc' } });
    for (const slot of teamSlots) {
        if (slot.slot === 1) continue;
        const pokemon = slot.pokemon;
        const petId = 1000 + slot.slot;
        setTimeout(() => createPet(petId, pokemon.name, false), 300);
    }

    setTimeout(() => setInterval(spawnFreePokemon, SPAWN_INTERVAL), 5000);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async () => { await prisma.$disconnect(); });
