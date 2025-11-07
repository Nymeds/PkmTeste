const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    win = new BrowserWindow({
        width: 120,
        height: 120,
        x: Math.floor(Math.random() * (width - 120)), // Posição inicial aleatória
        y: height - 140, // Um pouco acima da barra de tarefas
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        hasShadow: false,
        skipTaskbar: true, // Não aparece na barra de tarefas
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    win.loadFile(path.join(__dirname, 'index.html'));
    win.setIgnoreMouseEvents(true); // Cliques passam através da janela

    // Remove o menu
    win.setMenu(null);

    // Permite clicar com botão direito para fechar (opcional)
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape') {
            app.quit();
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

// Comunicação para mover a janela
const { ipcMain } = require('electron');

ipcMain.on('move-window', (event, x) => {
    if (win) {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        const currentBounds = win.getBounds();
        win.setBounds({
            x: Math.max(0, Math.min(x, width - 120)),
            y: height - 140,
            width: 120,
            height: 120
        });
    }
});