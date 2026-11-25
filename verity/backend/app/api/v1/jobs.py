"""Job status and result endpoints."""
from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.errors import JobNotFoundError
from app.schemas import AnalysisResult, JobStatusResponse, JobStatus
from app.workers.job_store import delete_job, get_job

router = APIRouter()
log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)


@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
@limiter.limit(settings.RATE_LIMIT_STATUS)
async def get_job_status(request: Request, job_id: UUID) -> JobStatusResponse:
    job = await get_job(str(job_id))
    if not job:
        raise JobNotFoundError(str(job_id))

    result_url = f"/api/v1/jobs/{job_id}/result" if job.status == JobStatus.COMPLETE else None

    return JobStatusResponse(
        job_id=job_id,
        status=job.status,
        progress=job.progress,
        step=job.step,
        error=job.error,
        result_url=result_url,
    )


@router.get("/jobs/{job_id}/result", response_model=AnalysisResult)
async def get_job_result(job_id: UUID) -> AnalysisResult:
    job = await get_job(str(job_id))
    if not job:
        raise JobNotFoundError(str(job_id))
    if job.status != JobStatus.COMPLETE or not job.result:
        from app.core.errors import VerityError
        raise VerityError(code="RESULT_NOT_READY", message="Analysis not yet complete.", status_code=202)
    return job.result


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job_endpoint(job_id: UUID) -> None:
    deleted = await delete_job(str(job_id))
    if not deleted:
        raise JobNotFoundError(str(job_id))
