# Architecture — Verity

## System Overview

Verity is a strictly separated monorepo with a **Next.js 15** frontend and a **FastAPI (Python 3.12)** backend. The frontend contains zero detection logic and communicates exclusively via a typed API client (`frontend/src/lib/api.ts`).

```
Browser (Next.js 15, Port 3000)
  ├── / (Home: Image | Video upload, Analyzing, Result)
  ├── /how-it-works (6-signal explanation + limitations)
  └── /privacy (Plain-language privacy policy)
          │
          │ HTTP/JSON (typed API client)
          ▼
Backend (FastAPI, Port 8000)
  ├── /api/v1/health
  ├── /api/v1/upload          → magic-byte validation → UUID storage → async job
  ├── /api/v1/jobs/{id}/status
  ├── /api/v1/jobs/{id}/result
  ├── /api/v1/jobs/{id}/report/{pdf,json}
  └── DELETE /api/v1/jobs/{id}
          │
          ├── Image Pipeline (asyncio.gather across 5 detectors)
          │     ├── C2PADetector (0.30)
          │     ├── MetadataDetector (0.15)
          │     ├── ELADetector (0.10)
          │     ├── SpectralDetector (0.10)
          │     └── MLClassifierDetector (0.35)
          │
          └── Video Pipeline (ffprobe → adaptive keyframes → frame pipeline + temporal)
```

## Key Design Boundaries
- **Storage:** UUID v4 filenames in `STORAGE_DIR` (`/tmp/verity`), auto-deleted after `RETENTION_MINUTES` (default 60) by `app/workers/cleanup.py`.
- **Rate Limiting:** `slowapi` per IP (`10/minute` upload, `60/minute` status).
- **Security Headers:** Applied via FastAPI middleware and `next.config.ts`.
