import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export const handleUpload = async (req, res, context) => {
  const runId = `api-upload-${Date.now()}`;
  // #region agent log
  fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H5',location:'src/api.js:8',message:'handleUpload entered',data:{method:req.method,originalUrl:req.originalUrl,path:req.path,hasUser:!!context.user},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    if (!context.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const requestedPath =
      typeof req.query.path === 'string' && req.query.path.trim()
        ? req.query.path
        : `uploads/video_${Date.now()}.mp4`;

    const savePath = path.resolve(process.cwd(), requestedPath);
    fs.mkdirSync(path.dirname(savePath), { recursive: true });

    await pipeline(req, fs.createWriteStream(savePath));

    // #region agent log
    fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H5',location:'src/api.js:26',message:'handleUpload succeeded',data:{requestedPath,savePath},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return res.status(200).json({ success: true, path: requestedPath });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7657/ingest/943300d7-68e6-42ea-a3f4-cd9fe6d2b1ad',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4eb233'},body:JSON.stringify({sessionId:'4eb233',runId,hypothesisId:'H5',location:'src/api.js:31',message:'handleUpload failed',data:{errorMessage:err?.message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
};