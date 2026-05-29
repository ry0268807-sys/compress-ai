import type { CompressionSettings } from '@ultra/shared';

export const DEFAULT_SETTINGS: CompressionSettings = {
  mode: 'balanced',
  quality: 75,
  codec: 'h264',
  audioQuality: 5,
  useGpu: true,
  outputFormat: 'mp4',
};

export const MODE_PRESETS: Record<string, Partial<CompressionSettings>> = {
  'low-size': { mode: 'low-size', quality: 55 },
  balanced: { mode: 'balanced', quality: 75 },
  'high-quality': { mode: 'high-quality', quality: 90 },
  custom: { mode: 'custom', quality: 80 },
};
