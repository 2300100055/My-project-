"""
ML classifier detector.
Uses HuggingFace `umm-maybe/AI-image-detector` (MIT license).
ViT-based binary classifier: returns probability of AI-generation.

Swappable via config: set ML_MODEL_ID to any HuggingFace model
with compatible architecture (binary classification, image input).

Temperature scaling calibration applied for better-calibrated probabilities.
"""
from __future__ import annotations

import asyncio
import functools
from pathlib import Path
from typing import Any

import numpy as np
import structlog
from PIL import Image

from app.core.config import settings
from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()

_pipeline: Any = None
_pipeline_lock = asyncio.Lock()


async def _get_pipeline() -> Any:
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    async with _pipeline_lock:
        if _pipeline is not None:
            return _pipeline
        try:
            from transformers import pipeline as hf_pipeline  # type: ignore[import]
            log.info("ml.loading_model", model_id=settings.ML_MODEL_ID)
            # Run in thread pool so we don't block the event loop
            loop = asyncio.get_event_loop()
            _pipeline = await loop.run_in_executor(
                None,
                functools.partial(
                    hf_pipeline,
                    "image-classification",
                    model=settings.ML_MODEL_ID,
                    device=settings.ML_DEVICE,
                ),
            )
            log.info("ml.model_loaded")
        except Exception as e:
            log.error("ml.load_failed", error=str(e))
            _pipeline = None
    return _pipeline


def _temperature_scale(logit: float, temperature: float) -> float:
    """Apply temperature scaling for calibration."""
    return 1.0 / (1.0 + np.exp(-logit / temperature))


class MLClassifierDetector(BaseDetector):
    name = "ml_classifier"
    weight = 0.35

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        if not settings.ML_ENABLED:
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="ML classifier disabled in configuration.",
                details={"enabled": False},
            )

        pipe = await _get_pipeline()
        if pipe is None:
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="ML classifier unavailable (model failed to load).",
                details={"error": "model_unavailable"},
            )

        try:
            loop = asyncio.get_event_loop()
            with Image.open(media_path) as img:
                img_rgb = img.convert("RGB").resize((224, 224))

            results = await loop.run_in_executor(None, lambda: pipe(img_rgb))
            # results: [{"label": "artificial", "score": 0.95}, {"label": "human", "score": 0.05}]

            label_map: dict[str, float] = {r["label"].lower(): r["score"] for r in results}
            # Map to: p(authentic) = p(human)
            p_human = label_map.get("human", label_map.get("real", 0.5))
            p_ai = label_map.get("artificial", label_map.get("ai", 1 - p_human))

            # Apply temperature scaling
            # Convert to logit space
            eps = 1e-7
            p_ai_clamped = max(eps, min(1 - eps, p_ai))
            logit = np.log(p_ai_clamped / (1 - p_ai_clamped))
            p_ai_calibrated = _temperature_scale(float(logit), settings.ML_TEMPERATURE)
            score = 1.0 - p_ai_calibrated  # invert: higher = more authentic

            confidence = max(0.55, min(abs(score - 0.5) * 2.0, 0.95))

            if score < 0.35:
                summary = f"ML classifier: {p_ai_calibrated:.0%} probability of AI generation (high confidence)."
            elif score > 0.65:
                summary = f"ML classifier: {(1-p_ai_calibrated):.0%} probability of authentic content."
            else:
                summary = "ML classifier result is inconclusive."

            return SignalResult(
                signal=self.name,
                score=self._safe_score(score),
                confidence=confidence,
                weight=0.45,
                summary=summary,
                details={
                    "model": settings.ML_MODEL_ID,
                    "p_ai_raw": round(p_ai, 4),
                    "p_ai_calibrated": round(p_ai_calibrated, 4),
                    "temperature": settings.ML_TEMPERATURE,
                    "raw_labels": results,
                },
            )

        except Exception as e:
            log.warning("ml.inference_error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="ML classifier encountered an error.",
                details={"error": str(e)},
            )
