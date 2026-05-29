import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import type { CompressionSettings } from '@ultra/shared';
import { modeToQuality } from './aiPresets';
import type { MediaProbe } from './aiPresets';

export async function probeImage(filePath: string): Promise<MediaProbe> {
  const meta = await sharp(filePath).metadata();
  const stat = fs.statSync(filePath);
  return {
    category: 'image',
    fileSize: stat.size,
    width: meta.width,
    height: meta.height,
  };
}

/**
 * Compress images with Sharp (streaming pipeline for large TIFFs etc.)
 */
export async function compressImage(
  inputPath: string,
  outputPath: string,
  settings: CompressionSettings,
  onProgress: (percent: number) => void
): Promise<void> {
  const quality = settings.quality ?? modeToQuality(settings.mode);
  const format = (settings.outputFormat || path.extname(outputPath).slice(1) || 'webp').toLowerCase();

  let pipeline = sharp(inputPath, { failOn: 'none' });

  if (settings.resolution) {
    const h = parseInt(settings.resolution.replace(/\D/g, ''), 10);
    if (h) pipeline = pipeline.resize({ height: h, fit: 'inside', withoutEnlargement: true });
  }

  onProgress(20);

  switch (format) {
    case 'jpg':
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: Math.round((100 - quality) / 10), quality });
      break;
    case 'heic':
      pipeline = pipeline.heif({ quality });
      break;
    case 'webp':
    default:
      pipeline = pipeline.webp({ quality });
      break;
  }

  onProgress(50);
  await pipeline.toFile(outputPath);
  onProgress(100);
}
