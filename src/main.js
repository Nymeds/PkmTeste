const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

// Habilita @electron/remote se necessário
try {
    require('@electron/remote/main').initialize();
} catch (e) {
    // Se não tiver @electron/remote instalado, não tem problema
}

let win = null;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    win = new BrowserWindow({
        width: 120,
        height: 120,
        x: Math.floor(Math.random() * (width - 120)),
        y: height - 140,
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

    // Habilita remote para esta janela
    try {
        require('@electron/remote/main').enable(win.webContents);
    } catch (e) {
        // Não tem problema se falhar
    }

    // ESC para fechar
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape') {
            app.quit();
        }
    });

    // Permite clicar com Ctrl+Click para arrastar (opcional)
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    win.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.type === 'mouseDown') {
            win.setIgnoreMouseEvents(false);
            isDragging = true;
        }
        if (input.type === 'mouseUp') {
            win.setIgnoreMouseEvents(true, { forward: true });
            isDragging = false;
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

// Comunicação IPC para mover a janela
ipcMain.on('move-window', (event, x) => {
    if (win && !win.isDestroyed()) {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        win.setBounds({
            x: Math.max(0, Math.min(x, width - 120)),
            y: height - 140,
            width: 120,
            height: 120
        });
    }
});