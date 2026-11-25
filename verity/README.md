# Verity — AI Content Authenticity Analyzer

> **Honest, explainable, multi-signal analysis of images and videos.**

Verity analyzes uploaded images and videos using a fused pipeline of provenance verification, metadata forensics, pixel-frequency analysis, and open-source ML classification. Every result is caveated with its limitations. No result ever claims certainty.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js 15)                 │
│  Home → Upload → Analyzing → Result (heatmap + score)  │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS / typed API client
┌──────────────────────▼──────────────────────────────────┐
│              Backend (FastAPI, Python 3.12)             │
│                                                         │
│  POST /api/v1/upload  →  job_id                        │
│  GET  /api/v1/jobs/{id}/status  (polling / SSE)        │
│  GET  /api/v1/jobs/{id}/result                         │
│  GET  /api/v1/jobs/{id}/report  (PDF / JSON)           │
│                                                         │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │
│  │C2PA/    │ │Metadata  │ │Pixel/FFT/ │ │ML        │  │
│  │Provenance│ │Forensics │ │ELA/Noise  │ │Classifier│  │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘  │
│       └───────────┴─────────────┴─────────────┘        │
│                         │ Fusion                        │
│              Score 0-100 + Verdict + Confidence        │
└─────────────────────────────────────────────────────────┘
```

## Screenshots

> Generated during Phase 6 verification — see `docs/reference-analysis/`.

## Setup (one command)

```bash
git clone https://github.com/2300100055/My-project-.git
cd My-project-/verity
cp .env.example .env
docker compose up --build
```

App: http://localhost:3000  
API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Development

```bash
make dev        # start backend + frontend in dev mode
make test       # run all tests
make lint       # lint + type-check
make audit      # pip-audit + npm audit
make e2e        # Playwright E2E
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript strict, Tailwind CSS v3, React Query v5 |
| Backend | Python 3.12, FastAPI, Pydantic v2, uv |
| Queue | In-process asyncio (upgradeable to Celery + Redis) |
| Storage | Local filesystem with UUID names; S3-compatible interface |
| ML | Graft Labs `graft-ai-detector` (MIT) or HuggingFace `umm-maybe/AI-image-detector` |
| Provenance | `python-c2pa` (C2PA open standard) |
| Container | Docker + docker compose |
| CI | GitHub Actions |

## Detectors (fused)

| Signal | Technique | Library |
|--------|-----------|---------|
| Provenance | C2PA / Content Credentials | `python-c2pa` |
| Metadata | EXIF/XMP/IPTC, AI signatures | `Pillow`, `exifread` |
| Pixel forensics | Error Level Analysis (ELA) | `Pillow` |
| Frequency | FFT spectral artifacts, DCT | `numpy`, `scipy` |
| Noise residual | High-pass residual analysis | `numpy`, `opencv-python` |
| JPEG forensics | Double-JPEG / JPEG-ghost | `numpy`, `scipy` |
| ML classifier | AI-image binary classifier | `transformers` (HuggingFace) |
| Video | ffprobe + keyframe sampling | `ffmpeg-python` |

## Limitations

- **No proprietary watermark detection** (SynthID, C2PA from Adobe, etc. require the original embedder's key).
- ML classifiers have false positive and false negative rates documented in `/docs/EVALUATION.md`.
- Heavily compressed, resized, or cropped media degrades detection accuracy.
- "Not detected" **never means authentic** — it means the signals Verity checks did not trigger.
- Results are for informational purposes only.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Security & Threat Model](docs/SECURITY.md)
- [Privacy Policy](docs/PRIVACY.md)
- [Decisions](docs/DECISIONS.md)
- [Evaluation](docs/EVALUATION.md)
- [Reverse Engineering Notes](docs/REVERSE_ENGINEERING.md)

## License

MIT — see LICENSE.
