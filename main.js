const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load your frontend (React build)
  win.loadFile(path.join(__dirname, 'app/build/index.html'));

  win.webContents.openDevTools();
}

// Start backend server
function startBackend() {
  const backendPath = path.join(__dirname, '/flux-backend/app.js');

  backendProcess = spawn('node', [backendPath], {
    stdio: 'inherit',
    shell: true,
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend server:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startBackend();      
  createWindow();      
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill(); 
  }
});
