'use client';

import type { CompressionMode, CompressionSettings } from '@ultra/shared';
import { MODE_PRESETS } from '@/lib/defaults';

interface CompressionControlsProps {
  settings: CompressionSettings;
  onChange: (s: CompressionSettings) => void;
  isVideo?: boolean;
  tier?: 'free' | 'premium' | 'cloud';
}

const MODES: { id: CompressionMode; label: string; desc: string }[] = [
  { id: 'low-size', label: 'Low Size', desc: 'Smallest file' },
  { id: 'balanced', label: 'Balanced', desc: 'Quality + size' },
  { id: 'high-quality', label: 'High Quality', desc: 'Best fidelity' },
  { id: 'custom', label: 'Custom', desc: 'Full control' },
];

export function CompressionControls({
  settings,
  onChange,
  isVideo = true,
  tier = 'free',
}: CompressionControlsProps) {
  const update = (partial: Partial<CompressionSettings>) =>
    onChange({ ...settings, ...partial });

  return (
    <div className="glass p-6 space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-3 block">Compression mode</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => update({ ...MODE_PRESETS[m.id], mode: m.id })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.mode === m.id
                  ? 'border-indigo-500 bg-indigo-500/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="font-medium text-sm">{m.label}</div>
              <div className="text-xs text-gray-500">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 flex justify-between mb-2">
          <span>Quality</span>
          <span>{settings.quality ?? 75}%</span>
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={settings.quality ?? 75}
          onChange={(e) => update({ quality: parseInt(e.target.value, 10) })}
          className="w-full"
        />
      </div>

      {isVideo && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Codec</label>
              <select
                className="input-field"
                value={settings.codec || 'h264'}
                onChange={(e) => update({ codec: e.target.value as 'h264' | 'h265' })}
              >
                <option value="h264">H.264 (AVC)</option>
                <option value="h265">H.265 (HEVC)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Resolution</label>
              <select
                className="input-field"
                value={settings.resolution || 'original'}
                onChange={(e) =>
                  update({
                    resolution: e.target.value === 'original' ? undefined : e.target.value,
                  })
                }
              >
                <option value="original">Original</option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">FPS</label>
              <select
                className="input-field"
                value={settings.fps || 'original'}
                onChange={(e) =>
                  update({
                    fps:
                      e.target.value === 'original'
                        ? undefined
                        : parseInt(e.target.value, 10),
                  })
                }
              >
                <option value="original">Original</option>
                <option value="60">60</option>
                <option value="30">30</option>
                <option value="24">24</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Bitrate (kbps)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Auto"
                value={settings.bitrateKbps || ''}
                onChange={(e) =>
                  update({
                    bitrateKbps: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Target output size (MB)</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 1000 for 1GB target"
              onChange={(e) =>
                update({
                  targetSizeBytes: e.target.value
                    ? parseFloat(e.target.value) * 1024 * 1024
                    : undefined,
                  aiBestQualityUnderLimit: !!e.target.value,
                })
              }
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useGpu ?? false}
              disabled={tier === 'free'}
              onChange={(e) => update({ useGpu: e.target.checked })}
              className="rounded border-white/20"
            />
            <span className="text-sm">
              GPU acceleration {tier === 'free' && '(Premium)'}
            </span>
          </label>
        </>
      )}

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Output format</label>
        <input
          className="input-field"
          value={settings.outputFormat || ''}
          onChange={(e) => update({ outputFormat: e.target.value })}
          placeholder={isVideo ? 'mp4' : 'webp'}
        />
      </div>
    </div>
  );
}
