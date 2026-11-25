"""
Fusion service: combine per-signal results into a final score, verdict, and reliability.
See /docs/DECISIONS.md for the full formula and weight rationale.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.schemas import (
    AnalysisResult,
    ReliabilityLevel,
    SignalResult,
    Verdict,
)


def _reliability(
    width: int | None,
    height: int | None,
    jpeg_quality: int | None,
    duration_s: float | None,
) -> tuple[ReliabilityLevel, str | None, float]:
    """Return (level, note, factor 0-1)."""
    factor = 1.0
    notes = []

    # Low resolution
    if width and height and (width < 256 or height < 256):
        factor *= 0.6
        notes.append("low resolution (<256px)")

    # Heavy JPEG compression
    if jpeg_quality is not None and jpeg_quality < 50:
        factor *= 0.7
        notes.append(f"heavy JPEG compression (Q={jpeg_quality})")

    # Very short video
    if duration_s is not None and duration_s < 1.0:
        factor *= 0.5
        notes.append("very short duration (<1s)")

    note = f"Reliability reduced due to: {', '.join(notes)}." if notes else None

    if factor >= 0.8:
        level = ReliabilityLevel.HIGH
    elif factor >= 0.5:
        level = ReliabilityLevel.MEDIUM
    else:
        level = ReliabilityLevel.LOW

    return level, note, factor


def fuse(
    job_id: UUID,
    media_type: str,
    filename: str,
    file_size_bytes: int,
    signals: list[SignalResult],
    *,
    image_width: int | None = None,
    image_height: int | None = None,
    jpeg_quality: int | None = None,
    video_duration_s: float | None = None,
    frames_analyzed: int | None = None,
    video_timeline: list | None = None,
) -> AnalysisResult:
    """Fuse signal results into a final AnalysisResult."""
    # Weighted sum (each signal has own weight; they should sum to ~1.0)
    total_weight = sum(s.weight for s in signals)
    if total_weight == 0:
        total_weight = 1.0

    raw_score = sum(s.score * s.weight for s in signals) / total_weight

    # Reliability
    reliability_level, reliability_note, rel_factor = _reliability(
        image_width, image_height, jpeg_quality, video_duration_s
    )

    # Pull toward center when low reliability
    final_raw = raw_score * rel_factor + 0.5 * (1 - rel_factor)
    final_score = round(final_raw * 100, 1)

    # Verdict bands
    if final_score >= 65:
        verdict = Verdict.LIKELY_AUTHENTIC
    elif final_score >= 35:
        verdict = Verdict.INCONCLUSIVE
    else:
        verdict = Verdict.LIKELY_AI_GENERATED

    # Plain English summary
    summary = _build_summary(verdict, signals, final_score)

    return AnalysisResult(
        job_id=job_id,
        media_type=media_type,
        filename=filename,
        file_size_bytes=file_size_bytes,
        analyzed_at=datetime.now(timezone.utc),
        score=final_score,
        verdict=verdict,
        reliability=reliability_level,
        reliability_note=reliability_note,
        plain_english_summary=summary,
        signals=signals,
        video_timeline=video_timeline,
        video_duration_s=video_duration_s,
        frames_analyzed=frames_analyzed,
    )


def _build_summary(verdict: Verdict, signals: list[SignalResult], score: float) -> str:
    dominant = min(signals, key=lambda s: s.score, default=None)
    if verdict == Verdict.LIKELY_AI_GENERATED:
        trigger = f"The strongest indicator was {dominant.signal}: {dominant.summary}" if dominant else ""
        return (
            f"This content shows strong signs of AI generation or manipulation (confidence score: {score:.0f}/100). "
            f"{trigger} Multiple forensic signals point in this direction, though no result is ever certain."
        )
    elif verdict == Verdict.INCONCLUSIVE:
        return (
            f"The analysis is inconclusive (score: {score:.0f}/100). "
            "Some signals suggest AI generation while others do not. "
            "Consider the individual signal details below before drawing conclusions."
        )
    else:
        return (
            f"No strong indicators of AI generation were found (confidence score: {score:.0f}/100). "
            "However, 'not detected' never means 'authentic'. "
            "AI-generated content without forensic artifacts may still score highly here."
        )
