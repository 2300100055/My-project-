"""
Error Level Analysis (ELA) detector.
Standard forensic technique: re-save at Q=95, subtract from original.
AI-generated images often show uniform ELA (no JPEG grid pattern),
while edited/manipulated images show localized high-error regions.

Score:
  High ELA uniformity (low variance) → likely AI-generated → score toward 0
  Low ELA uniformity (high variance, natural JPEG grid) → likely authentic → score toward 1
"""
from __future__ import annotations

import io
import tempfile
from pathlib import Path

import numpy as np
import structlog
from PIL import Image, UnidentifiedImageError

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()

ELA_QUALITY = 95


class ELADetector(BaseDetector):
    name = "ela"
    weight = 0.10

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if media_type == "video":
            # ELA on video: skip (handled by video pipeline on keyframes)
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.1,
                weight=self.weight,
                summary="ELA applied to keyframes via video pipeline.",
                details={"skipped_for_video_top_level": True},
            )

        try:
            with Image.open(media_path) as orig:
                orig_rgb = orig.convert("RGB")

            # Re-save at ELA_QUALITY
            buf = io.BytesIO()
            orig_rgb.save(buf, format="JPEG", quality=ELA_QUALITY)
            buf.seek(0)
            recompressed = Image.open(buf).convert("RGB")

            orig_arr = np.array(orig_rgb, dtype=np.float32)
            recomp_arr = np.array(recompressed, dtype=np.float32)

            ela_map = np.abs(orig_arr - recomp_arr)
            ela_normalized = (ela_map / ela_map.max() * 255).clip(0, 255).astype(np.uint8) if ela_map.max() > 0 else ela_map.astype(np.uint8)

            # Metrics
            mean_ela = float(np.mean(ela_map))
            std_ela = float(np.std(ela_map))
            # For genuine photos: high std (varied across image)
            # For AI images: low std (uniform noise floor)
            # For manipulated: high localized peaks

            # Normalize: std > 15 → authentic; std < 5 → uniform (AI)
            normalized_std = min(std_ela / 20.0, 1.0)
            score = normalized_std  # 0=uniform (AI-like), 1=varied (authentic-like)

            confidence = 0.65  # ELA is moderately reliable

            # Save heatmap
            heatmap_path = None
            try:
                ela_pil = Image.fromarray(ela_normalized)
                heatmap_name = f"ela_{Path(media_path).stem}.jpg"
                heatmap_dir = Path(media_path).parent
                heatmap_path = str(heatmap_dir / heatmap_name)
                ela_pil.save(heatmap_path, "JPEG", quality=85)
            except Exception as e:
                log.warning("ela.heatmap_save_failed", error=str(e))

            if score < 0.3:
                summary = "ELA shows unusually uniform error levels — consistent with AI-generated images."
            elif score > 0.65:
                summary = "ELA shows natural JPEG compression patterns — consistent with authentic photography."
            else:
                summary = "ELA results are inconclusive."

            return SignalResult(
                signal=self.name,
                score=self._safe_score(score),
                confidence=confidence,
                weight=self.weight,
                summary=summary,
                details={
                    "mean_ela": round(mean_ela, 2),
                    "std_ela": round(std_ela, 2),
                    "ela_quality": ELA_QUALITY,
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
