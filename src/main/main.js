const { app, BrowserWindow, screen } = require("electron");
const path = require("path");

let overlayWindow = null;

function createOverlay() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width,
    height: 200, // altura da faixa inferior
    x: 0,
    y: height - 200,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false, // permite clicar através
    webPreferences: {
      preload: path.join(__dirname, "overlayPreload.js"),
      contextIsolation: true,
    },
  });

  overlayWindow.loadFile(path.join(__dirname, "../renderer/overlay.html"));
}

app.whenReady().then(() => {
  createOverlay();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlay();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
