"""
Metadata & capture-origin forensics detector.
Checks EXIF, PNG text chunks (Stable Diffusion / ComfyUI / Midjourney prompts),
camera hardware tags, capture settings, and video container tags.
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
    r"steps:\s*\d+,\s*sampler:",
    r"negative prompt:",
]

_AI_RE = re.compile("|".join(AI_SOFTWARE_PATTERNS), re.IGNORECASE)


def _extract_image_meta(path: str) -> tuple[dict[str, Any], dict[str, Any], tuple[int, int] | None, str | None]:
    try:
        with Image.open(path) as img:
            size = img.size
            fmt = img.format
            info = {str(k): str(v)[:500] for k, v in (img.info or {}).items() if isinstance(v, (str, bytes))}
            exif_data = img._getexif()  # type: ignore[attr-defined]
            exif = {TAGS.get(k, k): v for k, v in exif_data.items()} if exif_data else {}
            return exif, info, size, fmt
    except Exception:
        return {}, {}, None, None


def _fmt_ratio(val: Any) -> str | None:
    try:
        num = float(val)
        return f"{num:.1f}" if num % 1 else f"{int(num)}"
    except Exception:
        return str(val) if val is not None else None


def _extract_video_metadata(path: str) -> dict[str, Any]:
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
            return {
                "device": device or "Not recorded",
                "taken_at": tags.get("creation_time") or tags.get("com.apple.quicktime.creationdate") or "Not recorded",
                "software": tags.get("encoder") or tags.get("com.apple.quicktime.software") or "Not recorded",
                "capture_settings": f"{vstream.get('width', '?')}×{vstream.get('height', '?')} · {vstream.get('codec_name', 'unknown').upper()}",
                "format": fmt.get("format_name", "video"),
            }
        except Exception:
            pass

    cap = cv2.VideoCapture(path)
    try:
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        return {
            "device": "Not recorded",
            "taken_at": "Not recorded",
            "software": "Not recorded",
            "capture_settings": f"{w}×{h} · {fps:.0f} fps" if w and h else "Video stream",
        }
    finally:
        cap.release()


class MetadataDetector(BaseDetector):
    name = "metadata"
    weight = 0.25

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        try:
            if media_type == "video":
                vmeta = _extract_video_metadata(media_path)
                has_device = vmeta.get("device") not in (None, "Not recorded")
                soft = str(vmeta.get("software", ""))
                if _AI_RE.search(soft):
                    return SignalResult(
                        signal=self.name,
                        score=0.05,
                        confidence=0.95,
                        weight=self.weight,
                        summary=f"AI tool signature found in video metadata: {soft}.",
                        details={**vmeta, "ai_signature": True},
                    )
                return SignalResult(
                    signal=self.name,
                    score=0.88 if has_device else 0.35,
                    confidence=0.85 if has_device else 0.45,
                    weight=self.weight,
                    summary=(
                        f"Video device metadata present ({vmeta['device']})."
                        if has_device
                        else "No camera/device metadata found in video container."
                    ),
                    details={**vmeta, "stripped": not has_device, "ai_signature": False},
                )

            exif, png_info, size, fmt = _extract_image_meta(media_path)
            dims = f"{size[0]}×{size[1]}" if size else "Unknown"

            # Check PNG text chunks / EXIF combined for AI signatures
            soft = str(exif.get("Software", "")).strip()
            creator = str(exif.get("Artist", "") or exif.get("Creator", "")).strip()
            comment = str(exif.get("UserComment", "") or exif.get("ImageDescription", "")).strip()
            png_text = " ".join(f"{k}:{v}" for k, v in png_info.items())
            combined = f"{soft} {creator} {comment} {png_text}"

            if _AI_RE.search(combined):
                matched = _AI_RE.findall(combined)
                return SignalResult(
                    signal=self.name,
                    score=0.02,
                    confidence=0.98,
                    weight=self.weight,
                    summary=f"AI generator signature detected in file metadata: {matched[0]}.",
                    details={
                        "stripped": False,
                        "ai_signature": True,
                        "device": "Synthetic / AI Generator",
                        "taken_at": "Not recorded",
                        "capture_settings": f"{dims} · {fmt or 'Image'}",
                        "software": soft or matched[0],
                        "matched": matched,
                    },
                )

            if not exif:
                return SignalResult(
                    signal=self.name,
                    score=0.35,
                    confidence=0.45,
                    weight=self.weight,
                    summary="No EXIF metadata present (common in both web-shared photos and AI images).",
                    details={
                        "stripped": True,
                        "ai_signature": False,
                        "device": "Not recorded (stripped or synthetic)",
                        "taken_at": "Not recorded",
                        "capture_settings": f"{dims} · {fmt or 'Image'}",
                        "software": "Not recorded",
                    },
                )

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

            has_camera = bool(make or model)
            has_exposure = any(k in exif for k in ("ExposureTime", "FNumber", "ISOSpeedRatings", "FocalLength"))
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

            if has_camera and has_exposure:
                return SignalResult(
                    signal=self.name,
                    score=0.94,
                    confidence=0.90,
                    weight=self.weight,
                    summary=f"Full camera hardware and exposure metadata present ({device}).",
                    details=details,
                )
            if has_camera:
                return SignalResult(
                    signal=self.name,
                    score=0.85,
                    confidence=0.78,
                    weight=self.weight,
                    summary=f"Camera metadata present ({device}).",
                    details=details,
                )

            return SignalResult(
                signal=self.name,
                score=0.55,
                confidence=0.35,
                weight=self.weight,
                summary="Basic metadata present without camera hardware tags.",
                details=details,
            )

        except Exception as e:
            log.warning("metadata.error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.0,
                weight=self.weight,
                summary="Metadata analysis skipped.",
                details={"error": str(e)},
            )
