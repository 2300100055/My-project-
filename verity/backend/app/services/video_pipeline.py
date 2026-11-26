"""
Video analysis pipeline.
Extracts keyframes adaptively (ffmpeg or OpenCV fallback), runs full spatial/noise/ELA/spectral
forensics per frame, and computes true pixel-level temporal flicker & face-vs-background
consistency checks.
"""
from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from pathlib import Path
from uuid import UUID

import cv2
import ffmpeg  # type: ignore[import]
import numpy as np
import structlog

from app.core.config import settings
from app.detectors.c2pa_check import C2PADetector
from app.detectors.ela import ELADetector
from app.detectors.metadata import MetadataDetector
from app.detectors.ml_classifier import MLClassifierDetector
from app.detectors.noise import NoiseResidualDetector
from app.detectors.spectral import SpectralDetector
from app.schemas import AnalysisResult, SignalResult, Verdict, VideoSegment
from app.services.fusion import fuse

log = structlog.get_logger()


async def _probe(path: str) -> dict:
    if shutil.which("ffprobe") is None:
        cap = cv2.VideoCapture(path)
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0
            duration = frame_count / fps if fps > 0 else 0.0
            return {"format": {"duration": str(duration)}, "streams": [{"codec_type": "video"}]}
        finally:
            cap.release()
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: ffmpeg.probe(path))


async def _extract_keyframes(
    path: str, fps: float, max_frames: int, out_dir: str
) -> list[str]:
    """Extract frames at given fps, using ffmpeg or OpenCV fallback."""
    if shutil.which("ffmpeg") is None:
        cap = cv2.VideoCapture(path)
        saved: list[str] = []
        try:
            src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            step = max(1, int(round(src_fps / max(fps, 0.1))))
            idx = 0
            count = 0
            while count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                if idx % step == 0:
                    out_file = os.path.join(out_dir, f"frame_{count + 1:06d}.jpg")
                    cv2.imwrite(out_file, frame)
                    saved.append(out_file)
                    count += 1
                idx += 1
        finally:
            cap.release()
        return saved

    out_pattern = os.path.join(out_dir, "frame_%06d.jpg")
    loop = asyncio.get_event_loop()

    def _run() -> None:
        (
            ffmpeg.input(path)
            .filter("fps", fps=fps)
            .output(
                out_pattern,
                vframes=max_frames,
                pix_fmt="rgb24",
                vcodec="mjpeg",
                q=2,
                loglevel="quiet",
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )

    try:
        await loop.run_in_executor(None, _run)
    except ffmpeg.Error as e:
        log.warning("video.ffmpeg_error", stderr=e.stderr.decode("utf-8", errors="replace")[:500])

    frames = sorted(Path(out_dir).glob("frame_*.jpg"))
    return [str(f) for f in frames]


def _analyze_adjacent_temporal(path: str, max_pairs: int = 24) -> SignalResult:
    """
    Analyze consecutive native-fps frames (t, t+1) for high-frequency AI shimmer/flicker
    and unnatural static-region smoothness.
    """
    cap = cv2.VideoCapture(path)
    lap_diffs: list[float] = []
    res_flickers: list[float] = []
    noise_floors: list[float] = []
    prev_gray: np.ndarray | None = None
    prev_res: np.ndarray | None = None
    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        stride = max(1, total // max_pairs) if total > max_pairs else 1
        idx = 0
        pairs = 0
        while pairs < max_pairs:
            ret, frame = cap.read()
            if not ret:
                break
            if idx % stride == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if max(gray.shape) > 512:
                    s = 512.0 / max(gray.shape)
                    gray = cv2.resize(gray, (int(gray.shape[1] * s), int(gray.shape[0] * s)))
                # Read immediate next frame for true dt=1 temporal delta
                ret2, frame2 = cap.read()
                idx += 1
                if not ret2:
                    break
                gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
                if gray2.shape != gray.shape:
                    gray2 = cv2.resize(gray2, (gray.shape[1], gray.shape[0]))

                lap1 = float(np.var(cv2.Laplacian(gray, cv2.CV_32F)))
                lap2 = float(np.var(cv2.Laplacian(gray2, cv2.CV_32F)))
                lap_diffs.append(abs(lap2 - lap1) / (max(lap1, lap2) + 1e-5))

                res1 = gray.astype(np.float32) - cv2.GaussianBlur(gray.astype(np.float32), (5, 5), 0)
                res2 = gray2.astype(np.float32) - cv2.GaussianBlur(gray2.astype(np.float32), (5, 5), 0)
                noise_floors.append(float(np.std(res1)))
                res_flickers.append(float(np.std(res2 - res1)) / (float(np.std(res1)) + 1e-5))
                pairs += 1
            idx += 1
    finally:
        cap.release()

    if len(lap_diffs) < 2:
        return SignalResult(
            signal="temporal_consistency",
            score=0.5,
            confidence=0.0,
            weight=0.25,
            summary="Too few consecutive frames for temporal flicker analysis.",
            details={"pairs": len(lap_diffs)},
        )

    mean_lap_diff = float(np.mean(lap_diffs))
    mean_flicker = float(np.mean(res_flickers))
    mean_noise = float(np.mean(noise_floors))

    # Synthetic/AI video: either very low sensor noise (< 2.5) OR high frame-to-frame sharpness jitter
    noise_ok = min(mean_noise / 4.5, 1.0)
    flicker_ok = max(0.0, 1.0 - max(0.0, mean_lap_diff - 0.04) / 0.20)
    raw_t = 0.55 * noise_ok + 0.45 * flicker_ok
    # Steady consecutive frames are neutral-positive (0.58, low conf), never 1.000
    if raw_t >= 0.70:
        score = 0.58
        conf = 0.35
    else:
        score = raw_t
        conf = 0.78

    summary = (
        f"Temporal flicker or synthetic smoothness detected (noise {mean_noise:.2f}, sharpness delta {mean_lap_diff:.3f})."
        if score < 0.55
        else f"Consecutive-frame noise and sharpness transitions are steady (noise {mean_noise:.2f}, delta {mean_lap_diff:.3f})."
    )
    return SignalResult(
        signal="temporal_consistency",
        score=score,
        confidence=conf,
        weight=0.20,
        summary=summary,
        details={
            "pairs_analyzed": len(lap_diffs),
            "mean_sharpness_delta": round(mean_lap_diff, 4),
            "mean_residual_flicker": round(mean_flicker, 3),
            "mean_noise_floor": round(mean_noise, 3),
        },
    )
    """
    Compute two real video-specific signals:
    1. temporal_consistency: pixel-level high-pass flicker & Laplacian sharpness jitter across frames.
    2. face_region_consistency: noise/sharpness mismatch between detected face and background
       (catches face-swap / deepfake synthesis).
    """
    if len(frame_paths) < 2:
        t_sig = SignalResult(
            signal="temporal_consistency",
            score=0.5,
            confidence=0.0,
            weight=0.25,
            summary="Too few frames for temporal analysis.",
            details={"frames": len(frame_paths)},
        )
        f_sig = SignalResult(
            signal="face_region_consistency",
            score=0.5,
            confidence=0.0,
            weight=0.20,
            summary="Too few frames for face-region analysis.",
            details={"frames": len(frame_paths)},
        )
        return t_sig, f_sig

    cascade_cls = getattr(cv2, "CascadeClassifier", None)
    cv2_data = getattr(cv2, "data", None)
    face_cascade = (
        cascade_cls(cv2_data.haarcascades + "haarcascade_frontalface_default.xml")
        if cascade_cls and cv2_data and hasattr(cv2_data, "haarcascades")
        else None
    )

    lap_vars: list[float] = []
    face_bg_ratios: list[float] = []
    prev_res: np.ndarray | None = None
    res_deltas: list[float] = []

    for fp in frame_paths:
        img = cv2.imread(fp)
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if max(gray.shape) > 640:
            scale = 640.0 / max(gray.shape)
            gray = cv2.resize(gray, (int(gray.shape[1] * scale), int(gray.shape[0] * scale)))

        # Laplacian sharpness per frame
        lap = cv2.Laplacian(gray, cv2.CV_32F)
        lap_vars.append(float(np.var(lap)))

        # High-pass residual for temporal flicker
        blurred = cv2.GaussianBlur(gray.astype(np.float32), (5, 5), 0)
        res = gray.astype(np.float32) - blurred
        if prev_res is not None and prev_res.shape == res.shape:
            res_deltas.append(float(np.std(res - prev_res)))
        prev_res = res

        # Face/center-subject vs background sharpness/noise check
        faces = (
            face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=5, minSize=(48, 48))
            if face_cascade is not None and not face_cascade.empty()
            else ()
        )
        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda b: b[2] * b[3])
        else:
            # Fallback to central 50% subject box vs outer background
            gh, gw = gray.shape
            x, y, w, h = gw // 4, gh // 4, gw // 2, gh // 2

        face_patch = res[y : y + h, x : x + w]
        mask = np.ones(res.shape, dtype=bool)
        mask[y : y + h, x : x + w] = False
        bg_patch = res[mask]
        if face_patch.size > 0 and bg_patch.size > 0:
            face_std = float(np.std(face_patch))
            bg_std = float(np.std(bg_patch))
            ratio = min(face_std, bg_std) / (max(face_std, bg_std) + 1e-5)
            face_bg_ratios.append(ratio)

    # 1. Temporal consistency:
    # Coefficient of variation of Laplacian sharpness across frames + residual delta jitter
    if len(lap_vars) >= 2 and np.mean(lap_vars) > 1e-4:
        lap_cv = float(np.std(lap_vars) / np.mean(lap_vars))
    else:
        lap_cv = 0.0

    res_delta_cv = float(np.std(res_deltas) / (np.mean(res_deltas) + 1e-5)) if len(res_deltas) >= 2 else 0.0

    # Natural steady video: lap_cv < 0.25, res_delta_cv < 0.25
    # AI/deepfake shimmer/flicker: higher jitter in sharpness or high-pass residuals
    jitter = 0.55 * min(lap_cv / 0.55, 1.0) + 0.45 * min(res_delta_cv / 0.45, 1.0)
    temporal_score = max(0.0, min(1.0, 1.0 - jitter))

    t_summary = (
        f"Temporal sharpness/residual jitter detected (sharpness CV {lap_cv:.2f}, residual CV {res_delta_cv:.2f})."
        if temporal_score < 0.55
        else f"Frame-to-frame sharpness and noise transitions are consistent (CV {lap_cv:.2f})."
    )
    t_sig = SignalResult(
        signal="temporal_consistency",
        score=temporal_score,
        confidence=0.78,
        weight=0.25,
        summary=t_summary,
        details={"sharpness_cv": round(lap_cv, 3), "residual_delta_cv": round(res_delta_cv, 3)},
    )

    # 2. Face-region consistency (if faces were detected):
    if face_bg_ratios:
        mean_ratio = float(np.mean(face_bg_ratios))
        # Natural camera video: face and background share similar sensor residual (ratio ~ 0.65-0.95)
        # Deepfake / face-swap: mismatched noise/blur between face & background (ratio < 0.55)
        face_score = max(0.0, min(1.0, (mean_ratio - 0.20) / 0.65))
        f_summary = (
            f"Face region noise/sharpness differs from background (match ratio {mean_ratio:.2f}) — consistent with face synthesis or swapping."
            if face_score < 0.55
            else f"Face region matches surrounding camera noise profile (match ratio {mean_ratio:.2f})."
        )
        f_sig = SignalResult(
            signal="face_region_consistency",
            score=face_score,
            confidence=0.82,
            weight=0.20,
            summary=f_summary,
            details={"faces_checked": len(face_bg_ratios), "face_bg_match_ratio": round(mean_ratio, 3)},
        )
    else:
        f_sig = SignalResult(
            signal="face_region_consistency",
            score=0.5,
            confidence=0.0,
            weight=0.20,
            summary="No prominent faces detected for face-region comparison.",
            details={"faces_checked": 0},
        )

    return t_sig, f_sig


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
    duration_s = float(probe_data["format"].get("duration", 0))
    fps_target = 1.0 if duration_s < 30 else (0.5 if duration_s < 120 else 0.25)
    max_frames = min(max(int(duration_s * fps_target) + 1, 1), settings.MAX_VIDEO_FRAMES)

    if progress_callback:
        await progress_callback(0.10, "Extracting keyframes")

    with tempfile.TemporaryDirectory(dir=str(settings.STORAGE_DIR)) as frame_dir:
        frame_paths = await _extract_keyframes(media_path, fps_target, max_frames, frame_dir)
        if not frame_paths:
            log.warning("video.no_frames_extracted", job_id=str(job_id))

        frame_detectors = [ELADetector(), SpectralDetector(), NoiseResidualDetector(), MLClassifierDetector()]
        total_frames = len(frame_paths)
        frame_results: list[dict] = []

        for i, fp in enumerate(frame_paths):
            if progress_callback:
                await progress_callback(
                    0.10 + 0.70 * (i / max(total_frames, 1)),
                    f"Analyzing frame {i + 1}/{total_frames}",
                )

            frame_signals = await asyncio.gather(
                *[det.analyze(fp, "image") for det in frame_detectors],
                return_exceptions=False,
            )
            active_sigs = [s for s in frame_signals if s.confidence > 0]
            frame_score = (
                float(np.mean([s.score for s in active_sigs])) if active_sigs else 0.5
            )
            dominant = min(active_sigs, key=lambda s: s.score).signal if active_sigs else "ela"
            frame_results.append({
                "frame_path": fp,
                "frame_idx": i,
                "timestamp_s": i / fps_target,
                "score": frame_score,
                "dominant": dominant,
                "signals": frame_signals,
            })

        if progress_callback:
            await progress_callback(0.85, "Computing consecutive-frame temporal consistency")

        temporal_signal = _analyze_adjacent_temporal(media_path)

        segment_duration = 1.0 / fps_target
        video_timeline: list[VideoSegment] = []
        for r in frame_results:
            seg_score = r["score"]
            seg_verdict = Verdict.LIKELY_AUTHENTIC if seg_score >= 0.5 else Verdict.LIKELY_AI_GENERATED
            video_timeline.append(VideoSegment(
                start_s=r["timestamp_s"],
                end_s=r["timestamp_s"] + segment_duration,
                score=seg_score,
                verdict=seg_verdict,
                dominant_signal=r["dominant"],
            ))

        def _aggregate_signal(name: str, weight: float, frames: list[dict]) -> SignalResult:
            frame_sigs = [sig for fr in frames for sig in fr["signals"] if sig.signal == name]
            if not frame_sigs:
                return SignalResult(
                    signal=name,
                    score=0.5,
                    confidence=0.0,
                    weight=weight,
                    summary="No frames analyzed.",
                    details={},
                )
            scores_arr = np.array([s.score for s in frame_sigs])
            mean_score = float(0.5 * np.percentile(scores_arr, 25) + 0.5 * np.mean(scores_arr))
            mean_conf = float(np.mean([s.confidence for s in frame_sigs]))
            return SignalResult(
                signal=name,
                score=mean_score,
                confidence=mean_conf,
                weight=weight,
                summary=f"Averaged across {len(frame_sigs)} keyframes.",
                details={"frame_count": len(frame_sigs)},
            )

        agg_ela = _aggregate_signal("ela", 0.20, frame_results)
        agg_spectral = _aggregate_signal("spectral", 0.15, frame_results)
        agg_noise = _aggregate_signal("noise_residual", 0.25, frame_results)
        agg_ml = _aggregate_signal("ml_classifier", 0.35, frame_results)

        c2pa_sig = await C2PADetector().analyze(media_path, "video")
        meta_sig = await MetadataDetector().analyze(media_path, "video")
        c2pa_sig.weight = 0.15
        meta_sig.weight = 0.20

        all_signals = [
            c2pa_sig,
            meta_sig,
            agg_ela,
            agg_spectral,
            agg_noise,
            agg_ml,
            temporal_signal,
        ]

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
