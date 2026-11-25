# Deepfake Vision AI v6.0 — My Project

> **Author:** Subbu (KL University) | **Version:** 6.0.0 | **Last Updated:** 2026-11-25

## 📌 Repository Structure

This monorepo contains the complete **Deepfake Vision AI v6.0** platform — a web-based multi-stage deepfake detection system.

| Branch | Folder | Description |
|--------|--------|-------------|
| `master` | `/` | Root landing — workspace config, README |
| `feature/faceforensics-backend` | `FaceForensics/` | Python ML backend — classification, dataset, models |
| `feature/faceforensics-platform` | `faceforensics-platform/` | Node.js frontend platform — UI, server, workers |

## 🚀 Project Overview

**Deepfake Vision AI v6.0** detects AI-manipulated images and videos using a mandatory 3-stage pipeline:
1. **Stage 1 — SynthID Detection:** LSB plane, DCT coefficient, cross-channel color correlation analysis
2. **Stage 2 — Pixel Forensic Analysis:** 6 forensic metrics via dedicated Web Worker (FFT, Laplacian, etc.)
3. **Stage 3 — Calibrated Verdict:** AUTHENTIC / SUSPICIOUS / MANIPULATED

## 🛠️ Tech Stack

- **Frontend:** HTML + Tailwind CSS + MediaPipe Face Landmarker
- **Backend:** Node.js (zero npm dependencies — built-in `http` only)
- **AI/ML:** Python (classification), optional ONNX models (EfficientNet-B4, XceptionNet, F3-Net, CLIP ViT)

## 📂 Sub-repositories / Branches

### `feature/faceforensics-backend`
Python ML backend with dataset, classification scripts, and model storage.

### `feature/faceforensics-platform`
Full Node.js + browser platform — server, pixel analyzer Web Worker, face detector, GradCAM, video processor.

## ▶️ How to Run (Platform)

```bash
cd faceforensics-platform
node server/index.js
# Open http://localhost:3000
```

## 🔗 GitHub Repository
https://github.com/2300100055/My-project-.git
