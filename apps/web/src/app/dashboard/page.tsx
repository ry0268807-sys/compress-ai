'use client';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import type { CompressionJob, CompressionSettings } from '@ultra/shared';
import { TIER_LIMITS } from '@ultra/shared';
import { DropZone } from '@/components/compress/DropZone';
import { CompressionControls } from '@/components/compress/CompressionControls';
import { ComparisonCard } from '@/components/compress/ComparisonCard';
import { AiRecommendations } from '@/components/compress/AiRecommendations';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import {
  uploadFile,
  uploadFileChunked,
  fetchJobs,
  fetchJob,
  fetchRecommendations,
  pauseJob,
  resumeJob,
  cancelJob,
  fetchHardware,
  checkApiHealth,
  ApiError,
} from '@/lib/api';
import { ApiStatusBanner } from '@/components/layout/ApiStatusBanner';
import type { AiRecommendation, HardwareInfo } from '@ultra/shared';
import { Loader2, HardDrive } from 'lucide-react';

const CHUNK_THRESHOLD = 100 * 1024 * 1024; // 100MB

export default function DashboardPage() {
  const { user } = useUser();
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [jobs, setJobs] = useState<CompressionJob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recs, setRecs] = useState<AiRecommendation[]>([]);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tier = 'free';

  useEffect(() => {
    fetchJobs().then(setJobs).catch(console.error);
    fetchHardware().then(setHardware).catch(console.error);
  }, []);

  // Refresh job list while on page (progress updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs().then(setJobs).catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // 👑 VIP Admin Lock (Clerk Email Checking)
      // NEECHE WALI LINE MEIN APNI ASLI EMAIL ID DAALIYE 👇
      const myEmail = "ry0268807@gmail.com"; 
      const isAdmin = user?.primaryEmailAddress?.emailAddress === myEmail;

      const FREE_TIER_LIMIT = 50 * 1024 * 1024; // 50 MB limit

      if (!isAdmin && file.size > FREE_TIER_LIMIT) {
        alert("File exceeds free tier limit. Upgrade to Premium for larger files.");
        return;
      }

      

      setUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const apiOk = await checkApiHealth();
        if (!apiOk) {
          throw new ApiError(
            'Compression API is offline. Run npm run dev from the project root to start web + backend.'
          );
        }

        // Upload first — recommendations are optional and must not block upload
        let job: CompressionJob;
        if (file.size > CHUNK_THRESHOLD) {
          job = await uploadFileChunked(file, settings, setUploadProgress);
        } else {
          setUploadProgress(10);
          job = await uploadFile(file, settings);
          setUploadProgress(100);
        }

        setJobs((prev) => [job, ...prev]);

        fetchRecommendations(file).then(setRecs).catch(() => {});
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Upload failed';
        setError(msg);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [settings, tier,user]
  );

  return (
    <>
      <ApiStatusBanner />
      <div className="max-w-6xl mx-auto px-4 py-10">
      {error && (
        <div className="mb-6 glass p-4 border-red-500/30 bg-red-500/10 text-red-200 text-sm rounded-xl">
          {error}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compression Studio</h1>
        <p className="text-gray-400">
          Upload videos, images, or archives. Processing runs locally on your machine.
        </p>
        {hardware && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
            <HardDrive className="w-3 h-3" />
            Encoder: {hardware.recommendedEncoder} • {hardware.platform}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <DropZone onFiles={handleFiles} disabled={uploading} />
          {uploading && (
            <div className="glass p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>
                {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Starting compression...'}
              </span>
            </div>
          )}
          <CompressionControls
            settings={settings}
            onChange={setSettings}
            isVideo
            tier={tier}
          />
        </div>

        <div className="space-y-6">
          {recs.length > 0 && (
            <AiRecommendations
              recommendations={recs}
              onApply={(partial) => setSettings((s) => ({ ...s, ...partial }))}
            />
          )}

          <div className="glass p-6">
            <h3 className="font-semibold mb-4">Queue & History</h3>
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-sm">No jobs yet. Drop a file to start.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {jobs.map((job) => (
                  <ComparisonCard
                    key={job.id}
                    job={job}
                    onPause={() => {
                      pauseJob(job.id).then(() =>
                        fetchJob(job.id).then((j) =>
                          setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)))
                        )
                      );
                    }}
                    onResume={() => {
                      resumeJob(job.id).then(() =>
                        fetchJob(job.id).then((j) =>
                          setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)))
                        )
                      );
                    }}
                    onCancel={() => {
                      cancelJob(job.id).then(() =>
                        fetchJob(job.id).then((j) =>
                          setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)))
                        )
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
