// main.js
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

try { require('@electron/remote/main').initialize(); } catch (e) { /* optional */ }

let win = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const windowWidth = 480; // deve refletir o width do canvas
  const windowHeight = 120; // deve refletir o height do canvas

  win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.floor(Math.random() * Math.max(1, width - windowWidth)),
    y: height - (windowHeight + 20),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setMenu(null);

  try { require('@electron/remote/main').enable(win.webContents); } catch (e) { /* optional */ }

  // fechar com ESC
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      app.quit();
    }
  });

  // opcional: abrir devtools se quiser DEBUG
  // win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

// canal para mover a janela se quiser usar (mantive)
ipcMain.on('move-window', (event, x) => {
  if (win && !win.isDestroyed()) {
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    win.setBounds({
      x: Math.max(0, Math.min(x, width - win.getBounds().width)),
      y: win.getBounds().y,
      width: win.getBounds().width,
      height: win.getBounds().height
    });
  }
});
