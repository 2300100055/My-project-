"""Report generation endpoint: PDF and JSON."""
from __future__ import annotations

import io
import json
from uuid import UUID

import structlog
from fastapi import APIRouter
from fastapi.responses import Response

from app.core.errors import JobNotFoundError
from app.schemas import JobStatus
from app.workers.job_store import get_job

router = APIRouter()
log = structlog.get_logger()


@router.get("/jobs/{job_id}/report/json")
async def download_json_report(job_id: UUID) -> Response:
    job = await get_job(str(job_id))
    if not job or not job.result:
        raise JobNotFoundError(str(job_id))

    payload = job.result.model_dump(mode="json")
    content = json.dumps(payload, indent=2, default=str)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=verity-report-{job_id}.json"},
    )


@router.get("/jobs/{job_id}/report/pdf")
async def download_pdf_report(job_id: UUID) -> Response:
    job = await get_job(str(job_id))
    if not job or not job.result:
        raise JobNotFoundError(str(job_id))

    result = job.result
    pdf_bytes = _generate_pdf(result)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=verity-report-{job_id}.pdf"},
    )


def _generate_pdf(result) -> bytes:  # type: ignore[no-untyped-def]
    from reportlab.lib import colors  # type: ignore[import]
    from reportlab.lib.pagesizes import A4  # type: ignore[import]
    from reportlab.lib.styles import getSampleStyleSheet  # type: ignore[import]
    from reportlab.lib.units import cm  # type: ignore[import]
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle  # type: ignore[import]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Verity — AI Content Analysis Report", styles["Title"]))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"File: {result.filename}", styles["Normal"]))
    story.append(Paragraph(f"Analyzed: {result.analyzed_at}", styles["Normal"]))
    story.append(Paragraph(f"Job ID: {result.job_id}", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    verdict_color = colors.red if "ai_generated" in str(result.verdict) else (colors.orange if "inconclusive" in str(result.verdict) else colors.green)
    story.append(Paragraph(f"<b>Verdict: {result.verdict.upper()} (Score: {result.score}/100)</b>", styles["Heading2"]))
    story.append(Paragraph(result.plain_english_summary, styles["Normal"]))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f"<i>Reliability: {result.reliability}</i>", styles["Normal"]))
    if result.reliability_note:
        story.append(Paragraph(f"<i>{result.reliability_note}</i>", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    # Signals table
    story.append(Paragraph("Evidence Signals", styles["Heading3"]))
    table_data = [["Signal", "Score", "Confidence", "Weight", "Summary"]]
    for sig in result.signals:
        table_data.append([
            sig.signal,
            f"{sig.score:.2f}",
            f"{sig.confidence:.2f}",
            f"{sig.weight:.2f}",
            sig.summary[:80] + ("…" if len(sig.summary) > 80 else ""),
        ])

    tbl = Table(table_data, colWidths=[3*cm, 2*cm, 2.5*cm, 2*cm, 7.5*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0071E3")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5F7")]),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(result.limitation_notice, styles["Italic"]))

    doc.build(story)
    return buf.getvalue()
