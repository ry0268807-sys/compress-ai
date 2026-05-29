/**
 * UltraCompress AI - Backend API Server
 * Local-first compression API with FFmpeg, Sharp, and Archiver
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config, ensureDirectories } from './config';
import { initDatabase } from './db/database';
import apiRoutes from './routes/api';
import { runStorageCleanup } from './services/chunkStorage';

ensureDirectories();
initDatabase();

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.WEB_ORIGIN || '',
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use('/api', apiRoutes);

// Static outputs for preview (local only)
app.use('/outputs', express.static(config.outputsDir));

app.get('/', (_req, res) => {
  res.json({
    name: 'UltraCompress AI API',
    docs: '/api/health',
    localProcessing: true,
  });
});

// Scheduled temp cleanup every 6 hours
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
setInterval(() => {
  const removed = runStorageCleanup(24);
  if (removed > 0) {
    console.log(`[cleanup] Removed ${removed} stale temp item(s)`);
  }
}, CLEANUP_INTERVAL_MS);

app.listen(config.port, config.host, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║  UltraCompress AI API                            ║
  ║  http://${config.host}:${config.port}                      ║
  ║  Local processing • No cloud upload by default   ║
  ╚══════════════════════════════════════════════════╝
  `);
  console.log(`Data directory: ${config.dataDir}`);
  console.log(`Max upload: ${(config.maxFileSize / 1024 / 1024 / 1024).toFixed(1)} GB`);
});

export default app;
