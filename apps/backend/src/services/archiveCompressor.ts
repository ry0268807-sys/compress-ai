import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import type { CompressionSettings } from '@ultra/shared';
import { modeToQuality } from './aiPresets';

/**
 * Re-compress or create archive with level based on quality setting
 */
export async function compressArchive(
  inputPath: string,
  outputPath: string,
  settings: CompressionSettings,
  onProgress: (percent: number) => void
): Promise<void> {
  const quality = settings.quality ?? modeToQuality(settings.mode);
  const format = (settings.outputFormat || 'zip').toLowerCase();
  const level = Math.round((100 - quality) / 100 * 9); // zlib 0-9

  const stat = fs.statSync(inputPath);

  // Single file → gzip stream for .tar.gz style or zip wrap
  if (format === 'zip') {
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level } });

      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.on('progress', (data) => {
        const percent = Math.min(99, (data.entries.processed / 1) * 100);
        onProgress(percent);
      });

      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  } else if (format === 'tar') {
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', { gzip: true, gzipOptions: { level } });

      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  } else {
    // Fallback: gzip raw file stream (memory-safe)
    const gzip = zlib.createGzip({ level });
    await pipeline(createReadStream(inputPath), gzip, createWriteStream(outputPath));
  }

  onProgress(100);
  void stat; // used for future multi-file archives
}
