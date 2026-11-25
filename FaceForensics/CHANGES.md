# Project Restructuring & Change Documentation (`CHANGES.md`)

**Project:** Deepfake Vision AI v6.0 (`FaceForensics`)  
**Date:** 2026-11-25  
**Base Reference:** `PROJECT_REPORT.md` (Revisions 1.0–3.0) + Static Reverse-Engineering Audit  

---

## 1. Summary of Objectives

1. **Restore & Preserve Working Application:** Retained 100% of the working Deepfake Vision AI v6.0 application logic (3-stage SynthID + Pixel Forensics + 2D FFT pipeline, reversed scoring `[5..99]`, all 4 image presets, all 3 video presets, and all `/api/v2/*` routes) as well as all upstream FaceForensics++ research assets (`classification/`, `dataset/`, `images/`, `dataset.csv`).
2. **Restructure into Separated Frontend & Backend:** Replaced the flattened single-folder root layout (Rev 3.0) and removed the empty `docs/` directory, organizing the web platform into dedicated `backend/`, `frontend/`, and `models/` directories.
3. **Restore Missing Assets from `.md` Registry:** Created `models/README.md` (listed in `PROJECT_REPORT.md` Section 3.1) documenting the 4 optional ONNX model slots.
4. **Targeted Static Security Fixes (Non-Breaking):** Hardened static file resolution against sensitive file exposure (`.git/`, `backend/`, `package.json`) and sibling-prefix path traversal, and escaped HTML-interpolated server strings in `frontend/index.html`.

---

## 2. Directory Structure Transformation

### Before (Flattened Root Layout)
```text
FaceForensics/
├── docs/                  (empty folder)
├── server.js
├── inference.js
├── video-processor.js
├── index.html
├── app-utils.js
├── face-detector.js
├── gradcam.js
├── pixel-analyzer.js
├── package.json
├── dataset.csv
├── PROJECT_REPORT.md
├── images/
├── classification/
└── dataset/
```

### After (Professional Separated Frontend & Backend Structure)
```text
FaceForensics/
├── backend/
│   ├── server.js               # Native Node.js HTTP server & /api/v2/* routes
│   ├── inference.js            # Optional onnxruntime-node wrapper (4 ONNX model slots)
│   └── video-processor.js      # FFmpeg frame & audio extraction wrapper
├── frontend/
│   ├── index.html              # Single-page UI (Image Detection + Video Detection)
│   ├── js/
│   │   ├── app-utils.js        # Browser helpers & .txt forensic report generators
│   │   ├── face-detector.js    # MediaPipe Face Landmarker wrapper
│   │   └── gradcam.js          # Heuristic saliency heatmap Canvas renderer
│   └── worker/
│       └── pixel-analyzer.js   # Web Worker: Stage 1 SynthID + Stage 2 (6 metrics + 2D FFT) + Stage 3 scoring
├── models/
│   └── README.md               # Optional ONNX models setup & export guide
├── images/                     # Visual assets (17 PNG/GIF files, preserved)
├── classification/             # FaceForensics++ PyTorch XceptionNet/ResNet classifier (preserved)
├── dataset/                    # FaceForensics++ dataset scripts & generators (preserved)
├── dataset.csv                 # Demo catalog (8 entries, served at /api/v2/dataset)
├── package.json                # Entry point updated to backend/server.js
├── CHANGES.md                  # This changelog & architecture documentation
├── PROJECT_REPORT.md           # Updated single source of truth (Rev 3.1)
├── README.md                   # Upstream FaceForensics++ README (preserved)
└── LICENSE                     # MIT License (preserved)
```

---

## 3. Detailed File-by-File Changes

| # | File | Action | Details of Change |
|---|------|--------|-------------------|
| 1 | `backend/server.js` | Moved & Updated | Moved from root `server.js`. Set `ROOT_DIR = path.resolve(__dirname, '..')`, `FRONTEND_DIR = path.join(ROOT_DIR, 'frontend')`, `IMAGES_DIR = path.join(ROOT_DIR, 'images')`, and `MODELS_DIR = path.join(ROOT_DIR, 'models')`. Removed stale `require('./server/inference')` fallback in favor of `require('./inference')`. Updated `folderMode` to `'separated-frontend-backend'`. Replaced permissive root `resolveFile()` and `startsWith(ROOT_DIR)` check with `isInsideDir()` (`path.sep`-bounded) allowlisting only `frontend/`, `images/`, and `dataset.csv`. |
| 2 | `backend/inference.js` | Moved | Moved from root `inference.js` with no behavioral changes; initialized automatically by `backend/server.js` with `MODELS_DIR`. |
| 3 | `backend/video-processor.js` | Moved | Moved from root `video-processor.js` alongside backend modules. |
| 4 | `frontend/index.html` | Moved & Updated | Moved from root `index.html`. Updated script imports to `js/app-utils.js`, `js/face-detector.js`, `js/gradcam.js`, and Web Worker path to `new Worker('worker/pixel-analyzer.js')`. Added `escapeHtml()` helper and applied it to `serverSynth.evidence` and `serverPath` rendered via `innerHTML` to prevent DOM XSS. |
| 5 | `frontend/js/app-utils.js` | Moved | Moved from root `app-utils.js` into `frontend/js/`. |
| 6 | `frontend/js/face-detector.js` | Moved | Moved from root `face-detector.js` into `frontend/js/`. |
| 7 | `frontend/js/gradcam.js` | Moved | Moved from root `gradcam.js` into `frontend/js/`. |
| 8 | `frontend/worker/pixel-analyzer.js` | Moved | Moved from root `pixel-analyzer.js` into `frontend/worker/`. |
| 9 | `models/README.md` | Created | Restored missing documentation asset listed in `PROJECT_REPORT.md` Section 3.1 covering the 4 ONNX model slots (`efficientnet_b4_dfdc.onnx`, `xception_ff.onnx`, `f3net_fft.onnx`, `clip_vit_linear_probe.onnx`). |
| 10 | `package.json` | Updated | Updated `"main"`, `"scripts.start"`, and `"scripts.dev"` from `server.js` to `backend/server.js`. |
| 11 | `PROJECT_REPORT.md` | Updated | Updated architecture diagram, file registry, entry point instructions, and Section 12 Change Log (Rev 3.1). |
| 12 | Root duplicates & `docs/` | Removed | Deleted flattened root copies (`server.js`, `inference.js`, `video-processor.js`, `index.html`, `app-utils.js`, `face-detector.js`, `gradcam.js`, `pixel-analyzer.js`) and empty `docs/` folder. |
| 13 | `classification/`, `dataset/`, `images/`, `dataset.csv`, `README.md`, `LICENSE` | Preserved | Untouched upstream FaceForensics++ assets and demo CSV. |

---

## 4. How to Run

```powershell
cd c:\ncc\FaceForensics
npm start
# or: node backend/server.js
```

Open **http://localhost:3000** in your browser.

### API Endpoints
- `GET /` → Serves `frontend/index.html`
- `GET /js/*` & `GET /worker/*` → Serves frontend JS and Web Worker assets
- `GET /images/*` & `GET /dataset.csv` → Serves image assets and sample catalog
- `POST /api/v2/detect` → Image 3-stage detection verdict
- `POST /api/v2/detect-video` → Video detection endpoint
- `GET /api/v2/pipeline-status` → Pipeline, ONNX, SynthID, and FFmpeg status
- `GET /api/v2/stats` → Runtime memory, uptime, and engine status
- `GET /api/v2/dataset` → Parsed JSON array from `dataset.csv`
