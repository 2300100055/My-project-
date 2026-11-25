"""
Verity Backend — FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.v1 import upload, analyze, jobs, reports, health
from app.core.config import settings
from app.core.errors import VerityError
from app.core.logging import configure_logging
from app.workers.cleanup import start_cleanup_worker, stop_cleanup_worker

configure_logging()
log = structlog.get_logger()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("verity.startup", version=settings.VERSION)
    await start_cleanup_worker()
    yield
    await stop_cleanup_worker()
    log.info("verity.shutdown")


app = FastAPI(
    title="Verity API",
    description="AI content authenticity analyzer — multi-signal forensic pipeline",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Accept"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


@app.exception_handler(VerityError)
async def verity_error_handler(request: Request, exc: VerityError) -> JSONResponse:
    log.warning("verity.error", code=exc.code, message=exc.message)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.code, "message": exc.message})


# Routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(analyze.router, prefix="/api/v1", tags=["analyze"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
