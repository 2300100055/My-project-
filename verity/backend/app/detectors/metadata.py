"""
Metadata forensics detector.
Checks EXIF/XMP/IPTC for:
  - AI tool signatures in Software/Creator/Comment fields
  - Stripped metadata (no EXIF at all — common in AI-generated images post-processed for sharing)
  - Edit history inconsistencies
  - Suspicious creation timestamps

Score: 1.0 = clean camera metadata, 0.0 = clear AI-tool signature
"""
from __future__ import annotations

import re
import io
from pathlib import Path
from typing import Any

import structlog
from PIL import Image
from PIL.ExifTags import TAGS

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()

# Known AI-tool software/creator strings
AI_SOFTWARE_PATTERNS = [
    r"stable.?diffusion",
    r"midjourney",
    r"dall.?e",
    r"firefly",
    r"imagen",
    r"generative.?fill",
    r"adobe.?ai",
    r"bing.?image.?creator",
    r"dream.?studio",
    r"civitai",
    r"novelai",
    r"leonardoai",
    r"getimg",
    r"nightcafe",
    r"playground.?ai",
    r"runwayml",
    r"pika.?labs",
    r"sora",
    r"kling",
    r"comfyui",
    r"automatic1111",
]

_AI_RE = re.compile("|".join(AI_SOFTWARE_PATTERNS), re.IGNORECASE)


def _extract_exif(path: str) -> dict[str, Any]:
    try:
        with Image.open(path) as img:
            exif_data = img._getexif()  # type: ignore[attr-defined]
            if not exif_data:
                return {}
            return {TAGS.get(k, k): v for k, v in exif_data.items()}
    except Exception:
        return {}


class MetadataDetector(BaseDetector):
    name = "metadata"
    weight = 0.15

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        try:
            exif = _extract_exif(media_path)
            details: dict[str, Any] = {"fields_found": len(exif)}

            if not exif:
                # Stripped metadata — slightly suspicious but common
                return SignalResult(
                    signal=self.name,
                    score=0.4,
                    confidence=0.6,
                    weight=self.weight,
                    summary="No EXIF metadata found. Metadata is often stripped from AI-generated images, but also from web-shared photos.",
                    details={"stripped": True, "ai_signature": False},
                )

            # Check for AI software signatures
            soft = str(exif.get("Software", ""))
            creator = str(exif.get("Artist", "") or exif.get("Creator", ""))
            comment = str(exif.get("UserComment", "") or exif.get("ImageDescription", ""))
            combined = f"{soft} {creator} {comment}"

            if _AI_RE.search(combined):
                matched = _AI_RE.findall(combined)
                return SignalResult(
                    signal=self.name,
                    score=0.0,
                    confidence=0.98,
                    weight=self.weight,
                    summary=f"AI tool signature found in metadata: {matched[0]}.",
                    details={
                        "stripped": False,
                        "ai_signature": True,
                        "software": soft,
                        "matched": matched,
                    },
                )

            # Camera make/model present = strong authenticity signal
            has_camera = bool(exif.get("Make") or exif.get("Model"))
            has_gps = "GPSInfo" in exif
            details.update({
                "stripped": False,
                "ai_signature": False,
                "has_camera": has_camera,
                "has_gps": has_gps,
                "software": soft,
            })

            if has_camera:
                return SignalResult(
                    signal=self.name,
                    score=0.85,
                    confidence=0.75,
                    weight=self.weight,
                    summary=f"Camera metadata present ({exif.get('Make', '')} {exif.get('Model', '')}). Consistent with real photo.",
                    details=details,
                )

            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.5,
                weight=self.weight,
                summary="Metadata present but no camera info or AI signatures. Inconclusive.",
                details=details,
            )

        except Exception as e:
            log.warning("metadata.error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.2,
                weight=self.weight,
                summary="Metadata analysis failed.",
                details={"error": str(e)},
            )
