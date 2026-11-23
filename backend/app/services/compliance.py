"""Rule Engine & Grounded RAG Compliance Checklist + Q&A service contracts (#83, #68, #63).

Enforces the Day 8 (Fri 28 Nov) data cutoff rule (#83):
Tracks (`OSS`, `PIRT`, `HALAL`, `SPT`) without ingested rows in `obligations`
return `track_status="coming_soon"` so the UI and RAG chat never hallucinate
missing regulations.
"""

from __future__ import annotations

import csv
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Obligation
from app.schemas import (
    LEGAL_DISCLAIMER_ID,
    BusinessScale,
    ChatAskResponse,
    ChatCitation,
    ChecklistItem,
    ChecklistResponse,
    ObligationTrack,
    RiskTier,
    TrackChecklistGroup,
)
from app.services.kbli import get_kbli_entry

REPO_ROOT = Path(__file__).resolve().parents[3]
OSS_CSV_PATH = REPO_ROOT / "data" / "obligations_oss.csv"
ALL_TRACKS: tuple[ObligationTrack, ...] = ("OSS", "PIRT", "HALAL", "SPT")


def _load_fallback_oss_rows() -> list[dict[str, str]]:
    if not OSS_CSV_PATH.exists():
        return []
    with open(OSS_CSV_PATH, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _scope_matches(kbli_scope: str, kbli_code: str) -> bool:
    scope = kbli_scope.strip().upper()
    if scope == "ALL":
        return True
    codes = {c.strip() for c in kbli_scope.split(",") if c.strip()}
    return kbli_code in codes


def _scale_matches(scope_scale: str, business_scale: BusinessScale) -> bool:
    raw = scope_scale.strip().lower()
    if raw == "all":
        return True
    scales = {s.strip() for s in raw.split(",") if s.strip()}
    return business_scale in scales


def _derive_title(obligation_id: str, track: str, requirement_text: str) -> str:
    first_sentence = requirement_text.split(".")[0].strip()
    if len(first_sentence) <= 75:
        return first_sentence
    return f"Kewajiban {obligation_id} ({track})"


def _needs_manual_verification(notes: str | None, requirement_text: str) -> bool:
    text_blob = f"{notes or ''} {requirement_text}".lower()
    triggers = ("apabila", "jika", "tergantung", "verifikasi", "daerah", "dikecualikan")
    return any(t in text_blob for t in triggers)


def generate_checklist(
    db: Session,
    kbli_code: str,
    business_scale: BusinessScale = "mikro",
    description: str | None = None,
) -> ChecklistResponse:
    """Rule engine filtering + track cutoff grouping (FR 4 – FR 8, #83, #68)."""
    kbli_entry = get_kbli_entry(kbli_code)
    kbli_title = kbli_entry.judul if kbli_entry else f"KBLI {kbli_code}"
    risk_tier: RiskTier = kbli_entry.default_risk_tier if kbli_entry else "rendah"

    try:
        db_rows = db.query(Obligation).all()
    except Exception:
        db_rows = []

    raw_rows: list[dict[str, str | None]] = []
    if db_rows:
        for r in db_rows:
            raw_rows.append(
                {
                    "obligation_id": r.obligation_id,
                    "track": r.track,
                    "kbli_scope": r.kbli_scope,
                    "business_scale": r.business_scale,
                    "risk_tier": r.risk_tier,
                    "requirement_text": r.requirement_text,
                    "issuing_agency": r.issuing_agency,
                    "source_url": r.source_url,
                    "source_article": r.source_article,
                    "notes": r.notes,
                }
            )
    else:
        for r in _load_fallback_oss_rows():
            raw_rows.append(r)

    ingested_tracks = {str(r.get("track") or "").strip().upper() for r in raw_rows}
    tracks_map: dict[ObligationTrack, TrackChecklistGroup] = {
        track: TrackChecklistGroup(
            track=track,
            track_status="ready" if track in ingested_tracks else "coming_soon",
            items=[],
        )
        for track in ALL_TRACKS
    }

    matched_items: list[ChecklistItem] = []
    for r in raw_rows:
        track_raw = str(r.get("track") or "OSS").strip().upper()
        if track_raw not in ALL_TRACKS:
            continue
        track: ObligationTrack = track_raw  # type: ignore[assignment]
        kbli_scope = str(r.get("kbli_scope") or "")
        scale_scope = str(r.get("business_scale") or "")

        if not _scope_matches(kbli_scope, kbli_code):
            continue
        if not _scale_matches(scale_scope, business_scale):
            continue

        obligation_id = str(r.get("obligation_id") or "")
        req_text = str(r.get("requirement_text") or "")
        article = str(r.get("source_article") or "Regulasi Terkait").strip()
        notes = r.get("notes")

        item = ChecklistItem(
            obligation_id=obligation_id,
            track=track,
            title=_derive_title(obligation_id, track, req_text),
            requirement_text=req_text,
            issuing_agency=str(r.get("issuing_agency") or ""),
            citation=article,
            source_article=article,
            source_url=str(r.get("source_url") or ""),
            needs_manual_verification=_needs_manual_verification(notes, req_text),
            notes=notes,
        )
        matched_items.append(item)
        tracks_map[track].items.append(item)

    return ChecklistResponse(
        kbli_code=kbli_code,
        kbli_title=kbli_title,
        business_scale=business_scale,
        risk_tier=risk_tier,
        obligations=matched_items,
        tracks=tracks_map,
        disclaimer=LEGAL_DISCLAIMER_ID,
    )


def answer_compliance_question(
    db: Session,
    question: str,
    kbli_code: str | None = None,
) -> ChatAskResponse:
    """Grounded RAG Q&A service signature for Calvin (#83, #63 Phase 5)."""
    target_kbli = kbli_code or "10794"
    checklist = generate_checklist(db=db, kbli_code=target_kbli)
    top_items = checklist.obligations[:3]

    citations = [
        ChatCitation(
            obligation_id=item.obligation_id,
            source_article=item.source_article,
            source_url=item.source_url,
        )
        for item in top_items
    ]

    if top_items:
        bullet_lines = [
            f"- [{item.obligation_id}] {item.requirement_text} (Dasar hukum: {item.source_article})"
            for item in top_items
        ]
        answer = (
            f"Berdasarkan korpus regulasi untuk KBLI {checklist.kbli_code} "
            f"({checklist.kbli_title}, risiko {checklist.risk_tier}):\n"
            + "\n".join(bullet_lines)
        )
    else:
        answer = (
            "Belum ditemukan klausa regulasi spesifik di korpus yang ter-ingest untuk pertanyaan ini. "
            "Silakan periksa kembali kode KBLI atau portal resmi OSS-RBA."
        )

    return ChatAskResponse(
        answer=answer,
        citations=citations,
        disclaimer=LEGAL_DISCLAIMER_ID,
    )
