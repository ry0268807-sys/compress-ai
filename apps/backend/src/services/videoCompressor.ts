import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { config } from '../config';
import { getVideoEncoder } from './hardware';
import { buildVideoSettings, type MediaProbe } from './aiPresets';
import type { CompressionSettings } from '@ultra/shared';

export interface VideoProgress {
  percent: number;
  timemark?: string;
  etaSeconds?: number;
}

type ProgressCallback = (p: VideoProgress) => void;
type ControlCheck = () => 'run' | 'pause' | 'cancel';

let activeCommand: ffmpeg.FfmpegCommand | null = null;
let paused = false;

export function  pauseVideoJob(): void {
  paused = true;
}

export function resumeVideoJob(): void {
  paused = false;
}

export function cancelVideoJob(): void {
  if (activeCommand) {
    try {
      activeCommand.kill('SIGKILL');
    } catch {
      /* already dead */
    }
    activeCommand = null;
  }
}

export function probeVideo(filePath: string): Promise<MediaProbe> {
  return new Promise((resolve, reject) => {
    // FIX: Normalize path for Windows compatibility
    const cleanPath = path.resolve(path.normalize(filePath)); 

    const ffprobe = config.ffprobePath;
    const cmd = ffmpeg(cleanPath);
    if (ffprobe) cmd.setFfprobePath(ffprobe);
    if (config.ffmpegPath) cmd.setFfmpegPath(config.ffmpegPath);

    cmd.ffprobe((err, data) => {
      if (err) return reject(err);
      const video = data.streams.find((s) => s.codec_type === 'video');
      const stat = fs.statSync(cleanPath);
      resolve({
        category: 'video',
        fileSize: stat.size,
        width: video?.width,
        height: video?.height,
        duration: data.format.duration,
        bitrate: data.format.bit_rate ? parseInt(String(data.format.bit_rate), 10) : undefined,
        fps: video?.r_frame_rate ? parseFrameRate(video.r_frame_rate) : undefined,
      });
    });
  });
}

function parseFrameRate(rate: string): number {
  const [a, b] = rate.split('/').map(Number);
  return b ? a / b : a;
}

/**
 * Compress video using FFmpeg with streaming I/O (no full RAM load)
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string,
  settings: CompressionSettings,
  probe: MediaProbe,
  onProgress: ProgressCallback,
  shouldContinue: ControlCheck
): Promise<void> {
  
  // FIX: Normalize both input and output paths for Windows
  const cleanInput = path.resolve(path.normalize(inputPath));
  const cleanOutput = path.resolve(path.normalize(outputPath));

  const { crf, maxrate, bufsize, scale } = buildVideoSettings(settings, probe);
  const codec = settings.codec || 'h264';
  const useGpu = false; // GPU force disabled to fix crash
  const videoEncoder = getVideoEncoder(codec, useGpu);

  const outputExt = (settings.outputFormat || path.extname(cleanOutput).slice(1) || 'mp4').toLowerCase();

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(cleanInput);
    if (config.ffmpegPath) cmd = cmd.setFfmpegPath(config.ffmpegPath);

    const outputOpts: string[] = [
      `-c:v ${videoEncoder}`,
      codec === 'h265' && !videoEncoder.includes('nvenc') && !videoEncoder.includes('265')
        ? `-crf ${crf}`
        : `-crf ${crf}`,
    ];

    if (maxrate) {
      outputOpts.push(`-maxrate ${maxrate}`, `-bufsize ${bufsize}`);
    }

    if (scale) {
      outputOpts.push(`-vf scale=${scale}`);
    }

    if (settings.fps) {
      outputOpts.push(`-r ${settings.fps}`);
    }

    const audioQ = settings.audioQuality ?? 4;
    outputOpts.push(`-c:a aac`, `-b:a ${128 + (10 - audioQ) * 12}k`, `-movflags +faststart`);

    cmd = cmd
      .outputOptions(outputOpts)
      .format(outputExt)
      .output(cleanOutput);

    activeCommand = cmd;
    paused = false;

    const startTime = Date.now();

    cmd.on('progress', (progress) => {
      if (shouldContinue() === 'cancel') {
        cancelVideoJob();
        return;
      }

      while (shouldContinue() === 'pause') {
        /* busy-wait slice; job manager handles async pause */
      }

      const percent = progress.percent ?? 0;
      let etaSeconds: number | undefined;
      if (percent > 0 && probe.duration) {
        const elapsed = (Date.now() - startTime) / 1000;
        etaSeconds = Math.round((elapsed / percent) * (100 - percent));
      }

      onProgress({
        percent: Math.min(99, percent),
        timemark: progress.timemark,
        etaSeconds,
      });
    });

    cmd.on('end', () => {
      activeCommand = null;
      onProgress({ percent: 100 });
      resolve();
    });

    cmd.on('error', (err) => {
      activeCommand = null;
      if (shouldContinue() === 'cancel') {
        reject(new Error('Cancelled'));
      } else {
        reject(err);
      }
    });

    cmd.run();
  });
}

/**
 * Generate thumbnail for preview (first frame)
 */
export function generateThumbnail(
  inputPath: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // FIX: Normalize paths for Windows
    const cleanInput = path.resolve(path.normalize(inputPath));
    const cleanOutput = path.resolve(path.normalize(outputPath));

    let cmd = ffmpeg(cleanInput);
    if (config.ffmpegPath) cmd = cmd.setFfmpegPath(config.ffmpegPath);

    cmd
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(cleanOutput),
        folder: path.dirname(cleanOutput),
        size: '320x?',
      })
      .on('end', () => resolve(cleanOutput))
      .on('error', reject);
  });
}