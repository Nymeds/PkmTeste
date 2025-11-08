// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const prisma = require('./db');
const { createPet, pets } = require('./petManager');
const { capturePokemon } = require('./captureManager');
const { startSpawning } = require('./spawnManager');
const { startAutoSave, saveAllPetsStats } = require('./saveManager');

let spawnRef = null;
let saveRef = null;

ipcMain.handle('capture-pokemon', async (event, payload) => capturePokemon(payload.id, payload));

ipcMain.handle('get-available-pokemon', async () => {
  try {
    const pokedexPath = path.join(__dirname, '../../pokedex');
    const starters = ['charmander','bulbasaur','squirtle'];
    return starters.map(name => {
      const img = path.join(pokedexPath, name.toLowerCase(), `${name.toLowerCase()}.png`);
      return { name, image: require('fs').existsSync(img) ? `file://${img.replace(/\\/g,'/')}` : null };
    });
  } catch (err) { console.error('get-available-pokemon erro:', err); return []; }
});

ipcMain.handle('select-starter', async (event, pokemonName) => {
  try {
    const base = {
      charmander: { hp:39, maxHp:39, attack:52, defense:43, speed:65 },
      bulbasaur:  { hp:45, maxHp:45, attack:49, defense:49, speed:45 },
      squirtle:   { hp:44, maxHp:44, attack:48, defense:65, speed:43 }
    }[pokemonName.toLowerCase()] || { hp:50, maxHp:50, attack:30, defense:30, speed:30 };

    const starter = await prisma.teamPokemon.create({
      data: { name: pokemonName, level:1, xp:0, hp:base.hp, maxHp:base.maxHp, attack:base.attack, defense:base.defense, speed:base.speed }
    });

    // close selection window
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();

    // create starter pet (id 1)
    await createPet(1, starter.name, true, true, starter.id, {
      level: starter.level, xp: starter.xp, hp: starter.hp, maxHp: starter.maxHp,
      attack: starter.attack, defense: starter.defense, speed: starter.speed
    });

    // start spawn & save
    if (!spawnRef) spawnRef = startSpawning();
    if (!saveRef) saveRef = startAutoSave(20000);

    return { success: true };
  } catch (err) {
    console.error('select-starter erro:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.on('show-card', (event, id) => {
  const pet = pets.find(p => p.id === id);
  if (!pet) return;
  try {
    const wb = pet.petWin.getBounds();
    pet.cardWin.setBounds({ x: wb.x - 30, y: wb.y - 210, width: 180, height: 200 });
    pet.cardWin.showInactive();
    pet.cardWin.webContents.send('show-card');
    pet.cardWin.webContents.send('update-stats', { name: pet.name, ...pet.currentStats });
  } catch (e) {}
});

ipcMain.on('hide-card', (event, id) => {
  const pet = pets.find(p => p.id === id);
  if (!pet) return;
  try { pet.cardWin.webContents.send('hide-card'); setTimeout(()=>{ if(!pet.cardWin.isDestroyed()) pet.cardWin.hide(); },250); } catch(e){}
});

ipcMain.on('update-card', (event, id, data) => {
  const pet = pets.find(p => p.id === id);
  if (!pet) return;
  pet.currentStats = { ...data };
  if (pet.cardWin && !pet.cardWin.isDestroyed() && pet.cardWin.isVisible()) {
    pet.cardWin.webContents.send('update-stats', { name: pet.name, ...pet.currentStats });
  }
});

// app init
app.whenReady().then(async () => {
  try {
    const team = await prisma.teamPokemon.findMany({ orderBy: { id: 'asc' } });

    if (!team.length) {
      const selectionWin = new BrowserWindow({ width: 900, height: 600, resizable: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
      selectionWin.loadFile(path.join(__dirname,'../renderer/selection/selection.html'));
      return;
    }

    // spawn first 3 from team (by DB order)
    for (let i = 0; i < Math.min(3, team.length); i++) {
      const p = team[i];
      await createPet(1000 + i, p.name, false, true, p.id, {
        level: p.level, xp: p.xp, hp: p.hp, maxHp: p.maxHp, attack: p.attack, defense: p.defense, speed: p.speed
      });
    }

    spawnRef = startSpawning();
    saveRef = startAutoSave(20000);

  } catch (err) {
    console.error('[App Init] erro:', err);
  }
});

// graceful shutdown
app.on('before-quit', async (event) => {
  event.preventDefault();
  if (saveRef) clearInterval(saveRef);
  if (spawnRef) clearInterval(spawnRef);
  await saveAllPetsStats();
  await prisma.$disconnect();
  app.exit(0);
});

process.on('SIGINT', async () => {
  if (saveRef) clearInterval(saveRef);
  if (spawnRef) clearInterval(spawnRef);
  await saveAllPetsStats();
  await prisma.$disconnect();
  process.exit(0);
});
