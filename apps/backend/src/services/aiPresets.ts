import type { AiRecommendation, CompressionMode, CompressionSettings } from '@ultra/shared';

export interface MediaProbe {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  fps?: number;
  fileSize: number;
  category: 'video' | 'image' | 'archive';
}

/**
 * Map compression mode to baseline quality / CRF-style values
 */
export function modeToQuality(mode: CompressionMode): number {
  switch (mode) {
    case 'low-size':
      return 55;
    case 'balanced':
      return 75;
    case 'high-quality':
      return 90;
    default:
      return 80;
  }
}

/**
 * AI-style recommendation engine (local heuristics, no external API)
 * Suggests settings to hit a target size while preserving perceived quality
 */
export function generateRecommendations(probe: MediaProbe): AiRecommendation[] {
  const recs: AiRecommendation[] = [];
  const sizeGb = probe.fileSize / (1024 * 1024 * 1024);

  if (probe.category === 'video' && sizeGb >= 1) {
    const target1Gb = 1024 * 1024 * 1024;
    recs.push({
      title: 'Reduce 10GB → 1GB',
      description: 'Scene-aware CRF + capped bitrate for ~90% perceived quality',
      suggestedSettings: {
        mode: 'balanced',
        quality: 88,
        targetSizeBytes: Math.min(target1Gb, probe.fileSize * 0.1),
        codec: 'h265',
        aiBestQualityUnderLimit: true,
      },
      estimatedReductionPercent: 90,
      estimatedOutputSizeBytes: Math.min(target1Gb, probe.fileSize * 0.1),
    });
  }

  if (probe.bitrate && probe.bitrate > 8_000_000) {
    recs.push({
      title: 'Trim excess bitrate',
      description: 'Source bitrate is higher than needed for the resolution — safe to reduce',
      suggestedSettings: {
        bitrateKbps: Math.round((probe.bitrate * 0.45) / 1000),
        quality: 82,
        mode: 'balanced',
      },
      estimatedReductionPercent: 45,
      estimatedOutputSizeBytes: Math.round(probe.fileSize * 0.55),
    });
  }

  if (probe.category === 'image' && probe.fileSize > 5 * 1024 * 1024) {
    recs.push({
      title: 'Web-optimized WebP',
      description: 'Convert to WebP at high quality for dramatic size savings',
      suggestedSettings: {
        mode: 'balanced',
        quality: 85,
        outputFormat: 'webp',
      },
      estimatedReductionPercent: 70,
      estimatedOutputSizeBytes: Math.round(probe.fileSize * 0.3),
    });
  }

  recs.push({
    title: 'Best quality under size limit',
    description: 'Automatically tune encoder settings to hit your target file size',
    suggestedSettings: {
      aiBestQualityUnderLimit: true,
      mode: 'custom',
      quality: 86,
      targetSizeBytes: probe.fileSize * 0.25,
    },
    estimatedReductionPercent: 75,
    estimatedOutputSizeBytes: Math.round(probe.fileSize * 0.25),
  });

  return recs;
}

/**
 * Derive FFmpeg/video settings from mode + optional target size
 */
export function buildVideoSettings(
  settings: CompressionSettings,
  probe: MediaProbe
): { crf: number; maxrate?: string; bufsize?: string; scale?: string } {
  let quality = settings.quality ?? modeToQuality(settings.mode);

  if (settings.aiBestQualityUnderLimit && settings.targetSizeBytes && probe.duration) {
    // Bits per second budget from target size
    const audioBudget = 128_000;
    const videoBudget = (settings.targetSizeBytes * 8) / probe.duration - audioBudget;
    const targetKbps = Math.max(500, Math.round(videoBudget / 1000));
    settings.bitrateKbps = settings.bitrateKbps ?? targetKbps;
    quality = Math.min(92, quality + 5);
  }

  const crf = Math.round(51 - (quality / 100) * 33); // map 100→18, 50→35

  let maxrate: string | undefined;
  let bufsize: string | undefined;
  if (settings.bitrateKbps) {
    maxrate = `${settings.bitrateKbps}k`;
    bufsize = `${settings.bitrateKbps * 2}k`;
  }

  let scale: string | undefined;
  if (settings.resolution) {
    const h = parseInt(settings.resolution.replace(/\D/g, ''), 10);
    if (h) scale = `-2:${h}`;
  }

  return { crf, maxrate, bufsize, scale };
}
