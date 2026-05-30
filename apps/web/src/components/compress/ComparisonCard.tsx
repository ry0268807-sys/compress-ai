'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Download, AlertCircle } from 'lucide-react';
import type { CompressionJob } from '@ultra/shared';
import { formatBytes, downloadUrl } from '@/lib/api';
import { ProgressRing } from '../ui/ProgressRing';

interface ComparisonCardProps {
  job: CompressionJob;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export function ComparisonCard({ job, onPause, onResume, onCancel }: ComparisonCardProps) {
  const reduction =
    job.compressedSize && job.originalSize
      ? ((1 - job.compressedSize / job.originalSize) * 100).toFixed(1)
      : null;

  const isActive = job.status === 'processing' || job.status === 'paused';

  // Smart ETA Calculation
  let etaText = '';
  if (isActive) {
    if (job.etaSeconds) {
      etaText = job.etaSeconds < 60 ? `${job.etaSeconds}s left` : `~${Math.ceil(job.etaSeconds / 60)}m left`;
    } else {
      etaText = 'Calculating...';
    }
  }

  return (
    <motion.div
      layout
      // 🔥 FIX 1: 'w-full min-w-0 overflow-hidden' ensures card never goes outside parent
      className="glass p-5 rounded-xl border border-gray-800 shadow-sm transition-all hover:border-gray-700 w-full min-w-0 overflow-hidden" 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start w-full min-w-0">
        
        {/* LEFT COLUMN: Progress Ring */}
        {isActive && (
          <div className="flex flex-col items-center justify-center w-full sm:w-36 bg-gray-900/30 p-4 rounded-2xl border border-gray-800/50 shrink-0">
            <div className="scale-90"> {/* Thoda sa ring chhota kiya hai taaki fit aaye */}
                <ProgressRing progress={job.progress || 0} />
            </div>
            <div className="text-center mt-2">
              <p className="text-[11px] font-bold text-white tracking-wide uppercase">
                {job.status}
              </p>
              <p className="text-[10px] font-medium text-indigo-400 mt-1 font-mono">
                {etaText}
              </p>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: File Details & Actions */}
        {/* 🔥 FIX 2: min-w-0 is critical for letting text truncate correctly */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-center">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 w-full">
              <h4 className="font-semibold text-gray-200 truncate text-base">{job.fileName}</h4>
              {!isActive && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    job.status === 'completed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                    job.status === 'error' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                    'border-gray-500/30 text-gray-400 bg-gray-500/10'
                  }`}>
                    {job.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics: Flex layout instead of Grid so it shrinks nicely */}
          <div className="flex items-center gap-2 w-full mb-4">
            <div className="bg-gray-900/50 p-3 rounded-lg text-center border border-gray-800/50 flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 truncate">Original</p>
              <p className="text-sm font-semibold text-gray-300 truncate">
                {formatBytes(job.originalSize)}
              </p>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-600 shrink-0 hidden sm:block" />
            
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800/50 text-center relative flex-1 min-w-0 overflow-hidden">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 truncate">Compressed</p>
              <div className="flex items-center justify-center gap-1">
                <p className={`text-sm font-bold truncate ${job.status === 'completed' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {job.compressedSize
                    ? formatBytes(job.compressedSize)
                    : job.estimatedOutputSize
                      ? `~${formatBytes(job.estimatedOutputSize)}`
                      : '—'}
                </p>
                {reduction && (
                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 absolute top-1 right-1 sm:static">
                    -{reduction}%
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Error Message */}
          {job.error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg w-full mb-3 border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{job.error}</span>
            </div>
          )}

          {/* Action Buttons: flex-wrap ensures they go to next line if space is low */}
          <div className="flex flex-wrap gap-2 w-full justify-start sm:justify-end mt-auto">
            {job.status === 'processing' && onPause && (
              <button type="button" onClick={onPause} className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 flex-1 sm:flex-none">
                Pause
              </button>
            )}
            {job.status === 'paused' && onResume && (
              <button type="button" onClick={onResume} className="px-4 py-2 text-xs font-medium text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 rounded-lg transition-colors border border-indigo-500/30 flex-1 sm:flex-none">
                Resume
              </button>
            )}
            {isActive && onCancel && (
              <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 rounded-lg transition-colors border border-red-500/30 flex-1 sm:flex-none">
                Cancel
              </button>
            )}
            {job.status === 'completed' && (
              <a href={downloadUrl(job.id)} className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 flex-1 sm:flex-none w-full sm:w-auto">
                <Download className="w-4 h-4" /> Download
              </a>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}