FROM python:3.12-slim

# Security: non-root user
RUN groupadd -r verity && useradd -r -g verity -u 1000 verity

# System deps for Pillow, OpenCV, libmagic, ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps as root first (before switching user)
COPY pyproject.toml ./
RUN pip install --no-cache-dir poetry==1.8.4 \
    && poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy application code
COPY app/ ./app/

# Writable temp dir only
RUN mkdir -p /tmp/verity && chown verity:verity /tmp/verity

USER verity

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
