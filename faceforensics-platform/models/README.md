# ONNX Model Setup Guide

## Overview

Deepfake Vision AI runs in two modes:

### 1. Pixel Forensics Mode (Default)
Works **immediately** with zero setup. Uses a Web Worker to analyze actual pixel data
(noise uniformity, color histograms, block variance, Laplacian energy, FFT spectrum).
No model downloads required.

### 2. Live AI Mode (Optional)
Requires ONNX model weights placed in this `/models/` directory.
The server auto-detects models on startup and switches to Live AI mode.

---

## Required Models

### Stage 1: Face Detection
Handled by **MediaPipe Face Landmarker** in the browser — no download needed.

### Stage 2: Spatial Detectors

| Model | File | Size | Input | Source |
|-------|------|------|-------|--------|
| EfficientNet-B4 | `efficientnet_b4_dfdc.onnx` | ~75 MB | [1,3,224,224] float32 | DFDC Challenge |
| XceptionNet | `xception_ff.onnx` | ~88 MB | [1,3,299,299] float32 | FaceForensics++ |

### Stage 3: Frequency Domain (Optional)

| Model | File | Size | Input | Source |
|-------|------|------|-------|--------|
| F3-Net FFT | `f3net_fft.onnx` | ~25 MB | [1,1,256,256] float32 | F3-Net |

### Stage 4: GenAI Full-Image (Optional)

| Model | File | Size | Input | Source |
|-------|------|------|-------|--------|
| CLIP ViT Linear Probe | `clip_vit_linear_probe.onnx` | ~350 MB | [1,3,224,224] float32 | UniversalFakeDetect |

---

## Export Instructions (PyTorch → ONNX)

```python
import torch

model = load_your_model()
model.eval()
dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy, "model.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}}
)
```

## Verification

After placing model files, restart the server:
```bash
node server/index.js
```
Console should show: `✓ ONNX Runtime loaded — Live AI Mode active`
