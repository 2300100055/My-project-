# Evaluation Methodology & Limitations — Verity

## Honest Reporting Policy
No metrics are fabricated. Until the evaluation benchmark is executed against a labeled dataset (`scripts/seed-eval-data`), no accuracy/precision/recall claims are published as measured results.

## Planned Benchmark Protocol
1. **Dataset:**
   - Real media: openly licensed camera photos (e.g., Unsplash / Wikimedia Commons with intact EXIF) and real video clips.
   - AI-generated media: images/videos generated locally with open-weights models (Stable Diffusion XL, Flux, etc.) and varied post-processing.
2. **Metrics:**
   - Accuracy, Precision, Recall, F1, False Positive Rate (FPR), False Negative Rate (FNR).
   - Expected Calibration Error (ECE) before and after temperature scaling (`ML_TEMPERATURE`).
3. **Robustness Sweeps:**
   - JPEG recompression at Q=90, Q=70, Q=50, Q=30.
   - Downscaling to 512px, 256px, 128px.
   - Center crops (75%, 50%).

## Known Weaknesses
- **Low resolution (<256px) and heavy JPEG compression (Q<50):** Degrade ELA, spectral noise residual, and ViT classifier accuracy; reliability indicator automatically pulls the fused score toward 50 (Inconclusive).
- **Screenshots / re-encoded social media:** Strip EXIF/C2PA and introduce uniform recompression artifacts.
- **No proprietary watermark detection:** SynthID and closed watermarks are not checked.
