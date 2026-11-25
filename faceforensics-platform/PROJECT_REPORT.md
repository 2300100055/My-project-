# 📋 DEEPFAKE VISION AI v6.0 — COMPREHENSIVE PROJECT REPORT

> **This document is the single source of truth for the entire project.**
> Any AI assistant, developer, or reviewer should read this file FIRST before making any changes.
> **This document MUST be updated after every prompt and every code change.**

---

## 🔖 Document Metadata

| Field | Value |
|-------|-------|
| **Project Name** | Deepfake Vision AI v6.0 — Multi-Stage Detection Platform |
| **Version** | 6.0.0 |
| **Author** | Subbu (KL University) |
| **Type** | Academic Frontend Project |
| **Last Updated** | 2026-11-25T09:43:00+05:30 |
| **Report Revision** | 2.1 |
| **Location** | `c:\Users\Subbu\OneDrive - K L University\Documents\Frontend project\faceforensics-platform\` |

---

## 📌 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [File Structure & Registry](#3-file-structure--registry)
4. [Detailed File Descriptions](#4-detailed-file-descriptions)
5. [Detection Pipeline — How It Works](#5-detection-pipeline--how-it-works)
6. [Scoring System — Reversed Logic](#6-scoring-system--reversed-logic)
7. [API Reference](#7-api-reference)
8. [Frontend UI Architecture](#8-frontend-ui-architecture)
9. [Detection Modes](#9-detection-modes)
10. [Dependencies & External Resources](#10-dependencies--external-resources)
11. [Known Issues & Pending Upgrades](#11-known-issues--pending-upgrades)
12. [Change Log](#12-change-log)
13. [Test Results](#13-test-results)
14. [Constraints & Rules](#14-constraints--rules)
15. [How to Run](#15-how-to-run)
16. [Update Protocol](#16-update-protocol)

---

## 1. PROJECT OVERVIEW

### 1.1 What This Project Does

Deepfake Vision AI v6.0 is a web-based platform that detects whether an image or video has been manipulated using AI techniques (deepfakes, face swaps, GAN synthesis, diffusion models). It analyzes actual **pixel data** — not just file metadata — using a multi-stage forensic pipeline.

### 1.2 Core Capabilities

| Capability | Description |
|-----------|-------------|
| **Image Detection** | Upload any image → pixel-level forensic analysis → verdict (AUTHENTIC / SUSPICIOUS / MANIPULATED) |
| **Video Detection** | Upload video → frame-by-frame temporal analysis → timeline of flagged frames → verdict |
| **6 Forensic Metrics** | Noise Uniformity, Color Histogram Spread, Block Luminance Variance, Laplacian Energy, Facial Symmetry Index, 2D FFT Peak Score |
| **Heuristic Saliency Map** | Per-block anomaly visualization showing where manipulation artifacts are strongest |
| **Report Generation** | Downloadable `.txt` forensic reports for both image and video analysis |
| **Demo Presets** | 4 image presets (all FAKE) + 3 video presets (2 FAKE, 1 REAL) for demonstration |
| **3 Detection Modes** | Auto AI, Simulate Fake, Simulate Real |
| **Optional ONNX Models** | EfficientNet-B4, XceptionNet, F3-Net FFT, CLIP ViT — optional Live AI mode if models are placed in `/models/` |

### 1.3 Key Design Principles

- **Zero required npm dependencies** — the server runs on Node.js built-in modules only
- **Pixel-based detection** — analyzes actual image pixels, NOT file size or metadata
- **Reversed scoring** — High score = AUTHENTIC, Low score = MANIPULATED
- **Graceful degradation** — works in Pixel Forensics mode without ONNX; upgrades to Live AI mode if models are present
- **Honest labeling** — no false claims of using techniques not actually implemented

---

## 2. ARCHITECTURE & TECH STACK

### 2.1 Technology Stack

| Layer | Technology | Version / Details |
|-------|-----------|-------------------|
| **Server** | Node.js native `http` module | No Express, no frameworks |
| **AI Inference** | `onnxruntime-node` | v1.17.0+ — **optional only** |
| **Frontend Framework** | Tailwind CSS (CDN) | Via `cdn.tailwindcss.com` |
| **Icons** | Font Awesome 6.4 | CDN |
| **Fonts** | Inter + JetBrains Mono | Google Fonts CDN |
| **Face Detection** | MediaPipe Face Landmarker | CDN — 478 3D landmarks |
| **Pixel Analysis** | Web Worker | Dedicated thread, non-blocking |
| **FFT Engine** | Custom Cooley-Tukey Radix-2 | 128×128 DFT in Web Worker |
| **Heatmap** | Custom Canvas renderer | Jet colormap, Gaussian blur overlay |

### 2.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client Side)                        │
│                                                                      │
│  ┌──────────────┐  ┌───────────────────┐  ┌───────────────────────┐ │
│  │ index.html   │  │ face-detector.js  │  │ gradcam.js            │ │
│  │ (606 lines)  │  │ (MediaPipe CDN)   │  │ (Heuristic Saliency)  │ │
│  │ Tailwind CSS │  │ 478 Landmarks     │  │ Jet Colormap Canvas   │ │
│  │ Tab UI       │  │ Face Crop         │  │ Per-block anomaly map │ │
│  └──────┬───────┘  └───────────────────┘  └───────────────────────┘ │
│         │                                                            │
│  ┌──────┴──────────────────┐    ┌──────────────────────────────────┐ │
│  │ app-utils.js (96 lines) │    │ pixel-analyzer.js (Web Worker)   │ │
│  │ sleep(), clamp(),       │    │ 282 lines — DEDICATED THREAD     │ │
│  │ mapRange(), reports     │    │ 6 metrics + FFT + anomaly score  │ │
│  └─────────────────────────┘    └──────────────────────────────────┘ │
│                                                                      │
│         │ fetch('/api/v2/detect')    │ postMessage(imageData)        │
└─────────┼───────────────────────────┼────────────────────────────────┘
          │                           │
          ▼                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js — Port 3000)                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ server/index.js (274 lines)                                     │ │
│  │  • Native HTTP server                                            │ │
│  │  • POST /api/v2/detect — image detection                        │ │
│  │  • POST /api/v2/detect-video — video detection                  │ │
│  │  • GET /api/v2/pipeline-status — ONNX/pixel mode                │ │
│  │  • GET /api/v2/stats — runtime info                             │ │
│  │  • GET /api/v2/dataset — CSV catalog                            │ │
│  │  • Static file serving (public/, worker/, models/)              │ │
│  │  • CORS headers + no-cache for HTML/JS/CSS                      │ │
│  │  • Path traversal protection                                    │ │
│  └──────┬───────────────────────────────────────────────────────────┘ │
│         │                                                            │
│  ┌──────┴──────────────┐    ┌────────────────────────────────────┐  │
│  │ inference.js        │    │ video-processor.js                 │  │
│  │ (90 lines)          │    │ (81 lines)                         │  │
│  │ ONNX model loader   │    │ ffmpeg frame extraction            │  │
│  │ try/catch wrapper    │    │ ffmpegAvailable() check            │  │
│  │ Per-model status     │    │ PNG-chunk splitter                 │  │
│  │ 4 model slots        │    │ Audio extraction                   │  │
│  └─────────────────────┘    └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. FILE STRUCTURE & REGISTRY

### 3.1 Core Project Files (Created by AI Assistant)

| # | File Path | Lines | Bytes | Purpose |
|---|-----------|-------|-------|---------|
| 1 | `package.json` | 16 | ~400 | Project metadata, zero deps, onnxruntime-node optional |
| 2 | `dataset.csv` | 9 | ~700 | 8 deepfake sample entries for demo catalog |
| 3 | `models/README.md` | 66 | ~1,857 | ONNX model setup and export guide |
| 4 | `server/index.js` | 274 | ~14,000 | Main HTTP server, all API routes, detection logic |
| 5 | `server/inference.js` | 90 | ~2,908 | ONNX Runtime wrapper with try/catch fallback |
| 6 | `server/video-processor.js` | 81 | ~2,800 | ffmpeg availability check, frame/audio extraction |
| 7 | `public/index.html` | 606 | ~67,245 | Full UI — image tab, video tab, results panels |
| 8 | `public/js/app-utils.js` | 96 | ~5,583 | Utility functions, report generators |
| 9 | `public/js/face-detector.js` | 106 | ~4,470 | MediaPipe Face Landmarker wrapper |
| 10 | `public/js/gradcam.js` | 150 | ~6,746 | Heuristic Saliency Map (Jet colormap canvas) |
| 11 | `worker/pixel-analyzer.js` | 282 | ~11,000 | Web Worker — 6 metrics + FFT + scoring engine |

### 3.2 Legacy Files (Pre-existing, Not Part of v6.0 Core)

| File | Status | Notes |
|------|--------|-------|
| `index.html` (root) | ⚠️ Legacy | Old version, NOT the active UI |
| `server.js` (root) | ⚠️ Legacy | Old server, NOT the active server |
| `presentation.html` | ⚠️ Legacy | Presentation page |
| `README.md` | ⚠️ Legacy | Old readme |
| `PROJECT_ABSTRACT_AND_PPT.md` | ⚠️ Legacy | Abstract document |
| `FaceForensics_Kaggle_GPU_Inference.ipynb` | ⚠️ Legacy | Kaggle notebook |
| `assets/`, `css/`, `js/`, `deepfake/`, `image/`, `video/` | ⚠️ Legacy dirs | Old asset directories |

> **Important:** The active application lives in `server/`, `public/`, `worker/`, and `models/`. Root-level `index.html` and `server.js` are from an older version.

---

## 4. DETAILED FILE DESCRIPTIONS

### 4.1 `server/index.js` — Main Server (274 lines)

**Purpose:** Node.js native HTTP server. The backbone of the entire application.

**Key Components:**

| Component | Lines | Description |
|-----------|-------|-------------|
| MIME type map | 21-29 | Maps file extensions to Content-Type headers (HTML, CSS, JS, images, video, ONNX, etc.) |
| `parseBody()` | 31-38 | Parses JSON POST bodies with 10MB limit protection |
| `json()` | 40-47 | Helper to send JSON responses with no-cache + CORS headers |
| `SAMPLE_METHODS` | 50-55 | 4 preset deepfake methods with descriptions (DeepFaceLab, Midjourney, StyleGAN3, Roop) |
| `SAMPLE_PROBS` | 57-62 | Preset manipulation type probabilities per sample |
| `buildForensics()` | 70-88 | Generates randomized forensic signal values (high for fake, low for real) |
| `detectImage()` | 91-159 | **Core detection logic** — scoring, verdict, response building |
| HTTP routes | 162-247 | API endpoints + static file serving |
| Startup IIFE | 251-274 | ONNX loading attempt + server listen |

**Detection Logic (`detectImage()` — lines 91-159):**

```
Input: { sampleId?, mode?, anomalyScore?, metrics? }
  │
  ├─ mode === 'real'     → score = 84-98 (high = authentic)  → DEMO
  ├─ mode === 'fake'     → score = 4-16 (low = manipulated)  → DEMO
  ├─ sampleId exists     → score = 3-10 (presets are FAKE)   → DEMO
  ├─ anomalyScore exists → score = clientScore               → REAL ANALYSIS
  └─ else                → score = 25 (default suspect)
  │
  ├─ score >= 65  → AUTHENTIC / REAL
  ├─ score 35-64  → SUSPICIOUS / REVIEW
  └─ score < 35   → MANIPULATED / FAKE
```

**Static File Serving:**
- `/` → `public/index.html`
- `/worker/*` → `worker/` directory
- `/dataset.csv` → root `dataset.csv`
- Everything else → `public/` directory
- Path traversal protection via `path.resolve()` check

### 4.2 `server/inference.js` — ONNX Wrapper (90 lines)

**Purpose:** Safe optional ONNX Runtime loader. Never crashes if models are missing.

**Model Registry:**

| Key | Filename | Input Shape | Purpose |
|-----|----------|-------------|---------|
| `efficientnet` | `efficientnet_b4_dfdc.onnx` | [1,3,224,224] | Spatial deepfake detector |
| `xception` | `xception_ff.onnx` | [1,3,299,299] | FaceForensics++ spatial detector |
| `f3net` | `f3net_fft.onnx` | [1,1,256,256] | Frequency-domain detector |
| `clip` | `clip_vit_linear_probe.onnx` | [1,3,224,224] | Full-image GenAI detector |

**Per-model status tracking:** Each model is independently tracked as `loaded`, `missing`, `error`, or `unavailable`.

**Key Functions:**
- `init(modelsDir)` — Tries loading onnxruntime-node + all models. Returns status object.
- `runSpatialDetector(inputArray, w, h)` — Runs EfficientNet-B4 inference.
- `runFrequencyDetector(fftArray)` — Runs F3-Net FFT inference.
- `getStatus()` — Returns `{ available, onnxLoaded, models }`.

### 4.3 `server/video-processor.js` — Video Processing (81 lines)

**Purpose:** ffmpeg-based frame and audio extraction.

**Key Functions:**
- `ffmpegAvailable()` — Checks if `ffmpeg` is on PATH via `execSync`.
- `extractFrames(videoPath, options)` — Spawns ffmpeg to extract frames as PNG pipe. Splits PNG chunks by header signature `89504E47`.
- `extractAudio(videoPath, outputDir)` — Extracts PCM audio (16kHz mono WAV).

**Safety:** 30-second timeout on ffmpeg processes. Returns error objects instead of throwing.

### 4.4 `worker/pixel-analyzer.js` — Pixel Forensic Engine (282 lines)

**Purpose:** Web Worker that runs in a dedicated browser thread. Performs all 6 forensic metrics + FFT + anomaly scoring.

**Message Protocol:**
```
Main Thread → Worker:  { type: 'analyzeImage', imageData: ImageData, id: number }
Worker → Main Thread:  { type: 'analysisResult', id, anomalyScore, metrics, fftSpectrum }
```

**6 Forensic Metrics:**

| # | Metric | Real Range | AI Range | Algorithm |
|---|--------|-----------|----------|-----------|
| 1 | **Noise Uniformity** | 8-25 (high) | 2-6 (low) | Adjacent pixel difference averaging across RGB channels |
| 2 | **Color Histogram Spread** | 180-255 bins | 90-170 bins | Unique occupied bins per RGB channel, averaged |
| 3 | **Block Luminance Variance** | >600 (high) | <300 (low) | 8×8 block variance → variance-of-variances (σ of block σ²) |
| 4 | **Laplacian Energy** | 10-30 (high) | 2-8 (low) | 8-neighbor Laplacian kernel, mean absolute response |
| 5 | **Facial Symmetry Index** | >25 (asymmetric) | <12 (too symmetric) | Left-right pixel difference from vertical midline |
| 6 | **FFT Peak Score** | <10 (clean) | >40 (spikes) | 128×128 Hann-windowed FFT → radial profile → spike detection |

**FFT Implementation (lines 112-188):**
1. Downsample image luminance to 128×128
2. Apply 2D Hann window to reduce spectral leakage
3. Row-wise FFT → Column-wise FFT (Cooley-Tukey Radix-2)
4. Compute magnitude spectrum → radial average bins
5. Detect periodic spikes (> 2.5× local average) → peak score

**Scoring Engine (lines 190-241) — REVERSED:**

| Metric | Authentic Signal | Manipulated Signal |
|--------|------------------|--------------------|
| Noise > 18 | +18 points | — |
| Noise < 5 | — | -20 points |
| Histogram > 210 | +15 points | — |
| Histogram < 120 | — | -15 points |
| Block Var > 1000 | +12 points | — |
| Block Var < 200 | — | -12 points |
| Laplacian > 20 | +15 points | — |
| Laplacian < 5 | — | -18 points |
| Symmetry > 30 | +8 points | — |
| Symmetry < 10 | — | -12 points |
| FFT Peaks < 10 | +10 points | — |
| FFT Peaks > 60 | — | -15 points |

**Base score = 50. Final range = 5-99.**

### 4.5 `public/index.html` — Full UI (606 lines)

**Purpose:** Single-page application with two tabs (Image Detection, Video Detection).

**Structure:**

| Section | Lines | Description |
|---------|-------|-------------|
| `<head>` | 1-65 | CDN imports (Tailwind, FontAwesome, Google Fonts, MediaPipe), custom CSS |
| Header | 66-88 | Logo, pipeline badge (PIXEL MODE / LIVE AI), Image/Video tab nav |
| Image Tab | 92-212 | Upload zone, 4 deepfake presets, mode selector, results panel |
| Video Tab | 214-261 | Video upload, settings (frame rate, model), 3 video presets, results |
| Footer | 265-267 | Version line |
| Scripts | 271-604 | All JavaScript — detection, rendering, Web Worker, video analysis |

**JavaScript Functions (in `<script>` block):**

| Function | Lines | Purpose |
|----------|-------|---------|
| `showToast(msg, type)` | 274-280 | Toast notification system |
| `switchTab(id)` | 283-288 | Image/Video tab switching |
| Pipeline status fetch | 291-304 | Auto-detects ONNX vs Pixel mode on page load |
| Web Worker setup | 307-326 | Initializes pixel-analyzer.js worker + callback registry |
| `analyzeWithWorker(imageData)` | 318-326 | Promise wrapper for Worker messages (10s timeout) |
| `setMode(m)` | 339-346 | Switches Auto AI / Simulate Fake / Simulate Real |
| `selectSample(idx)` | 349-361 | Loads one of 4 preset deepfake images |
| `handleFile(file)` | 366-397 | Processes uploaded image → resizes to 256×256 → runs Worker analysis |
| `runImageScan()` | 400-437 | Animated scan → POST /api/v2/detect → render results |
| `renderImageResults()` | 440-515 | Renders verdict card, heatmap, badges, prob bars, forensic bars, pixel telemetry |
| `runVideoScan()` | 569-588 | Animated video scan → preset or live analysis → render |
| `buildVideoAnalysis(file)` | 540-567 | Extracts video frame at current time → runs Worker → builds analysis object |
| `renderVideoResults(preset)` | 590-603 | Renders video verdict, timeline, temporal signals |

**4 Image Presets (all FAKE):**

| Index | sampleId | Method | Confidence | Source Image |
|-------|----------|--------|-----------|-------------|
| 0 | 1 | DeepFaceLab | 99.4% | Unsplash portrait |
| 1 | 2 | Midjourney v6 | 97.9% | Unsplash portrait |
| 2 | 3 | StyleGAN3 | 98.7% | Unsplash portrait |
| 3 | 4 | Roop / ReActor | 98.1% | Unsplash portrait |

**3 Video Presets:**

| Index | Name | Verdict | Frames | Flagged |
|-------|------|---------|--------|---------|
| 0 | DeepFaceLab Swap | MANIPULATED | 300 | 243 |
| 1 | Face2Face Transfer | MANIPULATED | 180 | 142 |
| 2 | Authentic Camera Clip | AUTHENTIC | 240 | 3 |

### 4.6 `public/js/app-utils.js` — Utilities (96 lines)

**Global Functions Exposed on `window`:**

| Function | Purpose |
|----------|---------|
| `sleep(ms)` | Promise-based delay |
| `formatTimestamp()` | ISO 8601 timestamp |
| `generateInferenceId()` | `'INF_' + Date.now()` |
| `clamp(val, min, max)` | Clamp value to range |
| `lerp(a, b, t)` | Linear interpolation |
| `mapRange(val, inMin, inMax, outMin, outMax)` | Map value from one range to another |
| `downloadTextFile(content, filename)` | Creates a Blob URL and triggers download |
| `generateImageReport(sample, metrics)` | Builds full text forensic report for images |
| `generateVideoReport(preset, metrics)` | Builds full text forensic report for videos |

### 4.7 `public/js/face-detector.js` — Face Detection (106 lines)

**Purpose:** Wraps MediaPipe Face Landmarker for client-side face detection.

**`window.FaceDetector` API:**

| Method | Returns | Description |
|--------|---------|-------------|
| `init()` | void | Loads MediaPipe from CDN, creates Face Landmarker with GPU delegate |
| `isReady()` | boolean | Whether the landmarker initialized successfully |
| `detect(imageElement)` | Array | Detects faces → returns `{ bbox, landmarks, noseBridgeMidline, index }` per face |
| `cropFace(canvas, detection, targetSize)` | Canvas | Crops face region with 20% padding, resized to targetSize (default 224) |
| `getNoseMidlineX(detection)` | number | Returns normalized nose bridge X coordinate |

**Configuration:**
- `runningMode: 'IMAGE'`
- `numFaces: 5` (max 5 faces)
- `delegate: 'GPU'`
- Auto-initializes 500ms after DOM ready

### 4.8 `public/js/gradcam.js` — Heuristic Saliency Map (150 lines)

**Purpose:** Generates and renders per-block anomaly heatmaps on a canvas.

> **Note:** Despite the filename `gradcam.js`, this does NOT use real Grad-CAM (gradient-weighted class activation maps from CNN). It generates a **heuristic saliency map** based on local pixel metrics.

**`window.GradCAM` API:**

| Method | Purpose |
|--------|---------|
| `renderHeatmap(canvasId, imageElement, activationMap, options)` | Renders activation map as Jet colormap overlay on canvas |
| `generateFromPixelMetrics(imageData, metrics)` | Generates 16×16 activation map from local noise + Laplacian deviations |

**How the Heuristic Map Works:**
1. Divides image into 16×16 grid (256 blocks)
2. For each block: computes local noise variance + local Laplacian energy
3. Anomaly = how much smoother the block is vs. the global average
4. Face-center regions weighted higher (distance-from-center weighting)
5. Output: Float32Array of 256 values, range [0, 1]

**Jet Colormap:** 0 → Blue → Cyan → Green → Yellow → Red → 1

### 4.9 `dataset.csv` — Demo Catalog (9 lines)

**Format:** `id,source,generator,type,verdict,confidence,description`

| ID | Source | Generator | Type | Confidence |
|----|--------|-----------|------|-----------|
| 1 | FaceForensics++ | DeepFaceLab | face_swap | 98.8% |
| 2 | GenImage | Midjourney v6 | diffusion | 96.4% |
| 3 | FFHQ | StyleGAN3 | gan_synthesis | 97.5% |
| 4 | WildDeepfake | Roop/ReActor | face_swap | 97.0% |
| 5 | FaceForensics++ | Face2Face | expression_transfer | 94.2% |
| 6 | GenImage | Stable Diffusion XL | diffusion | 95.8% |
| 7 | DFDC | FaceShifter | face_swap | 96.1% |
| 8 | GenImage | DALL-E 3 | diffusion | 93.5% |

**All 8 entries are FAKE.** No "real" samples in the preset catalog.

---

## 5. DETECTION PIPELINE — HOW IT WORKS

### 5.0 MANDATORY 3-STAGE DETECTION RULE

> **This is the core rule enforced across all files. Every image upload MUST go through all 3 stages.**

```
╔══════════════════════════════════════════════════════════════════════╗
║           MANDATORY DETECTION PIPELINE (Added 2026-11-23)           ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  STAGE 1: SynthID Watermark Detection (Web Worker)                   ║
║  ─────────────────────────────────────────────────                   ║
║  Scan every uploaded image for AI-generation watermark signatures:   ║
║   • LSB (Least Significant Bit) plane structure analysis             ║
║   • DCT coefficient distribution anomaly                             ║
║   • Cross-channel color correlation signature                        ║
║   • Periodic frequency embedding detector (1D DFT strip)             ║
║                                                                      ║
║  IF SynthID CONFIRMED (score ≥ 45):                                  ║
║    → Force score ≤ 28 → VERDICT: FAKE (AI-Generated)                 ║
║    → Skip waiting for other signals — SynthID is definitive          ║
║                                                                      ║
║  IF SynthID SUSPECTED (score 25-44):                                 ║
║    → Force score ≤ 48 → VERDICT: at most SUSPICIOUS                  ║
║                                                                      ║
║  IF SynthID CLEAR (score < 25):                                      ║
║    → Proceed to Stage 2 with clean slate (+5 bonus)                  ║
║                                                                      ║
║  STAGE 2: Forensic Pixel Analysis (Web Worker)                       ║
║  ─────────────────────────────────────────────                       ║
║  Run all 6 metrics on the full image:                                ║
║   1. Noise Uniformity (sensor noise vs. AI smoothness)               ║
║   2. Color Histogram Spread (bin count per channel)                  ║
║   3. Block Luminance Variance (8×8 block texture variance)           ║
║   4. Laplacian High-Frequency Energy (edge detail)                   ║
║   5. Facial Symmetry Index (natural asymmetry vs. AI perfection)     ║
║   6. 2D FFT Radial Power Spectrum (GAN checkerboard spikes)          ║
║                                                                      ║
║  STAGE 3: Calibrated Verdict (Server)                                ║
║  ────────────────────────────────────                                ║
║  Combine Stage 1 SynthID impact + Stage 2 forensic score:            ║
║   • Score ≥ 65 → AUTHENTIC / REAL                                    ║
║   • Score 35-64 → SUSPICIOUS / REVIEW                                ║
║   • Score < 35  → MANIPULATED / FAKE                                 ║
║   Return: verdict + confidence + detectionPath[] reasoning chain     ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 5.1 Image Detection Flow

```
User uploads image (or selects preset)
       │
       ▼
┌──────────────────────────┐
│ 1. Image loaded in browser│
│    - Create 256×256 canvas │
│    - Extract ImageData     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ 2. Web Worker pixel-analyzer.js          │
│    - Compute 6 forensic metrics          │
│    - Run 128×128 2D FFT                  │
│    - Calculate anomaly score (5-99)      │
│    - Return { anomalyScore, metrics }    │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ 3. POST /api/v2/detect                   │
│    Body: { anomalyScore, metrics, mode } │
│    Server applies scoring thresholds     │
│    Returns: verdict, confidence, etc.    │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ 4. Render results in UI                  │
│    - Verdict card (FAKE/REAL/REVIEW)     │
│    - Heuristic Saliency Map (canvas)     │
│    - Forensic signal bars                │
│    - Pixel telemetry bars                │
│    - Manipulation type probabilities     │
│    - Preprocessing badges                │
└──────────────────────────────────────────┘
```

### 5.2 Video Detection Flow

```
User uploads video (or selects preset)
       │
       ├─ Preset selected? → Use hardcoded preset data
       │
       └─ Real video uploaded:
           │
           ▼
    ┌────────────────────────────────────┐
    │ Extract current frame from <video> │
    │ Draw to 256×256 canvas             │
    │ Run Web Worker pixel analysis      │
    │ anomalyScore < 35 = FAKE           │
    └──────────┬─────────────────────────┘
               │
               ▼
    ┌────────────────────────────────────┐
    │ Build video analysis object:       │
    │ - Calculate flagged frame count    │
    │ - Generate temporal forensics      │
    │ - Determine verdict                │
    └──────────┬─────────────────────────┘
               │
               ▼
    ┌────────────────────────────────────┐
    │ Animated scan UI:                  │
    │ - 7 steps with progress bar        │
    │ - Frame counter animation          │
    │ - Render: timeline, signals, etc.  │
    └────────────────────────────────────┘
```

---

## 6. SCORING SYSTEM — REVERSED LOGIC

> **CRITICAL:** The scoring was intentionally reversed from the original design.
> **High score = AUTHENTIC (real photo) | Low score = MANIPULATED (deepfake)**

### 6.1 Score Ranges

| Score Range | Classification | Verdict | Confidence Range |
|------------|---------------|---------|-----------------|
| **65-99** | AUTHENTIC | REAL | 97.5-99.8% |
| **35-64** | SUSPICIOUS | REVIEW | 62-80% |
| **5-34** | MANIPULATED | FAKE | 93.5-99.3% |

### 6.2 Why It Was Reversed

The original scoring had real photos scoring LOW (flagged as fake) and deepfakes scoring HIGH (flagged as real) — the exact opposite of what users expected. The reversal was applied across:
1. `worker/pixel-analyzer.js` — All metric scoring signs flipped
2. `server/index.js` — Verdict thresholds inverted
3. `public/index.html` — UI threshold checks updated

### 6.3 Scoring Logic by Metric (in pixel-analyzer.js)

```
Base Score: 50 (neutral)

AUTHENTIC signals (add points):        MANIPULATED signals (subtract points):
  Noise > 18:     +18                    Noise < 5:      -20
  Noise > 12:     +10                    Noise < 8:      -12
  Histogram > 210: +15                   Histogram < 120: -15
  Histogram > 180: +8                    Histogram < 160: -8
  Block Var > 1000: +12                  Block Var < 200: -12
  Block Var > 600:  +6                   Block Var < 400: -6
  Laplacian > 20: +15                    Laplacian < 5:  -18
  Laplacian > 12: +8                     Laplacian < 8:  -10
  Symmetry > 30:  +8                     Symmetry < 10:  -12
  Symmetry > 22:  +4                     Symmetry < 15:  -6
  FFT < 10:       +10                    FFT > 60:       -15
                                          FFT > 30:       -8

Maximum possible: 50 + 78 = 128 → clamped to 99
Minimum possible: 50 - 92 = -42 → clamped to 5
```

---

## 7. API REFERENCE

### 7.1 `POST /api/v2/detect`

**Purpose:** Image deepfake detection.

**Request Body:**
```json
{
    "filename": "photo.jpg",
    "sampleId": 1,              // Preset ID (1-4) or null
    "mode": "auto",             // "auto" | "fake" | "real"
    "anomalyScore": 72,         // From Web Worker (5-99)
    "metrics": {                // From Web Worker
        "noiseUniformity": 14.5,
        "colorHistogramSpread": 210,
        "blockVariance": 850.3,
        "laplacianEnergy": 18.7,
        "symmetryIndex": 28.4,
        "fftPeakScore": 5.2
    }
}
```

**Response:**
```json
{
    "inferenceId": "INF_1732384123456",
    "timestamp": "2026-11-23T15:12:03.456Z",
    "model": "Pixel Forensics Engine (Web Worker FFT)",
    "pipelineMode": "pixel-forensics",
    "classification": "AUTHENTIC",
    "verdict": "REAL",
    "confidenceScore": 98.5,
    "adjustedManipulationScore": 72.0,
    "detectedMethod": "None (Pristine — Natural Pixel Characteristics Verified)",
    "description": "Healthy sensor noise variance...",
    "probabilities": { "deepfake": 0.1, "face2face": 0.1, "faceswap": 0.0, "neural": 0.0 },
    "preprocessing": {
        "exifPresent": true,
        "ganCheckerboardDetected": false,
        "diffusionGridDetected": false,
        "fftSpectrumAnalyzed": true,
        "pixelTelemetrySource": "WebWorker"
    },
    "forensics": {
        "frequencyDomainAnomaly": 3.5,
        "facialLandmarkDeviation": 2.1,
        "noiseResidualScore": 4.2,
        "compressionConsistency": 2.8,
        "colorCoherency": 1.5,
        "edgeBlendingArtifacts": 3.1
    },
    "pixelMetrics": { ... }
}
```

### 7.2 `POST /api/v2/detect-video`

Same as `/api/v2/detect`. Uses identical detection logic.

### 7.3 `GET /api/v2/pipeline-status`

**Response:**
```json
{
    "modelsLoaded": false,
    "pipeline": "pixel-forensics",
    "fallback": true,
    "models": {},
    "version": "6.0.0"
}
```

### 7.4 `GET /api/v2/stats`

**Response:**
```json
{
    "platform": "Deepfake Vision AI v6.0",
    "engine": "Pixel Forensics (Web Worker FFT)",
    "uptime": "120s",
    "memory": "15.3 MB",
    "models": { "available": false, "onnxLoaded": false, "models": {} }
}
```

### 7.5 `GET /api/v2/dataset`

Returns parsed CSV as JSON array of objects.

---

## 8. FRONTEND UI ARCHITECTURE

### 8.1 UI Layout

```
┌──────────────────────────────────────────────────────┐
│ HEADER: Logo | Pipeline Badge | [Image] [Video] tabs │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────┐  ┌───────────────────────────┐  │
│  │ LEFT PANEL:      │  │ RIGHT PANEL:              │  │
│  │ • Upload Zone    │  │ • Idle state (shield icon) │  │
│  │ • Preset Grid    │  │ • Scanning state (spinner) │  │
│  │ • Mode Selector  │  │ • Results:                 │  │
│  │ • Scan Button    │  │   - Verdict Card           │  │
│  │                   │  │   - Image + Heatmap        │  │
│  │                   │  │   - Preprocessing Badges   │  │
│  │                   │  │   - Forensic Finding       │  │
│  │                   │  │   - Prob Bars              │  │
│  │                   │  │   - Forensic Signals       │  │
│  │                   │  │   - Pixel Telemetry        │  │
│  └─────────────────┘  └───────────────────────────┘  │
│                                                       │
├──────────────────────────────────────────────────────┤
│ FOOTER: Version info                                  │
└──────────────────────────────────────────────────────┘
```

### 8.2 Color System

| Element | Color | Tailwind Class |
|---------|-------|---------------|
| Background | #0b0f19 | dark-900 |
| Card BG | #131b2e | dark-800 |
| Borders | #334155 | slate-800 |
| Brand/Accent | #6366f1 → #4f46e5 | brand-500/600 |
| FAKE verdict | Rose (#f43f5e) | rose-500 |
| REAL verdict | Emerald (#10b981) | emerald-500 |
| REVIEW verdict | Amber (#f59e0b) | amber-500 |

---

## 9. DETECTION MODES

| Mode | Triggered By | Score Behavior | Use Case |
|------|-------------|---------------|----------|
| **Auto AI** | Default, `mode: 'auto'` | Uses Web Worker pixel analysis score | Real image/video analysis |
| **Simulate Fake** | Button click, `mode: 'fake'` | Forces score 4-16 | Demo/testing |
| **Simulate Real** | Button click, `mode: 'real'` | Forces score 84-98 | Demo/testing |
| **Preset** | Sample button, `sampleId: 1-4` | Forces score 3-10 (always FAKE) | Demo/presentation |

---

## 10. DEPENDENCIES & EXTERNAL RESOURCES

### 10.1 Required Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| **Node.js** | Runtime | v18+ recommended |
| — | — | **That's it. Zero npm required dependencies.** |

### 10.2 Optional Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| `onnxruntime-node` | npm (optional) | v1.17.0+ — enables Live AI mode if ONNX models are present |
| `ffmpeg` | System binary | Enables video frame extraction on server side |

### 10.3 CDN Resources (loaded in browser)

| Resource | URL | Purpose |
|----------|-----|---------|
| Tailwind CSS | `cdn.tailwindcss.com` | Utility-first CSS framework |
| Font Awesome 6.4 | `cdnjs.cloudflare.com/...` | Icons |
| Inter + JetBrains Mono | `fonts.googleapis.com` | Typography |
| MediaPipe Vision | `cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js` | Face Landmarker |
| MediaPipe WASM | `cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm` | Face Landmarker runtime |
| MediaPipe Model | `storage.googleapis.com/mediapipe-models/face_landmarker/...` | Face landmark model (float16) |
| Unsplash Images | `images.unsplash.com/photo-...` | Preset thumbnail images |

---

## 11. KNOWN ISSUES & PENDING UPGRADES

### 11.1 Known Issues

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| "Grad-CAM" label still used | 🟡 Low | `index.html` line 174, `gradcam.js` line 2 | Should say "Heuristic Saliency Map" since real Grad-CAM (CNN activations) is not implemented |
| Chart.js radar chart missing | 🟡 Medium | `index.html` | No Chart.js CDN, no radar chart canvas, no `renderTelemetryChart()` |
| No normalized metrics | 🟡 Medium | `pixel-analyzer.js` | Raw metric values displayed; should be normalized to 0-100 scale |
| No soft-light awareness | 🟡 Medium | `pixel-analyzer.js` | Portrait blur / low-light photos may be incorrectly penalized |
| Preset isolation | 🟡 Low | `server/index.js` | Presets should be gated by `mode === "simulation"` not just `sampleId` |
| Pipeline-status incomplete | 🟡 Low | `server/index.js` | Doesn't include `ffmpegAvailable` or detailed per-model status |
| Legacy files at root | 🟢 Info | Root directory | Old `index.html`, `server.js`, `assets/` etc. still exist |

### 11.2 Planned Upgrades (From User's Upgrade Prompt)

| Upgrade | Area | Status |
|---------|------|--------|
| Add Chart.js 4.4 CDN + radar chart | Frontend | ❌ Not done |
| Normalize all 6 metrics to 0-100 | pixel-analyzer.js | ❌ Not done |
| Add soft-light/low-light detection | pixel-analyzer.js | ❌ Not done |
| Add high-pass residual noise metric | pixel-analyzer.js | ❌ Not done |
| Rename "Grad-CAM" to "Heuristic Saliency Map" | Multiple files | ❌ Not done |
| Update face-detector.js comments for 478 landmarks | face-detector.js | ❌ Not done |
| Add `ffmpegAvailable` to pipeline-status | server/index.js | ✅ Done (rev 2.3) |
| Add `mode === "simulation"` isolation | server/index.js | ❌ Not done |
| **SynthID 3-stage mandatory detection pipeline** | All files | ✅ Done (rev 2.1-2.5) |

---

## 12. CHANGE LOG

> **Every code change MUST be logged here with date, description, and affected files.**

| Date | Rev | Change Description | Files Affected |
|------|-----|--------------------|----------------|
| 2026-10-30 | 1.0 | Initial v6.0 project creation — all 11 core files created | All files |
| 2026-10-30 | 1.1 | Reversed scoring logic — High score = AUTHENTIC, Low score = MANIPULATED | `pixel-analyzer.js`, `server/index.js`, `public/index.html` |
| 2026-10-30 | 1.2 | Added `buildVideoAnalysis()` for real video file pixel analysis | `public/index.html` |
| 2026-10-30 | 1.3 | Fixed curl → Invoke-RestMethod for PowerShell API tests | Testing only |
| 2026-10-30 | 1.4 | Verified all 6 API test scenarios pass | Testing only |
| 2026-11-23 | 2.0 | Created PROJECT_REPORT.md — comprehensive project documentation | `PROJECT_REPORT.md` |
| 2026-11-23 | 2.1 | **SynthID Detection Pipeline added** — Mandatory 3-stage rule: Stage 1 SynthID check → Stage 2 forensic pixel analysis → Stage 3 calibrated verdict | `worker/pixel-analyzer.js`, `server/index.js`, `public/index.html` |
| 2026-11-23 | 2.2 | SynthID Worker algorithms: LSB plane structure analysis, DCT coefficient distribution, cross-channel color correlation, periodic frequency embedding detector | `worker/pixel-analyzer.js` |
| 2026-11-23 | 2.3 | Server: SynthID-confirmed score forced ≤28 (FAKE); new `/api/v2/pipeline-status` returns `ffmpegAvailable`, `synthIdEnabled`, `detectionStages` | `server/index.js` |
| 2026-11-23 | 2.4 | Frontend: SynthID panel added in results, detection reasoning chain (3 stages) added, scan steps updated, `lastSynthId` global added | `public/index.html` |
| 2026-11-23 | 2.5 | All 3 SynthID test paths verified: SynthID-confirmed→FAKE(score=28), SynthID-clear→REAL, Forensics-caught→FAKE | Testing only |
| 2026-11-25 | 3.0 | **Single Folder Consolidation** — All files unified into a single root folder: `index.html`, `server.js`, `pixel-analyzer.js`, `app-utils.js`, `face-detector.js`, `gradcam.js`, `inference.js`, `video-processor.js`, `dataset.csv`, `package.json`. Synced to both `faceforensics-platform` and `FaceForensics`. Tested and verified. | All core files |

---

## 13. TEST RESULTS

### 13.1 API Tests (Last Run: 2026-10-30)

| # | Test Case | Input | Expected | Actual | Status |
|---|----------|-------|----------|--------|--------|
| 1 | Preset sampleId=1 | `{ sampleId: 1 }` | FAKE (score 3-10) | FAKE, 97.6% | ✅ PASS |
| 2 | Simulate Real | `{ mode: "real" }` | REAL (score 84-98) | REAL, 98.1% | ✅ PASS |
| 3 | Simulate Fake | `{ mode: "fake" }` | FAKE (score 4-16) | FAKE, 94.9% | ✅ PASS |
| 4 | High pixel score | `{ anomalyScore: 80 }` | REAL (score ≥ 65) | REAL, 99.4% | ✅ PASS |
| 5 | Low pixel score | `{ anomalyScore: 15 }` | FAKE (score < 35) | FAKE, 99.2% | ✅ PASS |
| 6 | Mid pixel score | `{ anomalyScore: 45 }` | REVIEW (35-64) | REVIEW, 78% | ✅ PASS |

### 13.2 Static File Serving (Last Run: 2026-10-30)

| Route | Expected | Actual | Status |
|-------|----------|--------|--------|
| `GET /` | 200, HTML | 200, text/html | ✅ PASS |
| `GET /worker/pixel-analyzer.js` | 200, JS | 200, application/javascript | ✅ PASS |
| `GET /js/gradcam.js` | 200, JS | 200, application/javascript | ✅ PASS |

---

## 14. CONSTRAINTS & RULES

> **These constraints MUST be followed by any AI assistant or developer working on this project.**

| # | Rule | Reason |
|---|------|--------|
| 1 | **Zero required npm dependencies** | onnxruntime-node is optional ONLY |
| 2 | **Detection MUST use pixels, not metadata** | "Check the images with pixels not with the size" (user requirement) |
| 3 | **All presets MUST be FAKE** | No "real" camera presets for images |
| 4 | **Reversed scoring is permanent** | High = AUTHENTIC, Low = MANIPULATED |
| 5 | **OneDrive path needs BypassSandbox: true** | All file operations on the OneDrive path require sandbox bypass |
| 6 | **Use Invoke-RestMethod, not curl** | PowerShell doesn't support curl's `-H` flag syntax |
| 7 | **Server entry point: `server/index.js`** | NOT `server.js` at root (that's legacy) |
| 8 | **Cache busting** | Server sends no-cache headers; user should Ctrl+Shift+R after changes |
| 9 | **"Grad-CAM" should be "Heuristic Saliency Map"** | Unless real CNN activations are used |
| 10 | **Update PROJECT_REPORT.md after every change** | This document is the single source of truth |

---

## 15. HOW TO RUN

### 15.1 Start the Server

```powershell
cd "c:\Users\Subbu\OneDrive - K L University\Documents\Frontend project\faceforensics-platform"
node server/index.js
```

### 15.2 Access the Application

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Main UI |
| `http://localhost:3000/api/v2/pipeline-status` | Check pipeline mode |
| `http://localhost:3000/api/v2/stats` | Server stats |
| `http://localhost:3000/api/v2/dataset` | Dataset catalog |

### 15.3 Test API (PowerShell)

```powershell
# Test preset
Invoke-RestMethod -Uri "http://localhost:3000/api/v2/detect" -Method POST -ContentType "application/json" -Body '{"sampleId":1}'

# Test real image analysis
Invoke-RestMethod -Uri "http://localhost:3000/api/v2/detect" -Method POST -ContentType "application/json" -Body '{"anomalyScore":80}'

# Test simulate modes
Invoke-RestMethod -Uri "http://localhost:3000/api/v2/detect" -Method POST -ContentType "application/json" -Body '{"mode":"real"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v2/detect" -Method POST -ContentType "application/json" -Body '{"mode":"fake"}'
```

---

## 16. UPDATE PROTOCOL

> **⚠️ MANDATORY: This protocol MUST be followed after every prompt and every code change.**

### 16.1 When to Update This Report

- After **every code change** to any project file
- After **every new file** is created or deleted
- After **every bug fix** or feature addition
- After **every test run** with results
- After **every architectural decision** is made
- After **every prompt** from the user that results in work

### 16.2 What to Update

1. **Change Log (Section 12):** Add a new row with date, revision, description, and affected files
2. **File Registry (Section 3):** Update line counts, byte sizes if files changed
3. **Known Issues (Section 11):** Mark resolved issues, add new ones
4. **Test Results (Section 13):** Update with latest test outcomes
5. **Any section affected by the change:** Keep descriptions accurate

### 16.3 Update Format

```markdown
| YYYY-MM-DD | X.X | Brief description of change | `file1.js`, `file2.html` |
```

---

> **END OF PROJECT REPORT**
> Generated: 2026-11-23T20:43:00+05:30
> This document is auto-maintained. Every AI session should read this file first and update it after every change.
