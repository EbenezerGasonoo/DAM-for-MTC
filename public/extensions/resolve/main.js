const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1040,
        height: 860,
        minWidth: 460,
        minHeight: 520,
        title: 'MTC DAM — DaVinci Resolve Media Hub',
        useContentSize: true,
        backgroundColor: '#141c1e',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        }
    });

    mainWindow.on('close', function() {
        mainWindow = null;
        app.quit();
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.on('ready', createWindow);

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
