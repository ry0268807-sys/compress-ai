'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsSummary } from '@ultra/shared';
import { fetchAnalytics, formatBytes } from '@/lib/api';
import { BarChart3, HardDrive, Percent, FileStack } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetchAnalytics().then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">
        Loading analytics...
      </div>
    );
  }

  const stats = [
    {
      icon: FileStack,
      label: 'Total jobs',
      value: String(data.totalJobs),
    },
    {
      icon: HardDrive,
      label: 'Space saved',
      value: formatBytes(data.totalBytesSaved),
    },
    {
      icon: Percent,
      label: 'Avg. reduction',
      value: `${data.averageReductionPercent}%`,
    },
    {
      icon: BarChart3,
      label: 'Data processed',
      value: formatBytes(data.totalOriginalBytes),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Compression Analytics</h1>
      <p className="text-gray-400 mb-10">Insights from your local compression history</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass p-6">
            <s.icon className="w-8 h-8 text-indigo-400 mb-3" />
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass p-6">
          <h3 className="font-semibold mb-4">By category</h3>
          <div className="space-y-3">
            {Object.entries(data.jobsByCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="capitalize w-20 text-gray-400">{cat}</span>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    style={{
                      width: `${data.totalJobs ? (count / data.totalJobs) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <h3 className="font-semibold mb-4">Recent activity</h3>
          <ul className="space-y-2 text-sm">
            {data.recentJobs.map((j) => (
              <li key={j.id} className="flex justify-between py-2 border-b border-white/5">
                <span className="truncate max-w-[200px]">{j.fileName}</span>
                <span className="text-gray-500 capitalize">{j.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
