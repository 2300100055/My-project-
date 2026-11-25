# Reverse Engineering Notes — SynthID Detector

> Reference product: https://synthid.com/image-detection
> Method: Public web observation only. No login bypass, no scraping, no CAPTCHA solving.
> Chrome remote debugging was unavailable in automated browser session; research conducted via public documentation and web search.

---

## A. UX Flow

### States Documented (from public docs, blog posts, user reports)

| State | Description |
|-------|-------------|
| **Idle/Landing** | Clean centered layout. Title "SynthID Detector". Large drag-and-drop box labeled "Media: Upload a file for detection." with "Drag & drop, or Select file / Attach file" CTA. Info text below. |
| **Drag-over** | Standard browser drag-over highlight on the drop zone |
| **Uploading** | File selected → upload begins |
| **Scanning** | System scans for SynthID watermark in the uploaded file |
| **Result — Detected** | Confirms SynthID watermark found; may indicate timestamps for video/audio |
| **Result — Not Detected** | "No SynthID detected" with explicit caveat that this doesn't mean the content is authentic |
| **Result — Partial** | For video/audio: "SynthID detected between 10-20s. No SynthID detected in visuals" |
| **Error** | File type not supported, too large, corrupt |
| **Login Prompt** | Access may require Google account (varies by launch stage) |

### UX Flow (Step-by-Step)
1. User lands on page; sees headline and upload zone
2. User drags file or clicks to browse
3. File is validated client-side (type, size)
4. File uploads to server
5. Server scans for SynthID watermark embedding
6. Result returned — single verdict card
7. Limitation notice always visible

---

## B. Information Architecture

### Copy — Verbatim (from public sources)
- **Headline:** "SynthID Detector"
- **Upload CTA:** "Media: Upload a file for detection"
- **Drag prompt:** "Drag & drop, or Select file / Attach file"
- **Limitation notice:** "This is not a general AI detector. We can only detect media from companies who have adopted SynthID technology."
- **Advice:** "Upload the highest-quality file possible to ensure accuracy"
- **Capability note:** "The tool's robustness against common transformations like cropping, resizing, and compression"

### Supported Formats (public docs)
- **Images:** JPEG/JPG, PNG, WebP
- **Video:** MP4, MOV (checked across both audio and visual tracks)
- **Audio:** MP3, WAV (inaudible frequency-component watermarks)
- **Text:** Via Gemini/HuggingFace integration (not upload-based)

---

## C. Visual System (observed/inferred)

| Element | Description |
|---------|-------------|
| Design language | Google Material Design / Material You |
| Background | White / very light gray |
| Accent | Google Blue (#1A73E8 or similar) |
| Typography | Google Sans / Roboto; clean, modern sans-serif |
| Upload zone | Rounded rectangle with dashed border |
| Cards | Soft shadows, 8-12px radius |
| Navigation | Top bar with branding + icons |
| Motion | Standard Material transitions |
| Verdict | Text-based verdict card; region highlighting noted for some media types |

---

## D. Front-End Behavior

- Single file upload (no chunking visible for typical use)
- Client-side type validation before upload
- Verdict: synchronous for images (fast); may be async for video
- Result: single text verdict + caveat notice
- **No heatmap or region highlighting** visible in public demos for the standalone tool (region-level detection exists in other SynthID integrations)
- No score shown — binary/ternary verdict only

---

## E. Product Behavior (from public docs)

- SynthID is an **invisible steganographic watermark** embedded at generation time by participating AI models (Imagen, Veo, etc.)
- Detection requires the detection model — not the generation model
- Covers: Google Imagen, Veo, Lyria, Gemini; partner models from OpenAI (DALL-E), NVIDIA, Kakao
- Does NOT cover models that haven't adopted SynthID
- Verdict is probabilistic, not binary; displayed as a confidence level
- Video: timestamp-level detection (which segments contain watermark)
- Audio: frequency-domain watermark; detected in specific time ranges

---

## F. Technical Analysis — What We Can/Cannot Replicate

### What SynthID Does (proprietary, cannot replicate)
- Embeds invisible watermark in pixel-domain at generation time (requires watermarking model)
- Detects via dedicated detection model (requires detection model weights — not public)
- The watermark is robust to: JPEG compression, cropping (up to ~50%), resizing, some color adjustments
- **We cannot and must not claim to detect SynthID.** No legal public implementation of the detection model exists.

### What We CAN Implement (and do)

| Technique | Our Implementation | Replicates SynthID? |
|-----------|-------------------|---------------------|
| C2PA / Content Credentials | python-c2pa | No — different standard, same goal |
| Metadata forensics | exifread + Pillow | No — orthogonal signal |
| ELA (Error Level Analysis) | Re-save at Q=95 → delta map | No |
| FFT/DCT spectral artifacts | numpy/scipy | No |
| Noise residual analysis | High-pass filter | No |
| ML classifier | HuggingFace ViT | No — independent approach |
| Temporal video consistency | Frame-delta analysis | No |
| Fusion verdict | Weighted combination | No — our own system |

**Honest position:** Verity uses a different, complementary set of signals. It detects AI-generation patterns that leave forensic traces, NOT steganographic watermarks embedded by participating generators.

---

## G. Gap Analysis — Where Verity Is Better

| Area | SynthID | Verity |
|------|---------|--------|
| **Coverage** | Only SynthID-participating models | Any AI-generated image/video (forensic signals) |
| **Explainability** | Binary verdict, no explanation | Per-signal evidence cards with confidence bars |
| **No login** | Google account required | No login required |
| **Heatmap** | Not in public UI | ELA heatmap with before/after slider |
| **Video timeline** | Timestamp verdict | Scrubbable suspicious-segment timeline |
| **Report export** | Not available | PDF + JSON download |
| **Multi-signal** | Single watermark check | 6+ fused signals |
| **Provenance** | SynthID only | C2PA + metadata + ML fusion |
| **Score** | No score shown | 0-100 score + reliability indicator |
| **Privacy** | Requires Google account | Zero login, 60-min auto-delete |
| **Self-hostable** | No | Yes (Docker) |

---

## Blocks Encountered

- Chrome remote debugging was unavailable during automated browser session. Screenshots of the live UI were not captured.
- All findings above are sourced from: synthid.com, deepmind.google, blog.google, public user reports, and tech journalism (TechRepublic, Tom's Guide, Engadget).
- No private endpoints were accessed, no credentials were attempted, no robots.txt was violated.

---

*Documented: 2026-11-25*
