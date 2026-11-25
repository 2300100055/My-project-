# API Reference — Verity v1

Base URL: `http://localhost:8000/api/v1` (OpenAPI spec at `/openapi.json`, Swagger UI at `/docs`).

## Endpoints

### `GET /health`
Returns service status, version, and environment.

### `POST /upload`
Multipart form upload (`file`). Validates magic bytes, size (`20 MB` image / `500 MB` video), and dimensions (`8192x8192` max).
- **200 OK:** `{ "job_id": "<uuid>", "status_url": "...", "result_url": "...", "estimated_seconds": 5 }`
- **413:** `FILE_TOO_LARGE`
- **415:** `UNSUPPORTED_FILE_TYPE`
- **422:** `CORRUPT_FILE` or `DECOMPRESSION_BOMB`
- **429:** Rate limit exceeded (`10/minute`)

### `GET /jobs/{job_id}/status`
Poll job progress (`pending` | `running` | `complete` | `failed`).
- **200 OK:** `{ "job_id": "...", "status": "running", "progress": 0.4, "step": "Running ELA", "result_url": null }`
- **404:** `JOB_NOT_FOUND`

### `GET /jobs/{job_id}/result`
Returns `AnalysisResult` with `score` (0–100), `verdict` (`likely_authentic` | `inconclusive` | `likely_ai_generated`), `reliability` (`high` | `medium` | `low`), `signals[]`, `limitation_notice`, and `video_timeline[]` (for video).
- **202:** `RESULT_NOT_READY`
- **404:** `JOB_NOT_FOUND`

### `GET /jobs/{job_id}/report/json` & `GET /jobs/{job_id}/report/pdf`
Downloads the analysis report as JSON or PDF (`reportlab`).

### `DELETE /jobs/{job_id}`
Immediately deletes the job record. Returns `204 No Content`.
