const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    const win = new BrowserWindow({
        width: 120,
        height: 120,
        x: width - 160,
        y: height - 160,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    // 🔧 Caminho absoluto para index.html dentro da pasta src
    win.loadFile(path.join(__dirname, 'index.html')).catch(err => console.error(err));
    win.setMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
