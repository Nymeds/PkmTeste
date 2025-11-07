import { app, BrowserWindow } from "electron";
import * as path from "path";
let win = null;
function createWindow() {
    win = new BrowserWindow({
        width: 120,
        height: 120,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        hasShadow: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.loadFile(path.join(__dirname, "index.html"));
}
app.whenReady().then(createWindow);
