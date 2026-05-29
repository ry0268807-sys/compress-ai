'use client';

import { useEffect, useState } from 'react';
import type { CompressionJob } from '@ultra/shared';
import { fetchJobs, formatBytes, downloadUrl } from '@/lib/api';
import { FolderOpen, Download, Search } from 'lucide-react';

export default function FilesPage() {
  const [jobs, setJobs] = useState<CompressionJob[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchJobs(100).then(setJobs).catch(console.error);
  }, []);

  const filtered = jobs.filter((j) =>
    j.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-3xl font-bold">File Manager</h1>
            <p className="text-gray-400">Browse compressed outputs and history</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field pl-10 w-full sm:w-64"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-400">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Original</th>
              <th className="p-4 font-medium">Compressed</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-4 font-medium truncate max-w-[200px]">{job.fileName}</td>
                <td className="p-4 capitalize text-gray-400">{job.category}</td>
                <td className="p-4">{formatBytes(job.originalSize)}</td>
                <td className="p-4">
                  {job.compressedSize ? formatBytes(job.compressedSize) : '—'}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      job.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : job.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {job.status === 'completed' && (
                      <a
                        href={downloadUrl(job.id)}
                        className="p-2 rounded-lg hover:bg-white/10 text-indigo-400"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-gray-500">No files found</p>
        )}
      </div>
    </div>
  );
}
