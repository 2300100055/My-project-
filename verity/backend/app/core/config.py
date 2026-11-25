"""Application configuration via environment variables."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Storage
    STORAGE_DIR: Path = Path("/tmp/verity")
    RETENTION_MINUTES: int = 60

    # Limits
    MAX_IMAGE_BYTES: int = 20 * 1024 * 1024       # 20 MB
    MAX_VIDEO_BYTES: int = 500 * 1024 * 1024      # 500 MB
    MAX_IMAGE_DIM: int = 8192
    MAX_VIDEO_DURATION_S: int = 600               # 10 min
    MAX_VIDEO_FRAMES: int = 1500
    MAX_IMAGE_PIXELS: int = 50_000_000

    # Rate limiting
    RATE_LIMIT_UPLOAD: str = "10/minute"
    RATE_LIMIT_STATUS: str = "60/minute"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # ML
    ML_MODEL_ID: str = "umm-maybe/AI-image-detector"
    ML_DEVICE: str = "cpu"
    ML_TEMPERATURE: float = 1.5          # Calibration temperature (tune on eval set)
    ML_ENABLED: bool = True

    # Worker timeouts
    IMAGE_WORKER_TIMEOUT_S: int = 30
    VIDEO_WORKER_TIMEOUT_S: int = 300

    # Cleanup
    CLEANUP_INTERVAL_S: int = 300        # Every 5 minutes


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
