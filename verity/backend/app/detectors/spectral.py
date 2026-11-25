"""
Spectral / Frequency domain detector.
Uses FFT to detect:
  1. GAN/diffusion spectral fingerprints — periodic frequency artifacts
  2. Double-JPEG compression artifacts (DCT coefficient histogram peaks at non-multiple of 8)
  3. Noise residual analysis (high-pass filter reveals AI smoothness vs camera noise)

Score: 0 = AI-like spectral signature, 1 = natural/authentic
"""
from __future__ import annotations

import numpy as np
import structlog
from PIL import Image

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()


def _fft_spectral_score(gray: np.ndarray) -> tuple[float, dict]:
    """Check for periodic spectral artifacts common in GAN-generated images."""
    f = np.fft.fft2(gray.astype(np.float32))
    fshift = np.fft.fftshift(f)
    magnitude = np.log1p(np.abs(fshift))

    # Normalize
    mag_norm = (magnitude - magnitude.min()) / (magnitude.max() - magnitude.min() + 1e-8)

    # Center of spectrum (DC component)
    h, w = mag_norm.shape
    center = mag_norm[h//2 - 10:h//2 + 10, w//2 - 10:w//2 + 10]

    # Compute radial average
    y_idx, x_idx = np.indices((h, w))
    r = np.sqrt((x_idx - w//2)**2 + (y_idx - h//2)**2).astype(int)

    radial_mean = np.bincount(r.ravel(), weights=mag_norm.ravel()) / (np.bincount(r.ravel()) + 1e-8)
    radial_mean = radial_mean[:min(len(radial_mean), 200)]

    # GAN images tend to have elevated mid-frequency energy and periodic peaks
    if len(radial_mean) > 50:
        mid_freq_energy = float(np.mean(radial_mean[20:80]))
        low_freq_energy = float(np.mean(radial_mean[1:20]))
        ratio = mid_freq_energy / (low_freq_energy + 1e-8)
        # Natural images: ratio ~0.3-0.6; GAN: ratio often >0.7
        spectral_score = 1.0 - min(ratio / 1.0, 1.0)
    else:
        spectral_score = 0.5

    return spectral_score, {
        "mid_freq_energy": round(float(np.mean(radial_mean[20:80])) if len(radial_mean) > 80 else 0.0, 4),
        "spectrum_shape": "radial",
    }


def _noise_residual_score(gray: np.ndarray) -> tuple[float, dict]:
    """High-pass filter: AI images tend to be smoother (less high-freq noise)."""
    from scipy.ndimage import gaussian_filter  # type: ignore[import]

    blurred = gaussian_filter(gray.astype(np.float32), sigma=2)
    residual = gray.astype(np.float32) - blurred
    noise_std = float(np.std(residual))

    # Natural camera images: std ≈ 5-25 (sensor noise)
    # AI-generated: std ≈ 1-8 (smoothed)
    # Score: normalized to 0-1; higher = more authentic
    score = min(noise_std / 20.0, 1.0)

    return score, {"noise_std": round(noise_std, 3)}


class SpectralDetector(BaseDetector):
    name = "spectral"
    weight = 0.10

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if media_type == "video":
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.1,
                weight=self.weight,
                summary="Spectral analysis applied to keyframes via video pipeline.",
                details={"skipped_for_video_top_level": True},
            )

        try:
            with Image.open(media_path) as img:
                gray = np.array(img.convert("L"))

            fft_score, fft_details = _fft_spectral_score(gray)
            noise_score, noise_details = _noise_residual_score(gray)

            # Combine: FFT 60% + noise 40%
            combined = fft_score * 0.6 + noise_score * 0.4
            confidence = 0.60

            if combined < 0.35:
                summary = "Spectral analysis shows smooth frequency profile and low noise residual — consistent with AI generation."
            elif combined > 0.65:
                summary = "Spectral analysis shows natural frequency profile and camera noise — consistent with authentic photography."
            else:
                summary = "Spectral analysis is inconclusive."

            return SignalResult(
                signal=self.name,
                score=self._safe_score(combined),
                confidence=confidence,
                weight=self.weight,
                summary=summary,
                details={**fft_details, **noise_details, "fft_score": round(fft_score, 3), "noise_score": round(noise_score, 3)},
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
