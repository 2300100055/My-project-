# Technical Decisions — Verity

> This document is updated after every significant decision. All ambiguities are resolved here.

---

## Decision Log

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| D-01 | Python 3.12 + FastAPI | Async-native, Pydantic v2, fastest Python web framework for ML workloads | Flask (less async), Django (heavyweight) |
| D-02 | Next.js 15 App Router + TypeScript strict | Server components, edge-ready, tight TS integration | Vite + React (less SSR), Remix |
| D-03 | In-process asyncio queue (Phase 1) | Zero infra dependency; interface designed for Celery/Redis swap | Celery immediately (over-engineered for MVP) |
| D-04 | HuggingFace `umm-maybe/AI-image-detector` | MIT license, public model card, 97%+ on common benchmarks, swappable via adapter | Custom-trained model (requires dataset + GPU), CLIP-based (less specialized) |
| D-05 | python-c2pa for provenance | Only open-source C2PA implementation; covers Adobe Content Credentials, camera provenance | None viable |
| D-06 | ELA via JPEG re-save at Q=95 | Standard forensic technique, deterministic, explainable | DCT-only (misses spatial), ML-only (black box) |
| D-07 | UUID storage names, 60-min retention | Privacy-first; no filename leakage; auto-delete | Permanent storage (privacy risk), content-hash (linkability) |
| D-08 | Sandboxed worker via subprocess + resource limits | Defense-in-depth for malicious uploads | Docker-in-Docker (complexity), seccomp (Linux-only) |
| D-09 | Weighted fusion: C2PA 30% + Metadata 15% + Pixel 20% + ML 35% | C2PA is high-precision when present; ML is highest recall overall; pixel fills gaps | Equal weights (ignores signal reliability), ML-only (no explainability) |
| D-10 | Verdict bands: ≥70 Likely Authentic / 35-69 Inconclusive / <35 Likely AI-Generated | Chosen to minimize false "Likely Authentic" on manipulated media | 50/50 split (too coarse), continuous only (harder for users) |
| D-11 | Temperature scaling for ML calibration | Simple, effective post-hoc calibration; requires small labeled set | Platt scaling (similar), no calibration (overconfident) |
| D-12 | No login required | Privacy; accessibility; zero friction | Login (enables abuse tracking but hurts adoption) |
| D-13 | PDF + JSON report export | JSON for developers; PDF for non-technical users | Only PDF (not machine-readable) |
| D-14 | Apple design language | Clean, trusted, high-contrast — fits a forensics tool | Material Design (less refined for this use case) |
| D-15 | WCAG AA accessibility minimum | Legal and ethical baseline | WCAG AAA (too restrictive for color palette) |

---

## Technique Details

### ML Classifier — `umm-maybe/AI-image-detector`
- **Model:** ViT-based binary classifier fine-tuned on AI vs real images
- **License:** MIT
- **Input:** 224×224 RGB image
- **Output:** probability(AI-generated) ∈ [0,1]
- **Known weaknesses:** degrades on heavily cropped faces, old-style GAN artifacts vs diffusion artifacts differ, JPEG artifacts can confuse
- **Calibration:** Temperature scaling T learned on 200-image validation set (see EVALUATION.md)
- **Adapter interface:** `detectors/base.py::BaseDetector` — swap via config

### Fusion Formula
```
raw_score = (
  c2pa_score   * 0.30 +   # 1.0 = provenance verified clean; 0.0 = no provenance / tampered
  meta_score   * 0.15 +   # 1.0 = clean metadata; 0.0 = stripped/AI-tool signatures
  pixel_score  * 0.20 +   # 1.0 = forensically clean; 0.0 = ELA/FFT artifacts
  ml_score     * 0.35     # 1.0 = classifier says authentic; 0.0 = classifier says AI-generated
)

reliability = f(resolution, compression_level, duration)
# Drops toward 0.5 for low-res (<256px), highly compressed (JPEG Q<50), or very short (<1s) video

final_score = raw_score * reliability + 50 * (1 - reliability)
# Pulls toward center when reliability is low
```

### Video Pipeline
1. `ffprobe` container + stream metadata analysis
2. Adaptive keyframe extraction: 1 fps for <30s, 0.5 fps for 30-120s, 0.25 fps beyond
3. Per-frame: full image pipeline (ELA + FFT + noise + ML)
4. Temporal consistency: inter-frame delta analysis (suspicious flicker = high delta variance)
5. Face/region tracking: OpenCV face detector, per-region anomaly score
6. Aggregation: mean + P90 + max across frames; timeline of suspicious segments
7. Final fused score same as image but with temporal signal added

### Open Watermark Checks
- **C2PA / Content Credentials:** checked via `python-c2pa`. Covers images from participating cameras (Sony, Leica, Nikon), Adobe tools, some AI generators.
- **No SynthID check:** SynthID is proprietary to Google DeepMind. No legal open implementation exists. We document this limitation explicitly in every result.

---

## Ambiguities Resolved

| Ambiguity | Resolution |
|-----------|-----------|
| Which HuggingFace model? | `umm-maybe/AI-image-detector` — MIT, well-documented, swappable |
| Sync vs async for image analysis? | Async for all; images complete in <5s typically so polling has ≤1 poll |
| PDF library? | `reportlab` (BSD) |
| Heatmap method? | ELA difference map normalized to jet colormap; before/after slider in UI |
| Video max size? | 500 MB, max 10 minutes, enforced at upload |
| Image max size? | 20 MB, max 8192×8192px |
| Decompression bomb defense? | `Pillow` `Image.MAX_IMAGE_PIXELS = 50_000_000` |
