import Database from 'better-sqlite3';
import { config } from '../config';
import type { CompressionJob, AnalyticsSummary, FileCategory } from '@ultra/shared';

let db: Database.Database;

export function initDatabase(): Database.Database {
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      original_path TEXT NOT NULL,
      output_path TEXT,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0,
      original_size INTEGER NOT NULL,
      estimated_output_size INTEGER,
      compressed_size INTEGER,
      settings_json TEXT NOT NULL,
      error TEXT,
      thumbnail_url TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function saveJob(job: CompressionJob): void {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO jobs (
      id, file_name, original_path, output_path, category, status, progress,
      original_size, estimated_output_size, compressed_size, settings_json,
      error, thumbnail_url, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    job.id,
    job.fileName,
    job.originalPath,
    job.outputPath ?? null,
    job.category,
    job.status,
    job.progress,
    job.originalSize,
    job.estimatedOutputSize ?? null,
    job.compressedSize ?? null,
    JSON.stringify(job.settings),
    job.error ?? null,
    job.thumbnailUrl ?? null,
    job.createdAt,
    job.completedAt ?? null
  );
}

export function getJob(id: string): CompressionJob | null {
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToJob(row);
}

export function listJobs(limit = 50, offset = 0): CompressionJob[] {
  const rows = getDb()
    .prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export function getAnalytics(): AnalyticsSummary {
  const stats = getDb()
    .prepare(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(original_size), 0) as total_original,
        COALESCE(SUM(original_size - COALESCE(compressed_size, original_size)), 0) as saved
       FROM jobs WHERE status = 'completed'`
    )
    .get() as { total: number; total_original: number; saved: number };

  const byCategory = getDb()
    .prepare(`SELECT category, COUNT(*) as c FROM jobs GROUP BY category`)
    .all() as { category: string; c: number }[];

  const jobsByCategory: Record<FileCategory, number> = {
    video: 0,
    image: 0,
    archive: 0,
    unknown: 0,
  };
  for (const row of byCategory) {
    jobsByCategory[row.category as FileCategory] = row.c;
  }

  const totalOriginal = stats.total_original || 1;
  const avgReduction = stats.total > 0 ? (stats.saved / totalOriginal) * 100 : 0;

  return {
    totalJobs: stats.total,
    totalBytesSaved: stats.saved,
    totalOriginalBytes: stats.total_original,
    averageReductionPercent: Math.round(avgReduction * 10) / 10,
    jobsByCategory,
    recentJobs: listJobs(10),
  };
}

function rowToJob(row: Record<string, unknown>): CompressionJob {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    originalPath: row.original_path as string,
    outputPath: (row.output_path as string) || undefined,
    category: row.category as CompressionJob['category'],
    status: row.status as CompressionJob['status'],
    progress: row.progress as number,
    originalSize: row.original_size as number,
    estimatedOutputSize: (row.estimated_output_size as number) || undefined,
    compressedSize: (row.compressed_size as number) || undefined,
    settings: JSON.parse(row.settings_json as string),
    error: (row.error as string) || undefined,
    thumbnailUrl: (row.thumbnail_url as string) || undefined,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) || undefined,
  };
}
