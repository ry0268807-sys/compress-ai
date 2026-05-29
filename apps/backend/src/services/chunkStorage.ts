import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { config } from '../config';

/**
 * Stream-merge uploaded chunks into a single file without loading into RAM
 */
export async function mergeChunks(
  chunkDir: string,
  outputPath: string,
  totalChunks: number
): Promise<void> {
  const writeStream = createWriteStream(outputPath, { flags: 'w' });

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `chunk_${i}`);
    if (!fs.existsSync(chunkPath)) {
      writeStream.destroy();
      throw new Error(`Missing chunk ${i}`);
    }
    await pipeline(createReadStream(chunkPath), writeStream, { end: false });
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });
}

/**
 * Write a single chunk from request buffer (disk-based, not memory accumulation)
 */
export function saveChunk(chunkDir: string, index: number, buffer: Buffer): string {
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }
  const chunkPath = path.join(chunkDir, `chunk_${index}`);
  fs.writeFileSync(chunkPath, buffer);
  return chunkPath;
}

/**
 * Secure cleanup of temp directories and old files
 */
export function cleanupPath(targetPath: string): void {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
}

/**
 * Remove files older than maxAgeHours from temp and uploads
 */
export function runStorageCleanup(maxAgeHours: number): number {
  let removed = 0;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();

  for (const dir of [config.tempDir, config.uploadsDir]) {
    if (!fs.existsSync(dir)) continue;

    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const stat = fs.statSync(full);
        if (now - stat.mtimeMs > maxAgeMs) {
          cleanupPath(full);
          removed++;
        }
      } catch {
        /* ignore locked files */
      }
    }
  }

  return removed;
}
