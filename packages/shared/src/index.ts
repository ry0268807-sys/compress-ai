/**
 * @ultra/shared - Types and constants shared across web, backend, and desktop
 */

export type FileCategory = 'video' | 'image' | 'archive' | 'unknown';

export type CompressionMode = 'low-size' | 'balanced' | 'high-quality' | 'custom';

export type JobStatus =
  | 'queued'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type VideoCodec = 'h264' | 'h265';
export type VideoFormat = 'mp4' | 'mov' | 'mkv' | 'avi' | 'webm';
export type ImageFormat = 'jpg' | 'png' | 'webp' | 'heic';
export type ArchiveFormat = 'zip' | '7z' | 'tar';

export type SubscriptionTier = 'free' | 'premium' | 'cloud';

export interface CompressionSettings {
  mode: CompressionMode;
  /** 1-100 quality scale */
  quality: number;
  /** Target output size in bytes (optional) */
  targetSizeBytes?: number;
  /** Video-specific */
  bitrateKbps?: number;
  resolution?: string;
  fps?: number;
  codec?: VideoCodec;
  audioQuality?: number;
  outputFormat?: string;
  /** Enable GPU/hardware encoding when available */
  useGpu?: boolean;
  /** AI preset: optimize quality under size limit */
  aiBestQualityUnderLimit?: boolean;
}

export interface CompressionJob {
  id: string;
  fileName: string;
  originalPath: string;
  outputPath?: string;
  category: FileCategory;
  status: JobStatus;
  progress: number;
  originalSize: number;
  estimatedOutputSize?: number;
  compressedSize?: number;
  settings: CompressionSettings;
  error?: string;
  thumbnailUrl?: string;
  createdAt: string;
  completedAt?: string;
  etaSeconds?: number;
}

export interface HardwareInfo {
  hasNvenc: boolean;
  hasQsv: boolean;
  hasAmf: boolean;
  hasVideotoolbox: boolean;
  recommendedEncoder: string;
  platform: string;
}

export interface AiRecommendation {
  title: string;
  description: string;
  suggestedSettings: Partial<CompressionSettings>;
  estimatedReductionPercent: number;
  estimatedOutputSizeBytes: number;
}

export interface AppSettings {
  defaultMode: CompressionMode;
  autoExport: boolean;
  autoCleanupHours: number;
  maxConcurrentJobs: number;
  enableGpu: boolean;
  theme: 'dark' | 'light' | 'system';
  outputDirectory: string;
  tier: SubscriptionTier;
}

export interface AnalyticsSummary {
  totalJobs: number;
  totalBytesSaved: number;
  totalOriginalBytes: number;
  averageReductionPercent: number;
  jobsByCategory: Record<FileCategory, number>;
  recentJobs: CompressionJob[];
}

/** Free tier limits */
export const TIER_LIMITS = {
  free: {
    maxFileSizeBytes: 500 * 1024 * 1024, // 500MB
    maxJobsPerDay: 10,
    gpuEnabled: false,
    batchMax: 3,
  },
  premium: {
    maxFileSizeBytes: 50 * 1024 * 1024 * 1024, // 50GB
    maxJobsPerDay: Infinity,
    gpuEnabled: true,
    batchMax: 100,
  },
  cloud: {
    maxFileSizeBytes: 100 * 1024 * 1024 * 1024,
    maxJobsPerDay: Infinity,
    gpuEnabled: true,
    batchMax: 500,
  },
} as const;

export const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB chunks for streaming

export const SUPPORTED_VIDEO = ['mp4', 'mov', 'mkv', 'avi', 'webm'] as const;
export const SUPPORTED_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const;
export const SUPPORTED_ARCHIVE = ['zip', '7z', 'tar', 'gz'] as const;
