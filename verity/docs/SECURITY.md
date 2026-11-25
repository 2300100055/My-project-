# Security & Threat Model — Verity

## STRIDE Threat Model

### S — Spoofing
| Threat | Mitigation |
|--------|-----------|
| Attacker uploads crafted file claiming to be image | Magic-byte validation (not extension or MIME header) in `detectors/` pre-check |
| Attacker replays job IDs to access others' results | UUID v4 job IDs (128-bit entropy); no sequential IDs |

### T — Tampering
| Threat | Mitigation |
|--------|-----------|
| Malicious file triggers path traversal | UUID storage names; no user-controlled path segments; `os.path.abspath` checks |
| Decompression bomb exhausts memory | `Pillow MAX_IMAGE_PIXELS = 50_000_000`; subprocess memory limits |
| Polyglot file (e.g., PDF+JPEG) bypasses type check | Magic-byte check + libmagic; ffprobe container validation for video |
| Malformed EXIF triggers parser crash | `exifread` with try/except; crash = metadata signal returns "unreadable" |

### R — Repudiation
| Threat | Mitigation |
|--------|-----------|
| No audit trail of analysis | Structured logs (no PII, no file contents) with job_id + timestamp |

### I — Information Disclosure
| Threat | Mitigation |
|--------|-----------|
| Upload contents logged | No file content in logs; only metadata (size, type, job_id) |
| Storage path enumerable | UUID names; no directory listing endpoint |
| PII in filenames retained | Original filename stored only in-memory for display; storage uses UUID |
| Results accessible after retention window | Auto-delete cron at 60-minute retention (configurable) |

### D — Denial of Service
| Threat | Mitigation |
|--------|-----------|
| Upload flood | Rate limiting: 10 requests/minute/IP via slowapi |
| CPU exhaustion via large image | Resource limits on subprocess worker; timeouts |
| Storage exhaustion | Per-job size limits + retention TTL |
| Memory exhaustion via video | Frame-count limits; subprocess memory cap |

### E — Elevation of Privilege
| Threat | Mitigation |
|--------|-----------|
| Media worker escapes sandbox | Non-root user in Dockerfile; no network egress in worker subprocess; read-only FS except /tmp |
| Dependency vulnerability | `pip-audit` + `npm audit` in CI; pinned deps in `pyproject.toml` |

---

## Security Controls

### Upload Validation
```python
ALLOWED_MAGIC_BYTES = {
    "jpg":  [(0, b"\xff\xd8\xff")],
    "png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "webp": [(0, b"RIFF"), (8, b"WEBP")],
    "gif":  [(0, b"GIF87a"), (0, b"GIF89a")],
    "heic": [(4, b"ftyp")],  # + subtype check
    "mp4":  [(4, b"ftyp")],
    "mov":  [(4, b"ftyp")],
    "webm": [(0, b"\x1a\x45\xdf\xa3")],
}
MAX_IMAGE_SIZE = 20 * 1024 * 1024   # 20 MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500 MB
MAX_IMAGE_DIM  = 8192
MAX_VIDEO_DURATION = 600            # 10 minutes
MAX_VIDEO_FRAMES   = 1500
```

### HTTP Security Headers
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Rate Limiting
- 10 uploads / minute / IP
- 60 status polls / minute / IP
- 429 response with Retry-After header

### CORS
- Allowlist: `http://localhost:3000` (dev), `https://verity.app` (prod)
- Credentials: false (no cookies)

### Secrets
- All secrets via environment variables
- No secrets in code, logs, or Docker layers
- `.env.example` has only placeholder values
- Secret scanning enabled in CI (gitleaks)

---

## Worker Sandbox

The media processing worker runs as a subprocess with:
- Non-root OS user (uid 1000)
- `resource.setrlimit` for CPU time (30s image, 300s video), memory (1 GB), file size (600 MB)
- No network access (subprocess has no network calls; ffmpeg flagged with `-protocol_whitelist file,pipe`)
- Temp dir cleaned after each job
- Killed on timeout via `signal.SIGKILL`
