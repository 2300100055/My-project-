"""Auto-cleanup worker: deletes expired jobs and their temp files."""
from __future__ import annotations

import asyncio
import os
from pathlib import Path

import structlog

from app.core.config import settings
from app.workers.job_store import delete_job, get_job, list_expired_jobs

log = structlog.get_logger()
_task: asyncio.Task | None = None


async def _cleanup_loop() -> None:
    while True:
        await asyncio.sleep(settings.CLEANUP_INTERVAL_S)
        try:
            expired = await list_expired_jobs(settings.RETENTION_MINUTES)
            for job_id in expired:
                job = await get_job(job_id)
                if job and job.media_path:
                    _safe_delete(job.media_path)
                if job and job.heatmap_path:
                    _safe_delete(job.heatmap_path)
                await delete_job(job_id)
                log.info("cleanup.deleted_job", job_id=job_id)
        except Exception as e:
            log.warning("cleanup.error", error=str(e))


def _safe_delete(path: str) -> None:
    try:
        p = Path(path)
        if p.exists() and p.is_file():
            p.unlink()
    except Exception as e:
        log.warning("cleanup.file_delete_error", path=path, error=str(e))


async def start_cleanup_worker() -> None:
    global _task
    _task = asyncio.create_task(_cleanup_loop())
    log.info("cleanup.worker.started")


async def stop_cleanup_worker() -> None:
    global _task
    if _task:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
