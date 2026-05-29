'use client';

import type { AiRecommendation, CompressionSettings } from '@ultra/shared';
import { Sparkles } from 'lucide-react';
import { formatBytes } from '@/lib/api';

interface AiRecommendationsProps {
  recommendations: AiRecommendation[];
  onApply: (settings: Partial<CompressionSettings>) => void;
}

export function AiRecommendations({ recommendations, onApply }: AiRecommendationsProps) {
  if (!recommendations.length) return null;

  return (
    <div className="glass p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h3 className="font-semibold">AI Smart Recommendations</h3>
        <span className="text-xs text-gray-500">(local analysis)</span>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5"
          >
            <div>
              <p className="font-medium">{rec.title}</p>
              <p className="text-sm text-gray-400">{rec.description}</p>
              <p className="text-xs text-indigo-400 mt-1">
                ~{rec.estimatedReductionPercent}% reduction →{' '}
                {formatBytes(rec.estimatedOutputSizeBytes)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApply(rec.suggestedSettings)}
              className="btn-primary text-sm shrink-0"
            >
              Apply preset
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
