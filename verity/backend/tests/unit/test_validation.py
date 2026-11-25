"""Unit tests for validation module."""
import io
import struct
import pytest
from unittest.mock import patch

# Mock the PIL dependency for testing
import sys
from types import ModuleType

# We test validation logic directly
from app.core.errors import (
    FileTooLargeError,
    UnsupportedFileTypeError,
    CorruptFileError,
)
from app.utils.validation import detect_mime, MAGIC, IMAGE_TYPES, VIDEO_TYPES


def _make_jpeg_header() -> bytes:
    return b"\xff\xd8\xff\xe0" + b"\x00" * 60

def _make_png_header() -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 56

def _make_webm_header() -> bytes:
    return b"\x1a\x45\xdf\xa3" + b"\x00" * 60


class TestDetectMime:
    def test_jpeg_detected(self):
        assert detect_mime(_make_jpeg_header()) == "image/jpeg"

    def test_png_detected(self):
        assert detect_mime(_make_png_header()) == "image/png"

    def test_webm_detected(self):
        assert detect_mime(_make_webm_header()) == "video/webm"

    def test_unknown_returns_none(self):
        assert detect_mime(b"\x00\x00\x00\x00" * 16) is None

    def test_webp_detected(self):
        # RIFF????WEBP
        header = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 48
        assert detect_mime(header) == "image/webp"


class TestImageTypes:
    def test_image_types_are_images(self):
        for t in IMAGE_TYPES:
            assert t.startswith("image/")

    def test_video_types_are_videos(self):
        for t in VIDEO_TYPES:
            assert t.startswith("video/")
