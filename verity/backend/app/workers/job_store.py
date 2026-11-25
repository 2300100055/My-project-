"""
Job store: in-memory async job management.
Designed to be swapped for Redis/Celery in production.
"""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

import structlog

from app.schemas import AnalysisResult, JobStatus

log = structlog.get_logger()


@dataclass
class Job:
    job_id: uuid.UUID
    status: JobStatus = JobStatus.PENDING
    progress: float = 0.0
    step: str = "pending"
    result: AnalysisResult | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    media_path: str = ""
    heatmap_path: str | None = None


_jobs: dict[str, Job] = {}
_lock = asyncio.Lock()


async def create_job(media_path: str) -> Job:
    job = Job(job_id=uuid.uuid4(), media_path=media_path)
    async with _lock:
        _jobs[str(job.job_id)] = job
    return job


async def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


async def update_job_progress(job_id: str, progress: float, step: str) -> None:
    if job_id in _jobs:
        _jobs[job_id].progress = progress
        _jobs[job_id].step = step
        _jobs[job_id].status = JobStatus.RUNNING


async def complete_job(job_id: str, result: AnalysisResult) -> None:
    if job_id in _jobs:
        _jobs[job_id].result = result
        _jobs[job_id].status = JobStatus.COMPLETE
        _jobs[job_id].progress = 1.0
        _jobs[job_id].step = "complete"


async def fail_job(job_id: str, error: str) -> None:
    if job_id in _jobs:
        _jobs[job_id].status = JobStatus.FAILED
        _jobs[job_id].error = error


async def delete_job(job_id: str) -> bool:
    async with _lock:
        if job_id in _jobs:
            del _jobs[job_id]
            return True
    return False


async def list_expired_jobs(retention_minutes: int) -> list[str]:
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=retention_minutes)
    return [
        jid for jid, job in _jobs.items()
        if job.created_at < cutoff
    ]
