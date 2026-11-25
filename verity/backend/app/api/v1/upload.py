"""Upload endpoint: validate, store, and dispatch analysis job."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

import aiofiles
import structlog
from fastapi import APIRouter, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.errors import CorruptFileError, FileTooLargeError, UnsupportedFileTypeError
from app.schemas import UploadResponse
from app.services.image_pipeline import run_image_pipeline
from app.services.video_pipeline import run_video_pipeline
from app.utils.validation import validate_upload
from app.workers.job_store import (
    complete_job,
    create_job,
    fail_job,
    update_job_progress,
)

import asyncio

router = APIRouter()
log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)


async def _dispatch(job_id: str, media_path: str, media_type: str, filename: str, file_size: int):
    """Background task: run pipeline and update job store."""
    async def _progress(p: float, step: str):
        await update_job_progress(job_id, p, step)

    try:
        if media_type == "image":
            result = await run_image_pipeline(
                job_id=uuid.UUID(job_id),
                media_path=media_path,
                filename=filename,
                file_size_bytes=file_size,
                progress_callback=_progress,
            )
        else:
            result = await run_video_pipeline(
                job_id=uuid.UUID(job_id),
                media_path=media_path,
                filename=filename,
                file_size_bytes=file_size,
                progress_callback=_progress,
            )
        await complete_job(job_id, result)
        log.info("upload.analysis_complete", job_id=job_id, verdict=result.verdict)
    except Exception as e:
        log.error("upload.analysis_failed", job_id=job_id, error=str(e))
        await fail_job(job_id, str(e))


@router.post("/upload", response_model=UploadResponse)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def upload_file(request: Request, file: UploadFile) -> UploadResponse:
    """Upload an image or video for analysis."""
    data = await file.read()

    # Validate (raises on error)
    mime_type, media_type = validate_upload(data, file.filename or "unknown")
    original_name = file.filename or "upload"

    # Store with UUID name
    ext = Path(original_name).suffix.lower()
    storage_name = f"{uuid.uuid4()}{ext}"
    storage_path = settings.STORAGE_DIR / storage_name
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(storage_path, "wb") as f:
        await f.write(data)

    # Create job
    job = await create_job(str(storage_path))
    job_id = str(job.job_id)

    log.info("upload.received", job_id=job_id, media_type=media_type, size=len(data))

    # Dispatch background analysis
    asyncio.create_task(_dispatch(job_id, str(storage_path), media_type, original_name, len(data)))

    return UploadResponse(
        job_id=job.job_id,
        status_url=f"/api/v1/jobs/{job_id}/status",
        result_url=f"/api/v1/jobs/{job_id}/result",
        estimated_seconds=5 if media_type == "image" else 60,
    )
