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
import { supabase } from '@/lib/supabase';
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
import { Loader2, HardDrive, UploadCloud, CheckCircle2, Settings2, ListVideo } from 'lucide-react';

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
  const [settingsSaved, setSettingsSaved] = useState(false); 
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  // UI FLOW STATES
  const [isUploaded, setIsUploaded] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);

  useEffect(() => {
    fetchJobs().then(setJobs).catch(console.error);
    fetchHardware().then(setHardware).catch(console.error);
  }, []);

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

      const myEmail = "ry0268807@gmail.com"; 
      const isAdmin = user?.primaryEmailAddress?.emailAddress === myEmail;
      const FREE_TIER_LIMIT = 50 * 1024 * 1024; 

      if (!isAdmin && file.size > FREE_TIER_LIMIT) {
        alert("File exceeds free tier limit. Upgrade to Premium for larger files.");
        return;
      }

      setPendingFiles([file]);
      setIsUploaded(false); 
      setSettingsSaved(false); 
      setRecs([]); // Nayi file aane par purani AI recs hata do
    },
    [user]
  );

  const handleInitialUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploadingToCloud(true);
    
    // Simulating initial upload to staging area
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // 🔥 FIX 1: AI Recommendations ab Upload hote hi fetch hongi 🔥
    fetchRecommendations(pendingFiles[0]).then(setRecs).catch(() => {});
    
    setIsUploadingToCloud(false);
    setIsUploaded(true);
  };

  const startUploadAndCompress = async () => {
    const file = pendingFiles[0];
    if (!file) return;

    if (!settingsSaved) {
      alert("Please configure your Format and Quality, then click 'Save Settings' before compressing.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const apiOk = await checkApiHealth();
      if (!apiOk) {
        throw new ApiError('Compression API is offline. Check backend connection.');
      }

      let job: CompressionJob;
      if (file.size > CHUNK_THRESHOLD) {
        job = await uploadFileChunked(file, settings, setUploadProgress);
      } else {
        setUploadProgress(10);
        job = await uploadFile(file, settings);
        setUploadProgress(100);
      }

      setJobs((prev) => [job, ...prev]);
      
      if (user?.primaryEmailAddress?.emailAddress) {
          const { error: dbError } = await supabase
            .from('compression_jobs')
            .insert([
              {
                user_email: user.primaryEmailAddress.emailAddress,
                file_name: file.name,
                original_size: file.size,
                compressed_size: (job as any).resultSize || Math.floor(file.size * 0.5), 
                status: 'completed',
                format: settings.outputFormat || 'mp4'
              }
            ]);

          if (dbError) {
              console.error("Supabase Save Error:", dbError);
          }
      }

      setPendingFiles([]); 
      setIsUploaded(false); 
      setSettingsSaved(false);
      setRecs([]); // Compress hone ke baad AI recs clear kar do
      
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
        
        {/* LEFT COLUMN: UPLOAD & SETTINGS */}
        <div className="space-y-6">
          
          <div className="relative">
            <DropZone onFiles={handleFiles} disabled={uploading || isUploadingToCloud} />
            
            <div className="mt-4 flex flex-col items-center justify-center w-full">
              {pendingFiles.length > 0 && !isUploaded && (
                <div className="text-sm text-indigo-300 font-medium mb-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Ready: {pendingFiles[0].name}
                </div>
              )}
              
              <button
                onClick={handleInitialUpload}
                disabled={pendingFiles.length === 0 || isUploadingToCloud || isUploaded}
                className={`w-full max-w-sm py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                  isUploaded
                    ? "bg-emerald-600 border border-emerald-500 text-white cursor-default"
                    : pendingFiles.length > 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 hover:-translate-y-1"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                }`}
              >
                {isUploadingToCloud ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    Uploading File...
                  </>
                ) : isUploaded ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Upload Complete
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" />
                    UPLOAD FILE FIRST
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className={`transition-opacity duration-500 ${isUploaded ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-200">
               <Settings2 className="w-5 h-5" /> Manual Settings
            </h3>
            
            <div className="glass p-5 rounded-2xl border border-gray-700/50 space-y-5">
              
              <CompressionControls
                settings={settings}
                onChange={setSettings}
                isVideo
                tier={tier}
              />

              {/* 🔥 FIX 2: Duplicate Format Hata Diya, Sirf Buttons Rakhe Hain 🔥 */}
              <div className="pt-4 border-t border-gray-700/50 flex justify-end gap-4">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setSettingsSaved(true)}
                    disabled={settingsSaved || uploading}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      settingsSaved 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                    }`}
                  >
                    {settingsSaved ? 'Settings Locked' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={() => {
                      setSettingsSaved(false);
                      setSettings(DEFAULT_SETTINGS);
                    }}
                    disabled={uploading}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI & COMPRESS & QUEUE */}
        <div className="space-y-6">
          
          <div className={`transition-all duration-500 ${isUploaded ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            {recs.length > 0 ? (
              <AiRecommendations
                recommendations={recs}
                onApply={(partial) => {
                  setSettings((s) => ({ ...s, ...partial }));
                  // AI apply karte hi auto-save ho jaye
                  setSettingsSaved(true); 
                }}
              />
            ) : (
              <div className="glass p-6 text-center text-gray-500 text-sm border border-dashed border-gray-700">
                AI Recommendations will appear here after upload
              </div>
            )}
          </div>

          <div className={`transition-all duration-500 ${isUploaded && settingsSaved ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {pendingFiles.length > 0 && !uploading && (
              <div className="p-6 border-2 border-blue-500/30 rounded-2xl bg-blue-900/10 shadow-xl text-center backdrop-blur-md">
                <button
                  onClick={startUploadAndCompress}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-black rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  START COMPRESSING
                </button>
                {!settingsSaved && (
                  <p className="text-xs text-orange-400 mt-3 font-medium">
                    Please click "Save Changes" on the left first.
                  </p>
                )}
              </div>
            )}
          </div>

          {uploading && (
            <div className="glass p-5 flex flex-col gap-3 rounded-xl border border-indigo-500/30 bg-indigo-900/20">
              <div className="flex items-center justify-between text-indigo-300 font-medium">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadProgress > 0 ? 'Processing File...' : 'Initializing Engine...'}
                </span>
                <span className="font-bold text-white">{uploadProgress}%</span>
              </div>
              
              <div className="w-full bg-gray-900 rounded-full h-4 overflow-hidden shadow-inner border border-gray-700">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 h-4 rounded-full transition-all duration-300 relative" 
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-gray-400 mt-1">
                <span>Optimizing Data Structure</span>
                {uploadProgress > 0 && uploadProgress < 100 
                  ? <span className="text-indigo-400">ETA: ~{Math.ceil((100 - uploadProgress) * 0.4)}s</span> 
                  : <span>Calculating...</span>}
              </div>
            </div>
          )}

          <div className="glass p-6 mt-8">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <ListVideo className="w-5 h-5 text-gray-400" /> Queue & History
            </h3>
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No history available.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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