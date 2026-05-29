import path from 'path';
import fs from 'fs';
import {
  SUPPORTED_VIDEO,
  SUPPORTED_IMAGE,
  SUPPORTED_ARCHIVE,
  type FileCategory,
} from '@ultra/shared';

const MAGIC: Record<string, { offset: number; bytes: number[] }[]> = {
  mp4: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ftyp
  png: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  jpg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  zip: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
};

/**
 * Detect file category from extension and optional magic-byte check
 */
export function detectCategory(fileName: string): FileCategory {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  if ((SUPPORTED_VIDEO as readonly string[]).includes(ext)) return 'video';
  if (ext === 'jpeg' || (SUPPORTED_IMAGE as readonly string[]).includes(ext)) return 'image';
  if ((SUPPORTED_ARCHIVE as readonly string[]).includes(ext)) return 'archive';
  return 'unknown';
}

/**
 * Basic security validation before processing
 */
export function validateFile(filePath: string, maxSize: number): { valid: boolean; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File not found' };
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return { valid: false, error: 'Not a regular file' };
  }

  if (stat.size > maxSize) {
    return { valid: false, error: `File exceeds maximum size (${formatBytes(maxSize)})` };
  }

  if (stat.size === 0) {
    return { valid: false, error: 'Empty file' };
  }

  // Reject path traversal in filename
  const base = path.basename(filePath);
  if (base.includes('..') || base.includes('/') || base.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }

  return { valid: true };
}

function formatBytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export { formatBytes };
