"""
Image analysis pipeline.
Runs all image detectors and fuses results.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import UUID

import structlog
from PIL import Image

from app.core.config import settings
from app.detectors.c2pa_check import C2PADetector
from app.detectors.ela import ELADetector
from app.detectors.metadata import MetadataDetector
from app.detectors.ml_classifier import MLClassifierDetector
from app.detectors.noise import NoiseResidualDetector
from app.detectors.spectral import SpectralDetector
from app.schemas import AnalysisResult
from app.services.fusion import fuse

log = structlog.get_logger()

_DETECTORS = [
    C2PADetector(),
    MetadataDetector(),
    ELADetector(),
    SpectralDetector(),
    NoiseResidualDetector(),
    MLClassifierDetector(),
]


async def run_image_pipeline(
    job_id: UUID,
    media_path: str,
    filename: str,
    file_size_bytes: int,
    progress_callback=None,
) -> AnalysisResult:
    """Run all image detectors concurrently, then fuse."""
    steps = [
        "Checking provenance",
        "Analyzing metadata",
        "Running error level analysis",
        "Running spectral analysis",
        "Running ML classifier",
        "Fusing evidence",
    ]

    async def _run_one(detector, step_idx: int):
        if progress_callback:
            await progress_callback(step_idx / len(_DETECTORS), steps[step_idx])
        log.info("pipeline.detector.start", detector=detector.name, job_id=str(job_id))
        result = await detector.analyze(media_path, "image")
        log.info("pipeline.detector.done", detector=detector.name, score=result.score)
        return result

    tasks = [_run_one(det, i) for i, det in enumerate(_DETECTORS)]
    signals = await asyncio.gather(*tasks, return_exceptions=False)

    if progress_callback:
        await progress_callback(0.95, "Fusing evidence")

    # Get image dimensions and JPEG quality for reliability calc
    width, height, jpeg_quality = None, None, None
    try:
        with Image.open(media_path) as img:
            width, height = img.size
            if hasattr(img, "_getexif") and img.format == "JPEG":
                info = img.info
                jpeg_quality = info.get("quality")
    except Exception:
        pass

    result = fuse(
        job_id=job_id,
        media_type="image",
        filename=filename,
        file_size_bytes=file_size_bytes,
        signals=list(signals),
        image_width=width,
        image_height=height,
        jpeg_quality=jpeg_quality,
    )

    if progress_callback:
        await progress_callback(1.0, "Complete")

    return result
