"""
Metadata & capture-origin forensics detector.
Extracts device (Make/Model/Lens), capture timestamp, camera settings (how it was taken),
software/AI signatures, and video container/stream origin artifacts.
"""
from __future__ import annotations

import re
import shutil
from typing import Any

import cv2
import structlog
from PIL import Image
from PIL.ExifTags import TAGS

from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()

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


def _extract_exif(path: str) -> tuple[dict[str, Any], tuple[int, int] | None, str | None]:
    try:
        with Image.open(path) as img:
            size = img.size
            fmt = img.format
            exif_data = img._getexif()  # type: ignore[attr-defined]
            if not exif_data:
                return {}, size, fmt
            return {TAGS.get(k, k): v for k, v in exif_data.items()}, size, fmt
    except Exception:
        return {}, None, None


def _fmt_ratio(val: Any) -> str | None:
    try:
        num = float(val)
        return f"{num:.1f}" if num % 1 else f"{int(num)}"
    except Exception:
        return str(val) if val is not None else None


def _extract_video_metadata(path: str) -> dict[str, Any]:
    details: dict[str, Any] = {}
    if shutil.which("ffprobe"):
        try:
            import ffmpeg  # type: ignore[import]
            probe = ffmpeg.probe(path)
            fmt = probe.get("format", {})
            tags = fmt.get("tags", {}) or {}
            vstream = next((s for s in probe.get("streams", []) if s.get("codec_type") == "video"), {})
            make = tags.get("com.apple.quicktime.make") or tags.get("make")
            model = tags.get("com.apple.quicktime.model") or tags.get("model")
            device = " ".join(x for x in [make, model] if x).strip() or None
            details = {
                "device": device or "Not recorded",
                "taken_at": tags.get("creation_time") or tags.get("com.apple.quicktime.creationdate") or "Not recorded",
                "software": tags.get("encoder") or tags.get("com.apple.quicktime.software") or "Not recorded",
                "capture_settings": f"{vstream.get('width', '?')}×{vstream.get('height', '?')} · {vstream.get('codec_name', 'unknown').upper()}",
                "format": fmt.get("format_name", "video"),
            }
            return details
        except Exception:
            pass

    cap = cv2.VideoCapture(path)
    try:
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        details = {
            "device": "Not recorded",
            "taken_at": "Not recorded",
            "software": "Not recorded",
            "capture_settings": f"{w}×{h} · {fps:.0f} fps" if w and h else "Video stream",
        }
    finally:
        cap.release()
    return details


class MetadataDetector(BaseDetector):
    name = "metadata"
    weight = 0.15

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        try:
            if media_type == "video":
                vmeta = _extract_video_metadata(media_path)
                has_device = vmeta.get("device") not in (None, "Not recorded")
                soft = str(vmeta.get("software", ""))
                if _AI_RE.search(soft):
                    return SignalResult(
                        signal=self.name,
                        score=0.0,
                        confidence=0.95,
                        weight=self.weight,
                        summary=f"AI tool signature found in video metadata: {soft}.",
                        details={**vmeta, "ai_signature": True},
                    )
                return SignalResult(
                    signal=self.name,
                    score=0.8 if has_device else 0.45,
                    confidence=0.7 if has_device else 0.5,
                    weight=self.weight,
                    summary=(
                        f"Video device metadata present ({vmeta['device']})."
                        if has_device
                        else "No camera/device metadata found in video container."
                    ),
                    details={**vmeta, "stripped": not has_device, "ai_signature": False},
                )

            exif, size, fmt = _extract_exif(media_path)
            dims = f"{size[0]}×{size[1]}" if size else "Unknown"

            if not exif:
                return SignalResult(
                    signal=self.name,
                    score=0.4,
                    confidence=0.6,
                    weight=self.weight,
                    summary="No EXIF metadata found. Metadata is often stripped from AI-generated images or web-shared photos.",
                    details={
                        "stripped": True,
                        "ai_signature": False,
                        "device": "Not recorded (stripped or synthetic)",
                        "taken_at": "Not recorded",
                        "capture_settings": f"{dims} · {fmt or 'Image'}",
                        "software": "Not recorded",
                    },
                )

            soft = str(exif.get("Software", "")).strip()
            creator = str(exif.get("Artist", "") or exif.get("Creator", "")).strip()
            comment = str(exif.get("UserComment", "") or exif.get("ImageDescription", "")).strip()
            combined = f"{soft} {creator} {comment}"

            make = str(exif.get("Make", "")).strip()
            model = str(exif.get("Model", "")).strip()
            lens = str(exif.get("LensModel", "")).strip()
            device = " ".join(x for x in [make, model] if x).strip() or "Not recorded"
            if lens and device != "Not recorded":
                device = f"{device} ({lens})"

            taken_at = str(
                exif.get("DateTimeOriginal")
                or exif.get("DateTimeDigitized")
                or exif.get("DateTime")
                or "Not recorded"
            )

            settings_parts = [dims]
            if exif.get("FocalLength"):
                settings_parts.append(f"{_fmt_ratio(exif.get('FocalLength'))}mm")
            if exif.get("FNumber"):
                settings_parts.append(f"f/{_fmt_ratio(exif.get('FNumber'))}")
            if exif.get("ExposureTime"):
                exp = exif.get("ExposureTime")
                try:
                    ef = float(exp)
                    settings_parts.append(f"1/{round(1/ef)}s" if 0 < ef < 1 else f"{ef:.1f}s")
                except Exception:
                    settings_parts.append(str(exp))
            if exif.get("ISOSpeedRatings"):
                settings_parts.append(f"ISO {exif.get('ISOSpeedRatings')}")
            capture_settings = " · ".join(settings_parts)

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
                        "device": device,
                        "taken_at": taken_at,
                        "capture_settings": capture_settings,
                        "software": soft or matched[0],
                        "matched": matched,
                    },
                )

            has_camera = bool(make or model)
            has_gps = "GPSInfo" in exif
            details: dict[str, Any] = {
                "fields_found": len(exif),
                "stripped": False,
                "ai_signature": False,
                "has_camera": has_camera,
                "has_gps": has_gps,
                "device": device,
                "taken_at": taken_at,
                "capture_settings": capture_settings,
                "software": soft or "Not recorded",
            }

            if has_camera:
                return SignalResult(
                    signal=self.name,
                    score=0.85,
                    confidence=0.75,
                    weight=self.weight,
                    summary=f"Camera metadata present ({device}). Consistent with a real camera capture.",
                    details=details,
                )

            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.5,
                weight=self.weight,
                summary="Metadata present without camera make/model or AI signatures.",
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
