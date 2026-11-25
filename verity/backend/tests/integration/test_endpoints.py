"""Integration tests for the FastAPI endpoints."""
import io
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


class TestHealth:
    async def test_health_ok(self, client: AsyncClient):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestUpload:
    def _jpeg_bytes(self) -> bytes:
        # Minimal JPEG with valid magic bytes
        return (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            b"\xff\xd9"  # EOI marker — tiny but valid structure
        )

    async def test_upload_unsupported_type_returns_415(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/upload",
            files={"file": ("test.txt", b"hello world", "text/plain")},
        )
        assert resp.status_code == 415

    async def test_upload_valid_jpeg_returns_job(self, client: AsyncClient):
        # Create a real tiny JPEG using PIL
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (10, 10), color=(128, 64, 32)).save(buf, "JPEG")
        buf.seek(0)
        resp = await client.post(
            "/api/v1/upload",
            files={"file": ("test.jpg", buf.read(), "image/jpeg")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "job_id" in data
        assert "status_url" in data


class TestJobNotFound:
    async def test_missing_job_returns_404(self, client: AsyncClient):
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"/api/v1/jobs/{fake_id}/status")
        assert resp.status_code == 404
