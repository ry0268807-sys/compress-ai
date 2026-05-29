/**
 * Electron main process - launches local backend + embedded web UI
 */
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const isDev = !app.isPackaged;
const WEB_URL = process.env.ULTRA_WEB_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

function getBackendPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'backend', 'src', 'index.ts');
  }
  return path.join(process.resourcesPath, 'backend', 'dist', 'index.js');
}

function startBackend(): void {
  if (backendProcess) return;

  const backendEntry = getBackendPath();
  const cwd = isDev
    ? path.join(__dirname, '..', '..', 'backend')
    : path.join(process.resourcesPath, 'backend');

  if (isDev) {
    backendProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd,
      shell: true,
      env: { ...process.env, PORT: '4000' },
    });
  } else {
    backendProcess = spawn('node', [backendEntry], {
      cwd,
      env: { ...process.env, PORT: '4000' },
    });
  }

  backendProcess.stdout?.on('data', (d) => console.log('[backend]', d.toString()));
  backendProcess.stderr?.on('data', (d) => console.error('[backend]', d.toString()));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'UltraCompress AI',
    backgroundColor: '#0a0b0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(WEB_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  // Brief delay for backend boot in dev
  setTimeout(createWindow, isDev ? 2000 : 500);
});

app.on('window-all-closed', () => {
  backendProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('ultra:get-version', () => app.getVersion());
ipcMain.handle('ultra:open-output-folder', () => {
  const outputPath = path.join(app.getPath('userData'), 'outputs');
  shell.openPath(outputPath);
  return outputPath;
});
