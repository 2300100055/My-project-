"""
Video analysis pipeline.
Uses ffprobe for container analysis, extracts keyframes adaptively,
runs image pipeline on each frame, adds temporal consistency check.
"""
from __future__ import annotations

import asyncio
import os
import tempfile
from pathlib import Path
from uuid import UUID

import ffmpeg  # type: ignore[import]
import numpy as np
import structlog
from PIL import Image

from app.core.config import settings
from app.detectors.ela import ELADetector
from app.detectors.ml_classifier import MLClassifierDetector
from app.detectors.spectral import SpectralDetector
from app.schemas import AnalysisResult, SignalResult, Verdict, VideoSegment
from app.services.fusion import fuse

log = structlog.get_logger()


async def _probe(path: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: ffmpeg.probe(path))


async def _extract_keyframes(
    path: str, fps: float, max_frames: int, out_dir: str
) -> list[str]:
    """Extract frames at given fps, return list of frame paths."""
    out_pattern = os.path.join(out_dir, "frame_%06d.jpg")
    loop = asyncio.get_event_loop()

    def _run():
        (
            ffmpeg.input(path)
            .filter("fps", fps=fps)
            .output(out_pattern, vframes=max_frames, pix_fmt="rgb24",
                    vcodec="mjpeg", q=2,
                    loglevel="quiet")
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )

    try:
        await loop.run_in_executor(None, _run)
    except ffmpeg.Error as e:
        log.warning("video.ffmpeg_error", stderr=e.stderr.decode("utf-8", errors="replace")[:500])

    frames = sorted(Path(out_dir).glob("frame_*.jpg"))
    return [str(f) for f in frames]


async def run_video_pipeline(
    job_id: UUID,
    media_path: str,
    filename: str,
    file_size_bytes: int,
    progress_callback=None,
) -> AnalysisResult:
    if progress_callback:
        await progress_callback(0.05, "Probing container")

    probe_data = await _probe(media_path)
    video_stream = next(
        (s for s in probe_data.get("streams", []) if s.get("codec_type") == "video"),
        None,
    )
    duration_s = float(probe_data["format"].get("duration", 0))
    fps_target = 1.0 if duration_s < 30 else (0.5 if duration_s < 120 else 0.25)
    max_frames = min(int(duration_s * fps_target) + 1, settings.MAX_VIDEO_FRAMES)

    if progress_callback:
        await progress_callback(0.10, "Extracting keyframes")

    with tempfile.TemporaryDirectory(dir=str(settings.STORAGE_DIR)) as frame_dir:
        frame_paths = await _extract_keyframes(media_path, fps_target, max_frames, frame_dir)
        if not frame_paths:
            # Fallback: single frame at middle
            log.warning("video.no_frames_extracted", job_id=str(job_id))

        # Run per-frame analysis (ELA + spectral + ML)
        frame_detectors = [ELADetector(), SpectralDetector(), MLClassifierDetector()]
        total_frames = len(frame_paths)
        frame_results: list[dict] = []

        for i, fp in enumerate(frame_paths):
            if progress_callback:
                await progress_callback(0.10 + 0.75 * (i / max(total_frames, 1)), f"Analyzing frame {i+1}/{total_frames}")

            frame_signals = await asyncio.gather(
                *[det.analyze(fp, "image") for det in frame_detectors],
                return_exceptions=False,
            )
            frame_score = float(np.mean([s.score for s in frame_signals]))
            frame_results.append({
                "frame_path": fp,
                "frame_idx": i,
                "timestamp_s": i / fps_target,
                "score": frame_score,
                "signals": frame_signals,
            })

        if progress_callback:
            await progress_callback(0.87, "Computing temporal consistency")

        # Temporal consistency: frame-to-frame score variance
        if len(frame_results) > 1:
            scores = np.array([r["score"] for r in frame_results])
            temporal_variance = float(np.var(np.diff(scores)))
            # High variance = suspicious temporal inconsistency
            temporal_score = max(0.0, 1.0 - temporal_variance * 10)
        else:
            temporal_score = 0.5

        # Build timeline segments
        segment_duration = 1.0 / fps_target
        video_timeline: list[VideoSegment] = []
        for r in frame_results:
            seg_score = r["score"]
            if seg_score < 0.35:
                seg_verdict = Verdict.LIKELY_AI_GENERATED
            elif seg_score < 0.65:
                seg_verdict = Verdict.INCONCLUSIVE
            else:
                seg_verdict = Verdict.LIKELY_AUTHENTIC
            video_timeline.append(VideoSegment(
                start_s=r["timestamp_s"],
                end_s=r["timestamp_s"] + segment_duration,
                score=seg_score,
                verdict=seg_verdict,
                dominant_signal="ml_classifier",
            ))

        # Aggregate signals across frames
        def _aggregate_signal(name: str, weight: float, frames: list[dict]) -> SignalResult:
            frame_sigs = []
            for fr in frames:
                for sig in fr["signals"]:
                    if sig.signal == name:
                        frame_sigs.append(sig)
            if not frame_sigs:
                return SignalResult(signal=name, score=0.5, confidence=0.0, weight=weight,
                                     summary="No frames analyzed.", details={})
            mean_score = float(np.mean([s.score for s in frame_sigs]))
            mean_conf = float(np.mean([s.confidence for s in frame_sigs]))
            return SignalResult(
                signal=name,
                score=mean_score,
                confidence=mean_conf,
                weight=weight,
                summary=f"Averaged across {len(frame_sigs)} frames.",
                details={"frame_count": len(frame_sigs)},
            )

        agg_ela = _aggregate_signal("ela", 0.10, frame_results)
        agg_spectral = _aggregate_signal("spectral", 0.10, frame_results)
        agg_ml = _aggregate_signal("ml_classifier", 0.35, frame_results)

        temporal_signal = SignalResult(
            signal="temporal_consistency",
            score=temporal_score,
            confidence=0.65,
            weight=0.15,
            summary=(
                "Temporal analysis shows suspicious frame-to-frame inconsistencies."
                if temporal_score < 0.4
                else "Temporal consistency is within normal range."
            ),
            details={"temporal_variance": round(temporal_variance if len(frame_results) > 1 else 0.0, 4)},
        )

        # Import C2PA and metadata for the container itself
        from app.detectors.c2pa_check import C2PADetector
        from app.detectors.metadata import MetadataDetector
        c2pa_sig = await C2PADetector().analyze(media_path, "video")
        meta_sig = await MetadataDetector().analyze(media_path, "video")
        # adjust C2PA weight for video (less reliable)
        c2pa_sig.weight = 0.15
        meta_sig.weight = 0.15

        all_signals = [c2pa_sig, meta_sig, agg_ela, agg_spectral, agg_ml, temporal_signal]

        if progress_callback:
            await progress_callback(0.95, "Fusing evidence")

        result = fuse(
            job_id=job_id,
            media_type="video",
            filename=filename,
            file_size_bytes=file_size_bytes,
            signals=all_signals,
            video_duration_s=duration_s,
            frames_analyzed=total_frames,
            video_timeline=video_timeline,
        )

    if progress_callback:
        await progress_callback(1.0, "Complete")

    return result
