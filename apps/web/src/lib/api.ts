/**
 * API client - talks to local backend via Next.js proxy or direct URL
 */
import type {
  AiRecommendation,
  AnalyticsSummary,
  CompressionJob,
  CompressionSettings,
  HardwareInfo,
} from '@ultra/shared';

/** Use direct URL in browser when set (bypasses Next proxy if needed) */
const API_BASE =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '';

const API = API_BASE ? `${API_BASE}/api` : '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.error || body.message || res.statusText;
  } catch {
    if (res.status === 502 || res.status === 504) {
      return 'Compression API is not running. Start it with: npm run dev -w @ultra/backend';
    }
    return res.statusText || 'Request failed';
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, init);
  } catch {
    throw new ApiError(
      'Cannot reach the compression API. Run both servers: npm run dev (web + backend on port 4000).'
    );
  }
  return res;
}

/** Check if backend is reachable */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await apiFetch('/health');
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function fetchHardware(): Promise<HardwareInfo> {
  const res = await apiFetch('/hardware');
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function fetchJobs(limit = 50): Promise<CompressionJob[]> {
  const res = await apiFetch(`/jobs?limit=${limit}`);
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function fetchJob(id: string): Promise<CompressionJob> {
  const res = await apiFetch(`/jobs/${id}`);
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await apiFetch('/analytics');
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function uploadFile(
  file: File,
  settings: CompressionSettings
): Promise<CompressionJob> {
  const form = new FormData();
  form.append('file', file);
  form.append('settings', JSON.stringify(settings));

  const res = await apiFetch('/upload', { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

/** Chunked upload for files > 100MB */
export async function uploadFileChunked(
  file: File,
  settings: CompressionSettings,
  onProgress: (percent: number) => void,
  chunkSize = 64 * 1024 * 1024
): Promise<CompressionJob> {
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const form = new FormData();
    form.append('chunk', chunk, file.name);
    form.append('uploadId', uploadId);
    form.append('chunkIndex', String(i));
    form.append('totalChunks', String(totalChunks));
    form.append('fileName', file.name);
    if (i === totalChunks - 1) {
      form.append('settings', JSON.stringify(settings));
    }

    const res = await apiFetch('/upload/chunk', { method: 'POST', body: form });
    if (!res.ok) throw new ApiError(await parseError(res), res.status);

    onProgress(Math.round(((i + 1) / totalChunks) * 100));

    const data = await res.json();
    if (data.id) return data as CompressionJob;
  }

  throw new ApiError('Chunk upload incomplete');
}

export async function uploadBatch(
  files: File[],
  settings: CompressionSettings
): Promise<CompressionJob[]> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  form.append('settings', JSON.stringify(settings));

  const res = await apiFetch('/batch', { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function pauseJob(id: string): Promise<void> {
  await apiFetch(`/jobs/${id}/pause`, { method: 'POST' });
}

export async function resumeJob(id: string): Promise<void> {
  await apiFetch(`/jobs/${id}/resume`, { method: 'POST' });
}

export async function cancelJob(id: string): Promise<void> {
  await apiFetch(`/jobs/${id}/cancel`, { method: 'POST' });
}

/** Optional — does not block compression if it fails */
export async function fetchRecommendations(file: File): Promise<AiRecommendation[]> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch('/recommendations', { method: 'POST', body: form });
  if (!res.ok) return [];
  return res.json();
}

export function downloadUrl(jobId: string): string {
  return `${API}/files/download/${jobId}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
