// petManager.js
const { BrowserWindow, screen } = require('electron');
const path = require('path');

const pets = []; // array compartilhado: { id, name, isStarter, isTeamMember, dbId, petWin, cardWin, currentStats, lastPosition }

async function createPet(id, name, isStarter = false, isTeamMember = false, dbId = null, initialStats = null) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const startX = Math.floor(Math.random() * (width - 120));

  if (!initialStats) {
    initialStats = { level: 1, xp: 0, hp: 50, maxHp: 50, attack: 30, defense: 30, speed: 30 };
  }

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
    resizable: false,
    show: false,
    acceptFirstMouse: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      additionalArguments: [
        `--pokemonName=${name}`,
        `--starter=${isStarter}`,
        `--teamMember=${isTeamMember}`,
        `--petId=${id}`,
        `--dbId=${dbId || ''}`,
        `--level=${initialStats.level}`,
        `--xp=${initialStats.xp}`,
        `--hp=${initialStats.hp}`,
        `--maxHp=${initialStats.maxHp}`,
        `--attack=${initialStats.attack}`,
        `--defense=${initialStats.defense}`,
        `--speed=${initialStats.speed}`
      ]
    }
  });

  petWin.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
  petWin.setMenu(null);

  // card window (hidden initially)
  const cardWin = new BrowserWindow({
    width: 180,
    height: 200,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  cardWin.loadFile(path.join(__dirname, '../renderer/card/card.html'));
  cardWin.setMenu(null);

  petWin.once('ready-to-show', () => {
    try { petWin.showInactive(); petWin.setAlwaysOnTop(true, 'screen-saver'); }
    catch (e) { try { petWin.show(); } catch(e){} }
  });

  const petData = {
    id, name, isStarter, isTeamMember, dbId,
    petWin, cardWin,
    currentStats: initialStats,
    lastPosition: { x: startX, y: height - 150 }
  };
  pets.push(petData);
  return petData;
}

function getPetById(id) { return pets.find(p => p.id === id); }

function removePet(id) {
  const idx = pets.findIndex(p => p.id === id);
  if (idx === -1) return;
  const pet = pets[idx];
  try { if (!pet.petWin.isDestroyed()) pet.petWin.close(); } catch(e){}
  try { if (pet.cardWin && !pet.cardWin.isDestroyed()) pet.cardWin.close(); } catch(e){}
  pets.splice(idx, 1);
}

module.exports = { createPet, getPetById, removePet, pets };
