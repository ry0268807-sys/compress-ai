import path from 'path';
import fs from 'fs';

/** Central configuration - paths created on startup */
const ROOT = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = process.env.ULTRA_DATA_DIR || path.join(ROOT, 'data');

// FIX: Windows ke liye OS check add kiya
const isWindows = process.platform === 'win32';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '127.0.0.1',
  dataDir: DATA_DIR,
  uploadsDir: path.join(DATA_DIR, 'uploads'),
  outputsDir: path.join(DATA_DIR, 'outputs'),
  tempDir: path.join(DATA_DIR, 'temp'),
  dbPath: path.join(DATA_DIR, 'history.db'),
  /** Max upload size (10GB default) */
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(10 * 1024 * 1024 * 1024), 10),
  chunkSize: 64 * 1024 * 1024,
  // FIX: Windows par specifically .exe extension force karega
 // FIX: Hardcoded absolute path for Windows with correct syntax
 ffmpegPath: 'C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe',
 ffprobePath: 'C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffprobe.exe',
};
/** Ensure storage directories exist */
export function ensureDirectories(): void {
  for (const dir of [config.dataDir, config.uploadsDir, config.outputsDir, config.tempDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}