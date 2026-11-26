"""
SRM High-Pass Residual & YCbCr Chroma-Luma Noise Detector.
Uses 2nd-order Steganalysis Rich Model (SRM) high-pass kernels on Luminance (Y)
and Chrominance (Cb, Cr) to separate real Bayer camera sensor noise from
AI-generated latent/diffusion smoothness or synthetic seams.
"""
from __future__ import annotations

import cv2
import numpy as np
import structlog
from PIL import Image

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()

# Classic SRM 2nd-order diagonal high-pass kernel
_SRM_KERNEL = np.array(
    [
        [-1.0, 2.0, -1.0],
        [2.0, -4.0, 2.0],
        [-1.0, 2.0, -1.0],
    ],
    dtype=np.float32,
) / 4.0


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
                arr = np.array(rgb, dtype=np.uint8)

            ycrcb = cv2.cvtColor(arr, cv2.COLOR_RGB2YCrCb).astype(np.float32)
            y_ch, cr_ch, cb_ch = ycrcb[:, :, 0], ycrcb[:, :, 1], ycrcb[:, :, 2]

            res_y = cv2.filter2D(y_ch, cv2.CV_32F, _SRM_KERNEL)
            res_cb = cv2.filter2D(cb_ch, cv2.CV_32F, _SRM_KERNEL)
            res_cr = cv2.filter2D(cr_ch, cv2.CV_32F, _SRM_KERNEL)

            # 1. Block-level SRM energy (16x16 blocks)
            h, w = res_y.shape
            bh, bw = max(h // 16, 1), max(w // 16, 1)
            crop = res_y[: bh * 16, : bw * 16]
            blocks = crop.reshape(bh, 16, bw, 16)
            block_stds = np.std(blocks, axis=(1, 3))

            y_p50 = float(np.percentile(block_stds, 50))
            y_p85 = float(np.percentile(block_stds, 85))
            y_p15 = float(np.percentile(block_stds, 15))
            spatial_spread = y_p85 - y_p15

            # 2. Chroma-to-luma SRM residual ratio
            y_std = float(np.std(res_y))
            chroma_std = 0.5 * (float(np.std(res_cb)) + float(np.std(res_cr)))
            chroma_ratio = chroma_std / (y_std + 1e-5)

            # Natural camera photos: y_p50 ~ 1.0-6.0, spatial_spread ~ 1.0-5.0, chroma_ratio ~ 0.22-0.65
            # AI/synthetic images: very smooth midtones (y_p50 < 0.7) OR unnatural chroma_ratio (< 0.16 or > 0.80)
            luma_ok = min(y_p50 / 1.8, 1.0)
            spread_ok = min(spatial_spread / 2.0, 1.0)
            if 0.20 <= chroma_ratio <= 0.68:
                chroma_ok = 1.0
            elif chroma_ratio < 0.20:
                chroma_ok = max(0.0, chroma_ratio / 0.20)
            else:
                chroma_ok = max(0.0, 1.0 - (chroma_ratio - 0.68) / 0.35)

            score = self._safe_score(0.45 * luma_ok + 0.30 * spread_ok + 0.25 * chroma_ok)

            if score >= 0.55:
                summary = f"SRM sensor residual matches natural camera noise (Y={y_p50:.2f}, chroma ratio={chroma_ratio:.2f})."
            else:
                summary = f"SRM residual shows synthetic smoothness or abnormal chroma noise (Y={y_p50:.2f}, chroma ratio={chroma_ratio:.2f})."

            return SignalResult(
                signal=self.name,
                score=score,
                confidence=0.65,
                weight=self.weight,
                summary=summary,
                details={
                    "srm_y_median": round(y_p50, 3),
                    "srm_spread": round(spatial_spread, 3),
                    "chroma_luma_ratio": round(chroma_ratio, 3),
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
