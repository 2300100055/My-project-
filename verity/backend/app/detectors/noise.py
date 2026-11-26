"""
Multi-scale high-pass sensor noise residual detector.
Distinguishes natural camera shot noise (spatially varying, channel-independent micro-grain)
from synthetic AI smoothness or uniform generator noise.
"""
from __future__ import annotations

import cv2
import numpy as np
import structlog
from PIL import Image

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()


class NoiseResidualDetector(BaseDetector):
    name = "noise_residual"
    weight = 0.25

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if media_type == "video":
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="Noise residual applied to keyframes via video pipeline.",
                details={"skipped_for_video_top_level": True},
            )

        try:
            with Image.open(media_path) as img:
                rgb = img.convert("RGB")
                if max(rgb.size) > 1024:
                    rgb.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                arr = np.array(rgb, dtype=np.float32)

            # High-pass residual via median filter (preserves edges less than Gaussian, isolates sensor noise)
            denoised = cv2.medianBlur(arr.astype(np.uint8), 3).astype(np.float32)
            residual = arr - denoised

            # 1. Local patch noise floor (16x16 blocks): avoids being skewed by edges
            h, w, _ = residual.shape
            bh, bw = max(h // 16, 1), max(w // 16, 1)
            crop = residual[: bh * 16, : bw * 16, :]
            blocks = crop.reshape(bh, 16, bw, 16, 3)
            block_stds = np.std(blocks, axis=(1, 3, 4))
            noise_floor = float(np.percentile(block_stds, 25))
            noise_p75 = float(np.percentile(block_stds, 75))
            noise_spread = noise_p75 - noise_floor

            # 2. Channel independence: real camera Bayer/demosaic noise has lower R-B residual correlation
            r_res = residual[:, :, 0].ravel()
            b_res = residual[:, :, 2].ravel()
            if np.std(r_res) > 1e-4 and np.std(b_res) > 1e-4:
                rb_corr = float(np.corrcoef(r_res, b_res)[0, 1])
            else:
                rb_corr = 1.0

            # Real camera noise: noise_floor typically 1.0-6.0, spread > 1.5, rb_corr < 0.75
            # Synthetic smooth image: noise_floor < 0.6 or spread < 0.8
            floor_score = min(noise_floor / 3.0, 1.0)
            spread_score = min(noise_spread / 3.5, 1.0)
            channel_score = max(0.0, min(1.0, (0.95 - rb_corr) / 0.55))

            score = self._safe_score(0.45 * floor_score + 0.35 * spread_score + 0.20 * channel_score)

            if score >= 0.55:
                summary = f"Natural camera sensor noise profile detected (floor {noise_floor:.2f}, spread {noise_spread:.2f})."
            else:
                summary = f"Unusually smooth or correlated noise residual (floor {noise_floor:.2f}, R/B corr {rb_corr:.2f})."

            return SignalResult(
                signal=self.name,
                score=score,
                confidence=0.78,
                weight=self.weight,
                summary=summary,
                details={
                    "noise_floor": round(noise_floor, 3),
                    "noise_spread": round(noise_spread, 3),
                    "rb_correlation": round(rb_corr, 3),
                },
            )
        except Exception as e:
            log.warning("noise.error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="Noise residual analysis failed.",
                details={"error": str(e)},
            )
