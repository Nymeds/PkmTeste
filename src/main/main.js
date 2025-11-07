const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let win;
let cardWin;

// =====================================================
// Cria a janela principal (pet)
// =====================================================
function createPetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 120,
    height: 120,
    x: Math.floor(Math.random() * (width - 120)),
    y: height - 150,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/pet/pet.html'));
  win.setMenu(null);

  win.on('closed', () => {
    win = null;
  });
}

// =====================================================
// Cria a janela do card flutuante
// =====================================================
function createCardWindow() {
  cardWin = new BrowserWindow({
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
}

// =====================================================
// Mostra / oculta o card com posição atualizada
// =====================================================
ipcMain.on('show-card', () => {
  if (!win || !cardWin || win.isDestroyed() || cardWin.isDestroyed()) return;

  const winBounds = win.getBounds();
  const { height } = screen.getPrimaryDisplay().workAreaSize;

  const cardX = winBounds.x + 130;
  const cardY = height - 260;

  cardWin.setBounds({
    x: cardX,
    y: cardY,
    width: 180,
    height: 200,
  });

  cardWin.showInactive();
});

ipcMain.on('hide-card', () => {
  if (!cardWin || cardWin.isDestroyed()) return;

  setTimeout(() => {
    if (!cardWin.isDestroyed()) cardWin.hide();
  }, 150);
});

// =====================================================
// Atualiza o card com dados do pet
// =====================================================
ipcMain.on('update-card', (event, data) => {
  if (cardWin && !cardWin.isDestroyed()) {
    cardWin.webContents.send('update-stats', data);
  }
});

// =====================================================
// Mover a janela do pet
// =====================================================
ipcMain.on('move-window', (event, newX) => {
  if (win && !win.isDestroyed()) {
    const { height } = screen.getPrimaryDisplay().workAreaSize;
    win.setBounds({ x: newX, y: height - 150, width: 120, height: 120 });
  }
});

// =====================================================
// Inicialização do app
// =====================================================
app.whenReady().then(() => {
  createPetWindow();
  createCardWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
