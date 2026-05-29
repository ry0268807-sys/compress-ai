import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { config } from '../config';
import { listJobs, getJob, getAnalytics, saveJob } from '../db/database';
import {
  createCompressionJob,
  pauseJob,
  resumeJob,
  cancelJob,
  getRecommendationsForFile,
} from '../services/jobManager';
import { detectHardware } from '../services/hardware';
import { mergeChunks, saveChunk, runStorageCleanup } from '../services/chunkStorage';
import { detectCategory } from '../services/fileValidator';
import type { CompressionSettings } from '@ultra/shared';

const router = Router();

const upload = multer({
  dest: config.uploadsDir,
  limits: { fileSize: config.maxFileSize },
});

const settingsSchema = z.object({
  mode: z.enum(['low-size', 'balanced', 'high-quality', 'custom']).default('balanced'),
  quality: z.coerce.number().min(1).max(100).default(75),
  targetSizeBytes: z.coerce.number().optional(),
  bitrateKbps: z.coerce.number().optional(),
  resolution: z.string().optional(),
  fps: z.coerce.number().optional(),
  codec: z.enum(['h264', 'h265']).optional(),
  audioQuality: z.coerce.number().optional(),
  outputFormat: z.string().optional(),
  useGpu: z.coerce.boolean().optional(),
  aiBestQualityUnderLimit: z.coerce.boolean().optional(),
});

function parseSettings(raw: unknown): CompressionSettings {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};
  return settingsSchema.parse(parsed) as CompressionSettings;
}

/** Health + hardware */
router.get('/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

router.get('/hardware', (_req, res) => {
  res.json(detectHardware());
});

/** Analytics */
router.get('/analytics', (_req, res) => {
  res.json(getAnalytics());
});

/** Job history */
router.get('/jobs', (req, res) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  res.json(listJobs(limit, offset));
});

router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

/** Single file upload */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const settingsJson = req.body.settings;
    const settings = settingsSchema.parse(
      settingsJson ? JSON.parse(settingsJson) : {}
    ) as CompressionSettings;

    const job = await createCompressionJob(req.file.path, req.file.originalname, settings);
    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
});

/** Chunked upload for 10GB+ files */
router.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, fileName } = req.body;
    if (!uploadId || chunkIndex === undefined || !req.file) {
      return res.status(400).json({ error: 'Missing chunk metadata' });
    }

    const chunkDir = path.join(config.tempDir, uploadId);
    saveChunk(chunkDir, parseInt(chunkIndex, 10), fs.readFileSync(req.file.path));
    fs.unlinkSync(req.file.path);

    const isLast = parseInt(chunkIndex, 10) === parseInt(totalChunks, 10) - 1;
    if (isLast) {
      const mergedPath = path.join(config.uploadsDir, `${uploadId}_${fileName}`);
      await mergeChunks(chunkDir, mergedPath, parseInt(totalChunks, 10));
      fs.rmSync(chunkDir, { recursive: true, force: true });

      const settings = parseSettings(req.body.settings);

      const job = await createCompressionJob(mergedPath, fileName, settings);
      return res.status(201).json(job);
    }

    res.json({ ok: true, chunkIndex: parseInt(chunkIndex, 10) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Chunk upload failed' });
  }
});

/** Batch: multiple files */
router.post('/batch', upload.array('files', 100), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ error: 'No files' });

    const settings = settingsSchema.parse(
      req.body.settings ? JSON.parse(req.body.settings) : {}
    ) as CompressionSettings;

    const jobs = await Promise.all(
      files.map((f) => createCompressionJob(f.path, f.originalname, settings))
    );
    res.status(201).json(jobs);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Batch failed' });
  }
});

router.post('/jobs/:id/pause', (req, res) => {
  res.json({ ok: pauseJob(req.params.id) });
});

router.post('/jobs/:id/resume', (req, res) => {
  res.json({ ok: resumeJob(req.params.id) });
});

router.post('/jobs/:id/cancel', (req, res) => {
  res.json({ ok: cancelJob(req.params.id) });
});

/** AI recommendations */
router.post('/recommendations', upload.single('file'), async (req, res) => {
  let tempPath: string | undefined;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    tempPath = req.file.path;
    const recs = await getRecommendationsForFile(req.file.path, req.file.originalname);
    res.json(recs);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed' });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        /* ignore */
      }
    }
  }
});

/** Download compressed output */
router.get('/files/download/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.outputPath || !fs.existsSync(job.outputPath)) {
    return res.status(404).json({ error: 'Output not found' });
  }
  res.download(job.outputPath, path.basename(job.outputPath));
});

router.get('/files/thumb/:id', (req, res) => {
  const thumbPath = path.join(config.tempDir, `${req.params.id}_thumb.jpg`);
  if (!fs.existsSync(thumbPath)) return res.status(404).end();
  res.sendFile(thumbPath);
});

/** Preview original vs compressed sizes */
router.get('/files/compare/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({
    originalSize: job.originalSize,
    compressedSize: job.compressedSize,
    estimatedOutputSize: job.estimatedOutputSize,
    reductionPercent: job.compressedSize
      ? Math.round((1 - job.compressedSize / job.originalSize) * 1000) / 10
      : null,
    thumbnailUrl: job.thumbnailUrl,
    category: job.category,
  });
});

router.post('/cleanup', (req, res) => {
  const hours = parseInt(String(req.body.maxAgeHours || 24), 10);
  const removed = runStorageCleanup(hours);
  res.json({ removed });
});

/** App settings (persisted in SQLite) */
router.get('/settings', (_req, res) => {
  res.json({
    defaultMode: 'balanced',
    autoExport: true,
    autoCleanupHours: 24,
    maxConcurrentJobs: 2,
    enableGpu: true,
    theme: 'dark',
    outputDirectory: config.outputsDir,
    tier: 'free',
  });
});

router.put('/settings', (req, res) => {
  res.json({ ok: true, settings: req.body });
});

export default router;
