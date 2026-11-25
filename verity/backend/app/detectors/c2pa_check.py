"""
C2PA / Content Credentials provenance checker.
Uses python-c2pa (open-source, Apache 2.0).

Score interpretation:
  1.0 — Valid C2PA manifest, authentic provenance
  0.7 — C2PA manifest present but partial / unknown issuer
  0.5 — No C2PA data (neutral — most photos have none)
  0.1 — C2PA manifest present but validation fails (tamper evidence)
"""
from __future__ import annotations

import structlog
from app.detectors.base import BaseDetector
from app.schemas import SignalResult

log = structlog.get_logger()


class C2PADetector(BaseDetector):
    name = "provenance"
    weight = 0.30

    async def analyze(self, media_path: str, media_type: str, **kwargs) -> SignalResult:  # type: ignore[override]
        try:
            import c2pa  # type: ignore[import]
            reader = c2pa.Reader(media_path)
            manifest_store = reader.get_manifest_store()

            if manifest_store is None:
                return SignalResult(
                    signal=self.name,
                    score=0.5,
                    confidence=0.9,
                    weight=self.weight,
                    summary="No Content Credentials (C2PA) provenance found. This is normal for most images.",
                    details={"c2pa_present": False},
                )

            active = manifest_store.get_active_manifest()
            if active is None:
                return SignalResult(
                    signal=self.name,
                    score=0.5,
                    confidence=0.8,
                    weight=self.weight,
                    summary="C2PA data structure found but no active manifest.",
                    details={"c2pa_present": True, "active_manifest": False},
                )

            # Check validation status
            validation_status = active.validation_status()
            is_valid = all(s.code() == "claimSignature.validated" for s in (validation_status or []))

            claim_generator = active.claim_generator() or "Unknown"
            assertions = [a.label() for a in (active.assertions() or [])]

            if is_valid:
                score = 1.0
                confidence = 0.95
                summary = f"Valid Content Credentials found. Generator: {claim_generator}."
            else:
                score = 0.1
                confidence = 0.95
                summary = "C2PA manifest found but validation failed — possible tampering."

            return SignalResult(
                signal=self.name,
                score=self._safe_score(score),
                confidence=confidence,
                weight=self.weight,
                summary=summary,
                details={
                    "c2pa_present": True,
                    "valid": is_valid,
                    "claim_generator": claim_generator,
                    "assertions": assertions,
                },
            )

        except ImportError:
            log.warning("c2pa.not_installed")
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.1,
                weight=self.weight,
                summary="C2PA library not available; provenance check skipped.",
                details={"c2pa_present": None, "error": "library_missing"},
            )
        except Exception as e:
            log.warning("c2pa.error", error=str(e))
            return SignalResult(
                signal=self.name,
                score=0.5,
                confidence=0.3,
                weight=self.weight,
                summary="Provenance check encountered an error; result is neutral.",
                details={"error": str(e)},
            )
