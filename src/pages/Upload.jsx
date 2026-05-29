import React, { useState, useRef } from 'react';
import { useAction, createMediaFile } from 'wasp/client/operations';
import { useNavigate } from 'react-router-dom';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getVideoDurationSec = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('video')) return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    const cleanUp = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };
    video.addEventListener('loadedmetadata', () => {
      const dur = isFinite(video.duration) && !isNaN(video.duration) ? Math.floor(video.duration) : null;
      cleanUp();
      resolve(dur);
    });
    video.addEventListener('error', () => {
      cleanUp();
      resolve(null);
    });
  });
};

const uploadFileToPath = (storagePath, file, onProgress) => {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      const runId = `upload-${Date.now()}`;

      // IMPORTANT: use Wasp proxied API route
      const uploadUrl = `/upload?path=${encodeURIComponent(storagePath)}`;
      // #region agent log
      fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H1',location:'src/pages/Upload.jsx:44',message:'Preparing XHR upload request',data:{uploadUrl,storagePath,fileName:file?.name,fileSize:file?.size,fileType:file?.type},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      xhr.open('POST', uploadUrl, true);
      

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === 'function') {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
      
      xhr.onload = () => {
        // #region agent log
        fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H2',location:'src/pages/Upload.jsx:57',message:'XHR completed',data:{status:xhr.status,responseText:xhr.responseText?.slice(0,200)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ status: xhr.status });
        } else {
          reject(
            new Error(
              'Upload failed with status ' +
                xhr.status +
                (xhr.responseText ? ': ' + xhr.responseText : '')
            )
          );
        }
      };

      xhr.onerror = () => {
        // #region agent log
        fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H3',location:'src/pages/Upload.jsx:73',message:'XHR network error fired',data:{readyState:xhr.readyState,status:xhr.status},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        reject(new Error('Network error during file upload'));
      };
      // #region agent log
      fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H4',location:'src/pages/Upload.jsx:78',message:'Sending XHR body',data:{readyStateBeforeSend:xhr.readyState},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
};
      
    
const UploadPage = () => {
  const navigate = useNavigate();
  const createMediaFileAction = useAction(createMediaFile);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const onFileChange = (e) => {
    setError(null);
    const f = e.target.files && e.target.files[0];
    setSelectedFile(f || null);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = null;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const durationSec = await getVideoDurationSec(selectedFile);

      const created = await createMediaFileAction({
        originalName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
        checksum: null,
        durationSec: durationSec
      });

      if (!created || !created.storagePath || !created.id) {
        throw new Error('Server did not return required upload information.');
      }

      await uploadFileToPath(created.storagePath, selectedFile, (p) => setProgress(p));
      navigate(`/file/${created.id}`);
    } catch (err) {
      console.error(err);
      setError(err && err.message ? String(err.message) : 'Upload failed');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">Upload a File</h1>
        <p className="text-sm text-gray-500 mb-4">
          Select a local file (video or other) and upload it. After metadata is saved, the file will be transferred to storage.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Choose file</label>
            <input
              ref={inputRef}
              type="file"
              onChange={onFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 hover:file:bg-slate-200"
            />
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-600">
                <div><strong>Name:</strong> {selectedFile.name}</div>
                <div><strong>Type:</strong> {selectedFile.type || 'N/A'}</div>
                <div><strong>Size:</strong> {formatBytes(selectedFile.size)}</div>
              </div>
            )}
          </div>

          {isUploading && (
            <div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-3 bg-green-500 transition-all" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="text-sm text-gray-600 mt-2">Uploading... {progress}%</div>
            </div>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex items-center gap-x-3">
            <button
              type="submit"
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-60"
            >
              {isUploading ? 'Uploading...' : 'Start Upload'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isUploading}
              className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded hover:bg-slate-50"
            >
              Reset
            </button>
            <div className="ml-auto text-sm text-gray-500">Tip: For videos, duration is extracted automatically.</div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;