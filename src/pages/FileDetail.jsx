import React, { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "wasp/client/router";
import {
  useQuery,
  useAction,
  getFileById,
  getMyJobs,
  requestCompressionJob,
  deleteMediaFile,
  getPresets
} from "wasp/client/operations";

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes === 0) return "0 B";
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let u = -1;
  let value = bytes;
  do {
    value = value / thresh;
    ++u;
  } while (Math.abs(value) >= thresh && u < units.length - 1);
  return value.toFixed(2) + " " + units[u];
};

const FileDetailPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const {
    data: fileResp,
    isLoading: fileLoading,
    error: fileError,
    refetch: refetchFile
  } = useQuery(getFileById, { id: Number(fileId) });

  const {
    data: jobsResp,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery(getMyJobs, { inputFileId: Number(fileId), page: 1, pageSize: 50 });

  const {
    data: presets = [],
    isLoading: presetsLoading,
    refetch: refetchPresets
  } = useQuery(getPresets);

  const requestJob = useAction(requestCompressionJob);
  const deleteFile = useAction(deleteMediaFile);

  const [presetId, setPresetId] = useState("");
  const [crf, setCrf] = useState("");
  const [targetBitrateKbps, setTargetBitrateKbps] = useState("");
  const [targetSizeBytes, setTargetSizeBytes] = useState("");
  const [maxWidth, setMaxWidth] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [preserveAudio, setPreserveAudio] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const file = fileResp ? fileResp.file : null;
  const recentJobs = fileResp ? (fileResp.recentJobs || []) : [];
  const jobs = jobsResp ? (jobsResp.jobs || []) : [];
  const jobsCount = jobsResp ? jobsResp.totalCount || 0 : (recentJobs ? recentJobs.length : 0);

  const canDelete = useMemo(() => {
    return !jobsCount && (!recentJobs || recentJobs.length === 0);
  }, [jobsCount, recentJobs]);

  const handleRequestCompression = async () => {
    setFormError(null);
    setActionMessage(null);

    if (!file) {
      setFormError("File not loaded yet.");
      return;
    }

    const payload = { inputFileId: Number(fileId) };
    if (presetId) payload.presetId = Number(presetId);
    if (crf !== "") payload.crf = Number(crf);
    if (targetBitrateKbps !== "") payload.targetBitrateKbps = Number(targetBitrateKbps);
    if (targetSizeBytes !== "") payload.targetSizeBytes = Number(targetSizeBytes);
    if (maxWidth !== "") payload.maxWidth = Number(maxWidth);
    if (maxHeight !== "") payload.maxHeight = Number(maxHeight);
    payload.preserveAudio = Boolean(preserveAudio);

    if (!payload.presetId && payload.crf == null && payload.targetBitrateKbps == null && payload.targetSizeBytes == null) {
      setFormError("Select a preset or provide at least one compression option (CRF, bitrate or target size). ");
      return;
    }

    try {
      setIsSubmitting(true);
      await requestJob(payload);
      setActionMessage("Compression job requested.");
      refetchJobs();
      refetchFile();
      setCrf("");
      setTargetBitrateKbps("");
      setTargetSizeBytes("");
      setMaxWidth("");
      setMaxHeight("");
    } catch (err) {
      setFormError(err && err.message ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!file) return;
    if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    try {
      setIsDeleting(true);
      await deleteFile({ id: file.id });
      navigate("/");
    } catch (err) {
      setFormError(err && err.message ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (fileLoading) return "Loading file...";
  if (fileError) return "Error: " + (fileError.message || fileError);
  if (!file) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded shadow text-center">
        <h2 className="text-lg font-semibold text-slate-700">File not found</h2>
        <p className="text-sm text-slate-500 mt-2">The requested file could not be found.</p>
        <div className="mt-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">Back to files</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">File details</h1>
          <p className="text-sm text-slate-500">Inspect metadata and related compression jobs for this file.</p>
        </div>
        <div className="flex items-center gap-x-3">
          <Link to="/" className="text-sm text-slate-600 hover:underline">Back to files</Link>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className={
              "ml-2 px-4 py-2 rounded font-medium text-white " +
              (canDelete ? "bg-red-600 hover:bg-red-700" : "bg-gray-300 cursor-not-allowed")
            }
          >
            {isDeleting ? "Deleting..." : "Delete file"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{file.originalName}</h2>
              <p className="text-sm text-slate-500">{file.mimeType} ? {formatBytes(file.sizeBytes)}</p>
            </div>
            <div className="text-sm text-slate-500">Uploaded: {new Date(file.createdAt).toLocaleString()}</div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded">
              <div className="text-xs text-slate-500">Duration</div>
              <div className="mt-1 font-medium">{file.durationSec != null ? file.durationSec + "s" : "-"}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded">
              <div className="text-xs text-slate-500">Checksum</div>
              <div className="mt-1 font-medium">{file.checksum || "-"}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded">
              <div className="text-xs text-slate-500">Storage path</div>
              <div className="mt-1 font-medium break-all">{file.storagePath}</div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-800">Recent compression jobs</h3>
            <p className="text-sm text-slate-500">Showing recent and related jobs. You can also request a new compression below.</p>

            <div className="mt-4 space-y-3">
              { (recentJobs && recentJobs.length > 0) ? (
                recentJobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div>
                      <div className="font-medium">#{j.id} ? {j.status}</div>
                      <div className="text-sm text-slate-500">{j.message || "-"}</div>
                      <div className="text-xs text-slate-400">Created: {new Date(j.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm">
                      {j.outputFile ? (
                        <Link to={'/file/' + j.outputFile.id} className="text-green-600 hover:underline">Output #{j.outputFile.id}</Link>
                      ) : (
                        <span className="text-slate-400">No output</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-slate-500">No recent jobs for this file.</div>
              ) }
            </div>

            <div className="mt-6">
              <h4 className="text-md font-semibold text-slate-700">All jobs referencing this file</h4>
              {jobsLoading ? (
                <div className="mt-2">Loading jobs...</div>
              ) : jobsError ? (
                <div className="mt-2 text-red-600">Error loading jobs</div>
              ) : jobs.length === 0 ? (
                <div className="mt-2 text-slate-500">No jobs found.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {jobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between bg-white border p-3 rounded">
                      <div>
                        <div className="font-medium">#{j.id} ? {j.status}</div>
                        <div className="text-sm text-slate-500">{j.message || "-"}</div>
                        <div className="text-xs text-slate-400">Updated: {new Date(j.updatedAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-x-2">
                        {j.outputFile ? (
                          <Link to={'/file/' + j.outputFile.id} className="text-sm px-3 py-1 bg-green-50 text-green-700 rounded">Output</Link>
                        ) : (
                          <span className="text-sm px-3 py-1 bg-yellow-50 text-yellow-700 rounded">No output</span>
                        )}
                        <Link to={'/job/' + j.id} className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded">Details</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Request compression</h3>
          <p className="text-sm text-slate-500 mb-4">Choose a preset or provide custom options. A job will be queued for processing.</p>

          {formError && <div className="text-sm text-red-600 mb-3">{formError}</div>}
          {actionMessage && <div className="text-sm text-green-600 mb-3">{actionMessage}</div>}

          <div className="space-y-3">
            <label className="block text-sm text-slate-600">Preset</label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">-- Select preset (optional) --</option>
              {presetsLoading ? (
                <option>Loading presets...</option>
              ) : (
                (Array.isArray(presets) ? presets : []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.userId ? "(Yours)" : "(Default)"}</option>
                ))
              )}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-slate-600">CRF</label>
                <input type="number" value={crf} onChange={(e) => setCrf(e.target.value)} placeholder="e.g. 23" className="w-full border px-3 py-2 rounded" />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Target bitrate (kbps)</label>
                <input type="number" value={targetBitrateKbps} onChange={(e) => setTargetBitrateKbps(e.target.value)} placeholder="e.g. 1500" className="w-full border px-3 py-2 rounded" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600">Target size (bytes)</label>
              <input type="number" value={targetSizeBytes} onChange={(e) => setTargetSizeBytes(e.target.value)} placeholder="e.g. 5000000" className="w-full border px-3 py-2 rounded" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-slate-600">Max width</label>
                <input type="number" value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} placeholder="e.g. 1280" className="w-full border px-3 py-2 rounded" />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Max height</label>
                <input type="number" value={maxHeight} onChange={(e) => setMaxHeight(e.target.value)} placeholder="e.g. 720" className="w-full border px-3 py-2 rounded" />
              </div>
            </div>

            <div className="flex items-center gap-x-2">
              <input id="preserveAudio" type="checkbox" checked={preserveAudio} onChange={(e) => setPreserveAudio(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="preserveAudio" className="text-sm text-slate-600">Preserve audio</label>
            </div>

            <div className="flex items-center gap-x-2 mt-3">
              <button
                onClick={handleRequestCompression}
                disabled={isSubmitting}
                className={"px-4 py-2 rounded text-white font-medium " + (isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700")}
              >
                {isSubmitting ? "Requesting..." : "Request compression"}
              </button>

              <button
                onClick={() => {
                  setPresetId(""); setCrf(""); setTargetBitrateKbps(""); setTargetSizeBytes(""); setMaxWidth(""); setMaxHeight(""); setPreserveAudio(true); setFormError(null); setActionMessage(null);
                }}
                className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Note: If you select a preset, its values will be applied. Custom fields override preset values when provided.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FileDetailPage;
