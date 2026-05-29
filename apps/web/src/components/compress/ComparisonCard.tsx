'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
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

  return (
    <motion.div
      layout
      className="glass p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col lg:flex-row gap-6">
      {isActive && (
          <div className="flex flex-col items-center justify-center gap-3 min-w-[160px]">
            {/* Ab circle ke andar sirf percentage aayega */}
            <ProgressRing progress={job.progress} />
            
            {/* Yeh text circle ke theek niche bada aur clear dikhega */}
            <div className="text-center">
              <p className="text-lg font-bold text-white tracking-wide">
                {job.status === 'paused' ? 'Paused' : 'Compressing'}
              </p>
              <p className="text-sm font-medium text-indigo-300 mt-1">
                {job.etaSeconds
                  ? `~${Math.ceil(job.etaSeconds / 60)} min left`
                  : job.estimatedOutputSize
                    ? `Est. ${formatBytes(job.estimatedOutputSize)}`
                    : ''}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1">
          <h4 className="font-semibold truncate mb-1">{job.fileName}</h4>
          <p className="text-sm text-gray-400 capitalize mb-4">{job.status}</p>

          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
            <div className="glass p-3 rounded-xl flex-1 min-w-0 text-center sm:text-left">
              <p className="text-xs text-gray-500 mb-1">Before</p>
              <p className="text-sm sm:text-base font-semibold text-white">
                {formatBytes(job.originalSize)}
              </p>
            </div>
            
            <ArrowRight className="shrink-0 w-4 h-4 text-indigo-400" />
            
            <div className="glass p-3 rounded-xl flex-1 min-w-0 border-indigo-500/30 text-center sm:text-left">
              <p className="text-xs text-gray-500 mb-1">After</p>
              <p className="text-sm sm:text-base font-semibold text-indigo-300">
                {job.compressedSize
                  ? formatBytes(job.compressedSize)
                  : job.estimatedOutputSize
                    ? `~${formatBytes(job.estimatedOutputSize)}`
                    : '—'}
              </p>
              {reduction && (
                <p className="text-[10px] sm:text-xs text-green-400 mt-1">-{reduction}%</p>
              )}
            </div>
          </div>
          
          {job.error && <p className="text-red-400 text-sm mt-3">{job.error}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            {job.status === 'processing' && onPause && (
              <button type="button" onClick={onPause} className="btn-ghost text-sm">
                Pause
              </button>
            )}
            {job.status === 'paused' && onResume && (
              <button type="button" onClick={onResume} className="btn-ghost text-sm">
                Resume
              </button>
            )}
            {isActive && onCancel && (
              <button type="button" onClick={onCancel} className="btn-ghost text-sm text-red-400">
                Cancel
              </button>
            )}
            {job.status === 'completed' && (
              <a href={downloadUrl(job.id)} className="btn-primary text-sm inline-flex items-center gap-2">
                <Download className="w-4 h-4" /> Download
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
