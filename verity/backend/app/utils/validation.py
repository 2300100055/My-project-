"""
Secure upload validation.
Validates file by magic bytes (not extension or client MIME).
Enforces size, dimension, and format limits.
Defends against decompression bombs and polyglots.
"""
from __future__ import annotations

import io
from pathlib import Path

import structlog
from PIL import Image

from app.core.config import settings
from app.core.errors import (
    CorruptFileError,
    DecompressionBombError,
    FileTooLargeError,
    UnsupportedFileTypeError,
)

log = structlog.get_logger()

HEIC_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"}
MOV_BRANDS = {b"qt  "}

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"}
VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}


def detect_mime(header: bytes, filename: str = "") -> str | None:
    if len(header) >= 3 and header[0:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(header) >= 8 and header[0:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(header) >= 12 and header[0:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    if len(header) >= 6 and header[0:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if len(header) >= 4 and header[0:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    if len(header) >= 12 and header[4:8] == b"ftyp":
        brand = header[8:12]
        if brand in HEIC_BRANDS:
            return "image/heic"
        if brand in MOV_BRANDS or filename.lower().endswith(".mov"):
            return "video/quicktime"
        return "video/mp4"
    return None


def validate_upload(data: bytes, original_filename: str) -> tuple[str, str]:
    """
    Validate uploaded file bytes.

    Returns:
        (mime_type, media_type) where media_type is 'image' or 'video'

    Raises:
        FileTooLargeError, UnsupportedFileTypeError, CorruptFileError, DecompressionBombError
    """
    max_size = max(settings.MAX_IMAGE_BYTES, settings.MAX_VIDEO_BYTES)
    if len(data) > max_size:
        raise FileTooLargeError(max_mb=max_size // (1024 * 1024))

    header = data[:64]
    mime = detect_mime(header, original_filename)
    if mime is None:
        raise UnsupportedFileTypeError(detected="unknown")

    if mime in IMAGE_TYPES:
        if len(data) > settings.MAX_IMAGE_BYTES:
            raise FileTooLargeError(max_mb=settings.MAX_IMAGE_BYTES // (1024 * 1024))

        Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS
        try:
            with Image.open(io.BytesIO(data)) as img:
                w, h = img.size
                if w > settings.MAX_IMAGE_DIM or h > settings.MAX_IMAGE_DIM:
                    raise DecompressionBombError()
        except DecompressionBombError:
            raise
        except Exception:
            raise CorruptFileError()

        return mime, "image"

    elif mime in VIDEO_TYPES:
        if len(data) > settings.MAX_VIDEO_BYTES:
            raise FileTooLargeError(max_mb=settings.MAX_VIDEO_BYTES // (1024 * 1024))
        return mime, "video"

    raise UnsupportedFileTypeError(detected=mime)
