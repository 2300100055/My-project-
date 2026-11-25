"""Unit tests for fusion service."""
import uuid
from datetime import datetime, timezone

import pytest
from app.schemas import SignalResult, Verdict, ReliabilityLevel
from app.services.fusion import fuse, _reliability


def _sig(signal: str, score: float, weight: float = 0.25, confidence: float = 0.8) -> SignalResult:
    return SignalResult(signal=signal, score=score, confidence=confidence, weight=weight,
                        summary="test", details={})


class TestReliability:
    def test_high_resolution_high_reliability(self):
        level, note, factor = _reliability(1920, 1080, None, None)
        assert level == ReliabilityLevel.HIGH
        assert factor >= 0.8
        assert note is None

    def test_low_resolution_reduces_reliability(self):
        level, note, factor = _reliability(100, 100, None, None)
        assert factor < 0.8
        assert note is not None
        assert "resolution" in note

    def test_heavy_compression_reduces_reliability(self):
        level, note, factor = _reliability(1920, 1080, 30, None)
        assert factor < 0.8
        assert note is not None


class TestFuse:
    def test_low_signal_scores_give_ai_verdict(self):
        signals = [_sig("provenance", 0.1, 0.30), _sig("ml", 0.1, 0.35),
                   _sig("ela", 0.1, 0.10), _sig("spectral", 0.1, 0.10),
                   _sig("metadata", 0.1, 0.15)]
        result = fuse(uuid.uuid4(), "image", "test.jpg", 100000, signals)
        assert result.verdict == Verdict.LIKELY_AI_GENERATED
        assert result.score < 35

    def test_high_signal_scores_give_authentic_verdict(self):
        signals = [_sig("provenance", 0.9, 0.30), _sig("ml", 0.9, 0.35),
                   _sig("ela", 0.9, 0.10), _sig("spectral", 0.9, 0.10),
                   _sig("metadata", 0.9, 0.15)]
        result = fuse(uuid.uuid4(), "image", "test.jpg", 100000, signals)
        assert result.verdict == Verdict.LIKELY_AUTHENTIC
        assert result.score >= 65

    def test_mixed_signals_inconclusive(self):
        signals = [_sig("provenance", 0.5, 0.30), _sig("ml", 0.5, 0.35),
                   _sig("ela", 0.5, 0.10), _sig("spectral", 0.5, 0.10),
                   _sig("metadata", 0.5, 0.15)]
        result = fuse(uuid.uuid4(), "image", "test.jpg", 100000, signals)
        assert result.verdict == Verdict.INCONCLUSIVE
        assert 35 <= result.score < 65

    def test_result_has_limitation_notice(self):
        signals = [_sig("ml", 0.5, 1.0)]
        result = fuse(uuid.uuid4(), "image", "test.jpg", 100000, signals)
        assert "never means" in result.limitation_notice
