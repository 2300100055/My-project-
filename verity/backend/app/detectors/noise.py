"""
High-pass noise residual detector.
Extracts high-frequency camera sensor noise (PRNU-style residual)
to distinguish natural camera sensor noise from AI-generated smoothness.
"""
from __future__ import annotations

import numpy as np
import structlog
from PIL import Image
from scipy.ndimage import gaussian_filter  # type: ignore[import]

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()


class NoiseResidualDetector(BaseDetector):
    name = "noise_residual"
    weight = 0.10

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if media_type == "video":
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.1,
                weight=self.weight,
                summary="Noise residual applied to keyframes via video pipeline.",
                details={"skipped_for_video_top_level": True},
            )

        try:
            with Image.open(media_path) as img:
                gray = np.array(img.convert("L"), dtype=np.float32)

            blurred = gaussian_filter(gray, sigma=2.0)
            residual = gray - blurred
            noise_std = float(np.std(residual))
            score = self._safe_score(min(noise_std / 20.0, 1.0))

            if score < 0.35:
                summary = "Low high-frequency sensor noise residual — consistent with AI smoothing."
            elif score > 0.65:
                summary = "Natural high-frequency sensor noise residual detected."
            else:
                summary = "Noise residual analysis is inconclusive."

            return SignalResult(
                signal=self.name,
                score=score,
                confidence=0.55,
                weight=self.weight,
                summary=summary,
                details={"noise_std": round(noise_std, 3)},
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
