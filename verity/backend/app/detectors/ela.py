"""
Error Level Analysis (ELA) & Regional Tampering Detector.
Re-saves at Q=90 and measures both:
  1. Global edge-correlated compression richness (catches flat synthetic AI images)
  2. 16x16 block anomaly ratio (catches localized deepfake face-swaps / spliced regions)
"""
from __future__ import annotations

import io
from pathlib import Path

import cv2
import numpy as np
import structlog
from PIL import Image, UnidentifiedImageError

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()

ELA_QUALITY = 90


class ELADetector(BaseDetector):
    name = "ela"
    weight = 0.20

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if media_type == "video":
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="ELA applied to keyframes via video pipeline.",
                details={"skipped_for_video_top_level": True},
            )

        try:
            with Image.open(media_path) as orig:
                orig_rgb = orig.convert("RGB")
                if max(orig_rgb.size) > 1024:
                    orig_rgb.thumbnail((1024, 1024), Image.Resampling.LANCZOS)

            buf = io.BytesIO()
            orig_rgb.save(buf, format="JPEG", quality=ELA_QUALITY)
            buf.seek(0)
            recompressed = Image.open(buf).convert("RGB")

            orig_arr = np.array(orig_rgb, dtype=np.float32)
            recomp_arr = np.array(recompressed, dtype=np.float32)

            ela_map = np.abs(orig_arr - recomp_arr)
            ela_gray = np.mean(ela_map, axis=2)

            mean_ela = float(np.mean(ela_gray))
            std_ela = float(np.std(ela_gray))

            # Edge alignment
            gray_img = np.mean(orig_arr, axis=2)
            gx = cv2.Sobel(gray_img, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray_img, cv2.CV_32F, 0, 1, ksize=3)
            grad = np.sqrt(gx**2 + gy**2)
            if np.std(grad) > 1e-4 and np.std(ela_gray) > 1e-4:
                corr = float(np.corrcoef(grad.ravel(), ela_gray.ravel())[0, 1])
                corr = max(0.0, min(1.0, corr))
            else:
                corr = 0.0

            # Regional splice / face-swap check: 16x16 block p98 vs median
            h, w = ela_gray.shape
            bh, bw = max(h // 16, 1), max(w // 16, 1)
            blocks = ela_gray[: bh * 16, : bw * 16].reshape(bh, 16, bw, 16)
            block_means = np.mean(blocks, axis=(1, 3))
            b_med = float(np.percentile(block_means, 50))
            b_p98 = float(np.percentile(block_means, 98))
            splice_ratio = b_p98 / (b_med + 0.5)

            richness = min(std_ela / 3.0, 1.0)
            edge_score = min(corr / 0.35, 1.0)
            # High splice_ratio (> 5.0) indicates localized region with mismatched compression
            uniformity_ok = max(0.0, 1.0 - max(0.0, splice_ratio - 3.5) / 5.0)

            score = self._safe_score(0.40 * richness + 0.40 * edge_score + 0.20 * uniformity_ok)

            # Save heatmap
            heatmap_path = None
            try:
                ela_max = ela_map.max()
                ela_vis = (ela_map / ela_max * 255).clip(0, 255).astype(np.uint8) if ela_max > 0 else ela_map.astype(np.uint8)
                ela_pil = Image.fromarray(ela_vis)
                heatmap_name = f"ela_{Path(media_path).stem}.jpg"
                heatmap_path = str(Path(media_path).parent / heatmap_name)
                ela_pil.save(heatmap_path, "JPEG", quality=85)
            except Exception as e:
                log.warning("ela.heatmap_save_failed", error=str(e))

            if score >= 0.55:
                summary = f"ELA shows consistent edge-aligned compression (edge corr {corr:.2f}, std {std_ela:.2f})."
            else:
                summary = f"ELA shows flat synthetic error levels or regional splice anomaly (corr {corr:.2f}, splice {splice_ratio:.2f})."

            return SignalResult(
                signal=self.name,
                score=score,
                confidence=0.55,
                weight=self.weight,
                summary=summary,
                details={
                    "mean_ela": round(mean_ela, 3),
                    "std_ela": round(std_ela, 3),
                    "edge_correlation": round(corr, 3),
                    "splice_ratio": round(splice_ratio, 3),
                },
                heatmap_url=heatmap_path,
            )

        except UnidentifiedImageError:
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="ELA could not open file as image.",
                details={"error": "unidentified_image"},
            )
        except Exception as e:
            log.warning("ela.error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="ELA analysis failed.",
                details={"error": str(e)},
            )
