# Example Compression Pipelines

## Video (FFmpeg streaming)

**Balanced H.264 (CPU):**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart output.mp4
```

**Low size H.265 + GPU (NVENC):**
```bash
ffmpeg -i input.mp4 -c:v hevc_nvenc -cq 28 -c:a aac -b:a 96k output.mp4
```

**Target ~1GB from 10GB source (2-pass style budget):**
```bash
# API computes bitrate from: (target_bytes * 8 / duration) - audio_budget
ffmpeg -i input.mp4 -c:v libx265 -crf 24 -maxrate 4000k -bufsize 8000k -vf scale=-2:1080 -c:a aac -b:a 128k output.mp4
```

## Image (Sharp)

```typescript
await sharp('input.png').resize({ height: 1080, fit: 'inside' }).webp({ quality: 85 }).toFile('output.webp');
```

## Archive (Archiver)

```typescript
archive.file('large.bin', { name: 'large.bin' });
archive.pipe(fs.createWriteStream('out.zip'));
```

## Chunk upload flow

1. Client splits file into 64MB chunks
2. `POST /api/upload/chunk` per chunk → `data/temp/{uploadId}/chunk_N`
3. Last chunk triggers `mergeChunks()` → `data/uploads/{id}_filename`
4. `createCompressionJob()` starts FFmpeg/Sharp pipeline
