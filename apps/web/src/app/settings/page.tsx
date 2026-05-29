'use client';

import { useState } from 'react';
import type { CompressionMode } from '@ultra/shared';
import { Settings, Trash2, FolderOpen } from 'lucide-react';

export default function SettingsPage() {
  const [defaultMode, setDefaultMode] = useState<CompressionMode>('balanced');
  const [autoExport, setAutoExport] = useState(true);
  const [autoCleanup, setAutoCleanup] = useState(24);
  const [enableGpu, setEnableGpu] = useState(true);
  const [maxJobs, setMaxJobs] = useState(2);

  const runCleanup = async () => {
    await fetch('/api/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxAgeHours: autoCleanup }),
    });
    alert('Temp storage cleaned');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-indigo-400" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="glass p-6 space-y-6">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Default compression mode</label>
          <select
            className="input-field"
            value={defaultMode}
            onChange={(e) => setDefaultMode(e.target.value as CompressionMode)}
          >
            <option value="low-size">Low Size</option>
            <option value="balanced">Balanced</option>
            <option value="high-quality">High Quality</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={autoExport}
            onChange={(e) => setAutoExport(e.target.checked)}
          />
          <span>Auto-export compressed files to output folder</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enableGpu}
            onChange={(e) => setEnableGpu(e.target.checked)}
          />
          <span>Enable GPU acceleration when available</span>
        </label>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Max concurrent jobs</label>
          <input
            type="number"
            min={1}
            max={8}
            className="input-field"
            value={maxJobs}
            onChange={(e) => setMaxJobs(parseInt(e.target.value, 10))}
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Auto-cleanup temp files (hours)</label>
          <input
            type="number"
            className="input-field"
            value={autoCleanup}
            onChange={(e) => setAutoCleanup(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <FolderOpen className="w-4 h-4" />
          Output: ./data/outputs (local)
        </div>

        <button
          type="button"
          onClick={runCleanup}
          className="btn-ghost border border-white/10 flex items-center gap-2 w-full justify-center py-3 rounded-xl"
        >
          <Trash2 className="w-4 h-4" /> Run storage cleanup now
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">
        All processing is local. No files are sent to external servers by default.
      </p>
    </div>
  );
}
