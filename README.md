# UltraCompress AI

Cross-platform **desktop + web** application for compressing very large videos (10GB+), images, and archives with full control over quality, resolution, bitrate, and output size. All processing runs **locally by default** — no files uploaded to external servers.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Next.js 15, TailwindCSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Desktop | Electron 33 |
| Video | FFmpeg (streaming, hardware encoders) |
| Images | Sharp |
| Archives | Archiver / Zlib |
| Database | SQLite (compression history) |
| Shared | `@ultra/shared` workspace package |

## Project Structure

```
ultra-compress-ai/
├── apps/
│   ├── backend/          # Express API, FFmpeg, Sharp, job queue
│   ├── web/              # Next.js UI (landing, dashboard, pricing, etc.)
│   └── desktop/          # Electron wrapper
├── packages/
│   └── shared/           # TypeScript types & tier limits
├── data/                 # Created at runtime (uploads, outputs, SQLite)
├── package.json          # npm workspaces root
└── README.md
```

## Prerequisites

1. **Node.js 20+** — [https://nodejs.org](https://nodejs.org)
2. **FFmpeg** — required for video compression
   - **Windows:** `winget install Gyan.FFmpeg` or download from [ffmpeg.org](https://ffmpeg.org)
   - **macOS:** `brew install ffmpeg`
   - **Linux:** `sudo apt install ffmpeg`
3. **Cursor IDE** (optional) — open this folder as workspace

Verify FFmpeg:

```bash
ffmpeg -version
ffprobe -version
```

## Installation (Cursor IDE / Terminal)

```bash
# 1. Open project folder
cd "c:\Users\HP\Downloads\compress ai"

# 2. Copy environment template
copy .env.example .env

# 3. Install all workspace dependencies
npm install

# 4. Build shared types package
npm run build -w @ultra/shared
```

## Development

### Web + API (recommended)

```bash
# Terminal 1 — API on http://127.0.0.1:4000
npm run dev -w @ultra/backend

# Terminal 2 — Web on http://localhost:3000
npm run dev -w @ultra/web
```

Or both at once:

```bash
npm run dev
```

### Desktop (Electron)

```bash
# Start web + API first, then:
npm run dev -w @ultra/desktop
```

Full desktop dev (all three):

```bash
npm run dev:desktop
```

## Production Build

```bash
npm run build
npm run start -w @ultra/backend   # API
npm run start -w @ultra/web       # Next.js
```

Desktop installer:

```bash
npm run build:desktop
npm run pack -w @ultra/desktop
```

## Main Features

- **Drag-and-drop** upload with chunked streaming for 10GB+ files
- **Video:** MP4, MOV, MKV, AVI, WEBM — H.264/H.265, bitrate, resolution, FPS
- **Images:** JPG, PNG, WEBP, HEIC via Sharp
- **Archives:** ZIP, TAR (gzip)
- **Modes:** Low Size, Balanced, High Quality, Custom
- **AI presets (local):** Best quality under size limit, bitrate trimming, smart recommendations
- **Controls:** Pause / Resume / Cancel, progress rings, ETA, estimated output size
- **GPU:** NVENC, QSV, AMF, VideoToolbox auto-detection (Premium tier in UI)
- **Pages:** Landing, Dashboard, Batch, File Manager, Analytics, Pricing, Settings
- **Security:** Local processing, file validation, temp cleanup

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/hardware` | GPU encoder detection |
| POST | `/api/upload` | Single file upload |
| POST | `/api/upload/chunk` | Chunked large file upload |
| POST | `/api/batch` | Batch compression |
| GET | `/api/jobs` | Job history |
| POST | `/api/jobs/:id/pause` | Pause job |
| POST | `/api/recommendations` | AI preset suggestions |
| GET | `/api/analytics` | Dashboard stats |

## Environment Variables

See `.env.example`. Key options:

- `PORT` — API port (default 4000)
- `MAX_FILE_SIZE` — max upload bytes (default 10GB)
- `FFMPEG_PATH` / `FFPROBE_PATH` — custom FFmpeg location
- `ULTRA_DATA_DIR` — storage root for uploads/outputs/DB

## Monetization (UI)

| Tier | Limits |
|------|--------|
| **Free** | 500MB/file, 10 jobs/day, 3 batch files, CPU only |
| **Premium** | 50GB/file, unlimited jobs, GPU, AI presets |
| **Cloud** | Optional remote workers (subscription) — local remains default |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ffmpeg not found` | Install FFmpeg and add to PATH, or set `FFMPEG_PATH` |
| `better-sqlite3` build error | Run `npm install` with build tools (VS Build Tools on Windows) |
| Upload fails on large file | Use chunked upload (automatic >100MB) |
| GPU not used | Enable in settings; requires Premium + compatible GPU |

## Architecture Notes

- **Streaming:** FFmpeg reads/writes on disk; chunk merge uses `pipeline()` streams
- **Memory:** No full-file RAM load; 64MB chunk size default
- **Workers:** `compressionWorker.ts` for optional hash/size offload
- **Cleanup:** Scheduled temp purge every 6 hours + manual in Settings

## License

MIT — use and modify freely for your projects.
