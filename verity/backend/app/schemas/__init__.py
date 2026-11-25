"""Pydantic v2 schemas for all API contracts."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── Verdict ──────────────────────────────────────────────────────────────────

class Verdict(str, Enum):
    LIKELY_AUTHENTIC = "likely_authentic"
    INCONCLUSIVE = "inconclusive"
    LIKELY_AI_GENERATED = "likely_ai_generated"


class ReliabilityLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ── Per-signal result ─────────────────────────────────────────────────────────

class SignalResult(BaseModel):
    """Result for a single detector signal."""
    signal: str = Field(description="Signal name, e.g. 'provenance', 'metadata', 'ela'")
    score: float = Field(ge=0, le=1, description="0 = AI-generated/manipulated; 1 = authentic")
    confidence: float = Field(ge=0, le=1, description="Confidence in this signal's reading")
    weight: float = Field(ge=0, le=1, description="Weight in fusion")
    summary: str = Field(description="Plain-English one-line explanation")
    details: dict = Field(default_factory=dict, description="Signal-specific details")
    heatmap_url: Optional[str] = Field(None, description="URL to heatmap image if available")


# ── Video timeline ────────────────────────────────────────────────────────────

class VideoSegment(BaseModel):
    start_s: float
    end_s: float
    score: float = Field(ge=0, le=1)
    verdict: Verdict
    dominant_signal: str


# ── Full analysis result ──────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    job_id: UUID
    media_type: str                       # "image" | "video"
    filename: str
    file_size_bytes: int
    analyzed_at: datetime

    # Fused output
    score: float = Field(ge=0, le=100, description="0=AI-generated, 100=Authentic")
    verdict: Verdict
    reliability: ReliabilityLevel
    reliability_note: Optional[str] = None

    # Summary
    plain_english_summary: str
    limitation_notice: str = (
        "These results are informational only. "
        "'Not detected' never means 'authentic'. "
        "No result claims certainty. "
        "Heavily compressed or resized media reduces accuracy."
    )

    # Per-signal
    signals: list[SignalResult]

    # Video only
    video_timeline: Optional[list[VideoSegment]] = None
    video_duration_s: Optional[float] = None
    frames_analyzed: Optional[int] = None


# ── Job schemas ───────────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class JobStatusResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    progress: Optional[float] = Field(None, ge=0, le=1)
    step: Optional[str] = None
    error: Optional[str] = None
    result_url: Optional[str] = None


# ── Upload response ───────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    job_id: UUID
    status_url: str
    result_url: str
    estimated_seconds: int
