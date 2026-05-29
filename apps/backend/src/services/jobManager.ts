import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { saveJob, getJob } from '../db/database';
import { detectCategory, validateFile } from './fileValidator';
import { compressVideo, probeVideo, generateThumbnail, pauseVideoJob, resumeVideoJob, cancelVideoJob } from './videoCompressor';
import { compressImage, probeImage } from './imageCompressor';
import { compressArchive } from './archiveCompressor';
import { generateRecommendations, type MediaProbe } from './aiPresets';
import { cleanupPath } from './chunkStorage';
import type { CompressionJob, CompressionSettings } from '@ultra/shared';

const activeJobs = new Map<string, { pause: boolean; cancel: boolean }>();

export function getActiveJobControl(id: string) {
  return activeJobs.get(id);
}

export async function createCompressionJob(
  filePath: string,
  fileName: string,
  settings: CompressionSettings
): Promise<CompressionJob> {
  const validation = validateFile(filePath, config.maxFileSize);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const category = detectCategory(fileName);
  const stat = fs.statSync(filePath);
  const id = uuidv4();
  const ext = settings.outputFormat || path.extname(fileName).slice(1) || 'mp4';
  const outputName = `${path.parse(fileName).name}_compressed.${ext}`;
  const outputPath = path.join(config.outputsDir, `${id}_${outputName}`);

  const job: CompressionJob = {
    id,
    fileName,
    originalPath: filePath,
    outputPath,
    category,
    status: 'queued',
    progress: 0,
    originalSize: stat.size,
    estimatedOutputSize: estimateOutputSize(stat.size, settings),
    settings,
    createdAt: new Date().toISOString(),
  };

  saveJob(job);
  activeJobs.set(id, { pause: false, cancel: false });

  // Process in background (non-blocking)
  setImmediate(() => processJob(id).catch((err) => {
    const j = getJob(id);
    if (j) {
      j.status = 'failed';
      j.error = err.message;
      saveJob(j);
    }
    activeJobs.delete(id);
  }));

  return job;
}

function estimateOutputSize(original: number, settings: CompressionSettings): number {
  const q = settings.quality ?? 75;
  const ratio = settings.mode === 'low-size' ? 0.2 : settings.mode === 'high-quality' ? 0.7 : 0.4;
  if (settings.targetSizeBytes) return settings.targetSizeBytes;
  return Math.round(original * ratio * (q / 100));
}

async function processJob(id: string): Promise<void> {
  const job = getJob(id);
  if (!job) return;

  const control = activeJobs.get(id)!;
  const shouldContinue = () => {
    if (control.cancel) return 'cancel' as const;
    if (control.pause) return 'pause' as const;
    return 'run' as const;
  };

  job.status = 'processing';
  saveJob(job);

  let probe: MediaProbe = { category: job.category as MediaProbe['category'], fileSize: job.originalSize };

  try {
    if (job.category === 'video') {
      probe = await probeVideo(job.originalPath);
      const thumbPath = path.join(config.tempDir, `${id}_thumb.jpg`);
      await generateThumbnail(job.originalPath, thumbPath);
      job.thumbnailUrl = `/api/files/thumb/${id}`;

      await compressVideo(
        job.originalPath,
        job.outputPath!,
        job.settings,
        probe,
        (p) => {
          job.progress = p.percent;
          job.etaSeconds = p.etaSeconds;
          if (p.percent > 10) {
            job.estimatedOutputSize = Math.round(job.originalSize * (1 - p.percent / 120));
          }
          saveJob(job);
        },
        shouldContinue
      );
    } else if (job.category === 'image') {
      probe = await probeImage(job.originalPath);
      await compressImage(job.originalPath, job.outputPath!, job.settings, (percent) => {
        job.progress = percent;
        saveJob(job);
      });
    } else if (job.category === 'archive' || job.category === 'unknown') {
      await compressArchive(job.originalPath, job.outputPath!, job.settings, (percent) => {
        job.progress = percent;
        saveJob(job);
      });
    } else {
      throw new Error(`Unsupported category: ${job.category}`);
    }

    if (control.cancel) {
      job.status = 'cancelled';
      if (job.outputPath && fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
    } else {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        job.compressedSize = fs.statSync(job.outputPath).size;
      }
    }
  } catch (err) {
    job.status = control.cancel ? 'cancelled' : 'failed';
    job.error = err instanceof Error ? err.message : 'Unknown error';
  }

  saveJob(job);
  activeJobs.delete(id);
}

export function pauseJob(id: string): boolean {
  const c = activeJobs.get(id);
  if (!c) return false;
  c.pause = true;
  pauseVideoJob();
  const job = getJob(id);
  if (job) {
    job.status = 'paused';
    saveJob(job);
  }
  return true;
}

export function resumeJob(id: string): boolean {
  const c = activeJobs.get(id);
  if (!c) return false;
  c.pause = false;
  resumeVideoJob();
  const job = getJob(id);
  if (job) {
    job.status = 'processing';
    saveJob(job);
  }
  return true;
}

export function cancelJob(id: string): boolean {
  const c = activeJobs.get(id);
  if (c) c.cancel = true;
  cancelVideoJob();
  const job = getJob(id);
  if (job) {
    job.status = 'cancelled';
    saveJob(job);
  }
  return true;
}

export async function getRecommendationsForFile(filePath: string, fileName: string) {
  const category = detectCategory(fileName);
  let probe: MediaProbe = { category: category === 'unknown' ? 'archive' : category, fileSize: fs.statSync(filePath).size };

  if (category === 'video') probe = await probeVideo(filePath);
  else if (category === 'image') probe = await probeImage(filePath);

  return generateRecommendations(probe);
}

export { cleanupPath };
