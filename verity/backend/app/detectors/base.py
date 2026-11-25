"""Abstract base class for all detectors."""
from __future__ import annotations

import abc
from typing import Any

from app.schemas import SignalResult


class BaseDetector(abc.ABC):
    """Every detector must implement this interface."""

    name: str
    weight: float

    @abc.abstractmethod
    async def analyze(self, media_path: str, media_type: str, **kwargs: Any) -> SignalResult:
        """
        Analyze the given media file.

        Args:
            media_path: Absolute path to the (temp) media file.
            media_type: 'image' or 'video'

        Returns:
            SignalResult with score 0..1 (0=AI/manipulated, 1=authentic)
        """
        ...

    def _safe_score(self, raw: float) -> float:
        return max(0.0, min(1.0, float(raw)))
