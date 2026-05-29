'use client';

import { useState } from 'react';
import type { CompressionJob, CompressionSettings } from '@ultra/shared';
import { DropZone } from '@/components/compress/DropZone';
import { CompressionControls } from '@/components/compress/CompressionControls';
import { ComparisonCard } from '@/components/compress/ComparisonCard';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { uploadBatch, checkApiHealth, ApiError } from '@/lib/api';
import { ApiStatusBanner } from '@/components/layout/ApiStatusBanner';
import { Layers } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

export default function BatchPage() {
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [jobs, setJobs] = useState<CompressionJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn } = useAuth();
  

  const handleBatch = async (files: File[]) => {
    // --- SMART FILE LIMIT CHECK ---
    const maxLimitBytes = isSignedIn ? 10 * 1024 * 1024 * 1024 : 50 * 1024 * 1024; // 10GB or 50MB
    if (files.some(f => f.size > maxLimitBytes)) {
      setError(isSignedIn ? "Limit exceeded: Max 10GB allowed per file." : "Guest limit is 50MB. Please Sign In to upload up to 10GB!");
      return;
    }
    // ------------------------------
    
    if (files.length > 3) {
      setError('Free tier: max 3 files per batch. Upgrade for unlimited batch processing.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!(await checkApiHealth())) {
        throw new ApiError('Compression API is offline. Run npm run dev from the project root.');
      }
      const result = await uploadBatch(files, settings);
      setJobs((prev) => [...result, ...prev]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Batch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ApiStatusBanner />
    <div className="max-w-6xl mx-auto px-4 py-10">
      {error && (
        <div className="mb-6 glass p-4 border-red-500/30 bg-red-500/10 text-red-200 text-sm rounded-xl">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3 mb-8">
        <Layers className="w-8 h-8 text-indigo-400" />
        <div>
          <h1 className="text-3xl font-bold">Batch Compression</h1>
          <p className="text-gray-400">Process multiple files with the same settings</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <DropZone onFiles={handleBatch} disabled={loading} />
          <CompressionControls settings={settings} onChange={setSettings} />
        </div>
        <div className="space-y-4">
          {jobs.map((job) => (
            <ComparisonCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
