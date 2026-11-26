"""
Fusion service: confidence-weighted combination of forensic signals into a clear
Human vs AI verdict, 0-100 score, and reliability indicator.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

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

    if width and height and (width < 128 or height < 128):
        factor *= 0.7
        notes.append("very low resolution (<128px)")

    if jpeg_quality is not None and jpeg_quality < 45:
        factor *= 0.75
        notes.append(f"heavy JPEG compression (Q={jpeg_quality})")

    if duration_s is not None and duration_s < 0.5:
        factor *= 0.65
        notes.append("very short duration (<0.5s)")

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
    """Fuse active (confidence > 0) signal results into a decisive AnalysisResult."""
    # Only include signals that actually ran (confidence > 0), weighted by weight * confidence
    active_signals = [s for s in signals if s.confidence > 0.0 and s.weight > 0.0]
    if not active_signals:
        raw_score = 0.5
    else:
        weighted_sum = sum(s.score * s.weight * s.confidence for s in active_signals)
        total_eff_weight = sum(s.weight * s.confidence for s in active_signals)
        raw_score = weighted_sum / total_eff_weight if total_eff_weight > 0 else 0.5

    # Hard override: verified AI generator signature in metadata/C2PA tampering
    ai_meta = next((s for s in signals if s.signal == "metadata" and s.details.get("ai_signature")), None)
    if ai_meta is not None:
        raw_score = min(raw_score, 0.15)

    # Strong ML AI detection override: if pretrained ViT classifier is confident it's AI
    ml_sig = next((s for s in signals if s.signal == "ml_classifier" and s.confidence >= 0.55 and s.score <= 0.25), None)
    if ml_sig is not None:
        raw_score = min(raw_score, 0.40)

    reliability_level, reliability_note, rel_factor = _reliability(
        image_width, image_height, jpeg_quality, video_duration_s
    )

    final_raw = raw_score * rel_factor + 0.5 * (1.0 - rel_factor)
    final_score = round(final_raw * 100, 1)

    # Clear, decisive verdict: Human (>= 50), AI (< 50), Inconclusive only if reliability is LOW and score is near 50
    if reliability_level == ReliabilityLevel.LOW and 45 <= final_score <= 55:
        verdict = Verdict.INCONCLUSIVE
    elif final_score >= 50.0:
        verdict = Verdict.LIKELY_AUTHENTIC
    else:
        verdict = Verdict.LIKELY_AI_GENERATED

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
    active = [s for s in signals if s.confidence > 0.0]
    if verdict == Verdict.LIKELY_AI_GENERATED:
        dominant = min(active or signals, key=lambda s: s.score, default=None)
        trigger = f"Primary indicator ({dominant.signal}): {dominant.summary}" if dominant else ""
        return (
            f"Classified as AI-Generated / Manipulated (authenticity score {score:.0f}/100). "
            f"{trigger}"
        )
    elif verdict == Verdict.INCONCLUSIVE:
        return (
            f"Signals are closely balanced (authenticity score {score:.0f}/100). "
            "Review the Capture & Origin Artifacts and individual forensic signals below."
        )
    else:
        dominant = max(active or signals, key=lambda s: s.score, default=None)
        trigger = f"Strongest natural signal ({dominant.signal}): {dominant.summary}" if dominant else ""
        return (
            f"Classified as Human / Normal Media (authenticity score {score:.0f}/100). "
            f"{trigger}"
        )
