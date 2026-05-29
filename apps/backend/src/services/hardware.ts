import { execSync } from 'child_process';
import os from 'os';
import type { HardwareInfo } from '@ultra/shared';
import { config } from '../config';

let cached: HardwareInfo | null = null;

/**
 * Probe FFmpeg for available hardware encoders (NVENC, QSV, AMF, VideoToolbox)
 */
export function detectHardware(): HardwareInfo {
  if (cached) return cached;

  const platform = process.platform;
  let encoders = '';

  try {
    const ffmpeg = config.ffmpegPath || 'ffmpeg';
    encoders = execSync(`${ffmpeg} -hide_banner -encoders 2>&1`, {
      encoding: 'utf8',
      timeout: 10000,
    }).toLowerCase();
  } catch {
    encoders = '';
  }

  const hasNvenc = encoders.includes('h264_nvenc') || encoders.includes('hevc_nvenc');
  const hasQsv = encoders.includes('h264_qsv') || encoders.includes('hevc_qsv');
  const hasAmf = encoders.includes('h264_amf') || encoders.includes('hevc_amf');
  const hasVideotoolbox =
    platform === 'darwin' &&
    (encoders.includes('h264_videotoolbox') || encoders.includes('hevc_videotoolbox'));

  let recommendedEncoder = 'libx264';
  if (hasNvenc) recommendedEncoder = 'h264_nvenc';
  else if (hasQsv) recommendedEncoder = 'h264_qsv';
  else if (hasAmf) recommendedEncoder = 'h264_amf';
  else if (hasVideotoolbox) recommendedEncoder = 'h264_videotoolbox';

  cached = {
    hasNvenc,
    hasQsv,
    hasAmf,
    hasVideotoolbox,
    recommendedEncoder,
    platform: `${platform} (${os.arch()})`,
  };

  return cached;
}

export function getVideoEncoder(codec: 'h264' | 'h265', useGpu: boolean): string {
  const hw = detectHardware();
  if (!useGpu) {
    return codec === 'h265' ? 'libx265' : 'libx264';
  }

  if (codec === 'h265') {
    if (hw.hasNvenc) return 'hevc_nvenc';
    if (hw.hasQsv) return 'hevc_qsv';
    if (hw.hasAmf) return 'hevc_amf';
    if (hw.hasVideotoolbox) return 'hevc_videotoolbox';
    return 'libx265';
  }

  if (hw.hasNvenc) return 'h264_nvenc';
  if (hw.hasQsv) return 'h264_qsv';
  if (hw.hasAmf) return 'h264_amf';
  if (hw.hasVideotoolbox) return 'h264_videotoolbox';
  return 'libx264';
}
