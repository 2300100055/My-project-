# ONNX Models Directory (`models/`)

Place optional ONNX models in this directory to enable **Live AI Mode** in `backend/inference.js`.
When no `.onnx` files or `onnxruntime-node` are present, the server automatically runs in **Pixel Forensics + SynthID Mode** with zero required npm dependencies.

## Expected Model Slots

| Key | Expected Filename | Input Tensor Shape | Role |
|-----|-------------------|--------------------|------|
| `efficientnet` | `efficientnet_b4_dfdc.onnx` | `[1, 3, 224, 224]` | Spatial deepfake detector |
| `xception` | `xception_ff.onnx` | `[1, 3, 299, 299]` | FaceForensics++ spatial detector |
| `f3net` | `f3net_fft.onnx` | `[1, 1, 256, 256]` | Frequency-domain FFT detector |
| `clip` | `clip_vit_linear_probe.onnx` | `[1, 3, 224, 224]` | Full-image GenAI detector |

## Enabling Live AI Mode

1. Install the optional runtime:
   ```bash
   npm install onnxruntime-node
   ```
2. Export or place one or more `.onnx` model files listed above into `models/`.
3. Start the server (`npm start` or `node backend/server.js`) and check `GET /api/v2/pipeline-status`.
