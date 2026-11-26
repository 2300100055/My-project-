"""
Spectral / 2D FFT frequency-domain detector.
Measures the azimuthal radial power spectrum and 1/f^alpha falloff slope + high-frequency detail.
Natural images follow a smooth 1/f^alpha decay; GAN/diffusion images show spectral spikes or steep roll-off.
"""
from __future__ import annotations

import numpy as np
import structlog
from PIL import Image

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()


def _analyze_spectrum(gray: np.ndarray) -> tuple[float, dict]:
    h, w = gray.shape
    # Center-crop to square up to 512x512 for consistent radial binning
    side = min(h, w, 512)
    y0, x0 = (h - side) // 2, (w - side) // 2
    patch = gray[y0 : y0 + side, x0 : x0 + side].astype(np.float32)

    # Apply Hann window to eliminate boundary wrap-around artifacts
    win_y = np.hanning(side)[:, None]
    win_x = np.hanning(side)[None, :]
    patch = (patch - np.mean(patch)) * (win_y * win_x)

    f = np.fft.fft2(patch)
    fshift = np.fft.fftshift(f)
    power = np.abs(fshift) ** 2

    cy, cx = side // 2, side // 2
    y_idx, x_idx = np.indices((side, side))
    r = np.sqrt((x_idx - cx) ** 2 + (y_idx - cy) ** 2).astype(int)

    max_r = side // 2
    radial_sum = np.bincount(r.ravel(), weights=power.ravel())
    radial_cnt = np.bincount(r.ravel())
    radial_mean = radial_sum[:max_r] / (radial_cnt[:max_r] + 1e-8)

    if len(radial_mean) < 20:
        return 0.5, {"slope": 0.0, "peak_ratio": 0.0}

    freqs = np.arange(2, len(radial_mean))
    vals = np.log10(radial_mean[2:] + 1e-6)
    log_f = np.log10(freqs)

    # Linear fit in log-log space: natural images have slope ~ -2.0 to -3.0
    slope, intercept = np.polyfit(log_f, vals, 1)
    fit_line = slope * log_f + intercept
    residuals = vals - fit_line

    # Periodic spikes above the 1/f fit (common in GAN/diffusion upsamplers)
    peak_prominence = float(np.percentile(np.abs(residuals), 95))
    # High-freq retention vs mid-freq
    high_energy = float(np.mean(vals[len(vals) // 2 :]))
    mid_energy = float(np.mean(vals[: len(vals) // 3]))
    hf_drop = mid_energy - high_energy

    # Natural photos: slope in [-3.2, -1.6], low peak_prominence (< 0.35), moderate hf_drop (< 3.5)
    slope_ok = 1.0 - min(abs(slope - (-2.3)) / 1.5, 1.0)
    spike_ok = max(0.0, 1.0 - max(0.0, peak_prominence - 0.12) / 0.45)
    hf_ok = max(0.0, 1.0 - max(0.0, hf_drop - 1.8) / 2.2)

    # Cap spectral score at 0.72 so H.264/JPEG block edges never over-inflate synthetic media
    raw = 0.35 * slope_ok + 0.35 * spike_ok + 0.30 * hf_ok
    score = max(0.0, min(0.72, raw * 0.85))
    return score, {
        "spectral_slope": round(float(slope), 3),
        "peak_prominence": round(peak_prominence, 3),
        "hf_dropoff": round(hf_drop, 3),
    }


class SpectralDetector(BaseDetector):
    name = "spectral"
    weight = 0.25

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if media_type == "video":
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="Spectral analysis applied to keyframes via video pipeline.",
                details={"skipped_for_video_top_level": True},
            )

        try:
            with Image.open(media_path) as img:
                gray = np.array(img.convert("L"))

            score, details = _analyze_spectrum(gray)
            score = self._safe_score(score)

            if score >= 0.55:
                summary = f"2D FFT spectrum follows natural 1/f decay (slope {details['spectral_slope']})."
            else:
                summary = f"2D FFT spectrum shows synthetic roll-off or periodic peaks (slope {details['spectral_slope']}, spikes {details['peak_prominence']})."

            return SignalResult(
                signal=self.name,
                score=score,
                confidence=0.75,
                weight=self.weight,
                summary=summary,
                details=details,
            )

        except Exception as e:
            log.warning("spectral.error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="Spectral analysis failed.",
                details={"error": str(e)},
            )
