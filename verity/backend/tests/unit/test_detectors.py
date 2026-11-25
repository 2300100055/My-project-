"""Unit tests for individual forensic detectors."""
import io
import tempfile
from pathlib import Path

import pytest
from PIL import Image

from app.detectors.ela import ELADetector
from app.detectors.metadata import MetadataDetector
from app.detectors.noise import NoiseResidualDetector
from app.detectors.spectral import SpectralDetector


@pytest.fixture
def sample_jpeg(tmp_path: Path) -> str:
    p = tmp_path / "sample.jpg"
    img = Image.new("RGB", (128, 128), color=(120, 140, 160))
    img.save(p, "JPEG", quality=90)
    return str(p)


class TestDetectors:
    async def test_ela_returns_valid_signal(self, sample_jpeg: str):
        res = await ELADetector().analyze(sample_jpeg, "image")
        assert res.signal == "ela"
        assert 0.0 <= res.score <= 1.0
        assert 0.0 <= res.confidence <= 1.0

    async def test_spectral_returns_valid_signal(self, sample_jpeg: str):
        res = await SpectralDetector().analyze(sample_jpeg, "image")
        assert res.signal == "spectral"
        assert 0.0 <= res.score <= 1.0

    async def test_noise_returns_valid_signal(self, sample_jpeg: str):
        res = await NoiseResidualDetector().analyze(sample_jpeg, "image")
        assert res.signal == "noise_residual"
        assert 0.0 <= res.score <= 1.0

    async def test_metadata_stripped_returns_neutral_low(self, sample_jpeg: str):
        res = await MetadataDetector().analyze(sample_jpeg, "image")
        assert res.signal == "metadata"
        assert res.details.get("stripped") is True
        assert 0.0 <= res.score <= 1.0
