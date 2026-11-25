# FaceForensics++ Enterprise Web Platform

An enterprise-grade deepfake and facial forgery detection interface and forensic analytics platform grounded on the state-of-the-art **FaceForensics++** benchmark dataset.

---

## 🌟 Key Features

1. **Forensics Surveillance Dashboard**
   - High-level KPIs: Total Processed Media, Aggregate Accuracy (98.4%), Deepfakes Flagged, and Real-Time Frame Latency.
   - Interactive Chart.js visualizations:
     - **Active Manipulation Breakdown** (Deepfakes, Face2Face, FaceSwap, NeuralTextures).
     - **Model Performance Benchmarks** (AUC comparison: XceptionNet, EfficientNet-B4, CapsuleForensics, ResNet50, MesoInception-4).
   - Recent Live Detections feed with direct inspection drill-down.

2. **Forgery Detection Workbench**
   - Drag-and-drop media ingestion for videos (MP4, AVI, MOV) and images (PNG, JPEG).
   - Instant sample presets from the official FaceForensics research benchmarks:
     - **Deepfakes** (Autoencoder face swap)
     - **Authentic** (Pristine ground truth)
     - **Face2Face** (Expression reenactment)
     - **FaceSwap** (Computer graphics replacement)
     - **NeuralTextures** (GAN photorealism)
   - Real-time animated pipeline simulation (face extraction & bounding boxes, spatial frequency analysis, Grad-CAM heatmaps).
   - Dynamic timeline scrubber for frame-by-frame tampering inspection.
   - One-click cryptographic JSON audit report export.

3. **Dataset & Benchmark Explorer**
   - Searchable and filterable benchmark sequences across compression tiers:
     - **Raw** (Uncompressed)
     - **HQ (c23)** (High Quality)
     - **LQ (c40)** (Low Quality)
   - Sequence Inspection modal with detailed video bitrate, frame count, and manipulation masks.
   - Human Baseline vs. Automated Models degradation curve chart.
   - Benchmark dataset CSV export.

4. **Model Registry & Weights**
   - Manage model weights and switch the primary inference engine:
     - **XceptionNet (FF++)** (AUC: 0.993, 22.8M parameters)
     - **MesoInception-4** (AUC: 0.941, 4.1 ms/frame, edge-optimized)
     - **EfficientNet-B4** (AUC: 0.981, 19.3M parameters)
   - Simulated checksum verification and weights reload.

5. **Batch Inference & Audit Logs**
   - Live simulated stream of incoming detection webhooks.
   - Filter logs by status (`SUCCESS`, `FLAGGED`, `READY`).
   - Export audit logs to `.txt` files.

6. **Kaggle Cloud Hub & Dataset Sync**
   - Connect your Kaggle account directly via `kaggle.json` upload or username & API key.
   - Synchronize official and community deepfake datasets (FaceForensics++, DFDC Challenge, CIPlab).
   - One-click download of the **Kaggle GPU Starter Notebook (`.ipynb`)** to train or run inference on free NVIDIA T4/P100 GPUs.
   - Quick Kaggle CLI command references.

7. **Enterprise API Credential Manager**
   - Modal key generator for generating and copying secure bearer tokens (`ff_live_...`).

---

## 📂 Project Architecture

```
faceforensics-platform/
├── index.html               # Main application interface
├── server.js                # Built-in Node.js HTTP & REST API server
├── package.json             # npm scripts and project metadata
├── README.md                # Documentation
├── css/
│   └── styles.css           # Glassmorphism, radar scanlines, custom scrollbars, animations
├── js/
│   ├── app.js               # Tab controller, toast notifications, API token manager
│   ├── charts.js            # Chart.js instances and responsive handlers
│   ├── workbench.js         # Media upload, presets, inference simulation, heatmaps
│   ├── dataset.js           # Filterable benchmark dataset, inspect modal, CSV export
│   ├── models.js            # Model registry, primary engine switcher
│   └── logs.js              # Real-time audit logs and live streaming toggle
└── assets/
    └── samples/             # Official FaceForensics++ benchmark reference visuals
        ├── ex_deepfakes.png
        ├── ex_original.png
        ├── deepfakes.gif
        ├── face2face.gif
        ├── faceswap.gif
        └── neuraltextures.gif
```

---

## 🚀 How to Run

### Method 1: Local Node.js Server (Recommended)
From this directory:
```bash
npm start
```
Or directly:
```bash
node server.js
```
Then navigate in your browser to:
```
http://localhost:3000
```

### Method 2: Direct Browser Launch (No Server Needed)
Simply double-click `index.html` or open it directly in any modern web browser (Chrome, Edge, Firefox, Safari). All styles and dependencies are served via high-speed CDNs.

### Method 3: Python Web Server
If Python is available:
```bash
python -m http.server 3000
```
Then visit `http://localhost:3000`.

---

## 🔗 FaceForensics Integration

The platform is designed to interface directly with the cloned [FaceForensics](https://github.com/ondyari/FaceForensics) repository located in `../FaceForensics`:
- **Model Checkpoints**: Train and export XceptionNet weights using `../FaceForensics/classification/detect_from_video.py`.
- **Dataset Generation**: Use `../FaceForensics/dataset/` scripts to download and compress raw YouTube video pairs into HQ (c23) and LQ (c40) tiers.
- **REST API Endpoints**: The bundled `server.js` provides ready-to-wire `/api/v2/detect`, `/api/v2/stats`, and `/api/v2/models` endpoints to integrate your PyTorch models.
