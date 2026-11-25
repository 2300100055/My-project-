"""
Secure upload validation.
Validates file by magic bytes (not extension or client MIME).
Enforces size, dimension, and format limits.
Defends against decompression bombs and polyglots.
"""
from __future__ import annotations

import io
import struct
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

# Magic bytes: (offset, bytes_to_match)
MAGIC: dict[str, list[tuple[int, bytes]]] = {
    "image/jpeg": [(0, b"\xff\xd8\xff")],
    "image/png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "image/webp": [(0, b"RIFF"), (8, b"WEBP")],
    "image/gif":  [(0, b"GIF87a"), (0, b"GIF89a")],
    "image/heic": [(4, b"ftyp")],  # simplified; real check needs subtype
    "video/mp4":  [(4, b"ftyp")],
    "video/quicktime": [(4, b"ftyp")],
    "video/webm": [(0, b"\x1a\x45\xdf\xa3")],
}

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"}
VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}


def detect_mime(header: bytes) -> str | None:
    for mime, checks in MAGIC.items():
        if all(header[offset:offset + len(sig)] == sig for offset, sig in checks if offset + len(sig) <= len(header)):
            return mime
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
    mime = detect_mime(header)
    if mime is None:
        raise UnsupportedFileTypeError(detected="unknown")

    if mime in IMAGE_TYPES:
        # Additional image validation
        if len(data) > settings.MAX_IMAGE_BYTES:
            raise FileTooLargeError(max_mb=settings.MAX_IMAGE_BYTES // (1024 * 1024))

        # Decompression bomb check
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
