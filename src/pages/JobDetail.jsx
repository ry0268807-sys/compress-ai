import React, { useState } from 'react';
import { Link, useParams } from 'wasp/client/router';
import { useQuery, useAction, getJobById, cancelCompressionJob } from 'wasp/client/operations';

const bytesToSize = (bytes) => {
  if (bytes == null) return '?';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (iso) => {
  try {
    if (!iso) return '?';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
};

const StatusBadge = ({ status }) => {
  const s = (status || 'UNKNOWN').toUpperCase();
  let color = 'bg-gray-100 text-gray-800';
  if (s === 'PENDING') color = 'bg-yellow-100 text-yellow-800';
  if (s === 'PROCESSING') color = 'bg-blue-100 text-blue-800';
  if (s === 'DONE' || s === 'COMPLETED' || s === 'SUCCESS') color = 'bg-green-100 text-green-800';
  if (s === 'FAILED' || s === 'CANCELED' || s === 'ERROR') color = 'bg-red-100 text-red-800';

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {s}
    </span>
  );
};

const InfoRow = ({ label, children }) => (
  <div className="flex justify-between items-start border-b border-slate-100 py-2">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="text-sm text-slate-800 break-words">{children}</div>
  </div>
);

const JobDetailPage = () => {
  const { jobId } = useParams();
  const parsedId = Number(jobId);
  const { data: job, isLoading, error, refetch } = useQuery(getJobById, { id: parsedId });
  const cancelJob = useAction(cancelCompressionJob);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  if (isLoading) return <div className="p-6">Loading job...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {String(error)}</div>;
  if (!job) return <div className="p-6">No job found.</div>;

  const canCancel = ['PENDING', 'PROCESSING'].includes((job.status || '').toUpperCase());

  const handleCancel = async () => {
    if (!canCancel) return;
    if (!confirm('Are you sure you want to cancel this job?')) return;
    setIsCancelling(true);
    try {
      await cancelJob({ jobId: job.id, message: cancelMessage || undefined });
      await refetch();
      setCancelMessage('');
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      alert('Failed to cancel job: ' + msg);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Compression Job #{job.id}</h1>
            <div className="text-sm text-slate-500 mt-1">Requested: {formatDate(job.createdAt)}</div>
          </div>
          <div className="flex items-center gap-x-3">
            <StatusBadge status={job.status} />
            <Link to="/" className="text-sm text-slate-500 hover:underline">Back</Link>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-3">Files</h2>

            <div className="mb-4 p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-500">Input file</div>
              {job.inputFile ? (
                <div className="mt-2">
                  <Link to={`/file/${job.inputFile.id}`} className="text-slate-900 font-semibold hover:underline">
                    {job.inputFile.originalName}
                  </Link>
                  <div className="text-sm text-slate-500 mt-1">
                    {job.inputFile.mimeType} ? {bytesToSize(job.inputFile.sizeBytes)}{job.inputFile.durationSec != null ? ` ? ${job.inputFile.durationSec}s` : ''}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 mt-2">No input file info available</div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-500">Output file</div>
              {job.outputFile ? (
                <div className="mt-2">
                  <Link to={`/file/${job.outputFile.id}`} className="text-slate-900 font-semibold hover:underline">
                    {job.outputFile.originalName}
                  </Link>
                  <div className="text-sm text-slate-500 mt-1">
                    {job.outputFile.mimeType} ? {bytesToSize(job.outputFile.sizeBytes)}{job.outputFile.durationSec != null ? ` ? ${job.outputFile.durationSec}s` : ''}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 mt-2">No output yet</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-slate-800 mb-3">Job details</h2>
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
              <InfoRow label="Status">{job.status}</InfoRow>
              <InfoRow label="Message">{job.message ?? '?'}</InfoRow>
              <InfoRow label="Preset">{job.preset ? job.preset.name : '?'}</InfoRow>
              <InfoRow label="CRF">{job.crf ?? '?'}</InfoRow>
              <InfoRow label="Target bitrate (kbps)">{job.targetBitrateKbps ?? '?'}</InfoRow>
              <InfoRow label="Target size">{job.targetSizeBytes ? bytesToSize(job.targetSizeBytes) : '?'}</InfoRow>
              <InfoRow label="Max width/height">{(job.maxWidth || job.maxHeight) ? `${job.maxWidth ?? 'auto'} x ${job.maxHeight ?? 'auto'}` : '?'}</InfoRow>
              <InfoRow label="Preserve audio">{job.preserveAudio ? 'Yes' : 'No'}</InfoRow>
              <InfoRow label="Created">{formatDate(job.createdAt)}</InfoRow>
              <InfoRow label="Updated">{formatDate(job.updatedAt)}</InfoRow>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Actions</h3>

              <div className="flex flex-col gap-y-3">
                <div className="flex gap-x-3 items-center">
                  <input
                    type="text"
                    placeholder="Optional cancel message"
                    value={cancelMessage}
                    onChange={(e) => setCancelMessage(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded bg-white text-sm"
                  />
                  <button
                    onClick={handleCancel}
                    disabled={!canCancel || isCancelling}
                    className={`px-4 py-2 rounded font-semibold text-white ${canCancel ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    {isCancelling ? 'Canceling...' : 'Cancel Job'}
                  </button>
                </div>

                <div>
                  <Link
                    to={`/`}
                    className="inline-block text-sm text-slate-600 hover:underline"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <h4 className="text-sm text-slate-600">Raw metadata</h4>
          <pre className="mt-2 text-xs text-slate-700 bg-white p-3 rounded overflow-auto">{JSON.stringify(job, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;
